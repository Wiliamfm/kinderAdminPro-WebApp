import { server$ } from "@builder.io/qwik-city";
import { EmployeeResponse } from "~/types/payroll.types";

const employees: EmployeeResponse[] = [
  {
    id: "1", name: "test employee", job: "test job", salary: 1000
  },
  {
    id: "2", name: "test 2 employee", job: "test job", salary: 2000
  },
];

export const createEmployee = server$(function(name: string, job: string, salary: number) {
  const lastId = employees.length + 1;
  const employee: EmployeeResponse = {
    id: lastId.toString(), name: name, job: job, salary: salary
  };
  employees.push(employee);
  return employee;
})

export const getEmployees = server$(function() {
  return employees;
});

export const getEmployee = server$(function(id: string) {
  return employees.find(e => e.id === id);
});

export const updateEmployee = server$(function(id: string, name: string, job: string, salary: number) {
  const employee = employees.find(e => e.id === id);
  if (!employee) {
    throw new Error("Employee not found!");
  }
  employee.name = name;
  employee.job = job;
  employee.salary = salary;
  return employee;
})

export const deleteEmployee = server$(function(id: string) {
  var employee = employees.find(e => e.id === id);
  if (!employee) {
    throw new Error("Employee not found!");
  }
  employees.splice(employees.indexOf(employee), 1);
  return employee;
});
