import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { Show, onMount } from "solid-js";
import { getCurrentUser, isAuthenticated, logout } from "~/lib/auth";
import NavBar from "~/components/NavBar";

type ProtectedPageProps = {
  title: string;
  heading: string;
  description: string;
};

export default function ProtectedPage(props: ProtectedPageProps) {
  const navigate = useNavigate();

  onMount(() => {
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
    }
  });

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const user = getCurrentUser();
  const name = typeof user?.name === "string" ? user.name : "Usuario";
  const email = typeof user?.email === "string" ? user.email : "user";

  return (
    <Show
      when={isAuthenticated()}
      fallback={
        <main class="home-page">
          <Title>Redirecting</Title>
          <p>Redirecting to login...</p>
        </main>
      }
    >
      <main class="home-page">
        <Title>{props.title}</Title>
        <NavBar name={name} email={email} onLogout={handleLogout} />
        <section class="home-content">
          <h1>{props.heading}</h1>
          <p>{props.description}</p>
        </section>
      </main>
    </Show>
  );
}
