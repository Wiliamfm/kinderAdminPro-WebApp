import { $, component$, useSignal, useStore } from "@builder.io/qwik";
import { Form, Link, routeAction$, routeLoader$, z, zod$, type DocumentHead } from "@builder.io/qwik-city";
import Table, { TableHeader, TableProps } from "~/components/common/table/table";
import { createEmployee, createEmployeeLeave, deleteEmployee, getEmployeeInvoices, getEmployeeJobs, getEmployeeLeaves, getEmployees } from "~/services/payroll.service";
import { CreateEmployeeLeaveRequest, CreateEmployeeRequest, EmployeeInvoiceResponse, EmployeeLeaveResponse, EmployeeResponse } from "~/types/payroll.types";
import { useGetEmployeeJobs } from "~/loaders/payroll.loader";
import { useCreateEmployeeInvoice } from "~/services/payroll.service";
import FormModal from "~/components/common/modal/formModal/formModal";
import { BaseError } from "~/types/shared.types";

export { useGetEmployeeJobs } from "~/loaders/payroll.loader";
export { useCreateEmployeeInvoice } from "~/services/payroll.service";

export const useGetEmployees = routeLoader$(async () => {
  const response = await getEmployees();
  return {
    employees: response,
  }
});

export const useCreateEmployee = routeAction$(async (data, event) => {
  const jobs = await getEmployeeJobs();
  const job = jobs.find((j) => j.id === data.job);
  if (!job) {
    return event.fail(404, { message: "Job not found!" });
  }
  const request: CreateEmployeeRequest = {
    name: data.name,
    jobId: job.id
  }
  const response = await createEmployee(request);
  if (response instanceof BaseError) {
    return event.fail(response.status, { message: response.message });
  }
  return response;
}, zod$({
  name: z.string().min(3),
  job: z.string().min(1),
}));

export const useCreateEmployeeLeave = routeAction$(async (data, event) => {
  const startDate = new Date(data.startDate);
  startDate.setHours(Number(data.startTime.substring(0, 2)));
  startDate.setMinutes(Number(data.startTime.substring(3)));
  const endDate = new Date(data.endDate);
  endDate.setHours(Number(data.endTime.substring(0, 2)));
  endDate.setMinutes(Number(data.endTime.substring(3)));
  if (startDate > endDate) {
    return event.fail(400, { message: "La fecha de inicio debe ser menor a la fecha de finalización!" });
  }

  const request: CreateEmployeeLeaveRequest = {
    employeeId: data.employeeId,
    startDate: startDate,
    endDate: endDate,
  };
  const employeeLeave = createEmployeeLeave(request);
  return employeeLeave;
}, zod$({
  employeeId: z.string().min(1),
  startDate: z.coerce.date(),
  startTime: z.string(),
  endDate: z.coerce.date(),
  endTime: z.string(),
}));

