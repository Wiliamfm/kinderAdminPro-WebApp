import { routeLoader$ } from "@builder.io/qwik-city";
import { getEmployeesJobs } from "~/services/payroll.service";

export const useGetEmployeeJobs = routeLoader$(async () => {
  const employeeJobs = await getEmployeesJobs();
  return { employeeJobs };
});
