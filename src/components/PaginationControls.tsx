import { For } from 'solid-js';

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  busy?: boolean;
  class?: string;
  onPageChange: (page: number) => void;
};

type PaginationItem =
  | { type: 'page'; value: number }
  | { type: 'gap'; key: string };

const MAX_VISIBLE_PAGES_WITHOUT_GAPS = 7;

function buildPaginationItems(page: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 1) {
    return [];
  }

  const pages =
    totalPages <= MAX_VISIBLE_PAGES_WITHOUT_GAPS
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
          .filter((value) => value >= 1 && value <= totalPages)
          .sort((left, right) => left - right);

  return pages.flatMap((value, index) => {
    const previousValue = pages[index - 1];

    if (previousValue === undefined || value - previousValue === 1) {
      return [{ type: 'page', value }];
    }

    return [
      { type: 'gap', key: `gap-${previousValue}-${value}` },
      { type: 'page', value },
    ];
  });
}

export default function PaginationControls(props: PaginationControlsProps) {
  const safeTotalPages = () => Math.max(1, props.totalPages);
  const safePage = () => Math.min(Math.max(1, props.page), safeTotalPages());
  const canGoPrevious = () => safePage() > 1;
  const canGoNext = () => safePage() < safeTotalPages();
  const disabled = () => props.busy === true;
  const paginationItems = () => buildPaginationItems(safePage(), safeTotalPages());

  const changePage = (nextPage: number) => {
    if (disabled()) return;
    if (nextPage < 1 || nextPage > safeTotalPages()) return;
    if (nextPage === safePage()) return;

    props.onPageChange(nextPage);
  };

  return (
    <div class={props.class ?? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'}>
      <p class="text-xs text-gray-600">
        Página {safePage()} de {safeTotalPages()}
      </p>
      <div class="flex flex-wrap items-center gap-2 sm:justify-end">
        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled() || !canGoPrevious()}
          onClick={() => {
            if (!canGoPrevious()) return;
            changePage(safePage() - 1);
          }}
        >
          Anterior
        </button>
        <For each={paginationItems()}>
          {(item) =>
            item.type === 'gap' ? (
              <span
                aria-hidden="true"
                class="px-1 text-sm font-medium tracking-wide text-gray-500"
              >
                ...
              </span>
            ) : (
              <button
                type="button"
                aria-current={item.value === safePage() ? 'page' : undefined}
                class={`rounded-md border px-3 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  item.value === safePage()
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                }`}
                disabled={disabled() || item.value === safePage()}
                onClick={() => changePage(item.value)}
              >
                {item.value}
              </button>
            )
          }
        </For>
        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled() || !canGoNext()}
          onClick={() => {
            if (!canGoNext()) return;
            changePage(safePage() + 1);
          }}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
