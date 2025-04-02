import { routeAction$, server$, z, zod$ } from "@builder.io/qwik-city";
import { CalendarEvent, EmployeeInvoiceRequest, EmployeeInvoiceResponse, EmployeeJobResponse, EmployeeLeave, EmployeeResponse } from "~/types/payroll.types";
import * as fs from 'node:fs/promises';

const employees: EmployeeResponse[] = [
  {
    id: "1", name: "test employee", job: "test job", salary: 1000
  },
  {
    id: "2", name: "test 2 employee", job: "test job 2", salary: 2000
  },
];

const employeeJobs: EmployeeJobResponse[] = [
  { id: "1", name: "test job", salary: 1000 },
  { id: "2", name: "test job 2", salary: 2000 },
];

const employeeLeaves: EmployeeLeave[] = [
  { id: "1", startDate: new Date("2025-04-05"), endDate: new Date("2025-04-05"), employeeId: "1" },
  { id: "2", startDate: new Date("2025-05-06"), endDate: new Date("2025-05-06"), employeeId: "1" },
];

const calendarEvents: CalendarEvent[] = [];

const employeeInvoices: EmployeeInvoiceResponse[] = [];

export const createEmployee = server$(function(name: string, job: string, salary: number) {
  const lastId = employees.length + 1;
  const employee: EmployeeResponse = {
    id: lastId.toString(), name: name, job: job, salary: salary
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

export const updateEmployee = server$(function(id: string, name: string, jobId: string, salary: number) {
  const employee = employees.find(e => e.id === id);
  const job = employeeJobs.find(e => e.id === jobId);
  if (!employee || !job) {
    throw new Error("Employee or Job not found!");
  }
  if (job.salary !== salary) {
    throw new Error("Cannot change job's salary!");
  }
  employee.name = name;
  employee.job = job.name;
  employee.salary = salary;
  return employee;
});

export const deleteEmployee = server$(function(id: string) {
  var employee = employees.find(e => e.id === id);
  if (!employee) {
    throw new Error("Employee not found!");
  }
  employees.splice(employees.indexOf(employee), 1);
  return employee;
});

export const getEmployeeJobs = server$(function() {
  return employeeJobs;
});

export const getEmployeeLeaves = server$(function() {
  return employeeLeaves;
});

export const getEmployeesWithLeaves = server$(function() {
  return employees.map(e => {
    const leaves = employeeLeaves.filter(l => l.employeeId === e.id);
    const employeeResponse: EmployeeResponse = {
      id: e.id, name: e.name, job: e.job, salary: e.salary, leaves: leaves
    };
    return employeeResponse;
  });
});

export const createEmployeeLeave = server$(function(employeeId: string, startDate: Date, endDate: Date) {
  const lastId = employeeLeaves.length + 1;
  const employeeLeave = {
    id: lastId.toString(), startDate: startDate, endDate: endDate, employeeId: employeeId
  };
  employeeLeaves.push(employeeLeave);
  return employeeLeave;
});

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

export const getEmployeeInvoices = server$(async function(request: EmployeeInvoiceRequest) {
  const files = await fs.readdir("data/invoices/" + request.employeeId);
  employeeInvoices.length = 0;
  for (const file of files) {
    employeeInvoices.push({
      id: String(employeeInvoices.length + 1),
      employeeId: request.employeeId,
      invoiceDate: new Date(),
      invoicePath: file
    })
  }
  const invoices = employeeInvoices.filter(e => e.employeeId === request.employeeId);
  console.info(`Getting employee invoices for employee ${request.employeeId}: ${invoices.length}`);
  return invoices;
});

export const useCreateEmployeeInvoice = routeAction$(async (data, event) => {
  //TODO: Use real users.
  const fileName = crypto.randomUUID();
  const dirPath = `data/invoices/${data.employeeId}`;
  const filePath = `${dirPath}/${fileName}.pdf`;
  await fs.mkdir(dirPath, { recursive: true });

  const fileResponse = await fs.writeFile(filePath, new Uint8Array(await data.invoice.arrayBuffer())).catch((error) => {
    console.error("ERROR: Unable to save file:\n", error);
    return new Error("Unable to save file!");
  });
  if (fileResponse instanceof Error) {
    return event.fail(500, { message: fileResponse.message });
  }

  const lastId = employeeInvoices.length + 1;
  employeeInvoices.push({
    id: lastId.toString(),
    employeeId: data.employeeId,
    invoiceDate: new Date(),
    invoicePath: filePath,
  });
  console.log(employeeInvoices);

  return {
    success: true,
    message: "Invoice saved successfully!"
  };
  //await Bun.write(`/data/invoices/${userId}/${fileName}.pdf`, data.invoice);
}, zod$({
  invoice: z.instanceof(File).refine((file) => {
    return file.size > 0 && file.type.startsWith("application/") && file.type.endsWith("pdf") && file.name.endsWith(".pdf");
  }),
  employeeId: z.string()
}));
