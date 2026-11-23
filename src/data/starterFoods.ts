import type { FoodItem, MealType } from '../types';

/**
 * STARTER FOOD DATABASE - built from the item names on the Boys Hostel Mess Menu.
 *
 * The menu lists dishes only: it gives NO serving weights and NO nutrition values.
 * Every number below is therefore a rough ESTIMATE for a typical single serving of
 * that kind of dish, rounded on purpose, and is flagged `approximate: true`.
 * Real calories depend on the recipe, the amount of oil/ghee/sugar and the actual portion.
 * All entries are editable in the app (Food Diary -> Foods), and "Restore starter values"
 * brings an edited entry back to what is listed here.
 */

const B: MealType = 'breakfast';
const L: MealType = 'lunch';
const E: MealType = 'evening';
const D: MealType = 'dinner';

type Row = [
  name: string,
  serving: string,
  grams: number | null,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  meals: MealType[],
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const ROWS: Row[] = [
  // ---- Breakfast ------------------------------------------------------
  ['Aloo Paratha', '1 paratha (~100 g)', 100, 260, 5, 36, 10, [B]],
  ['Plain Paratha', '1 paratha (~70 g)', 70, 210, 4, 28, 9, [B, D]],
  ['Stuffed Mix Paratha', '1 paratha (~100 g)', 100, 250, 6, 33, 10, [B]],
  ['Stuffed Mooli / Gobhi / Onion Paratha', '1 paratha (~100 g)', 100, 240, 5, 33, 10, [B]],
  ['Missa Paratha', '1 paratha (~85 g)', 85, 230, 7, 30, 9, [B]],
  ['Soya Paneer Paratha', '1 paratha (~110 g)', 110, 280, 10, 30, 13, [B]],
  ['Poori', '2 pooris (~70 g)', 70, 240, 4, 28, 12, [B, L]],
  ['Kulcha (Toasted)', '1 kulcha (~80 g)', 80, 200, 5, 32, 5, [B, L]],
  ['Idli with Sambhar', '2 idli + small bowl sambhar', 200, 180, 6, 32, 2, [B]],
  ['Masala Vegetable Idli', '2 idli (~150 g)', 150, 190, 6, 32, 4, [B]],
  ['Mix Veg Uttapam', '1 uttapam (~150 g)', 150, 200, 6, 30, 6, [B]],
  ['Medu Vada with Sambhar', '2 vada + small bowl sambhar', 180, 300, 9, 30, 16, [B]],
  ['Poha (Indori Poha)', '1 plate (~150 g)', 150, 250, 5, 42, 7, [B]],
  ['Upma (Vermicelli / Rawa)', '1 plate (~170 g)', 170, 250, 6, 38, 8, [B]],
  ['Vegetable Dalia', '1 bowl (~200 g)', 200, 180, 6, 32, 3, [B]],
  ['Sweet / Milk Dalia', '1 bowl (~200 g)', 200, 220, 7, 38, 4, [B]],
  ['Sandwich (Cold / Veg Stuffed Toast)', '1 sandwich (2 slices)', 120, 220, 6, 30, 8, [B, E]],
  ['Mysore Bonda', '2 pieces (~90 g)', 90, 250, 5, 28, 13, [B]],
  ['Aloo Bonda', '2 pieces (~100 g)', 100, 260, 5, 32, 12, [B]],
  ['Minapa Punugulu', '4 pieces (~100 g)', 100, 280, 7, 30, 14, [B]],
  ['Hot Pongal', '1 bowl (~200 g)', 200, 280, 7, 40, 10, [B]],
  ['Tomato Bath', '1 plate (~200 g)', 200, 260, 6, 40, 8, [B]],
  ['Vegetable Macaroni', '1 plate (~200 g)', 200, 280, 8, 42, 8, [B]],
  ['Mangalore Bajji', '3 pieces (~90 g)', 90, 250, 5, 30, 12, [B]],
  ['Sprouts (Moong / Mix Dal / Soya)', '1 bowl (~100 g)', 100, 110, 8, 16, 1, [B]],
  ['Packed Curd', '1 cup (~100 g)', 100, 60, 3, 5, 3.5, [B, L, D]],
  ['Brown Bread', '2 slices (~50 g)', 50, 130, 5, 24, 2, [B]],
  ['White Bread', '2 slices (~50 g)', 50, 140, 4, 26, 2, [B]],
  ['Jam', '1 sachet (~10 g)', 10, 25, 0, 6, 0, [B]],
  ['Butter', '1 portion (~10 g)', 10, 70, 0, 0, 8, [B]],
  ['Banana', '1 medium (~100 g)', 100, 90, 1, 23, 0.3, [B, E, L, D]],
  ['Mixed Cut Fruits', '1 bowl (~120 g)', 120, 80, 1, 20, 0.3, [B, E, L, D]],
  ['Plain Milk', '1 glass (~200 ml)', 200, 120, 6, 10, 6, [B, E]],
  ['Masala Tea', '1 cup (~150 ml)', 150, 80, 2, 12, 3, [B, E]],
  ['Coffee (with milk & sugar)', '1 cup (~150 ml)', 150, 70, 2, 10, 3, [B, E]],
  ['Coconut Chutney', '2 tbsp (~30 g)', 30, 60, 1, 3, 5, [B]],
  ['Tomato Ketchup', '1 tbsp (~15 g)', 15, 20, 0, 5, 0, [B, E]],

  // ---- Lunch & dinner: dal, legumes -----------------------------------
  ['Dal (Yellow / Arhar / Moong / Masoor)', '1 katori (~150 ml)', 150, 130, 7, 16, 4, [L, D]],
  ['Dal Makhni', '1 katori (~150 ml)', 150, 200, 8, 18, 10, [L, D]],
  ['Dal Palak', '1 katori (~150 ml)', 150, 140, 8, 16, 5, [L, D]],
  ['Sambhar', '1 katori (~150 ml)', 150, 80, 4, 12, 2, [L, D, B]],
  ['Rasam', '1 katori (~150 ml)', 150, 40, 1, 6, 1, [L, D]],
  ['Rajma', '1 katori (~150 g)', 150, 190, 9, 26, 5, [L, D]],
  ['Chole (Pindi Chhole / White Chana)', '1 katori (~150 g)', 150, 210, 9, 28, 7, [L, D]],
  ['Black Chana', '1 katori (~150 g)', 150, 190, 9, 26, 5, [L, D]],
  ['Punjabi Kadhi Pakoda', '1 katori (~150 ml)', 150, 200, 6, 17, 12, [L, D]],

  // ---- Paneer ---------------------------------------------------------
  ['Paneer Curry (Kadai / Do Pyaza / Matar)', '1 katori (~150 g)', 150, 300, 13, 11, 23, [L, D]],
  ['Palak Paneer', '1 katori (~150 g)', 150, 250, 12, 10, 18, [L, D]],
  ['Paneer Butter Masala', '1 katori (~150 g)', 150, 330, 12, 12, 27, [L, D]],

  // ---- Vegetable curries ----------------------------------------------
  ['Mix Veg Curry', '1 katori (~150 g)', 150, 120, 3, 12, 7, [L, D]],
  ['Aloo Gobhi / Aloo Matar / Aloo Beans', '1 katori (~150 g)', 150, 150, 4, 18, 7, [L, D]],
  ['Bhindi Masala / Bhindi Do Pyaza', '1 katori (~120 g)', 120, 110, 2, 10, 7, [L, D]],
  ['Dum Aloo', '1 katori (~150 g)', 150, 190, 3, 22, 10, [L, D]],
  ['Baingan Bharta / Bagara Baingan', '1 katori (~150 g)', 150, 120, 2, 10, 8, [L, D]],
  ['Mushroom Curry (Matar / Chettinad)', '1 katori (~150 g)', 150, 140, 6, 10, 9, [L, D]],
  ['Soya Chaap Masala', '1 katori (~150 g)', 150, 220, 14, 12, 12, [L, D]],
  ['Nutri / Meal Maker Curry', '1 katori (~150 g)', 150, 180, 13, 12, 9, [L, D]],
  ['Veg Kofta (Mix Veg / Ghia Kofta) Curry', '1 katori (~150 g)', 150, 250, 6, 17, 17, [L, D]],
  ['Seasonal Vegetable (Dry)', '1 katori (~120 g)', 120, 100, 2, 10, 6, [L, D]],
  ['Cabbage / Beans Poriyal', '1 katori (~100 g)', 100, 80, 2, 8, 4, [L, D]],
  ['Avial / Vegetable Kurma / Sagu', '1 katori (~150 g)', 150, 140, 3, 10, 9, [L, D]],
  ['Gutti Vankaya / Vankaya Curry', '1 katori (~150 g)', 150, 150, 3, 11, 10, [L, D]],
  ['Mor Kuzhambu / Majjiga Pulusu', '1 katori (~150 ml)', 150, 100, 3, 8, 6, [L, D]],
  ['Veg 65 / Potato 65 / Cabbage 65', '6 pieces (~120 g)', 120, 250, 4, 28, 14, [L, D, E]],
  ['Mirchi Bajji', '2 pieces (~80 g)', 80, 200, 4, 18, 12, [L, E]],

  // ---- Rice -----------------------------------------------------------
  ['Plain Rice', '1 cup cooked (~150 g)', 150, 195, 4, 43, 0.5, [L, D]],
  ['Jeera Rice', '1 cup cooked (~150 g)', 150, 230, 4, 42, 5, [L, D]],
  ['Veg Pulao / Matar Pulao', '1 cup (~170 g)', 170, 250, 5, 42, 7, [L, D]],
  ['Lemon / Tomato / Coconut / Pudina Rice', '1 cup (~170 g)', 170, 250, 5, 42, 7, [L, D]],
  ['Curd Rice', '1 cup (~200 g)', 200, 220, 6, 32, 7, [L, D]],
  ['Bisi Bele Bath', '1 plate (~250 g)', 250, 280, 8, 42, 9, [L, D]],
  ['Vegetable Khichdi', '1 bowl (~250 g)', 250, 220, 8, 36, 4, [D, L]],
  ['Veg / Soya Biryani', '1 plate (~300 g)', 300, 400, 9, 60, 13, [L, D]],
  ['Fried Rice / Noodles (Manchurian combo)', '1 plate (~250 g)', 250, 320, 7, 48, 11, [D]],

  // ---- Breads ---------------------------------------------------------
  ['Roti', '1 roti (~40 g)', 40, 110, 3.5, 20, 2, [L, D]],
  ['Missi / Ajwain / Spinach Roti', '1 roti (~45 g)', 45, 125, 4, 20, 3, [L, D]],
  ['Bhatura', '1 piece (~80 g)', 80, 250, 5, 30, 12, [L]],

  // ---- Curd, raita, sides ---------------------------------------------
  ['Plain Curd', '1 katori (~100 g)', 100, 60, 3, 5, 3.5, [L, D]],
  ['Raita (Boondi / Mix-Veg / Lauki / Cucumber)', '1 katori (~100 g)', 100, 80, 3, 7, 4, [L, D]],
  ['Fruit Raita', '1 katori (~100 g)', 100, 90, 3, 12, 3, [L]],
  ['Dahi Bhalla', '2 pieces (~150 g)', 150, 200, 7, 22, 9, [L, D]],
  ['Green Salad', '1 plate (~80 g)', 80, 25, 1, 5, 0.2, [L, D]],
  ['Fryums', '5 pieces (~15 g)', 15, 60, 0.5, 9, 3, [L, D]],
  ['Pickle', '1 tsp (~10 g)', 10, 20, 0, 1, 2, [L, D]],

  // ---- Desserts -------------------------------------------------------
  ['Gulab Jamun', '1 piece (~50 g)', 50, 150, 2, 22, 6, [L, D]],
  ['Kheer (Semiya / Rice)', '1 katori (~120 g)', 120, 200, 5, 30, 7, [L, D]],
  ['Halwa (Suji / Moong Dal / Gajar)', '1 katori (~100 g)', 100, 250, 3, 35, 11, [L, D]],
  ['Rasgulla', '1 piece (~50 g)', 50, 120, 3, 25, 1, [L, D]],
  ['Barfi / Laddu (Besan, Coconut, Boondi)', '1 piece (~40 g)', 40, 160, 3, 18, 8, [L, D, E]],
  ['Ice Cream', '1 scoop (~70 g)', 70, 140, 2, 16, 7, [L, D]],

  // ---- Evening snacks -------------------------------------------------
  ['Samosa', '1 medium (~90 g)', 90, 260, 4, 28, 15, [E]],
  ['Bread Roll', '1 roll (~100 g)', 100, 220, 4, 30, 9, [E]],
  ['Bombay / Coleslaw Sandwich', '1 sandwich', 130, 240, 6, 28, 11, [E]],
  ['Bhel Puri', '1 plate (~120 g)', 120, 250, 5, 38, 9, [E]],
  ['Vada Pav', '1 piece (~140 g)', 140, 290, 7, 42, 11, [E]],
  ['Hakka Noodles', '1 plate (~250 g)', 250, 350, 8, 52, 12, [E, D]],
  ['Bread Pakoda', '1 piece (~100 g)', 100, 250, 6, 28, 13, [E]],
  ['Veg Bajji / Pakoda', '3 pieces (~90 g)', 90, 200, 4, 22, 11, [E]],
  ['Pav Bhaji', '1 plate (2 pav + bhaji)', 300, 400, 10, 55, 16, [E]],
  ['Kachouri with Aloo Sabji', '2 pieces + sabji', 200, 350, 7, 42, 17, [E]],
  ['Dabeli', '1 piece (~120 g)', 120, 280, 6, 40, 11, [E]],
  ['Tea', '1 cup (~150 ml)', 150, 80, 2, 12, 3, [E, B]],
  ['Lemon Water', '1 glass (~200 ml)', 200, 40, 0, 10, 0, [E]],
  ['Rooh Afza / Tang / Aam Panna', '1 glass (~200 ml)', 200, 75, 0, 18, 0, [E]],
];

export const STARTER_FOODS: FoodItem[] = ROWS.map(([name, servingLabel, servingGrams, calories, protein, carbs, fat, meals]) => ({
  id: `starter-${slug(name)}`,
  name,
  servingLabel,
  servingGrams,
  calories,
  protein,
  carbs,
  fat,
  source: 'starter',
  approximate: true,
  favorite: false,
  meals,
  note: 'Hostel mess menu item. Approximate values: actual calories depend on the recipe and portion.',
}));

const BY_ID = new Map(STARTER_FOODS.map((f) => [f.id, f]));

/** Original starter definition of a food, for "Restore starter values". */
export function getStarterFood(id: string): FoodItem | undefined {
  return BY_ID.get(id);
}

export function cloneStarterFoods(): FoodItem[] {
  return STARTER_FOODS.map((f) => ({ ...f, meals: [...f.meals] }));
}
