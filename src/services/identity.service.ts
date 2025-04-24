import { routeAction$, server$, z, zod$ } from "@builder.io/qwik-city";
import { IdentityRolesEnum, IdentityUser } from "~/types/identity.types";
import { BaseError } from "~/types/shared.types";

let user: IdentityUser | null = null;

export const getUserStatus = server$(async function() {
  return user;
});

export const useLogin = routeAction$(async (data, event) => {
  if (data.password !== "1234") {
    return event.fail(401, { message: "Credenciales inválidas!" });
  }
  user = {
    id: "1",
    email: data.username,
    role: getUserRole(data.username),
    name: "admin",
  } as IdentityUser;
  if (user instanceof BaseError) {
    return event.fail(user.status, { message: user.message });
  }
  event.cookie.set("username", data.username, { httpOnly: true, secure: true, maxAge: 60 * 15 });
  return {
    success: true
  }
}, zod$({
  username: z.string().email(),
  password: z.string(),
}));

function getUserRole(email: string) {
  switch (email) {
    case "admin@test.com":
      return IdentityRolesEnum.Admin;
    case "professor@test.com":
      return IdentityRolesEnum.Professor;
    case "tutor@test.com":
      return IdentityRolesEnum.Parent;
    default:
      return IdentityRolesEnum.Parent;
  }
}
