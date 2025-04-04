import { routeAction$, server$, z, zod$ } from "@builder.io/qwik-city";
import { CalendarEvent, CreateEmployeeInvoiceRequest, CreateEmployeeJobRequest, CreateEmployeeLeaveRequest, CreateEmployeeRequest, EmployeeInvoiceRequest, EmployeeInvoiceResponse, EmployeeJobResponse, EmployeeLeaveResponse, EmployeeResponse, UpdateEmployeeJobRequest, UpdateEmployeeRequest } from "~/types/payroll.types";
import * as fs from 'node:fs/promises';
import { BaseError, ErrorResponse } from "~/types/shared.types";

const employees: EmployeeResponse[] = [
  {
    id: "1", name: "test employee", job: { id: "1", name: "test job", salary: 1000 }
  },
  {
    id: "2", name: "test 2 employee", job: { id: "2", name: "test job 2", salary: 2000 }
  },
];

const employeeJobs: EmployeeJobResponse[] = [
  { id: "1", name: "test job", salary: 1000 },
  { id: "2", name: "test job 2", salary: 2000 },
];

const employeeLeaves: EmployeeLeaveResponse[] = [
  { id: "1", startDate: new Date("2025-04-05"), endDate: new Date("2025-04-05"), employeeId: "1" },
  { id: "2", startDate: new Date("2025-05-06"), endDate: new Date("2025-05-06"), employeeId: "1" },
];

const employeeInvoices: EmployeeInvoiceResponse[] = [
  { id: "1", employeeId: "1", invoiceDate: new Date(), invoicePath: "data/invoices/2/59d957ca-6278-443a-810e-b84727bd6c01.pdf", fileName: "test.pdf", }
];

const calendarEvents: CalendarEvent[] = [];

export const createEmployee = server$(function(request: CreateEmployeeRequest) {
  const lastId = employees.length + 1;
  const job = employeeJobs.find(e => e.id === request.jobId);
  if (!job) {
    return new BaseError("Invalid job id!", 400, { id: request.jobId });
  }
  const employee: EmployeeResponse = {
    id: lastId.toString(), name: request.name, job: job
  };
  employees.push(employee);
  return employee;
});

export const getEmployees = server$(function() {
  return employees;
});

export const getEmployee = server$(function(id: string) {
  return employees.find(e => e.id === id);
});

export const updateEmployee = server$(function(request: UpdateEmployeeRequest) {
  const employee = employees.find(e => e.id === request.id);
  const job = employeeJobs.find(e => e.id === request.jobId);
  if (!employee || !job) {
    return new BaseError("Invalid employee or job id!", 400, { id: request.id, jobId: request.jobId });
  }
  employee.name = request.name;
  employee.job = job;
  return employee;
});

export const deleteEmployee = server$(function(id: string) {
  var employee = employees.find(e => e.id === id);
  if (!employee) {
    return new BaseError("Invalid employee id!", 400, { id: id });
  }
  employees.splice(employees.indexOf(employee), 1);
  return employee;
});

export const getEmployeesJobs = server$(function() {
  return employeeJobs;
});

export const getEmployeeJob = server$(function(id: string) {
  return employeeJobs.find(e => e.id === id);
});

export const createEmployeeJob = server$(function(request: CreateEmployeeJobRequest) {
  if (request.salary < 1000) {
    return new BaseError("Salario no puede ser menor a 1000", 400, { salary: request.salary });
  }
  if (request.name.length === 0) {
    return new BaseError("El nombre no puede estar vacio", 400, { name: request.name });
  }
  const lastId = employeeJobs.length + 1;
  const newJob = { id: `${lastId}`, ...request };
  employeeJobs.push(newJob);
  return newJob
});

export const updateEmployeeJob = server$(function(request: UpdateEmployeeJobRequest) {
  const job = employeeJobs.find(e => e.id === request.id);
  if (!job) {
    return new BaseError("Invalid job id!", 400, { id: request.id });
  }
  job.name = request.name;
  job.salary = request.salary;
  //employeeJobs[employeeJobs.indexOf(job)] = job;
  return job;
});

export const deleteEmployeeJob = server$(function(id: string) {
  var job = employeeJobs.find(e => e.id === id);
  if (!job) {
    return new BaseError("Invalid job id!", 400, { id: id });
  }
  employeeJobs.splice(employeeJobs.indexOf(job), 1);
  return job;
});

export const getEmployeeLeaves = server$(function(employeeId: string) {
  return employeeLeaves.filter(x => x.employeeId === employeeId);
});

export const createEmployeeLeave = server$(function(request: CreateEmployeeLeaveRequest) {
  const lastId = employeeLeaves.length + 1;
  const employeeLeave = {
    id: lastId.toString(), startDate: request.startDate, endDate: request.endDate, employeeId: request.employeeId
  };
  employeeLeaves.push(employeeLeave);
  return employeeLeave;
});

export const getEmployeeInvoices = server$(async function(request: EmployeeInvoiceRequest) {
  const dirPath = "data/invoices/" + request.employeeId;
  await fs.mkdir(dirPath, { recursive: true });
  const files = await fs.readdir(dirPath);
  const invoices = employeeInvoices.filter(e => e.employeeId === request.employeeId);
  for (const file of files) {
    const invoice = invoices.find(f => {
      const originalName = f.invoicePath.split("/").pop();
      return originalName === file;
    });
    if (invoice) continue;
    invoices.push({
      id: String(employeeInvoices.length + 1),
      employeeId: request.employeeId,
      invoiceDate: new Date(),
      invoicePath: file,
      fileName: file,
    })
  }
  return invoices;
});

export const useCreateEmployeeInvoice = routeAction$(async (data, event) => {
  //TODO: Use real users.
  const fileName = crypto.randomUUID();
  const dirPath = `data/invoices/${data.employeeId}`;
  const filePath = `${dirPath}/${fileName}.pdf`;

  const fileResponse = await fs.writeFile(filePath, new Uint8Array(await data.invoice.arrayBuffer())).catch((error) => {
    console.error("ERROR: Unable to save file:\n", error);
    return new BaseError("Unable to save file!", 500, { message: error.message });
  });
  if (fileResponse instanceof Error) {
    return event.fail(500, { message: fileResponse.message });
  }

  const lastId = employeeInvoices.length + 1;
  const employeeInvoice: EmployeeInvoiceResponse = {
    id: lastId.toString(),
    employeeId: data.employeeId,
    invoiceDate: new Date(),
    invoicePath: filePath,
    fileName: data.invoice.name,
  }
  employeeInvoices.push(employeeInvoice);
  console.log(employeeInvoices);

  return {
    success: true,
    employeeInvoice: employeeInvoice
  };
  //await Bun.write(`/data/invoices/${userId}/${fileName}.pdf`, data.invoice);
}, zod$({
  invoice: z.instanceof(File).refine((file) => {
    return file.size > 0 && file.type.startsWith("application/") && file.type.endsWith("pdf") && file.name.endsWith(".pdf");
  }),
  employeeId: z.string()
}));

export const createCalendarEvent = server$(function(event: CalendarEvent) {
  const lastId = String(calendarEvents.length + 1);
  // const { id, ...eventProps } = event;
  // const calendarEvent: CalendarEvent = { id: lastId, ...eventProps };
  const calendarEvent: CalendarEvent = { id: lastId, ...event };
  console.info("Calendar event created: ", calendarEvent);
  calendarEvents.push(calendarEvent);
  return calendarEvent;
});

export const getCalendarEvents = server$(function() {
  console.info("Getting calendar events: ", calendarEvents.length);
  return calendarEvents;
});
