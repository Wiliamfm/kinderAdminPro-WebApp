import { component$, useSignal } from "@builder.io/qwik";
import { Form, routeAction$, routeLoader$, z, zod$, type DocumentHead } from "@builder.io/qwik-city";
import Table, { TableHeader, TableProps } from "~/components/common/table/table";
import { createEmployee, deleteEmployee, getEmployeeJobs, getEmployees } from "~/services/payroll.service";
import { Employee, EmployeeResponse } from "~/types/payroll.types";
import { useGetEmployeeJobs } from "~/loaders/payroll.loader";

export { useGetEmployeeJobs } from "~/loaders/payroll.loader";

export const useGetEmployees = routeLoader$(async () => {
  const response = await getEmployees();
  const employees: Employee[] = response.map((e: EmployeeResponse) => {
    return {
      id: e.id, name: e.name, job: e.job, salary: e.salary, actions: [
        <a href={`/payroll/employee/${e.id}`}>
          <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M5 8a4 4 0 1 1 7.796 1.263l-2.533 2.534A4 4 0 0 1 5 8Zm4.06 5H7a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h2.172a2.999 2.999 0 0 1-.114-1.588l.674-3.372a3 3 0 0 1 .82-1.533L9.06 13Zm9.032-5a2.907 2.907 0 0 0-2.056.852L9.967 14.92a1 1 0 0 0-.273.51l-.675 3.373a1 1 0 0 0 1.177 1.177l3.372-.675a1 1 0 0 0 .511-.273l6.07-6.07a2.91 2.91 0 0 0-.944-4.742A2.907 2.907 0 0 0 18.092 8Z" clip-rule="evenodd" />
          </svg>
        </a >,
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
        </button>
      ]
    }
  })
  return {
    employees: employees,
  }
});

export const useCreateEmployee = routeAction$(async (data, event) => {
  const jobs = await getEmployeeJobs();
  const job = jobs.find((j) => j.id === data.job);
  if (!job) {
    return event.fail(404, { message: "Job not found!" });
  }
  const employee = await createEmployee(data.name, job.name, job.salary).catch((error) => {
    console.error(error);
    return event.fail(500, { message: "Unable to create employee!" });
  });
  console.log("Response:", employee);
  return employee;
}, zod$({
  name: z.string().min(3),
  job: z.string().min(1),
}));

export default component$(() => {
  const btnCloseModalRef = useSignal<HTMLButtonElement>();
  const employeesLoader = useGetEmployees();
  const getEmployeeJobsLoader = useGetEmployeeJobs();

  const createEmployeeAction = useCreateEmployee();

  const headers: TableHeader[] = [
    { name: "Nombre", key: "name" },
    { name: "Cargo", key: "job" },
    { name: "Salario", key: "salary" },
    { name: "Acciones", key: "actions" },
  ]
  const tableProps: TableProps = {
    headers: headers,
    data: employeesLoader.value.employees,
  }

  return (
    <div class="flex flex-col place-items-center h-full space-y-10">
      <h1 class="mt-18 text-4xl">Gestion de Empleados</h1>

      {/*<!-- Modal toggle -->*/}
      <button data-modal-target="employee-form-modal" data-modal-toggle="employee-form-modal" class="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 dark:text-white dark:hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400" type="button">
        <span class="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
          Agregar Empleado
        </span>
      </button>

      {/*<!-- Main modal -->*/}
      <div id="employee-form-modal" tabIndex={-1} aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
        <div class="relative p-4 w-full max-w-md max-h-full">
          {/*<!-- Modal content -->*/}
          <div class="relative bg-white rounded-lg shadow-sm dark:bg-gray-700">
            {/*<!-- Modal header -->*/}
            <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600 border-gray-200">
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                Agregar Empleado
              </h3>
              <button ref={btnCloseModalRef} type="button" class="end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" data-modal-hide="employee-form-modal">
                <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
                <span class="sr-only">Close modal</span>
              </button>
            </div>
            {/*<!-- Modal body -->*/}
            <div class="p-4 md:p-5">
              <Form class="space-y-4" action={createEmployeeAction} onSubmitCompleted$={(_, element) => {
                if(createEmployeeAction.value?.failed){
                  console.error(createEmployeeAction.value.message);
                  return;
                }
                console.log("createEmployeeAction completed:\n", createEmployeeAction.value);
                element.reset();
                btnCloseModalRef.value?.click();
              }}>
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
                <button type="submit" class="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Crear empleado</button>
              </Form>
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
