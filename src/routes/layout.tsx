import { component$, Slot } from "@builder.io/qwik";
import { type RequestHandler } from "@builder.io/qwik-city";
import Header from "~/components/layout/Header";
import { useLoginStatus } from "~/loaders/loaders";
import { getUserStatus } from "~/services/identity.service";

export { useLoginStatus } from "../loaders/loaders"

export const onRequest: RequestHandler = async (event) => {
  const user = await getUserStatus();
  if (!user && event.url.pathname !== "/auth/login/") {
    throw event.redirect(308, "/auth/login");
  }
};

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
  const loginStatusLoader = useLoginStatus();

  return (
    <div class="h-dvh">
      {loginStatusLoader.value && <Header />}
      < Slot />
    </div>
  );
});
