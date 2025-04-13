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
  type: GuardianTypeEnum;
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
  description: string;
}

export type GradeResponse = {
  id: string;
  name: string;
}
