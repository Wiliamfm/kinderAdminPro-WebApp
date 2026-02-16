import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { Show, onMount } from "solid-js";
import { getCurrentUser, isAuthenticated, logout } from "~/lib/auth";

export default function Home() {
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
        <Title>Home</Title>
        <h1>Home</h1>
        <p>You are signed in as {email}.</p>
        <button type="button" onClick={handleLogout}>
          Sign out
        </button>
      </main>
    </Show>
  );
}
