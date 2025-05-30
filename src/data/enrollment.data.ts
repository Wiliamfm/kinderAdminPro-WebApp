import { GradeResponse, GuardianResponse, GuardianTypeEnum, GuardianTypeResponse, StudentApplicationResponse, StudentApplicationStatusResponse, StudentApplicationStatusTypeResponse, StudentResponse } from "~/types/enrollment.types";

export const bloodTypes = [
  { id: "A+", name: "A+" },
  { id: "A-", name: "A-" },
  { id: "B+", name: "B+" },
  { id: "B-", name: "B-" },
  { id: "AB+", name: "AB+" },
  { id: "AB-", name: "AB-" },
  { id: "O+", name: "O+" },
  { id: "O-", name: "O-" },
];

export const students: StudentResponse[] = [
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
        typeId: GuardianTypeEnum.Father,
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
        typeId: GuardianTypeEnum.Mother,
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
        typeId: GuardianTypeEnum.Father,
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
        typeId: GuardianTypeEnum.Mother,
      },
    ],
  },
];

export const guardians: GuardianResponse[] = [
  {
    id: "gua-001",
    name: "Michael Johnson",
    documentNumber: "CC1234567",
    phone: "+57 300 1234567",
    profession: "Engineer",
    company: "Bogotá Tech Ltd.",
    email: "michael.johnson@example.com",
    address: "Calle 123 #45-67, Bogotá",
    typeId: "1",
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
    typeId: "2",
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
    typeId: "1",
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
    typeId: "2",
  },
];

export const guardianTypes: GuardianTypeResponse[] = [
  {
    id: "1",
    name: "father",
    displayName: "Padre",
    description: "Biological or legal male guardian of the student",
  },
  {
    id: "2",
    name: "mother",
    displayName: "Madre",
    description: "Biological or legal female guardian of the student",
  },
  {
    id: "3",
    name: "tutor",
    displayName: "Tutor Legal",
    description: "Appointed legal representative or caregiver for the student",
  },
];

export const grades: GradeResponse[] = [
  {
    id: "grade-prek",
    name: "Pre-Kinder"
  },
  {
    id: "grade-kg1",
    name: "Kindergarten 1",
  },
  {
    id: "grade-kg2",
    name: "Kindergarten 2",
  },
];

export const studentApplications: StudentApplicationResponse[] = [];
export const studentApplicationStatuses: StudentApplicationStatusResponse[] = [];
export const studentApplicationStatusTypes: StudentApplicationStatusTypeResponse[] = [];
