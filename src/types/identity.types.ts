export enum IdentityRolesEnum {
  Admin = "admin",
  Professor = "professor",
  Parent = "parent",
}

export type IdentityUser = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: IdentityRolesEnum;
  userId: string;
};
