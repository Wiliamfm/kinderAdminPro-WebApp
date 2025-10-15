import { routeAction$, server$, z, zod$ } from "@builder.io/qwik-city";
import { CalendarEvent, CreateEmployeeJobRequest, CreateEmployeeLeaveRequest, CreateEmployeeRequest, EmployeeInvoiceRequest, EmployeeInvoiceResponse, EmployeeJobResponse, EmployeeLeaveResponse, EmployeeResponse, UpdateEmployeeJobRequest, UpdateEmployeeRequest } from "~/types/payroll.types";
import { BaseError } from "~/types/shared.types";
import { getSupabase } from "./supabase.service";

const calendarEvents: CalendarEvent[] = [];

export const createEmployee = server$(async function (request: CreateEmployeeRequest) {
  const job = await getEmployeeJob(request.jobId);
  if (!job) {
    return new BaseError("Invalid job id!", 400, { id: request.jobId });
  }
  // const userResponse = await getSupabase().auth.signUp({ email: request.email, password: request.password });
  // if (userResponse.error) {
  //   console.error("Unable to create user:\n", userResponse.error);
  //   return new BaseError(userResponse.error.message, 500, { message: "No se pudo crear el usuario" });
  // }
  const userAppResponse = await getSupabase().from("Users").insert({
    name: request.name,
    email: request.email,
    password: request.password,
    role_id: 2
  }).select("id").single();
  if (userAppResponse.error) {
    console.error("Unable to create user app:\n", userAppResponse.error);
    return new BaseError(userAppResponse.error.message, 500, { message: "No se pudo crear el usuario" });
  }

  const { data, error } = await getSupabase().from("employees").insert({
    name: request.name,
    job_id: request.jobId,
    user_app_id: userAppResponse.data.id
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

export const getEmployees = server$(async function () {
  const { data, error } = await getSupabase().from("employees").select(`
*,
job_id(*)
`);
  if (error) {
    console.error("Unable to fetch employees:\n", error);
    return [];
  }
  return data.map((e) => {
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

export const getEmployee = server$(async function (id: number) {
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

export const updateEmployee = server$(async function (request: UpdateEmployeeRequest) {
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

export const deleteEmployee = server$(async function (id: number) {
  const employee = await getEmployee(id);
  if (!employee) {
    return { data: null, error: new BaseError("Invalid employee id!", 400, { id: id }) };
  }
  const { error: invoiceError } = await getSupabase().from("employee_invoices").delete().eq("employee_id", id);
  const { error: leavesError } = await getSupabase().from("employee_leaves").delete().eq("employee_id", id);
  const { error } = await getSupabase().from("employees").delete().eq("id", id);
  if (error || invoiceError || leavesError) {
    console.error(`Unable to delete employee ${id}:\n`, error);
    return { data: null, error: new BaseError("No se pudo eliminar el empleado, porfavor revise que no tenga cursos asignados", 500, { id: id }) };
  }

  return { data: employee, error: null };
});

export const getEmployeesJobs = server$(async function () {
  const { data, error } = await getSupabase().from("employee_jobs").select();
  if (error) {
    console.error("Unable to fetch employee jobs:\n", error);
    return [];
  }
  return data.map((e) => {
    return {
      id: e.id,
      name: e.name,
      salary: e.salary,
      gradeId: e.grade_id
    } as EmployeeJobResponse;
  });
});

export const getEmployeeJob = server$(async function (id: number) {
  const { data, error } = await getSupabase().from("employee_jobs").select().eq("id", id).single();
  if (error) {
    console.error(`Unable to fetch employee job ${id}:\n`, error);
    return null;
  }
  return {
    id: data.id,
    name: data.name,
    salary: data.salary,
    gradeId: data.grade_id
  } as EmployeeJobResponse;
});

export const createEmployeeJob = server$(async function (request: CreateEmployeeJobRequest) {
  if (request.salary < 1000) {
    return new BaseError("Salario no puede ser menor a 1000", 400, { salary: request.salary });
  }
  if (request.name.length === 0) {
    return new BaseError("El nombre no puede estar vacio", 400, { name: request.name });
  }
  const { data, error } = await getSupabase().from("employee_jobs").insert({
    name: request.name,
    salary: request.salary,
    grade_id: request.gradeId
  })
    .select();
  if (error) {
    console.error(`Unable to create employee job:\n`, error);
    if (error.message.includes("duplicate key value violates unique constraint")) {
      return new BaseError("Ya existe un cargo con ese nombre", 400, { name: request.name });
    }
    return new BaseError("No se pudo crear el cargo", 500, { message: error.message });
  }
  return {
    id: data[0].id,
    name: data[0].name,
    salary: data[0].salary,
    gradeId: data[0].grade_id
  } as EmployeeJobResponse;
});

export const updateEmployeeJob = server$(async function (request: UpdateEmployeeJobRequest) {
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
    if (error.message.includes("duplicate key value violates unique constraint")) {
      return new BaseError("Ya existe un cargo con ese nombre", 400, { name: request.name });
    }
    return new BaseError("No se pudo actualizar el cargo", 500, { message: error.message });
  }
  const updatedJob = data[0];
  return {
    id: updatedJob.id,
    name: updatedJob.name,
    salary: updatedJob.salary,
    gradeId: updatedJob.grade_id
  } as EmployeeJobResponse;
});

export const deleteEmployeeJob = server$(async function (id: number) {
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

export const getEmployeeLeaves = server$(async function (employeeId: number) {
  const { data, error } = await getSupabase().from("employee_leaves").select().eq("employee_id", employeeId);
  if (error) {
    console.error("Unable to fetch employee leaves:\n", error);
    return [];
  }

  return data.map((e) => {
    return {
      id: e.id,
      employeeId: e.employee_id,
      startDate: e.start_date,
      endDate: e.end_date
    } as EmployeeLeaveResponse
  });
});

export const createEmployeeLeave = server$(async function (request: CreateEmployeeLeaveRequest) {
  const employee = await getEmployee(request.employeeId);
  if (!employee) {
    return new BaseError("Invalid employee id!", 400, { id: request.employeeId });
  }

  const { data, error } = await getSupabase().from("employee_leaves").insert({
    employee_id: request.employeeId,
    start_date: request.startDate,
    end_date: request.endDate
  }).select();
  if (error) {
    console.error("Unable to create employee leave:\n", error);
    return new BaseError("No se pudo crear la incapacidad del empleado", 500, { message: error.message });
  }
  return {
    id: data[0].id,
    employeeId: data[0].employee_id,
    startDate: data[0].start_date,
    endDate: data[0].end_date
  } as EmployeeLeaveResponse
});

export const getEmployeeInvoices = server$(async function (request: EmployeeInvoiceRequest) {
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

  //TODO: Use invoices bucket
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

export const createCalendarEvent = server$(function (event: CalendarEvent) {
  const lastId = String(calendarEvents.length + 1);
  // const { id, ...eventProps } = event;
  // const calendarEvent: CalendarEvent = { id: lastId, ...eventProps };
  const calendarEvent: CalendarEvent = { id: lastId, ...event };
  console.info("Calendar event created: ", calendarEvent);
  calendarEvents.push(calendarEvent);
  return calendarEvent;
});

export const getCalendarEvents = server$(function () {
  console.info("Getting calendar events: ", calendarEvents.length);
  return calendarEvents;
});
