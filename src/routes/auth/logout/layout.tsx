import { RequestHandler } from "@builder.io/qwik-city";

export const onRequest: RequestHandler = async (event) => {
  //TODO: Check how to fix this: sometimes it does not reload the entire page (header stays).
  event.cookie.set("username", "", { httpOnly: true, path: "/", secure: true, maxAge: 0 });
  event.headers.set("Location", "/auth/login");
  //throw event.redirect(308, "/auth/login");
  event.json(308, { success: true });
};
