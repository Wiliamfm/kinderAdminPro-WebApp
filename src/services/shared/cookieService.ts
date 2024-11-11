import { $ } from "@builder.io/qwik";
import { Cookie } from "@builder.io/qwik-city/middleware/request-handler";
import { isBrowser } from "@builder.io/qwik/build";

export const setSecureCookie = $((cookie: Cookie, name: string, value: string) => {
  if(isBrowser){
    throw new Error("setSecureCookie is not supported in the browser");
  }
  console.log("setSecureCookie: ", value);
  cookie.set(name, value, {
    path: "/",
    secure: true,
    httpOnly: true,
    //Expires in 15 in in future.
    expires: new Date(Date.now() + 1000 * 60 * 15),
  });
});
