import { routeAction$, server$, z, zod$ } from "@builder.io/qwik-city";
import { CalendarEvent, CreateEmployeeJobRequest, CreateEmployeeLeaveRequest, CreateEmployeeRequest, EmployeeInvoiceRequest, EmployeeInvoiceResponse, EmployeeJobResponse, EmployeeLeaveResponse, EmployeeResponse, UpdateEmployeeJobRequest, UpdateEmployeeRequest } from "~/types/payroll.types";
import * as fs from 'node:fs/promises';
import { BaseError } from "~/types/shared.types";
import { getSupabase } from "./supabase.service";

const employeeJobs: EmployeeJobResponse[] = [
  { id: "1", name: "test job", salary: 1000 },
  { id: "2", name: "test job 2", salary: 2000 },
];

const employees: EmployeeResponse[] = [
  {
    id: "1", name: "test employee", job: employeeJobs.find(e => e.id === "1")!
  },
  {
    id: "2", name: "test 2 employee", job: employeeJobs.find(e => e.id === "2")!
  },
];

const employeeLeaves: EmployeeLeaveResponse[] = [
  { id: "1", startDate: new Date("2025-04-05"), endDate: new Date("2025-04-05"), employeeId: "1" },
  { id: "2", startDate: new Date("2025-05-06"), endDate: new Date("2025-05-06"), employeeId: "1" },
];

const employeeInvoices: EmployeeInvoiceResponse[] = [
  { id: "1", employeeId: "1", invoiceDate: new Date(), invoicePath: "data/invoices/2/59d957ca-6278-443a-810e-b84727bd6c01.pdf", fileName: "test.pdf", }
];

const calendarEvents: CalendarEvent[] = [];

export const createEmployee = server$(async function(request: CreateEmployeeRequest) {
  const job = await getEmployeeJob(request.jobId);
  if (!job) {
    return new BaseError("Invalid job id!", 400, { id: request.jobId });
  }
  const { data, error } = await getSupabase().from("employees").insert({
    name: request.name,
    job_id: request.jobId
  })
    .select(`
*,
job_id(*)
`);
  if (error) {
    console.error(`Unable to create employee:\n`, error);
    return null;
  }
  return {
    id: data[0].id,
    name: data[0].name,
    job: job
  }
});

export const getEmployees = server$(async function() {
  const { data, error } = await getSupabase().from("employees").select(`
*,
job_id(*)
`);
  if (error) {
    console.error("Unable to fetch employees:\n", error);
    return [];
  }
  return data.map((e: any) => {
    return {
      id: e.id,
      name: e.name,
      job: {
        id: e.job_id.id,
        name: e.job_id.name,
        salary: e.job_id.salary
      } as EmployeeJobResponse
    } as EmployeeResponse;
  });
});

export const getEmployee = server$(async function(id: number) {
  const { data, error } = await getSupabase().from("employees").select(`
*,
job_id(*)
`).eq("id", id).single();
  if (error) {
    console.error(`Unable to fetch employee ${id}:\n`, error);
    return null;
  }
  return {
    id: data.id,
    name: data.name,
    job: {
      id: data.job_id.id,
      name: data.job_id.name,
      salary: data.job_id.salary
    } as EmployeeJobResponse
  } as EmployeeResponse;
});

export const updateEmployee = server$(async function(request: UpdateEmployeeRequest) {
  const employee = await getEmployee(request.id);
  const job = await getEmployeeJob(request.jobId);
  if (!employee || !job) {
    return new BaseError("Invalid employee or job id!", 400, { id: request.id, jobId: request.jobId });
  }
  const { data, error } = await getSupabase().from("employees").update({
    name: request.name,
    job_id: request.jobId
  })
    .eq("id", request.id)
    .select(`
*,
job_id(*)
`);
  if (error) {
    console.error(`Unable to update employee ${request.id}:\n`, error);
    return null;
  }
  const updatedEmployee = data[0];
  return {
    id: updatedEmployee.id,
    name: updatedEmployee.name,
    job: {
      id: updatedEmployee.job_id.id,
      name: updatedEmployee.job_id.name,
      salary: updatedEmployee.job_id.salary
    } as EmployeeJobResponse
  } as EmployeeResponse;
});

export const deleteEmployee = server$(async function(id: number) {
  const employee = await getEmployee(id);
  if (!employee) {
    return new BaseError("Invalid employee id!", 400, { id: id });
  }
  const { error } = await getSupabase().from("employees").delete().eq("id", id);
  if (error) {
    console.error(`Unable to delete employee ${id}:\n`, error);
    return new BaseError("Unable to delete employee", 400, { id: id });;
  }
  return employee;
});

