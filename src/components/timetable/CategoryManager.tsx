import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { COLOR_CHOICES } from '../../data/defaults';
import { useApp } from '../../store/AppContext';
import type { CategoryKind } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';

const KIND_LABELS: Record<CategoryKind, string> = {
  study: 'Study (counts as study + productive)',
  productive: 'Productive (counts as productive)',
  other: 'Other (not counted as productive)',
};

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
      {COLOR_CHOICES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value.toLowerCase() === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className="flex h-9 w-9 items-center justify-center rounded-full"
        >
          <span
            className={`block h-7 w-7 rounded-full transition-transform ${
              value.toLowerCase() === c ? 'scale-100 ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900' : 'scale-90'
            }`}
            style={{ backgroundColor: c }}
          />
        </button>
      ))}
    </div>
  );
}

/** Add, rename, recolour and delete categories. Used from the Timetable and Settings pages. */
export function CategoryManager({ onClose }: { onClose: () => void }) {
  const { data, actions } = useApp();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_CHOICES[10]);
  const [newKind, setNewKind] = useState<CategoryKind>('other');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const usage = (id: string) =>
    Object.values(data.timetable).reduce((n, list) => n + list.filter((a) => a.categoryId === id).length, 0);

  const nameTaken = data.categories.some((c) => c.name.trim().toLowerCase() === newName.trim().toLowerCase());

  const add = () => {
    const name = newName.trim();
    if (!name || nameTaken) return;
    actions.addCategory({ name, color: newColor, kind: newKind });
    setNewName('');
  };

  const toDelete = data.categories.find((c) => c.id === pendingDelete);

  return (
    <>
      <Modal title="Categories" onClose={onClose} wide footer={<button type="button" className="btn btn-primary" onClick={onClose}>Done</button>}>
        <form
          className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Add a custom category</p>
          <div className="space-y-3">
            <div>
              <label className="field-label" htmlFor="new-cat-name">
                Name
              </label>
              <input
                id="new-cat-name"
                className="field"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Gym, Reading"
                maxLength={30}
              />
              {newName.trim() && nameTaken && <p className="mt-1 text-xs text-rose-600">A category with this name already exists.</p>}
            </div>
            <div>
              <span className="field-label">Colour</span>
              <ColorPicker value={newColor} onChange={setNewColor} />
            </div>
            <div>
              <label className="field-label" htmlFor="new-cat-kind">
                Counts as
              </label>
              <select id="new-cat-kind" className="field" value={newKind} onChange={(e) => setNewKind(e.target.value as CategoryKind)}>
                {(Object.keys(KIND_LABELS) as CategoryKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={!newName.trim() || nameTaken}>
              <Plus size={16} /> Add category
            </button>
          </div>
        </form>

        <ul className="mt-4 space-y-2">
          {data.categories.map((c) => {
            const open = expanded === c.id;
            const used = usage(c.id);
            return (
              <li key={c.id} className="rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 pr-1">
                  <button
                    type="button"
                    className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 text-left"
                    onClick={() => setExpanded(open ? null : c.id)}
                    aria-expanded={open}
                  >
                    <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{c.name}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {used} {used === 1 ? 'activity' : 'activities'} · {c.kind}
                      </span>
                    </span>
                  </button>
                  {!c.builtIn && (
                    <button
                      type="button"
                      className="btn-icon"
                      aria-label={`Delete ${c.name}`}
                      onClick={() => setPendingDelete(c.id)}
                      title="Delete category"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                {open && (
                  <div className="space-y-3 border-t border-slate-100 p-3 dark:border-slate-800">
                    <div>
                      <label className="field-label" htmlFor={`cat-name-${c.id}`}>
                        Name
                      </label>
                      <input
                        id={`cat-name-${c.id}`}
                        className="field"
                        value={c.name}
                        maxLength={30}
                        onChange={(e) => actions.updateCategory(c.id, { name: e.target.value })}
                        onBlur={(e) => {
                          if (!e.target.value.trim()) actions.updateCategory(c.id, { name: 'Untitled' });
                        }}
                      />
                    </div>
                    <div>
                      <span className="field-label">Colour</span>
                      <ColorPicker value={c.color} onChange={(color) => actions.updateCategory(c.id, { color })} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor={`cat-kind-${c.id}`}>
                        Counts as
                      </label>
                      <select
                        id={`cat-kind-${c.id}`}
                        className="field"
                        value={c.kind}
                        onChange={(e) => actions.updateCategory(c.id, { kind: e.target.value as CategoryKind })}
                      >
                        {(Object.keys(KIND_LABELS) as CategoryKind[]).map((k) => (
                          <option key={k} value={k}>
                            {KIND_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </div>
                    {c.builtIn && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        This category powers a dashboard card, so it can be renamed or recoloured but not deleted.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Modal>
      {toDelete && (
        <DeleteCategoryDialog
          categoryId={toDelete.id}
          name={toDelete.name}
          used={usage(toDelete.id)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}

/** Confirms deletion; when activities still use the category they are moved to a category the user picks. */
function DeleteCategoryDialog({
  categoryId,
  name,
  used,
  onClose,
}: {
  categoryId: string;
  name: string;
  used: number;
  onClose: () => void;
}) {
  const { data, actions } = useApp();
  const options = data.categories.filter((c) => c.id !== categoryId);
  const [moveTo, setMoveTo] = useState(options[0]?.id ?? '');

  if (used === 0) {
    return (
      <ConfirmDialog
        title={`Delete "${name}"?`}
        message="No activity uses this category. It will be removed from the category list."
        confirmLabel="Delete"
        danger
        onConfirm={() => actions.deleteCategory(categoryId)}
        onCancel={onClose}
      />
    );
  }

  return (
    <Modal
      title={`Delete "${name}"?`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={!moveTo}
            onClick={() => {
              actions.deleteCategory(categoryId, moveTo);
              onClose();
            }}
          >
            Move activities and delete
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {used} {used === 1 ? 'activity uses' : 'activities use'} this category. Choose where {used === 1 ? 'it' : 'they'} should go
        before the category is removed.
      </p>
      <label className="field-label mt-4" htmlFor="move-to">
        Move activities to
      </label>
      <select id="move-to" className="field" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </Modal>
  );
}
