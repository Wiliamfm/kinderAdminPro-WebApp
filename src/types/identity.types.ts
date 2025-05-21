export enum IdentityRolesEnum {
  Admin = "admin",
  Professor = "professor",
  Parent = "parent",
}

export type IdentityUser = {
  id: number;
  name: string;
  email: string;
  role: IdentityRolesEnum;
  userId: string;
};
