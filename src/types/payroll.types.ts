import { TableActions } from "./shared.types";

export type Employee = TableActions & {
  id: string;
  name: string;
  job: string;
  salary: number;
}
