export type SortDirection = 'asc' | 'desc';

export type SortState<TSortKey extends string> = {
  key: TSortKey;
  direction: SortDirection;
};

type SortableValue = string | number | boolean | null | undefined;
type SortAccessorMap<TRow, TSortKey extends string> = Record<TSortKey, (row: TRow) => SortableValue>;

const collator = new Intl.Collator('es-CO', {
  numeric: true,
  sensitivity: 'base',
});

function isEmptyValue(value: SortableValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (typeof value === 'number') return Number.isNaN(value);
  return false;
}

function compareFilledValues(left: SortableValue, right: SortableValue): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }

  return collator.compare(String(left), String(right));
}

export function toggleSort<TSortKey extends string>(
  current: SortState<TSortKey>,
  nextKey: TSortKey,
): SortState<TSortKey> {
  if (current.key === nextKey) {
    return {
      key: nextKey,
      direction: current.direction === 'asc' ? 'desc' : 'asc',
    };
  }

  return {
    key: nextKey,
    direction: 'asc',
  };
}

export function sortRows<TRow, TSortKey extends string>(
  rows: TRow[],
  sort: SortState<TSortKey>,
  accessors: SortAccessorMap<TRow, TSortKey>,
): TRow[] {
  const getSortValue = accessors[sort.key];
  const directionMultiplier = sort.direction === 'asc' ? 1 : -1;

  return rows
    .map((row, index) => ({ row, index }))
    .sort((leftItem, rightItem) => {
      const leftValue = getSortValue(leftItem.row);
      const rightValue = getSortValue(rightItem.row);
      const leftEmpty = isEmptyValue(leftValue);
      const rightEmpty = isEmptyValue(rightValue);

      if (leftEmpty && rightEmpty) {
        return leftItem.index - rightItem.index;
      }

      if (leftEmpty) return 1;
      if (rightEmpty) return -1;

      const valueComparison = compareFilledValues(leftValue, rightValue);
      if (valueComparison !== 0) {
        return valueComparison * directionMultiplier;
      }

      return leftItem.index - rightItem.index;
    })
    .map(({ row }) => row);
}
