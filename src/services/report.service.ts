import { server$ } from "@builder.io/qwik-city";
import { getSupabase } from "./supabase.service";
import { Bulletin } from "~/types/report.types";
import { GradeResponse, StudentResponse } from "~/types/enrollment.types";
import { EmployeeResponse } from "~/types/payroll.types";

export const getBulletins = server$(async function() {
  const { data, error } = await getSupabase().from("bulletins").select("*");
  if (error) {
    console.error("Unable to get bulletin data: ", error)
    return null;
  }

  return data.map(bulletin => {
    return {
      id: bulletin.id,
      type: bulletin.type,
      name: bulletin.name
    } as Bulletin;
  });
});

export const deleteBulletin = server$(async function(id: number) {
  const response = await getSupabase().from("bulletins").delete().eq("id", id);
  if (response.error && response.status !== 204) {
    return false;
  }

  return true;
});

export const getBulletin = server$(async function(id: number) {
  const { data, error } = await getSupabase().from("bulletins").select("*").eq("id", id).single();
  if (error) {
    console.error("Unable to get bulletin: ", error);
    return null;
  }

  return data as Bulletin;
});

export const createBulletin = server$(async function(name: string, type: string) {
  const { data, error } = await getSupabase().from("bulletins").insert({
    name: name,
    type: type,
  }).select().single();
  if (error) {
    console.error("Unable to create bulletin.");
    return null;
  }

  return data as Bulletin;
});

export const updateBulletin = server$(async function(id: number, name: string, type: string) {
  const bulletin = await getBulletin(id);
  if (!bulletin) {
    return null;
  }

  const { data, error } = await getSupabase().from("bulletins").update({
    name: name,
    type: type,
  }).eq("id", id).select().single();
  if (error) {
    console.error("Unable to update bulletin: ", error);
    return null;
  }

  return data as Bulletin;
});

export const getGradesByProfessor = server$(async function(id: number, useAppId: boolean = false) {
  if (useAppId) {
    const professor = await getProfessorByUserId(id);
    if (!professor) {
      return null;
    }
    id = professor.id;
  }
  const { data, error } = await getSupabase().from("grades").select("*").eq("professor_id", id);
  if (error) {
    console.error("Unable to get grades: ", error);
    return null;
  }

  return data.map(grade => {
    return {
      id: grade.id,
      name: grade.name,
      displayName: grade.display_name,
      professorId: grade.professor_id,
    } as GradeResponse
  });
});

export const getStudentsByProfessor = server$(async function(id: number) {
  const professor = await getProfessorByUserId(id);
  if (!professor) {
    return null;
  }
  const grades = await getGradesByProfessor(professor.id);
  if (!grades || grades.length === 0) {
    return null;
  }
  let students: StudentResponse[] = [];
  for (const grade of grades) {
    const { data, error } = await getSupabase().from("students").select("*").eq("grade_id", grade.id);
    if (error) {
      console.error("Unable to get students for grade id: ", grade.id);
      return null;
    }
    students = students.concat(data.map(student => {
      return {
        id: student.id,
        fullName: student.full_name,
        birthDate: student.birth_date,
        birthPlace: student.birth_place,
        department: student.department,
        documentNumber: student.document_number,
        weight: student.weight,
        height: student.height,
        bloodType: student.blood_type,
        socialSecurity: student.social_security,
        allergies: student.allergies.split(","),
        gradeId: student.grade_id,
      } as StudentResponse;
    }));
  }

  return students;
});

export const getProfessorByUserId = server$(async function(id: number) {
  const { data, error } = await getSupabase().from("employees").select("*").eq("user_app_id", id).single();
  if (error) {
    console.error("Unable to get professors: ", error);
    return null;
  }
  return data as EmployeeResponse;
});