export const getEmployeesJobs = server$(async function() {
  const { data, error } = await getSupabase().from("employee_jobs").select();
  if (error) {
    console.error("Unable to fetch employee jobs:\n", error);
    return [];
  }
  return data.map((e: any) => {
    return {
      id: e.id,
      name: e.name,
      salary: e.salary
    } as EmployeeJobResponse;
  });
});

export const getEmployeeJob = server$(async function(id: number) {
  const { data, error } = await getSupabase().from("employee_jobs").select().eq("id", id).single();
  if (error) {
    console.error(`Unable to fetch employee job ${id}:\n`, error);
    return null;
  }
  return {
    id: data.id,
    name: data.name,
    salary: data.salary
  } as EmployeeJobResponse;
});

export const createEmployeeJob = server$(async function(request: CreateEmployeeJobRequest) {
  if (request.salary < 1000) {
    return new BaseError("Salario no puede ser menor a 1000", 400, { salary: request.salary });
  }
  if (request.name.length === 0) {
    return new BaseError("El nombre no puede estar vacio", 400, { name: request.name });
  }
  const { data, error } = await getSupabase().from("employee_jobs").insert({
    name: request.name,
    salary: request.salary
  })
    .select();
  if (error) {
    console.error(`Unable to create employee job:\n`, error);
    return new BaseError("No se pudo crear el cargo", 500, { message: error.message });
  }
  return {
    id: data[0].id,
    name: data[0].name,
    salary: data[0].salary
  } as EmployeeJobResponse;
});

export const updateEmployeeJob = server$(async function(request: UpdateEmployeeJobRequest) {
  const job = await getEmployeeJob(request.id);
  if (!job) {
    return new BaseError("Invalid job id!", 400, { id: request.id });
  }
  const { data, error } = await getSupabase().from("employee_jobs").update({
    name: request.name,
    salary: request.salary
  })
    .eq("id", request.id)
    .select();
  if (error) {
    console.error(`Unable to update employee job ${request.id}:\n`, error);
    return new BaseError("No se pudo actualizar el cargo", 500, { message: error.message });
  }
  const updatedJob = data[0];
  return {
    id: updatedJob.id,
    name: updatedJob.name,
    salary: updatedJob.salary
  } as EmployeeJobResponse;
});

export const deleteEmployeeJob = server$(async function(id: number) {
  const job = await getEmployeeJob(id);
  if (!job) {
    return {
      data: null,
      error: new BaseError("Invalid job id!", 400, { id: id })
    };
  }
  const { error } = await getSupabase().from("employee_jobs").delete().eq("id", id);
  if (error) {
    console.error(`Unable to delete employee job ${id}:\n`, error);
    return {
      data: null,
      error: new BaseError("No se pudo eliminar el cargo", 500, { message: error.message })
    };
  }
  return {
    data: job,
    error: null
  };
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
  const { data, error } = await getSupabase().from("employee_invoices").select().eq("employee_id", request.employeeId);
  if (error) {
    console.error(`Unable to fetch employee invoices ${request.employeeId}:\n`, error);
    return [];
  }
  return data.map((i) => {
    return {
      id: i.id,
      employeeId: i.employee_id,
      invoiceDate: i.created_at,
      invoicePath: i.path,
      fileName: i.file_name
    } as EmployeeInvoiceResponse
  })
});

export const useCreateEmployeeInvoice = routeAction$(async (req, event) => {
  const fileName = crypto.randomUUID();
  const dirPath = `${req.employeeId}`;
  const filePath = `${dirPath}/${fileName}.pdf`;

  const { data, error } = await getSupabase().storage.from("test")
    .upload(filePath, req.invoice, {
      upsert: true
    });
  if (error) {
    console.error("ERROR: Unable to upload file:\n", error);
    return event.fail(500, { message: error.message });
  }

  const response = await getSupabase().from("employee_invoices").insert({
    employee_id: req.employeeId,
    path: data?.path,
    file_name: req.invoice.name
  }).select();
  if (response.error) {
    console.error("ERROR: Unable to create invoice:\n", error);
    return event.fail(500, { message: response.error.message });
  }

  const employeeInvoice: EmployeeInvoiceResponse = {
    id: response.data[0].id,
    employeeId: req.employeeId,
    invoiceDate: new Date(),
    invoicePath: response.data[0].created_at,
    fileName: response.data[0].file_name
  }
  return {
    success: true,
    employeeInvoice: employeeInvoice
  };
}, zod$({
  invoice: z.instanceof(File).refine((file) => {
    return file.size > 0 && file.type.startsWith("application/") && file.type.endsWith("pdf") && file.name.endsWith(".pdf");
  }),
  employeeId: z.coerce.number()
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
