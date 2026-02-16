import { A, useLocation } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";

type NavBarProps = {
  name: string;
  email: string;
  onLogout: () => void;
};

const tabs = [
  { label: "Inicio", href: "/" },
  { label: "Gestion de personal", href: "/gestion-personal" },
  { label: "Gestion de matriculas", href: "/gestion-matriculas" },
  { label: "Informes y gestion de eventos", href: "/informes-eventos" },
];

export default function NavBar(props: NavBarProps) {
  const location = useLocation();
  const [showUserInfo, setShowUserInfo] = createSignal(false);

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  return (
    <header class="app-nav">
      <p class="app-brand">KinderAdminPro</p>

      <nav aria-label="Main navigation">
        <ul class="nav-tabs">
          <For each={tabs}>
            {tab => (
              <li>
                <A
                  href={tab.href}
                  class="nav-tab"
                  classList={{ active: isActive(tab.href) }}
                >
                  {tab.label}
                </A>
              </li>
            )}
          </For>
        </ul>
      </nav>

      <div class="user-menu">
        <button
          type="button"
          class="user-icon-button"
          aria-label="Toggle user information"
          onClick={() => setShowUserInfo(current => !current)}
        >
          👤
        </button>

        <Show when={showUserInfo()}>
          <section class="user-panel">
            <h2>Usuario</h2>
            <p>
              <strong>Nombre:</strong> {props.name}
            </p>
            <p>
              <strong>Email:</strong> {props.email}
            </p>
            <button type="button" class="logout-button" onClick={props.onLogout}>
              Cerrar sesion
            </button>
          </section>
        </Show>
      </div>
    </header>
  );
}
