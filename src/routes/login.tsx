import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createSignal, onMount } from "solid-js";
import { isAuthenticated, login } from "~/lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");

  onMount(() => {
    if (isAuthenticated()) {
      navigate("/", { replace: true });
    }
  });

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await login(email(), password());
      navigate("/", { replace: true });
    } catch (error: unknown) {
      if (error instanceof Error && (error.message === "400" || error.message === "401")) {
        setErrorMessage("Invalid email or password.");
      } else {
        setErrorMessage("Unable to sign in right now.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main class="auth-page">
      <Title>KinderAdminPro | Login</Title>

      <section class="auth-card">
        <h1>Login</h1>

        <form class="auth-form" onSubmit={handleSubmit}>
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            autocomplete="email"
            required
            value={email()}
            onInput={event => setEmail(event.currentTarget.value)}
          />

          <label for="password">Password</label>
          <div class="password-field">
            <input
              id="password"
              type={showPassword() ? "text" : "password"}
              name="password"
              autocomplete="current-password"
              required
              value={password()}
              onInput={event => setPassword(event.currentTarget.value)}
            />
            <button
              class="password-toggle"
              type="button"
              aria-label={showPassword() ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(current => !current)}
            >
              {showPassword() ? "🙈" : "👁"}
            </button>
          </div>

          {errorMessage() && <p class="form-error">{errorMessage()}</p>}

          <button class="auth-submit" type="submit" disabled={isSubmitting()}>
            {isSubmitting() ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
