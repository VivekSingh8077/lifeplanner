import { describe, expect, it } from 'vitest';
import { STARTER_FOODS } from '../data/starterFoods';
import type { HealthProfile } from '../types';
import {
  bmi,
  bmiCategory,
  calorieFloor,
  cmToFtIn,
  computeMetrics,
  effectiveTargets,
  estimateBmr,
  estimateExerciseCalories,
  estimateGoalDate,
  formatHeight,
  formatWeight,
  ftInToCm,
  kgToLb,
  lbToKg,
  metricsForProfile,
  scaleNutrition,
  validateProfile,
} from './health';

const base = (over: Partial<HealthProfile> = {}): HealthProfile => ({
  age: 21,
  sex: 'male',
  heightCm: 175,
  currentWeightKg: 80,
  targetWeightKg: 72,
  activityLevel: 'light',
  goal: 'lose',
  pace: 'steady',
  targetDate: null,
  diet: 'vegetarian',
  calorieTarget: null,
  proteinTarget: null,
  waterTargetMl: 2500,
  weightUnit: 'kg',
  heightUnit: 'cm',
  addExerciseToBudget: false,
  ...over,
});

describe('unit conversion', () => {
  it('converts kg <-> lb', () => {
    expect(kgToLb(70)).toBeCloseTo(154.32, 1);
    expect(lbToKg(kgToLb(63.4))).toBeCloseTo(63.4, 6);
    expect(formatWeight(70, 'kg')).toBe('70 kg');
    expect(formatWeight(70, 'lb')).toBe('154.3 lb');
  });
  it('converts cm <-> ft/in', () => {
    expect(cmToFtIn(175)).toEqual({ ft: 5, inch: 9 });
    expect(cmToFtIn(152.4)).toEqual({ ft: 5, inch: 0 });
    expect(ftInToCm(5, 9)).toBeCloseTo(175.26, 2);
    expect(formatHeight(175, 'ft')).toBe('5′ 9″');
    expect(formatHeight(175, 'cm')).toBe('175 cm');
  });
});

describe('BMI, BMR, TDEE', () => {
  it('BMI', () => {
    expect(bmi(70, 175)).toBeCloseTo(22.857, 3);
    expect(bmiCategory(17)).toMatch(/Under/);
    expect(bmiCategory(22)).toMatch(/Healthy/);
    expect(bmiCategory(27)).toMatch(/Over/);
    expect(bmiCategory(31)).toMatch(/Obese/);
  });
  it('Mifflin-St Jeor BMR (hand-checked values)', () => {
    expect(estimateBmr(20, 'male', 175, 70)).toBeCloseTo(1698.75, 2); // 700 + 1093.75 - 100 + 5
    expect(estimateBmr(21, 'female', 160, 60)).toBeCloseTo(1334, 2); // 600 + 1000 - 105 - 161
    expect(estimateBmr(20, 'unspecified', 175, 70)).toBeCloseTo(1698.75 - 5 - 78, 2);
  });
  it('TDEE uses the activity multiplier', () => {
    const m = computeMetrics({ age: 20, sex: 'male', heightCm: 175, weightKg: 70, activityLevel: 'light', goal: 'maintain', pace: 'steady' });
    expect(m.bmr).toBe(1699);
    expect(m.tdee).toBe(Math.round(1698.75 * 1.375));
    expect(m.suggestedCalories).toBe(Math.round((1698.75 * 1.375) / 10) * 10);
  });
});

