import { routeAction$, routeLoader$, server$, z, zod$ } from "@builder.io/qwik-city";
import { students, guardians, grades, guardianTypes, bloodTypes } from "~/data/enrollment.data";
import { StudentResponse } from "~/types/enrollment.types";

export const getStudents = server$(function() {
  return students;
});

export const useCreateStudent = routeAction$((data, event) => {
  const lastId = students.length + 1;
  const studentGuardians = guardians.filter(guardian => data.guardianIds.includes(guardian.id));
  if (studentGuardians.length !== data.guardianIds.length) {
    return event.fail(400, { message: "Invalid guardian IDs" });
  }
  const response: StudentResponse = { ...data, id: `${lastId}`, guardians: studentGuardians };
  students.push(response);
  return response;
}, zod$({
  fullName: z.string().min(1, "Full name is required"),
  birthDate: z.coerce.date(),
  birthPlace: z.string().min(1, "Birth place is required"),
  department: z.string().min(1, "Department is required"),
  documentNumber: z.string().min(1, "Document number is required"),
  weight: z.number().positive("Weight must be a positive number"),
  height: z.number().positive("Height must be a positive number"),
  bloodType: z.string().min(1, "Blood type is required"),
  socialSecurity: z.string().min(1, "Social security is required"),
  allergies: z.array(z.string()).default([]),
  gradeId: z.string().min(1, "Grade ID is required"),
  guardianIds: z.array(z.string().min(1)).min(1, "At least one guardian is required"),
}));

export const useUpdateStudent = routeAction$((data, event) => {
  let student = students.find(student => student.id === data.id);
  if (!student) {
    return event.fail(404, { message: "Student not found" });
  }
  const guardianIds = data.guardianIds.split(',').map(id => id.trim());
  const studentGuardians = guardians.filter(guardian => guardianIds.includes(guardian.id));
  if (studentGuardians.length !== guardianIds.length) {
    return event.fail(400, { message: "Invalid guardian IDs" });
  }
  const allergies = data.allergies.split(',').map(allergy => allergy.trim());
  student = { ...data, guardians: studentGuardians, allergies: allergies };
  students.splice(students.findIndex(student => student.id === data.id), 1, student);


  return student;
}, zod$({
  id: z.string().min(1, "ID is required"),
  fullName: z.string().min(1, "Full name is required"),
  birthDate: z.coerce.date(),
  birthPlace: z.string().min(1, "Birth place is required"),
  department: z.string().min(1, "Department is required"),
  documentNumber: z.string().min(1, "Document number is required"),
  weight: z.coerce.number().positive("Weight must be a positive number"),
  height: z.coerce.number().positive("Height must be a positive number"),
  bloodType: z.string().min(1, "Blood type is required"),
  socialSecurity: z.string().min(1, "Social security is required"),
  allergies: z.string().min(1, "Allergies is required"),
  gradeId: z.string().min(1, "Grade ID is required"),
  guardianIds: z.string().min(1, "At least one guardian is required"),
}));

export const useDeleteStudent = routeAction$(async (data, event) => {
  const student = students.find((student) => student.id === data.id);
  if (!student) {
    return event.fail(404, { message: "Student not found!" });
  }
  const index = students.indexOf(student);
  students.splice(index, 1);
  return student;
}, zod$({
  id: z.string().min(1),
}));

export const getStudent = server$(function(id: string) {
  const student = students.find((student) => student.id === id);
  if (!student) {
    throw new Error("Student not found!");
  }
  return student;
});

export const useGetGuardians = routeLoader$(async () => {
  return guardians;
});

export const useGetGrades = routeLoader$(async () => {
  return grades;
});

export const useDeleteGuardian = routeAction$((data, event) => {
  const guardian = guardians.find((guardian) => guardian.id === data.id);
  if (!guardian) {
    return event.fail(404, { message: "Guardian not found!" });
  }
  const index = guardians.indexOf(guardian);
  guardians.splice(index, 1);
  return guardian;
}, zod$({
  id: z.string().min(1),
}));

export const getGuardian = server$(function(id: string) {
  const guardian = guardians.find((guardian) => guardian.id === id);
  if (!guardian) {
    throw new Error("Guardian not found!");
  }
  return guardian;
});

export const useUpdateGuardian = routeAction$(async (data, event) => {
  const guardian = guardians.find((guardian) => guardian.id === data.id);
  if (!guardian) {
    return event.fail(404, { message: "Guardian not found" });
  }

  const newGuardian = { ...guardian, ...data };
  guardians.splice(guardians.indexOf(guardian), 1, newGuardian);
  return guardian;
}, zod$({
  id: z.string().min(1, "ID is required"),
  fullName: z.string().min(1, "Full name is required"),
  documentNumber: z.string().min(1, "Document number is required"),
  phone: z.string().min(1, "Phone is required"),
  profession: z.string().min(1, "Profession is required"),
  company: z.string().min(1, "Company is required"),
  email: z.string().email().min(1, "Email is required"),
  address: z.string().min(1, "Address is required"),
  typeId: z.string().min(1, "Type is required"),
}));

export const useGetGuardianTypes = routeLoader$(() => {
  return guardianTypes;
});

export const useGetBloodTypes = routeLoader$(() => {
  return bloodTypes;
});
