export type EmployeeResponse = {
  id: number;
  name: string;
  job: EmployeeJobResponse;
}

export type CreateEmployeeRequest = {
  name: string;
  email: string;
  password: string;
  jobId: number;
}

export type UpdateEmployeeRequest = {
  id: number;
  name: string;
  jobId: number;
}

export type EmployeeJobResponse = {
  id: number;
  name: string;
  salary: number;
  gradeId: number;
}

export type CreateEmployeeJobRequest = {
  name: string;
  salary: number;
  gradeId: number;
}

export type UpdateEmployeeJobRequest = {
  id: number;
  name: string;
  salary: number;
}

export type EmployeeLeaveResponse = {
  id: number;
  employeeId: number;
  startDate: Date;
  endDate: Date;
}

export type CreateEmployeeLeaveRequest = {
  employeeId: number;
  startDate: Date;
  endDate: Date;
}

export type EmployeeInvoiceResponse = {
  id: number;
  employeeId: number;
  invoiceDate: Date;
  invoicePath: string;
  fileName: string;
}

export type EmployeeInvoiceRequest = {
  employeeId: number;
}

export type CalendarEvent = {
  id?: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
}
