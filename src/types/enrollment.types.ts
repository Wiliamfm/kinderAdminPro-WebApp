export type StudentResponse = {
  id: string;
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
  gradeId?: string;
  guardians: GuardianResponse[];
};

export type GuardianResponse = {
  id: string;
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
  gradeId: string;
  guardianIds: string[];
};

export type CreateGuardianRequest = {
  name: string;
  documentNumber: string;
  phone: string;
  profession: string;
  company: string;
  email: string;
  address: string;
  typeId: string;
};

export type GuardianTypeResponse = {
  id: string;
  name: string;
  displayName: string;
  description: string;
}

export type GradeResponse = {
  id: string;
  name: string;
}

export type StudentApplicationStatusResponse = {
  id: string;
  studentApplicationId: string;
  createdAt: Date;
  status: StudentApplicationStatusTypeResponse;
};

export type StudentApplicationStatusTypeResponse = {
  id: string;
  name: string;
  description: string;
}

export type StudentApplicationResponse = {
  id: string;
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