describe('calorie and protein suggestions', () => {
  it('uses a ~550 kcal deficit for the steady pace', () => {
    const m = metricsForProfile(base());
    expect(m.tdee - m.suggestedCalories).toBeGreaterThanOrEqual(540);
    expect(m.tdee - m.suggestedCalories).toBeLessThanOrEqual(560);
    expect(m.suggestedCalories % 10).toBe(0);
  });

  it('range runs from the steady target up to the gentle target', () => {
    const m = metricsForProfile(base());
    expect(m.calorieRange.low).toBeLessThan(m.calorieRange.high);
    expect(m.suggestedCalories).toBeGreaterThanOrEqual(m.calorieRange.low);
    expect(m.suggestedCalories).toBeLessThanOrEqual(m.calorieRange.high);
  });

  it('never suggests less than the safety floor', () => {
    const small = computeMetrics({ age: 25, sex: 'female', heightCm: 150, weightKg: 45, activityLevel: 'sedentary', goal: 'lose', pace: 'brisk' });
    expect(small.suggestedCalories).toBeGreaterThanOrEqual(calorieFloor('female'));
    expect(small.limited).toBe(true);
  });

  it('never cuts more than 25% of maintenance', () => {
    for (const pace of ['gentle', 'steady', 'brisk'] as const) {
      const m = computeMetrics({ age: 30, sex: 'male', heightCm: 170, weightKg: 65, activityLevel: 'sedentary', goal: 'lose', pace });
      expect(m.suggestedCalories).toBeGreaterThanOrEqual(m.tdee * 0.75 - 10);
    }
  });

  it('limits the deficit for under-18s', () => {
    const adult = computeMetrics({ age: 25, sex: 'male', heightCm: 175, weightKg: 90, activityLevel: 'moderate', goal: 'lose', pace: 'brisk' });
    const teen = computeMetrics({ age: 17, sex: 'male', heightCm: 175, weightKg: 90, activityLevel: 'moderate', goal: 'lose', pace: 'brisk' });
    expect(teen.deficit).toBeLessThan(adult.deficit);
    expect(teen.deficit).toBeLessThanOrEqual(285);
  });

  it('protein suggestion is about 1.2 g per kg', () => {
    const m = metricsForProfile(base({ currentWeightKg: 70 }));
    expect(m.suggestedProtein).toBe(85);
    expect(m.proteinRange).toEqual({ low: 70, high: 110 });
  });

  it('recalculates when the profile changes, and manual overrides win over estimates', () => {
    const auto = effectiveTargets(base());
    const heavier = effectiveTargets(base({ currentWeightKg: 90 }));
    expect(heavier.calories).toBeGreaterThan(auto.calories);
    expect(heavier.protein).toBeGreaterThan(auto.protein);
    const custom = effectiveTargets(base({ calorieTarget: 1800, proteinTarget: 100 }));
    expect(custom).toMatchObject({ calories: 1800, protein: 100, customCalories: true, customProtein: true });
    expect(auto.customCalories).toBe(false);
  });
});

describe('profile validation', () => {
  const TODAY = '2026-11-22';
  it('accepts a sensible profile', () => {
    expect(validateProfile(base(), TODAY).errors).toEqual({});
  });
  it('rejects out-of-range numbers', () => {
    const { errors } = validateProfile(base({ age: 5, heightCm: 20, currentWeightKg: 10, waterTargetMl: 10 }), TODAY);
    expect(Object.keys(errors).sort()).toEqual(['age', 'currentWeightKg', 'heightCm', 'waterTargetMl'].sort());
  });
  it('requires a loss target below the current weight', () => {
    expect(validateProfile(base({ targetWeightKg: 80 }), TODAY).errors.targetWeightKg).toBeDefined();
    expect(validateProfile(base({ targetWeightKg: 85 }), TODAY).errors.targetWeightKg).toBeDefined();
  });
  it('does not allow a target that would be below the healthy BMI range', () => {
    // 175 cm -> BMI 18.5 at ~56.7 kg
    expect(validateProfile(base({ targetWeightKg: 55 }), TODAY).errors.targetWeightKg).toMatch(/healthy BMI/);
    expect(validateProfile(base({ targetWeightKg: 58 }), TODAY).errors.targetWeightKg).toBeUndefined();
  });
  it('rejects impossible calendar dates instead of allowing date rollover', () => {
    expect(validateProfile(base({ targetDate: '2026-02-31' }), TODAY).errors.targetDate).toMatch(/valid calendar date/);
  });
    it('blocks target dates that need more than 1 kg/week and warns near the limit', () => {
    const tooFast = validateProfile(base({ targetDate: '2026-12-06' }), TODAY); // 8 kg in 2 weeks
    expect(tooFast.errors.targetDate).toMatch(/too fast/);
    const ok = validateProfile(base({ targetDate: '2027-03-22' }), TODAY); // 8 kg in ~17 weeks
    expect(ok.errors.targetDate).toBeUndefined();
    const edge = validateProfile(base({ targetDate: '2027-01-17' }), TODAY); // ~8kg / 8 weeks = 1.0 -> about 0.9
    expect(edge.errors.targetDate).toBeUndefined();
    expect(edge.warnings.length).toBeGreaterThan(0);
    expect(validateProfile(base({ targetDate: '2026-11-01' }), TODAY).errors.targetDate).toMatch(/future/);
  });
  it('rejects very low custom calorie targets and warns below the floor', () => {
    expect(validateProfile(base({ calorieTarget: 800 }), TODAY).errors.calorieTarget).toBeDefined();
    const warn = validateProfile(base({ calorieTarget: 1300 }), TODAY);
    expect(warn.errors.calorieTarget).toBeUndefined();
    expect(warn.warnings.some((w) => /very low/.test(w))).toBe(true);
  });
  it('warns for under-18s', () => {
    expect(validateProfile(base({ age: 17 }), TODAY).warnings.some((w) => /under 18/.test(w))).toBe(true);
  });
  it('maintain goal does not need a lower target', () => {
    expect(validateProfile(base({ goal: 'maintain', targetWeightKg: 80 }), TODAY).errors.targetWeightKg).toBeUndefined();
  });
});

