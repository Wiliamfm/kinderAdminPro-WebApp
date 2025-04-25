import { routeAction$, server$, z, zod$ } from "@builder.io/qwik-city";
import { IdentityRolesEnum, IdentityUser } from "~/types/identity.types";
import { BaseError } from "~/types/shared.types";

let user: IdentityUser | null = null;

export const getUserStatus = server$(async function(username: string | null = null) {
  if (username) {
    const info = getUserInfo(username);
    user = {
      id: "1",
      email: username,
      role: info.role,
      name: info.name,
    } as IdentityUser;
    return user;
  }
  return user;
});

export const useLogin = routeAction$(async (data, event) => {
  if (data.password !== "1234") {
    return event.fail(401, { message: "Credenciales inválidas!" });
  }
  const info = getUserInfo(data.username);
  user = {
    id: "1",
    email: data.username,
    role: info.role,
    name: info.name,
  } as IdentityUser;
  if (user instanceof BaseError) {
    return event.fail(user.status, { message: user.message });
  }
  event.cookie.set("username", data.username, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 60 * 15 });
  return {
    success: true
  }
}, zod$({
  username: z.string().email(),
  password: z.string(),
}));

function getUserInfo(email: string) {
  switch (email) {
    case "admin@test.com":
      return { name: "admin", role: IdentityRolesEnum.Admin };
    case "professor@test.com":
      return { name: "professor", role: IdentityRolesEnum.Professor };
    case "tutor@test.com":
      return { name: "parent", role: IdentityRolesEnum.Parent };
    default:
      return { name: "parent", role: IdentityRolesEnum.Parent };
  }
}
