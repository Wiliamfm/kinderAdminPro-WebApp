import { server$ } from "@builder.io/qwik-city";
import { getSupabase } from "./supabase.service";
import { Bulletin, SemesterResponse, StudentBulletin } from "~/types/report.types";
import { GradeResponse, StudentResponse } from "~/types/enrollment.types";
import { EmployeeResponse } from "~/types/payroll.types";

export const getBulletins = server$(async function () {
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

export const getBulletinsByGrade = server$(async function (gradeId: number) {
  const { data, error } = await getSupabase().from("bulletins").select("*").eq("grade_id", gradeId);
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

export const deleteBulletin = server$(async function (id: number) {
  const response = await getSupabase().from("bulletins").delete().eq("id", id);
  if (response.error && response.status !== 204) {
    return false;
  }

  return true;
});

export const getBulletin = server$(async function (id: number) {
  const { data, error } = await getSupabase().from("bulletins").select("*").eq("id", id).single();
  if (error) {
    console.error("Unable to get bulletin: ", error);
    return null;
  }

  return data as Bulletin;
});

export const createBulletin = server$(async function (name: string, type: string, gradeId: number) {
  const { data, error } = await getSupabase().from("bulletins").insert({
    name: name,
    type: type,
    grade_id: gradeId,
  }).select().single();
  if (error) {
    console.error("Unable to create bulletin.");
    return null;
  }

  return data as Bulletin;
});

export const updateBulletin = server$(async function (id: number, name: string, type: string) {
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

export const getGradesByProfessor = server$(async function (id: number, useAppId: boolean = false) {
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

export const getStudentsByProfessor = server$(async function (id: number) {
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

export const getProfessorByUserId = server$(async function (id: number) {
  const { data, error } = await getSupabase().from("employees").select("*").eq("user_app_id", id).single();
  if (error) {
    console.error("Unable to get professors: ", error);
    return null;
  }
  return data as EmployeeResponse;
});

export const deleteStudentBulletin = server$(async function (studentId: number) {
  const response = await getSupabase().from("bulletins_students").delete().eq("student_id", studentId);
  console.log(response);
  if (response.error && response.status !== 204) {
    return false;
  }

  return true;
});

export const deleteStudentBulletinValue = server$(async function (studentId: number, bulletinId: number) {
  const response = await getSupabase().from("bulletins_students").delete().eq("student_id", studentId).eq("bulletin_id", bulletinId);
  if (response.error && response.status !== 204) {
    return false;
  }

  return true;
});

export const getStudentBulletinValue = server$(async function (studentId: number, bulletinId: number, semesterId: number) {
  const { data, error } = await getSupabase().from("bulletins_students").select("*").eq("student_id", studentId).eq("bulletin_id", bulletinId).eq("semester_id", semesterId).single();
  if (error && error.code !== "PGRST116" && error.details !== "The result contains 0 rows") {
    console.error("Unable to get student bulletin value: ", error);
    return null;
  }
  return data as StudentBulletin;
});

export const createStudentBulletinValue = server$(async function (studentId: number, bulletinId: number, value: number, semesterId: number) {
  const { data, error } = await getSupabase().from("semesters").select("*").eq("is_active", true).single();
  if (error) {
    console.error("Unable to get student bulletin value: ", error);
    return null;
  }

  const response = await getSupabase().from("bulletins_students").insert({
    student_id: studentId,
    bulletin_id: bulletinId,
    value: value,
    semester_id: semesterId
  });
  if (response.error && response.status !== 204) {
    return false;
  }

  return data;
});

export const updateStudentBulletinValue = server$(async function (studentId: number, bulletinId: number, value: number, semesterId: number) {
  const response = await getSupabase().from("bulletins_students").update({
    value: value
  }).eq("student_id", studentId).eq("bulletin_id", bulletinId).eq("semester_id", semesterId).select().single();
  if (response.error && response.status !== 204) {
    console.error("Unable to update student bulletin value: ", response.error);
    return false;
  }

  return response.data;
});

export const getStudentsByGrade = server$(async function (gradeId: number) {
  const { data, error } = await getSupabase().from("students").select("*").eq("grade_id", gradeId);
  if (error) {
    console.error("Unable to get bulletin data: ", error)
    return null;
  }

  return data.map(student => {
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
  });
});

export const getSemesters = server$(async function () {
  const { data, error } = await getSupabase().from("semesters").select("*");
  if (error) {
    console.error("Unable to get semesters: ", error);
    return null;
  }

  return data.map(semester => {
    return {
      id: semester.id,
      semester: semester.semester,
      startDate: semester.start_date,
      endDate: semester.end_date,
      isActive: semester.is_active,
    } as SemesterResponse;
  }) as SemesterResponse[];
});

export const getSemester = server$(async function (id: number) {
  const { data, error } = await getSupabase().from("semesters").select("*").eq("id", id).single();
  if (error) {
    console.error("Unable to get semesters: ", error);
    return null;
  }

  return {
    id: data.id,
    semester: data.semester,
    startDate: data.start_date,
    endDate: data.end_date,
    isActive: data.is_active,
  } as SemesterResponse;

});

export const createSemester = server$(async function (semester: string, startDate: Date, endDate: Date) {
  const response = await getSupabase().from("semesters").insert({
    semester: semester,
    start_date: startDate,
    end_date: endDate,
    is_active: false
  });
  if (response.error && response.status !== 204) {
    return response.error;
  }

  return true;
})

export const updateSemester = server$(async function (id: number, semester: string, startDate: Date, endDate: Date) {
  const response = await getSupabase().from("semesters").update({
    semester: semester,
    start_date: startDate,
    end_date: endDate
  }).eq("id", id).select().single();
  if (response.error && response.status !== 204) {
    console.log("Error when updating semesters: \n", response.error);
    return null;
  }

  return response.data as SemesterResponse;
})

export const activateSemester = server$(async function (id: number) {
  const semester = await getSemester(id);
  if (!semester) {
    return null;
  }
  let response = await getSupabase().from("semesters").update({
    is_active: !semester.isActive
  }).eq("id", id).select().single();
  if (response.error && response.status !== 204) {
    console.log("Error when activating semesters: \n", response.error);
    return null;
  }

  response = await getSupabase().from("semesters").update({
    is_active: false
  }).neq("id", id);
  if (response.error && response.status !== 204) {
    console.log("Error when activating semesters: \n", response.error);
    return null;
  }

  return !semester.isActive;
})