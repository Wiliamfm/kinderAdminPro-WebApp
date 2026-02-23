import { Show, createEffect, onCleanup, type Component, type JSX } from 'solid-js';

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  variant?: 'default' | 'danger';
  size?: 'md' | 'xl';
  onConfirm: () => void;
  onClose: () => void;
  children?: JSX.Element;
};

const Modal: Component<ModalProps> = (props) => {
  createEffect(() => {
    if (!props.open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !props.busy) {
        props.onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    onCleanup(() => document.removeEventListener('keydown', onKeyDown));
  });

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        onClick={(event) => {
          if (event.target === event.currentTarget && !props.busy) {
            props.onClose();
          }
        }}
      >
        <div
          class="w-full rounded-xl border border-yellow-300 bg-white p-6 shadow-xl"
          classList={{
            'max-w-md': props.size !== 'xl',
            'max-w-4xl': props.size === 'xl',
          }}
        >
          <h2 class="text-lg font-semibold text-gray-900">{props.title}</h2>
          <Show when={props.description}>
            <p class="mt-2 text-sm text-gray-600">{props.description}</p>
          </Show>
          <Show when={props.children}>
            <div class="mt-3">{props.children}</div>
          </Show>

          <div class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={props.busy}
              onClick={props.onClose}
            >
              {props.cancelLabel ?? 'Cancelar'}
            </button>
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              classList={{
                'bg-yellow-600 hover:bg-yellow-700': props.variant !== 'danger',
                'bg-red-600 hover:bg-red-700': props.variant === 'danger',
              }}
              disabled={props.busy}
              onClick={props.onConfirm}
            >
              {props.busy ? 'Procesando...' : props.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default Modal;
