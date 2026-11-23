import { PencilLine, Plus, RotateCcw, Search, Star, Trash2, Utensils } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getStarterFood } from '../../data/starterFoods';
import { MEAL_TYPES } from '../../lib/health';
import { useApp } from '../../store/AppContext';
import type { FoodItem, MealType } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { FoodFormModal } from './FoodFormModal';

type Filter = 'all' | 'favorites' | 'custom' | MealType;

/** Searchable food list: favourites, custom foods, editing and restoring starter values. */
export function FoodDatabase() {
  const { data, actions } = useApp();
  const toast = useToast();
  const foods = data.health.foods;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<FoodItem | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return foods
      .filter((f) => (q ? f.name.toLowerCase().includes(q) : true))
      .filter((f) => {
        if (filter === 'all') return true;
        if (filter === 'favorites') return f.favorite;
        if (filter === 'custom') return f.source === 'custom';
        return f.meals.includes(filter);
      })
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
  }, [foods, query, filter]);

  const changed = (f: FoodItem) => {
    const s = getStarterFood(f.id);
    return !!s && (s.calories !== f.calories || s.protein !== f.protein || s.carbs !== f.carbs || s.fat !== f.fat || s.servingLabel !== f.servingLabel);
  };

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'favorites', label: 'Favourites' },
    { value: 'custom', label: 'My foods' },
    ...MEAL_TYPES.map((m) => ({ value: m.value as Filter, label: m.short })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="field pl-10" placeholder="Search foods" aria-label="Search foods" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary shrink-0" onClick={() => setAdding(true)}>
          <Plus size={17} /> <span className="hidden sm:inline">Add food</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="radiogroup" aria-label="Filter foods">
        {filters.map((f) => (
          <button key={f.value} type="button" role="radio" aria-checked={filter === f.value} onClick={() => setFilter(f.value)} className={`chip shrink-0 ${filter === f.value ? 'chip-on' : 'chip-off'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Starter foods come from the hostel mess menu. Their calories and macros are <strong>rough estimates</strong> for a typical serving, because
        real values depend on the recipe and how it is cooked. Edit any item to match what you actually eat.
      </p>

      {list.length === 0 ? (
        <EmptyState
          icon={<Utensils size={22} />}
          title={foods.length === 0 ? 'No foods yet' : 'No foods found'}
          description={query ? 'Try a different word, or add it as your own food.' : 'Add a custom food to get started.'}
          action={
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
              <Plus size={17} /> Add a food
            </button>
          }
        />
      ) : (
        <ul className="card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
          {list.slice(0, 200).map((f) => (
            <li key={f.id} className="flex items-center gap-1 py-1 pl-4 pr-1">
              <div className="min-w-0 flex-1 py-1.5">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {f.name}
                  {f.source === 'custom' && <span className="ml-2 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">MINE</span>}
                  {changed(f) && <span className="ml-2 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">EDITED</span>}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {f.servingLabel} · {f.approximate ? '~' : ''}
                  {f.calories} kcal · P {f.protein} · C {f.carbs} · F {f.fat}
                </p>
              </div>
              <button type="button" className="btn-icon" aria-pressed={f.favorite} aria-label={f.favorite ? `Remove ${f.name} from favourites` : `Add ${f.name} to favourites`} onClick={() => actions.updateFood(f.id, { favorite: !f.favorite })}>
                <Star size={18} className={f.favorite ? 'fill-amber-400 text-amber-500' : ''} />
              </button>
              <button type="button" className="btn-icon" aria-label={`Edit ${f.name}`} onClick={() => setEditing(f)}>
                <PencilLine size={17} />
              </button>
              {f.source === 'custom' ? (
                <button type="button" className="btn-icon hover:text-rose-600" aria-label={`Delete ${f.name}`} onClick={() => setDeleting(f)}>
                  <Trash2 size={17} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-icon disabled:opacity-30"
                  disabled={!changed(f)}
                  aria-label={`Restore original values for ${f.name}`}
                  title={changed(f) ? 'Restore original values' : 'Unchanged'}
                  onClick={() => {
                    actions.restoreStarterFood(f.id);
                    toast.show(`Restored ${f.name}`);
                  }}
                >
                  <RotateCcw size={17} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {list.length > 200 && <p className="text-center text-xs text-slate-400">Showing the first 200. Search to narrow the list.</p>}

      {adding && <FoodFormModal onClose={() => setAdding(false)} />}
      {editing && <FoodFormModal food={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          danger
          title="Delete this food?"
          message={`"${deleting.name}" will be removed from your food list. Meals you already logged with it keep their calories.`}
          confirmLabel="Delete"
          onConfirm={() => {
            actions.deleteFood(deleting.id);
            toast.show('Food deleted');
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
