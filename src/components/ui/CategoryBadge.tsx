import type { Category } from '../../types';

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${category.color}1f`, color: category.color }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
      <span className="truncate">{category.name}</span>
    </span>
  );
}
