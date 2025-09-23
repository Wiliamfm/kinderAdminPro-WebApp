export type Bulletin = {
  id: number,
  type: string,
  name: string
};

export type StudentBulletin = {
  id: number,
  studentId: number,
  bulletinId: number,
  value: number,
  semesterId: number
}

export type SemesterResponse = {
  id: number,
  createdAt: Date,
  semester: string,
  startDate: Date,
  endDate: Date,
  isActive: boolean,
}