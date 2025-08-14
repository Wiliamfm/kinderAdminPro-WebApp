export type Bulletin = {
  id: number,
  type: string,
  name: string
};

export type StudentBulletin = {
  id: number,
  studentId: number,
  bulletinId: number,
  value: number
}
