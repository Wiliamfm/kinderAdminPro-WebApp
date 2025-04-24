import { routeLoader$ } from "@builder.io/qwik-city";
import { getUserStatus } from "~/services/identity.service";

export const useLoginStatus = routeLoader$(async (event) => {
  const username = event.cookie.get("username")?.value;
  const user = await getUserStatus(username);
  if (!user && event.url.pathname !== "/auth/login/") {
    return null;
  }
  return user;
});
