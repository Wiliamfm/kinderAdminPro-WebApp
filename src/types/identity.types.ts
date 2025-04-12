export enum IdentityRolesEnum {
  Admin = "admin",
  Professor = "professor",
  Parent = "parent",
}

export type IdentityUser = {
  id: string;
  name: string;
  email: string;
  role: IdentityRolesEnum;
};
