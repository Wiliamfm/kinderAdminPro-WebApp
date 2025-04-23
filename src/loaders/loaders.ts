import { routeLoader$ } from "@builder.io/qwik-city";
import { getUserStatus } from "~/services/identity.service";

export const useLoginStatus = routeLoader$(async (event) => {
  const user = await getUserStatus();
  if (!user && event.url.pathname !== "/auth/login/") {
    return null;
  }
  return user;
});
