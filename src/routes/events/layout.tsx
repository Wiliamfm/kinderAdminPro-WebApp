import { RequestHandler } from "@builder.io/qwik-city";
import { getUserStatus } from "~/services/identity.service";
import { IdentityRolesEnum } from "~/types/identity.types";

export const onRequest: RequestHandler = async (event) => {
  const username = event.cookie.get("username")?.value;
  const user = await getUserStatus(username);
  if (!user || user.role !== IdentityRolesEnum.Admin) {
    // throw event.redirect(308, "/");
  }
};
