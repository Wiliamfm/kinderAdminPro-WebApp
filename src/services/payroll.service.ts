import { server$ } from "@builder.io/qwik-city";
import { EmployeeJobResponse, EmployeeResponse } from "~/types/payroll.types";

const employees: EmployeeResponse[] = [
  {
    id: "1", name: "test employee", job: "test job", salary: 1000
  },
  {
    id: "2", name: "test 2 employee", job: "test job", salary: 2000
  },
];

const employeeJobs: EmployeeJobResponse[] = [
  { id: "1", name: "test job", salary: 1000 },
  { id: "2", name: "test job 2", salary: 2000 },
]

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
  if(job.salary !== salary) {
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
