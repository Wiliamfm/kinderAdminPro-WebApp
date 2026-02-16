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
  let triggerRef: SVGSVGElement | undefined;

  const isActive = (href: string) => props.currentPath === href;

  onMount(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!open()) return;

      const target = event.target as Node | null;
      const inMenu = !!(target && menuRef?.contains(target));
      const inTrigger = !!(target && triggerRef?.contains(target));

      if (!inMenu && !inTrigger) {
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
      <div class="flex justify-between items-center py-2">
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

        <div class="relative items-center">
          <svg
            ref={triggerRef}
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            fill="currentColor"
            class="bi bi-person-circle cursor-pointer"
            viewBox="0 0 16 16"
            role="button"
            tabindex="0"
            aria-label="Usuario"
            aria-haspopup="menu"
            aria-expanded={open()}
            onClick={() => setOpen((value) => !value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setOpen((value) => !value);
              }
            }}
          >
            <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
            <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"/>
          </svg>

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
                class="mt-3 w-full rounded-lg border border-yellow-500 bg-yellow-100 px-3 py-2 text-sm hover:bg-yellow-200"
                onClick={() => {
                  setOpen(false);
                  props.onLogout();
                }}
              >
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

