export type EmployeeResponse = {
  id: number;
  name: string;
  job: EmployeeJobResponse;
}

export type CreateEmployeeRequest = {
  name: string;
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
}

export type CreateEmployeeJobRequest = {
  name: string;
  salary: number;
}

export type UpdateEmployeeJobRequest = {
  id: string;
  name: string;
  salary: number;
}

export type EmployeeLeaveResponse = {
  id: string;
  employeeId: string;
  startDate: Date;
  endDate: Date;
}

export type CreateEmployeeLeaveRequest = {
  employeeId: string;
  startDate: Date;
  endDate: Date;
}

export type EmployeeInvoiceResponse = {
  id: string;
  employeeId: string;
  invoiceDate: Date;
  invoicePath: string;
  fileName: string;
}

export type EmployeeInvoiceRequest = {
  employeeId: string;
}

export type CreateEmployeeInvoiceRequest = {
  employeeId: string;
  fileName: string;
}

export type CalendarEvent = {
  id?: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
}
