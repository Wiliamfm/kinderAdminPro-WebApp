import { routeLoader$ } from "@builder.io/qwik-city";

export const useLoginStatus = routeLoader$((event) => {
  const username = event.cookie.get("username");
  const loginStatus = {
    isLoggedIn: false,
  }
  if (!username) {
    console.log("not logged in, redirecting...");
    return loginStatus;
  }
  loginStatus.isLoggedIn = true;
  return loginStatus;
});
