export type StudentResponse = {
  id: number;
  fullName: string;
  birthDate: Date;
  birthPlace: string;
  department: string;
  documentNumber: string;
  weight: number;
  height: number;
  bloodType: string;
  socialSecurity: string;
  allergies: string[];
  gradeId?: number;
  guardians: GuardianResponse[];
};

export type GuardianResponse = {
  id: number;
  name: string;
  documentNumber: string;
  phone: string;
  profession: string;
  company: string;
  email: string;
  address: string;
  typeId: string;
}

export enum GuardianTypeEnum {
  Father = "father",
  Mother = "mother",
  Tutor = "tutor",
}

export type CreateStudentRequest = {
  fullName: string;
  birthDate: Date;
  birthPlace: string;
  department: string;
  documentNumber: string;
  weight: number;
  height: number;
  bloodType: string;
  socialSecurity: string;
  allergies: string[];
  gradeId: number;
  guardianIds: number[];
};

export type CreateGuardianRequest = {
  name: string;
  documentNumber: string;
  phone: string;
  profession: string;
  company: string;
  email: string;
  address: string;
  typeId: number;
};

export type GuardianTypeResponse = {
  id: number;
  name: string;
  displayName: string;
  description: string;
}

export type GradeResponse = {
  id: number;
  name: string;
  displayName: string;
  professorId: number;
}

export type StudentApplicationStatusResponse = {
  id: number;
  studentApplicationId: number;
  createdAt: Date;
  status: StudentApplicationStatusTypeResponse;
};

export type StudentApplicationStatusTypeResponse = {
  id: number;
  name: string;
  displayName: string;
}

export type StudentApplicationResponse = {
  id: number;
  studentName: string;
  birthDate: Date;
  birthPlace: string;
  department: string;
  studentDocument: string;
  weight: number;
  height: number;
  bloodType: string;
  socialSecurity: string;
  allergies: string[];
  gradeId: number;

  guardianName: string;
  phone: string;
  profession: string;
  company: string;
  email: string;
  address: string;
  typeId: number;
  guardianDocument: string;
};

export type StudentApplicationRequest = {
  studentName: string;
  birthDate: Date;
  birthPlace: string;
  department: string;
  studentDocument: string;
  weight: number;
  height: number;
  bloodType: string;
  socialSecurity: string;
  allergies: string[];
  gradeId: string;

  guardianName: string;
  phone: string;
  profession: string;
  company: string;
  email: string;
  address: string;
  typeId: string;
  guardianDocument: string;
};
