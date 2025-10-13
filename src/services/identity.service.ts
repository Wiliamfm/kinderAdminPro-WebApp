import { routeAction$, server$, z, zod$ } from "@builder.io/qwik-city";
import { IdentityUser } from "~/types/identity.types";
import { getSupabase } from "./supabase.service";

export const getUserStatus = server$(async function (email: string | null = null) {
  if (!email) {
    return null;
  }
  return getAppUser(email);
});

export const useLogin = routeAction$(async (data, event) => {
  // const res = await getSupabase().auth.signInWithPassword({
  //   email: data.username,
  //   password: data.password
  // });
  // if (res.error) {
  //   console.error("Unable to login:\n", res.error);
  //   return event.fail(401, { message: "Credenciales inválidas!" });
  // }
  const user = await getAppUser(data.username);
  if (!user || user.password !== data.password) {
    return event.fail(401, { message: "Credenciales inválidas!" });
  }
  event.cookie.set("username", user.email, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 60 * 60 });
  return {
    success: true
  }
}, zod$({
  username: z.string().email(),
  password: z.string(),
}));

async function getAppUser(email: string): Promise<IdentityUser | null> {
  const { data, error } = await getSupabase().from("Users").select(`
    id,
    user_id,
    email,
    name,
    password,
    role_id(*)
    `).eq("email", email).single();
  if (error) {
    console.error(`Unable to fetch user ${email}:\n`, error);
    return null;
  }
  if (data.role_id.length === 0) {
    console.error(`User ${email} has no role`);
    return null;
  }
  /* eslint-disable */
  const role = (data.role_id as any).name;
  /* eslint-enable */
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: role,
    password: data.password,
    userId: data.user_id
  } as IdentityUser;
}