describe('goal date estimate', () => {
  it('uses the selected pace', () => {
    const est = estimateGoalDate(base({ pace: 'steady' }), 80, '2026-11-22')!;
    expect(est.weeks).toBe(16); // 8 kg at 0.5 kg/week
    expect(est.dateKey).toBe('2027-03-14');
    expect(estimateGoalDate(base({ goal: 'maintain' }), 80, '2026-11-22')).toBeNull();
    expect(estimateGoalDate(base(), 70, '2026-11-22')).toBeNull(); // already below target
  });
});

describe('nutrition scaling', () => {
  const food = { calories: 200, protein: 10, carbs: 30, fat: 5, servingGrams: 100 as number | null };
  it('scales by portion size and servings', () => {
    expect(scaleNutrition(food, 'medium', null, 1)).toEqual({ calories: 200, protein: 10, carbs: 30, fat: 5 });
    expect(scaleNutrition(food, 'small', null, 1).calories).toBe(150);
    expect(scaleNutrition(food, 'large', null, 2)).toEqual({ calories: 600, protein: 30, carbs: 90, fat: 15 });
  });
  it('uses custom serving weight relative to the base serving', () => {
    expect(scaleNutrition(food, 'custom', 150, 2)).toEqual({ calories: 600, protein: 30, carbs: 90, fat: 15 });
    expect(scaleNutrition({ ...food, servingGrams: null }, 'custom', 150, 1).calories).toBe(200); // no base weight: falls back to 1x
  });
  it('rounds sensibly', () => {
    expect(scaleNutrition({ calories: 133, protein: 3.33, carbs: 7, fat: 1.11, servingGrams: null }, 'small', null, 1)).toEqual({ calories: 100, protein: 2.5, carbs: 5.3, fat: 0.8 });
  });
  it('estimates exercise calories as MET x kg x hours', () => {
    expect(estimateExerciseCalories('Walking', 60, 70)).toBe(Math.round(3.5 * 70));
    expect(estimateExerciseCalories('Unknown thing', 30, 80)).toBe(Math.round(4 * 80 * 0.5));
  });
});

describe('starter food database', () => {
  it('has unique ids and sensible fields', () => {
    const ids = new Set(STARTER_FOODS.map((f) => f.id));
    expect(ids.size).toBe(STARTER_FOODS.length);
    for (const f of STARTER_FOODS) {
      expect(f.name.length).toBeGreaterThan(1);
      expect(f.approximate).toBe(true);
      expect(f.source).toBe('starter');
      expect(f.meals.length).toBeGreaterThan(0);
      expect(f.calories).toBeGreaterThanOrEqual(0);
    }
  });

  it('contains every dish group requested from the mess menu', () => {
    const names = STARTER_FOODS.map((f) => f.name.toLowerCase()).join(' | ');
    for (const needle of ['aloo paratha', 'plain paratha', 'idli with sambhar', 'poha', 'vegetable dalia', 'upma', 'sandwich', 'dal', 'rajma', 'chole', 'paneer', 'plain rice', 'roti', 'curd', 'raita', 'samosa', 'bread roll', 'bhel puri', 'vada pav', 'hakka noodles']) {
      expect(names).toContain(needle);
    }
  });

  it('keeps calories roughly consistent with the macros (4/4/9 kcal per g, +/-35%)', () => {
    const off = STARTER_FOODS.filter((f) => {
      const fromMacros = 4 * f.protein + 4 * f.carbs + 9 * f.fat;
      if (f.calories < 60) return false; // tiny items / drinks: rounding dominates
      return Math.abs(fromMacros - f.calories) / f.calories > 0.35;
    });
    expect(off.map((f) => `${f.name}: ${f.calories} vs ${4 * f.protein + 4 * f.carbs + 9 * f.fat}`)).toEqual([]);
  });
});

import { calorieBudget as _cb } from './health';
describe('calorieBudget', () => {
  it('ignores exercise unless the setting is on', () => {
    expect(_cb(1800, false, 400, 1000)).toEqual({ budget: 1800, exerciseBonus: 0, remaining: 800 });
  });
  it('adds half of the burn when enabled and can go negative', () => {
    expect(_cb(1800, true, 400, 2100)).toEqual({ budget: 2000, exerciseBonus: 200, remaining: -100 });
  });
});
