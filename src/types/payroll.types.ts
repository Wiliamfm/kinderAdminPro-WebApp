import { TableActions } from "./shared.types";

export type Employee = TableActions & {
  id: string;
  name: string;
  job: string;
  salary: number;
}

export type EmployeeResponse = {
  id: string;
  name: string;
  job: string;
  salary: number;
  leaves?: EmployeeLeave[];
}

export type EmployeeJobResponse = {
  id: string;
  name: string;
  salary: number;
}

export type EmployeeLeave = {
  id: string;
  startDate: Date;
  endDate: Date;
  employeeId: string;
}
