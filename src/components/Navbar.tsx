import { A } from '@solidjs/router';
import { Show, createSignal, onCleanup, onMount, type Component } from 'solid-js';

type NavbarProps = {
  currentPath: string;
  onLogout: () => void;
  userName: string;
  userEmail: string;
};

const tabs = [
  { href: '/staff-management', label: 'Gestión de personal' },
  { href: '/enrollment-management', label: 'Gestión de matrícula' },
  { href: '/reports', label: 'Informes' },
  { href: '/event-management', label: 'Gestión de eventos' },
];

const Navbar: Component<NavbarProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  let menuRef: HTMLDivElement | undefined;
  let buttonRef: HTMLButtonElement | undefined;

  const isActive = (href: string) => props.currentPath === href;

  onMount(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!open()) return;

      const target = event.target as Node | null;
      const inMenu = !!(target && menuRef?.contains(target));
      const inButton = !!(target && buttonRef?.contains(target));

      if (!inMenu && !inButton) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onEscape);

    onCleanup(() => {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onEscape);
    });
  });

  return (
    <nav class="bg-yellow-300 text-gray-900 px-4 border-b border-yellow-400">
      <div class="flex items-center gap-3 py-2">
        <A href="/" class="font-semibold px-2 py-1 rounded-lg hover:bg-yellow-200">
          KinderAdminPro
        </A>

        <div class="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <A
              href={tab.href}
              class="px-3 py-1 rounded-lg text-sm border transition-colors"
              classList={{
                'bg-white border-yellow-500': isActive(tab.href),
                'bg-yellow-100 border-yellow-300 hover:bg-yellow-200': !isActive(tab.href),
              }}
            >
              {tab.label}
            </A>
          ))}
        </div>

        <div class="ml-auto relative">
          <button
            ref={buttonRef}
            type="button"
            class="h-9 w-9 rounded-full border border-yellow-600 bg-yellow-100 hover:bg-yellow-200 text-lg flex items-center justify-center"
            aria-label="Usuario"
            aria-haspopup="menu"
            aria-expanded={open()}
            aria-controls="user-menu"
            onClick={() => setOpen((value) => !value)}
          >
            <i class="bi bi-person-circle" aria-hidden="true"></i>
          </button>

          <Show when={open()}>
            <div
              ref={menuRef}
              id="user-menu"
              class="absolute right-0 mt-2 min-w-64 rounded-xl border border-yellow-300 bg-white shadow-lg p-3 z-20"
            >
              <p class="text-sm text-gray-500">Usuario</p>
              <p class="font-medium text-gray-900">{props.userName}</p>
              <p class="text-sm text-gray-700 break-all">{props.userEmail}</p>

              <button
                type="button"
                class="mt-3 w-full rounded-lg border border-yellow-500 bg-yellow-100 px-3 py-2 text-sm hover:bg-yellow-200 inline-flex items-center justify-center gap-2"
                onClick={() => {
                  setOpen(false);
                  props.onLogout();
                }}
              >
                <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
                Cerrar sesión
              </button>
            </div>
          </Show>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
