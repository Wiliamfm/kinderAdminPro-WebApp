import { component$, useSignal } from "@builder.io/qwik";
import { DocumentHead, Form, routeAction$, routeLoader$, z, zod$ } from "@builder.io/qwik-city";
import { getEmployeeJob, updateEmployeeJob } from "~/services/payroll.service";
import { BaseError } from "~/types/shared.types";

export const useGetEmployeeJob = routeLoader$(async (event) => {
  const response = await getEmployeeJob(Number(event.params.id));
  if (!response) {
    throw event.redirect(308, "/payroll/jobs");
  }
  return {
    employeeJob: response,
  }
});

export const useUpdateEmployeeJob = routeAction$(async (data, event) => {
  const response = await updateEmployeeJob({ id: Number(event.params.id), name: data.name, salary: data.salary });
  if (response instanceof BaseError) {
    return event.fail(response.status, { message: response.message });
  }
  return {
    success: true,
    job: response,
  };
}, zod$({
  name: z.string().min(3),
  salary: z.coerce.number().min(1000),
}));

export default component$(() => {
  const getEmployeeJobLoader = useGetEmployeeJob();

  const updateEmployeeJobAction = useUpdateEmployeeJob();

  const jobName = useSignal(getEmployeeJobLoader.value.employeeJob.name);
  const jobSalary = useSignal(getEmployeeJobLoader.value.employeeJob.salary);

  return (
    <div class="flex flex-col items-center h-full space-y-10">
      <h1 class="mt-18 text-4xl">Editar Trabajo: {getEmployeeJobLoader.value.employeeJob.name}</h1>

      <Form class="max-w-md mx-auto w-full" action={updateEmployeeJobAction} onSubmit$={() => {
        if (!updateEmployeeJobAction.value) {
          return;
        }
        if (updateEmployeeJobAction.value.failed) {
          alert(`updateEmployeeAction failed:\n${updateEmployeeJobAction.value.message}`);
          return;
        }
        console.log(updateEmployeeJobAction.value.job);
        window.location.href = "/payroll/jobs";
      }}>
        <div class="relative z-0 w-full mb-5 group">
          <input bind:value={jobName} type="text" name="name" id="name" class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
          <label for="name" class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Nombre</label>
        </div>
        <div class="grid md:grid-cols-2 md:gap-6">
          <label for="jobSalary" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Salario:</label>
          <input bind:value={jobSalary} type="number" id="jobSalary" name="salary" aria-describedby="helper-text-explanation" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="90210" required />
        </div>
        <button type="submit" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Actualizar</button>
      </Form>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Editar Trabajo",
  meta: [
    {
      name: "description",
      content: "Job info management",
    },
  ],
};
