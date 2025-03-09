import { routeLoader$ } from "@builder.io/qwik-city";
import { getEmployeeJobs } from "~/services/payroll.service";

export const useGetEmployeeJobs = routeLoader$(async () => {
  const employeeJobs = await getEmployeeJobs();
  return { employeeJobs };
});
