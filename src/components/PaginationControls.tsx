type PaginationControlsProps = {
  page: number;
  totalPages: number;
  busy?: boolean;
  class?: string;
  onPageChange: (page: number) => void;
};

export default function PaginationControls(props: PaginationControlsProps) {
  const safeTotalPages = () => Math.max(1, props.totalPages);
  const canGoPrevious = () => props.page > 1;
  const canGoNext = () => props.page < safeTotalPages();
  const disabled = () => props.busy === true;

  return (
    <div class={props.class ?? 'flex items-center justify-between'}>
      <p class="text-xs text-gray-600">
        Página {props.page} de {safeTotalPages()}
      </p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled() || !canGoPrevious()}
          onClick={() => {
            if (!canGoPrevious()) return;
            props.onPageChange(props.page - 1);
          }}
        >
          Anterior
        </button>
        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled() || !canGoNext()}
          onClick={() => {
            if (!canGoNext()) return;
            props.onPageChange(props.page + 1);
          }}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
