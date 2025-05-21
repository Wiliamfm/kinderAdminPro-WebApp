import { routeAction$, server$, z, zod$ } from "@builder.io/qwik-city";
import { IdentityUser } from "~/types/identity.types";
import { getSupabase } from "./supabase.service";

export const getUserStatus = server$(async function(userId: string | null = null) {
  if (!userId) {
    return null;
  }
  return getAppUser(userId);
});

export const useLogin = routeAction$(async (data, event) => {
  const res = await getSupabase().auth.signInWithPassword({
    email: data.username,
    password: data.password
  });
  if (res.error) {
    console.error("Unable to login:\n", res.error);
    return event.fail(401, { message: "Credenciales inválidas!" });
  }
  const user = await getAppUser(res.data.user.id);
  if (!user) {
    return event.fail(401, { message: "Credenciales inválidas!" });
  }
  event.cookie.set("username", user.userId, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 60 * 15 });
  return {
    success: true
  }
}, zod$({
  username: z.string().email(),
  password: z.string(),
}));

async function getAppUser(userId: string): Promise<IdentityUser | null> {
  const { data, error } = await getSupabase().from("Users").select(`
    id,
    user_id,
    email,
    name,
    role_id(*)
    `).eq("user_id", userId).single();
  if (error) {
    console.error(`Unable to fetch user ${userId}:\n`, error);
    return null;
  }
  if (data.role_id.length === 0) {
    console.error(`User ${userId} has no role`);
    return null;
  }
  const role = data.role_id.name;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: role,
    userId: data.user_id
  } as IdentityUser;
}
