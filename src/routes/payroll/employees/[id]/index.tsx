import { component$, useSignal } from "@builder.io/qwik";
import { Form, routeAction$, routeLoader$, z, zod$, type DocumentHead } from "@builder.io/qwik-city";
import { useGetEmployeeJobs } from "~/loaders/payroll.loader";
import { getEmployee, updateEmployee } from "~/services/payroll.service";
import { UpdateEmployeeRequest } from "~/types/payroll.types";
import { BaseError } from "~/types/shared.types";

export { useGetEmployeeJobs } from "~/loaders/payroll.loader";

export const useGetEmployee = routeLoader$(async (event) => {
  const id = event.params.id;
  const employee = await getEmployee(Number(id));
  if (employee instanceof BaseError) {
    throw event.redirect(302, "/payroll/employees");
  }
  if (!employee) {
    throw event.redirect(302, "/payroll/employees");
  }
  return { employee };
});

export const useUpdateEmployee = routeAction$(async (data, event) => {
  const request: UpdateEmployeeRequest = {
    id: Number(event.params.id),
    name: data.name,
    jobId: data.job,
  }
  const response = await updateEmployee(request);
  if (response instanceof BaseError) {
    return event.fail(response.status, { message: response.message });
  }
  return response;
}, zod$({
  name: z.string().min(3),
  job: z.string().min(1),
  salary: z.coerce.number().min(1000),
}));

export default component$(() => {
  const getEmployeeLoader = useGetEmployee();
  const getEmployeeJobsLoader = useGetEmployeeJobs();

  const employeeName = useSignal(getEmployeeLoader.value.employee.name);
  const selectedJobSalary = useSignal(getEmployeeLoader.value.employee.job.salary);

  const updateEmployeeAction = useUpdateEmployee();

  return (
    <div class="flex flex-col items-center h-full space-y-10">
      <h1 class="mt-18 text-4xl">Editar Empleado: {getEmployeeLoader.value.employee.name}</h1>

      <Form class="max-w-md mx-auto w-full" action={updateEmployeeAction} onSubmit$={() => {
        if (updateEmployeeAction.value?.failed) {
          alert(`updateEmployeeAction failed:\n${updateEmployeeAction.value.message}`);
          return;
        }
        window.location.href = "/payroll/employees";
      }}>
        <div class="relative z-0 w-full mb-5 group">
          <input bind:value={employeeName} type="text" name="name" id="name" class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
          <label for="name" class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Nombre</label>
        </div>
        <div class="grid md:grid-cols-2 md:gap-6">
          <div class="relative z-0 w-full mb-5 group">
            <label for="job" class="sr-only">Underline select</label>
            <select id="job" name="job" class="block py-2.5 px-0 w-full text-sm text-gray-500 bg-transparent border-0 border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-none focus:ring-0 focus:border-gray-200 peer" onChange$={(_, element) => {
              const selectedJobId = element.value;
              const selectedJob = getEmployeeJobsLoader.value.employeeJobs.find((job) => job.id === selectedJobId);
              if (!selectedJob) {
                console.error("Job not found!");
                return;
              }
              selectedJobSalary.value = selectedJob.salary;
            }}>
              {getEmployeeJobsLoader.value.employeeJobs.map((job) => (
                <option value={job.id} key={job.id} selected={job.id === getEmployeeLoader.value.employee.job.id}>{job.name}</option>
              ))}
            </select>
          </div>
          <div class="relative z-0 w-full mb-5 group">
            <input value={selectedJobSalary.value} type="number" name="salary" id="salary" class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer cursor-not-allowed" placeholder=" " required readOnly />
            <label for="salary" class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Salario</label>
          </div>
        </div>
        <button type="submit" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Actualizar</button>
      </Form>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Editar Empleado",
  meta: [
    {
      name: "description",
      content: "Employee info management",
    },
  ],
};