export default component$(() => {
  const leavesHeader: TableHeader[] = [
    { name: "Id del empleado", key: "employeeId" },
    {
      name: "Fecha de Inicio", key: "startDate", format: $((date: Date) => {
        return date.toLocaleDateString();
      })
    },
    {
      name: "Fecha de Finalización", key: "endDate", format: $((date: Date) => {
        return date.toLocaleDateString();
      })
    },
  ];
  const invoicesHeader: TableHeader[] = [
    { name: "Id del empleado", key: "employeeId" },
    {
      name: "Fecha de pago", key: "invoiceDate", format: $((date: Date) => {
        return date.toLocaleDateString();
      })
    },
    { name: "Factura", key: "fileName" }
  ];

  const employeesLoader = useGetEmployees();
  const getEmployeeJobsLoader = useGetEmployeeJobs();

  const selectedEmployee = useSignal("");
  const employeeInvoices = useStore({
    invoices: [] as EmployeeInvoiceResponse[],
  });
  const showEmployeeInvoiceForm = useSignal(false);
  const employeeLeavesTableProps = useStore({
    headers: leavesHeader,
    data: [] as EmployeeLeaveResponse[],
  });
  const employeeInvoicesTableProps = useStore({
    headers: invoicesHeader,
    data: [] as EmployeeInvoiceResponse[],
  });

  const createEmployeeAction = useCreateEmployee();
  const createEmployeeLeaveAction = useCreateEmployeeLeave();
  const createEmployeeInvoiceAction = useCreateEmployeeInvoice();

  const employeeFormFn = $((_: any, element: HTMLFormElement) => {
    if (createEmployeeAction.value?.failed) {
      console.error(createEmployeeAction.value.message);
      return;
    }
    element.reset();
  });

  const employeeLeaveFormFn = $((_: any, element: HTMLFormElement) => {
    if (createEmployeeLeaveAction.value?.failed) {
      alert(createEmployeeLeaveAction.value.message);
      return;
    }
    element.reset();
  });

  const headers: TableHeader[] = [
    { name: "Nombre", key: "name" },
    { name: "Cargo", key: "job" },
    { name: "Salario", key: "salary" },
    { name: "Acciones", key: "actions" },
  ]
  const employees = employeesLoader.value.employees.map((e: EmployeeResponse) => {
    return {
      id: e.id, name: e.name, job: e.job.name, salary: e.job.salary, actions: [
        <Link href={`${e.id}`}>
          <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M5 8a4 4 0 1 1 7.796 1.263l-2.533 2.534A4 4 0 0 1 5 8Zm4.06 5H7a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h2.172a2.999 2.999 0 0 1-.114-1.588l.674-3.372a3 3 0 0 1 .82-1.533L9.06 13Zm9.032-5a2.907 2.907 0 0 0-2.056.852L9.967 14.92a1 1 0 0 0-.273.51l-.675 3.373a1 1 0 0 0 1.177 1.177l3.372-.675a1 1 0 0 0 .511-.273l6.07-6.07a2.91 2.91 0 0 0-.944-4.742A2.907 2.907 0 0 0 18.092 8Z" clip-rule="evenodd" />
          </svg>
        </Link >,
        <button class="cursor-pointer" onClick$={async () => {
          var employee = await deleteEmployee(e.id).catch((error) => {
            console.error(error);
          });
          if (employee) {
            alert("Empleado Eliminado!");
            window.location.reload();
          }
        }}>
          <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M5 8a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm-2 9a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Zm13-6a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2h-4Z" clip-rule="evenodd" />
          </svg>
        </button>,
        <button class="cursor-pointer" data-modal-target="leavesModal" data-modal-toggle="leavesModal" onClick$={async () => {
          employeeLeavesTableProps.data = await getEmployeeLeaves(e.id);
        }}>
          <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M5 5a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1 2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a2 2 0 0 1 2-2ZM3 19v-7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm6.01-6a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-10 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" clip-rule="evenodd" />
          </svg>
        </button>,
        <button class="cursor-pointer" data-modal-target="invoicesModal" data-modal-toggle="invoicesModal" onClick$={async () => {
          selectedEmployee.value = e.id;
          employeeInvoices.invoices.length = 0;
          employeeInvoices.invoices = await getEmployeeInvoices({ employeeId: e.id });
          employeeInvoicesTableProps.data = employeeInvoices.invoices;
        }}>
          <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M5.617 2.076a1 1 0 0 1 1.09.217L8 3.586l1.293-1.293a1 1 0 0 1 1.414 0L12 3.586l1.293-1.293a1 1 0 0 1 1.414 0L16 3.586l1.293-1.293A1 1 0 0 1 19 3v18a1 1 0 0 1-1.707.707L16 20.414l-1.293 1.293a1 1 0 0 1-1.414 0L12 20.414l-1.293 1.293a1 1 0 0 1-1.414 0L8 20.414l-1.293 1.293A1 1 0 0 1 5 21V3a1 1 0 0 1 .617-.924ZM9 7a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H9Zm0 4a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H9Zm0 4a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H9Z" clip-rule="evenodd" />
          </svg>
        </button>
      ]
    }
  });
  const tableProps: TableProps = {
    headers: headers,
    data: employees,
  };

  return (
    <div class="flex flex-col place-items-center h-full space-y-10">
      <h1 class="mt-18 text-4xl">Gestion de Empleados</h1>

      <div class="flex">
        <FormModal modalId="employee-form-modal" modalTitle={"Agregar Empleado"} modalBtnName={"Agregar Empleado"} modalBtnClass="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 dark:text-white dark:hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400" formBtnName="Crear Empleado" formBtnClass="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" formAction={createEmployeeAction} formOnSubmitFn={employeeFormFn}>
          <div>
            <label for="name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre</label>
            <input type="name" name="name" id="name" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white" placeholder="Juan Perez" required />
          </div>
          <div>
            <label for="jobs" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Seleccione un cargo</label>
            <select id="jobs" name="job" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
              {getEmployeeJobsLoader.value.employeeJobs.map((job) => (
                <option value={job.id} key={job.id}>{job.name}</option>
              ))}
            </select>
          </div>
        </FormModal>

        <FormModal modalId="employee-leave-form" modalTitle={"Registrar Incapacidad"} modalBtnName={"Registrar Incapacidad"} modalBtnClass="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 dark:text-white dark:hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400" formBtnName="Registrar incapacidad" formBtnClass="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" formAction={createEmployeeLeaveAction} formOnSubmitFn={employeeLeaveFormFn}>
          <div class="grid md:grid-cols-2 md:gap-6">
            <div class="relative z-0 w-full mb-5 group">
              <input type="date" name="startDate" id="startDate" class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
              <label for="startDate" class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Fecha de inicio</label>
            </div>
            <div class="relative z-0 w-full mb-5 group">
              <input type="time" name="startTime" id="startTime" class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
              <label for="startTime" class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Hora de inicio</label>
            </div>
            <div class="relative z-0 w-full mb-5 group">
              <input type="date" name="endDate" id="floating_last_name" class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
              <label for="endDate" class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Fecha de salida</label>
            </div>
            <div class="relative z-0 w-full mb-5 group">
              <input type="time" name="endTime" id="endTime" class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
              <label for="endTime" class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Hora de salida</label>
            </div>
          </div>
          <div>
            <label for="employees" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Seleccione un empleado</label>
            <select id="employees" name="employeeId" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
              {employeesLoader.value.employees.map((employee) => (
                <option value={employee.id} key={employee.id}>{employee.name}</option>
              ))}
            </select>
          </div>
        </FormModal>
      </div>

      <div
        id="leavesModal"
        tabIndex={-1}
        aria-hidden="true"
        class="fixed left-0 right-0 top-0 z-50 hidden h-[calc(100%-1rem)] max-h-full w-full overflow-y-auto overflow-x-hidden p-4 md:inset-0"
      >
        <div class="relative max-h-full w-full max-w-2xl">
          {/*<!-- Modal content -->*/}
          <div class="relative rounded-lg bg-white shadow-sm dark:bg-gray-700">
            {/*<!-- Modal header -->*/}
            <div
              class="flex items-start justify-between rounded-t border-b p-5 dark:border-gray-600"
            >
              <h3
                class="text-xl font-semibold text-gray-900 dark:text-white lg:text-2xl"
              >
                Registro de incapacidades
              </h3>
              <button
                type="button"
                class="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
                data-modal-hide="leavesModal"
              >
                <svg
                  class="h-3 w-3"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 14 14"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                  />
                </svg>
                <span class="sr-only">Close modal</span>
              </button>
            </div>
            {/*<!-- Modal body -->*/}
            <div class="space-y-6 p-6">
              <Table {...employeeLeavesTableProps} />
            </div>
            {/*<!-- Modal footer -->*/}
            <div
              class="flex items-center space-x-2 rtl:space-x-reverse rounded-b border-t border-gray-200 p-6 dark:border-gray-600"
            >
            </div>
          </div>
        </div>
      </div>

      <div
        id="invoicesModal"
        tabIndex={-1}
        aria-hidden="true"
        class="fixed left-0 right-0 top-0 z-50 hidden h-[calc(100%-1rem)] max-h-full w-full overflow-y-auto overflow-x-hidden p-4 md:inset-0"
      >
        <div class="relative max-h-full w-full max-w-2xl">
          {/*<!-- Modal content -->*/}
          <div class="relative rounded-lg bg-white shadow-sm dark:bg-gray-700">
            {/*<!-- Modal header -->*/}
            <div
              class="flex items-start justify-between rounded-t border-b p-5 dark:border-gray-600"
            >
              <h3
                class="text-xl font-semibold text-gray-900 dark:text-white lg:text-2xl"
              >
                Registro de facturas
              </h3>
              <button
                type="button"
                class="relative inline-flex items-center justify-center ms-auto p-0.5 mb-2 me-2 overflow-hidden text-xs font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 dark:text-white dark:hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400" onClick$={() => {
                  showEmployeeInvoiceForm.value = !showEmployeeInvoiceForm.value;
                }}>
                <span class="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
                  {showEmployeeInvoiceForm.value ? "Cerrar" : "Registrar nueva factura"}
                </span>
              </button>
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
                data-modal-hide="invoicesModal"
              >
                <svg
                  class="h-3 w-3"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 14 14"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                  />
                </svg>
                <span class="sr-only">Close modal</span>
              </button>
            </div>
            {/*<!-- Modal body -->*/}
            <div class="space-y-6 p-6">
              {showEmployeeInvoiceForm.value && <Form action={createEmployeeInvoiceAction} onSubmitCompleted$={async (_, element) => {
                if (!createEmployeeInvoiceAction.value) {
                  return;
                }
                if (createEmployeeInvoiceAction.value.failed) {
                  alert(createEmployeeInvoiceAction.value.message);
                  return;
                }
                element.reset();
                employeeInvoicesTableProps.data = await getEmployeeInvoices({ employeeId: createEmployeeInvoiceAction.value.employeeInvoice.employeeId });
                alert(`Factura "${createEmployeeInvoiceAction.value.employeeInvoice.fileName}" registrada correctamente`);
              }}>
                <input type="hidden" name="employeeId" value={selectedEmployee.value} />
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white" for="file_input">Subir factura</label>
                <input name="invoice" class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400" aria-describedby="file_input_help" id="file_input" type="file" accept=".pdf" />
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-300" id="file_input_help">PDF</p>
                <button class="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 dark:text-white dark:hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400">
                  <span class="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
                    Subir
                  </span>
                </button>
              </Form>
              }
              <Table {...employeeInvoicesTableProps} />
            </div>
            {/*<!-- Modal footer -->*/}
            <div
              class="flex items-center space-x-2 rtl:space-x-reverse rounded-b border-t border-gray-200 p-6 dark:border-gray-600"
            >
            </div>
          </div>
        </div>
      </div>

      <Table {...tableProps} />
    </div>
  );
});

export const head: DocumentHead = {
  title: "Gestión de Empleados",
  meta: [
    {
      name: "description",
      content: "Employee management",
    },
  ],
};
