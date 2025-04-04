export type EmployeeResponse = {
  id: string;
  name: string;
  job: EmployeeJobResponse;
}

export type CreateEmployeeRequest = {
  name: string;
  jobId: string;
}

export type UpdateEmployeeRequest = {
  id: string;
  name: string;
  jobId: string;
}

export type EmployeeJobResponse = {
  id: string;
  name: string;
  salary: number;
}

export type CreateEmployeeJobRequest = {
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
