import type { SortState } from '../lib/table/sorting';

type SortableHeaderCellProps<TSortKey extends string> = {
  label: string;
  columnKey: TSortKey;
  sort: SortState<TSortKey>;
  onSort: (key: TSortKey) => void;
  class?: string;
};

export default function SortableHeaderCell<TSortKey extends string>(
  props: SortableHeaderCellProps<TSortKey>,
) {
  const isActive = () => props.sort.key === props.columnKey;
  const direction = () => (isActive() ? props.sort.direction : null);

  return (
    <th
      class={props.class}
      aria-sort={
        direction() === 'asc'
          ? 'ascending'
          : direction() === 'desc'
            ? 'descending'
            : 'none'
      }
    >
      <button
        type="button"
        class="inline-flex w-full items-center justify-between gap-2 text-left"
        onClick={() => props.onSort(props.columnKey)}
      >
        <span>{props.label}</span>
        <span aria-hidden="true" class="text-xs text-gray-500">
          {direction() === 'asc' ? '▲' : direction() === 'desc' ? '▼' : '↕'}
        </span>
      </button>
    </th>
  );
}
