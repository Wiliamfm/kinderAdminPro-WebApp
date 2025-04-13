import { routeAction$, server$, z, zod$ } from "@builder.io/qwik-city";
import { CreateStudentRequest, GuardianResponse, GuardianTypeEnum, GuardianTypeResponse, StudentResponse } from "~/types/enrollment.types";

const students: StudentResponse[] = [
  {
    id: "stu-001",
    fullName: "Emma Johnson",
    birthDate: new Date("2018-03-12"),
    birthPlace: "Bogotá, Colombia",
    department: "Early Childhood Education",
    documentNumber: "A123456789",
    weight: 18.5,
    height: 105,
    bloodType: "O+",
    socialSecurity: "123-45-6789",
    allergies: ["Peanuts", "Dust"],
    gradeId: "grade-kg1",
    guardians: [
      {
        id: "gua-001",
        name: "Michael Johnson",
        documentNumber: "CC1234567",
        phone: "+57 300 1234567",
        profession: "Engineer",
        company: "Bogotá Tech Ltd.",
        email: "michael.johnson@example.com",
        address: "Calle 123 #45-67, Bogotá",
        type: GuardianTypeEnum.Father,
      },
    ],
  },
  {
    id: "stu-002",
    fullName: "Liam García",
    birthDate: new Date("2019-07-22"),
    birthPlace: "Bogotá, Colombia",
    department: "Preschool",
    documentNumber: "B987654321",
    weight: 16.2,
    height: 98,
    bloodType: "A-",
    socialSecurity: "987-65-4321",
    allergies: [],
    gradeId: "grade-prek",
    guardians: [
      {
        id: "gua-002",
        name: "Sofía García",
        documentNumber: "CC2345678",
        phone: "+57 301 7654321",
        profession: "Graphic Designer",
        company: "Creativa SAS",
        email: "sofia.garcia@example.com",
        address: "Carrera 10 #20-30, Bogotá",
        type: GuardianTypeEnum.Mother,
      },
    ],
  },
  {
    id: "stu-003",
    fullName: "Ava Kim",
    birthDate: new Date("2017-11-05"),
    birthPlace: "Bogotá, Colombia",
    department: "Kindergarten",
    documentNumber: "C456789123",
    weight: 20.1,
    height: 110,
    bloodType: "B+",
    socialSecurity: "111-22-3333",
    allergies: ["Gluten"],
    gradeId: "grade-kg2",
    guardians: [
      {
        id: "gua-003",
        name: "Daniel Kim",
        documentNumber: "CC3456789",
        phone: "+57 302 3456789",
        profession: "Doctor",
        company: "Hospital San José",
        email: "daniel.kim@example.com",
        address: "Avenida 68 #30-55, Bogotá",
        type: GuardianTypeEnum.Father,
      },
      {
        id: "gua-004",
        name: "Grace Kim",
        documentNumber: "CC4567890",
        phone: "+57 304 9876543",
        profession: "Lawyer",
        company: "Legal Group Colombia",
        email: "grace.kim@example.com",
        address: "Avenida 68 #30-55, Bogotá",
        type: GuardianTypeEnum.Mother,
      },
    ],
  },
];

const guardians: GuardianResponse[] = [
  {
    id: "gua-001",
    name: "Michael Johnson",
    documentNumber: "CC1234567",
    phone: "+57 300 1234567",
    profession: "Engineer",
    company: "Bogotá Tech Ltd.",
    email: "michael.johnson@example.com",
    address: "Calle 123 #45-67, Bogotá",
    type: GuardianTypeEnum.Father,
  },
  {
    id: "gua-002",
    name: "Sofía García",
    documentNumber: "CC2345678",
    phone: "+57 301 7654321",
    profession: "Graphic Designer",
    company: "Creativa SAS",
    email: "sofia.garcia@example.com",
    address: "Carrera 10 #20-30, Bogotá",
    type: GuardianTypeEnum.Mother,
  },
  {
    id: "gua-003",
    name: "Daniel Kim",
    documentNumber: "CC3456789",
    phone: "+57 302 3456789",
    profession: "Doctor",
    company: "Hospital San José",
    email: "daniel.kim@example.com",
    address: "Avenida 68 #30-55, Bogotá",
    type: GuardianTypeEnum.Father,
  },
  {
    id: "gua-004",
    name: "Grace Kim",
    documentNumber: "CC4567890",
    phone: "+57 304 9876543",
    profession: "Lawyer",
    company: "Legal Group Colombia",
    email: "grace.kim@example.com",
    address: "Avenida 68 #30-55, Bogotá",
    type: GuardianTypeEnum.Mother,
  },
];

const guardianTypes: GuardianTypeResponse[] = [
  {
    id: "1",
    name: "father",
    description: "Biological or legal male guardian of the student",
  },
  {
    id: "2",
    name: "mother",
    description: "Biological or legal female guardian of the student",
  },
  {
    id: "3",
    name: "tutor",
    description: "Appointed legal representative or caregiver for the student",
  },
];


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

export const getStudent = server$(async (id: string) => {
  const student = students.find((student) => student.id === id);
  if (!student) {
    throw new Error("Student not found!");
  }
  return student;
});

export const getGuardians = server$(async () => {
  return guardians;
});
