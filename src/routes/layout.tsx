import { component$, Slot } from "@builder.io/qwik";
import { type RequestHandler } from "@builder.io/qwik-city";
import { isAuthenticated } from "../services/auth/AuthService";

export const onRequest: RequestHandler = async (event) => {
  let userIdCookie = event.cookie.get("user_id");
  if((!userIdCookie || !(await isAuthenticated(userIdCookie.value))) && !event.url.pathname.toLowerCase().startsWith("/login")){
    throw event.redirect(308, "/login");
  }
}

export const onGet: RequestHandler = async ({ cacheControl }) => {
  // Control caching for this request for best performance and to reduce hosting costs:
  // https://qwik.dev/docs/caching/
  cacheControl({
    // Always serve a cached response by default, up to a week stale
    staleWhileRevalidate: 60 * 60 * 24 * 7,
    // Max once every 5 seconds, revalidate on the server to get a fresh version of this page
    maxAge: 5,
  });
};

export default component$(() => {
  return <Slot />;
});
