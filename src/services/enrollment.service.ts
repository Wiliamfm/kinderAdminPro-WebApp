import { routeAction$, routeLoader$, server$, z, zod$ } from "@builder.io/qwik-city";
import { bloodTypes } from "~/data/enrollment.data";
import { CreateGuardianRequest, CreateStudentRequest, GradeResponse, GuardianResponse, GuardianTypeResponse, StudentApplicationResponse, StudentResponse } from "~/types/enrollment.types";
import { getSupabase } from "./supabase.service";

/* eslint-disable */
const mapGuardiansStudentsToResponse = (data: any[]) => {
  /* eslint-enable */
  const studentsGroup: StudentResponse[] = [];
  for (const s of data) {
    let student = studentsGroup.find((student) => student.id === s.student_id.id);
    if (!student) {
      student = {
        id: s.student_id.id,
        fullName: s.student_id.full_name,
        birthDate: s.student_id.birth_date,
        birthPlace: s.student_id.birth_place,
        department: s.student_id.department,
        documentNumber: s.student_id.document_number,
        weight: s.student_id.weight,
        height: s.student_id.height,
        bloodType: s.student_id.blood_type,
        socialSecurity: s.student_id.social_security,
        allergies: s.student_id.allergies.split(","),
        gradeId: s.student_id.grade_id,
        guardians: []
      };
      studentsGroup.push(student);
    }
    if (student) {
      if (student.guardians.find((guardian) => guardian.id === s.guardian_id.id)) {
        continue;
      }
      student.guardians.push({
        id: s.guardian_id.id,
        name: s.guardian_id.full_name,
        documentNumber: s.guardian_id.document_number,
        phone: s.guardian_id.phone,
        profession: s.guardian_id.profession,
        company: s.guardian_id.company,
        email: s.guardian_id.email,
        address: s.guardian_id.address,
        typeId: s.guardian_id.type_id
      } as GuardianResponse);
    }
  }

  return studentsGroup;
}

export const getStudents = server$(async function () {
  const { data, error } = await getSupabase().from("guardians_students").select(`
*,
student_id(*),
guardian_id(*)
`);
  if (error) {
    console.error(`Unable to get students:\n`, error);
    return [];
  }
  return mapGuardiansStudentsToResponse(data);
});

const getGuardiansById = server$(async function (ids: number[]) {
  const { data, error } = await getSupabase().from("guardians").select().in("id", ids);
  if (error) {
    console.error(`Unable to get guardians:\n`, error);
    return [];
  }
  return data.map(g => {
    return {
      id: g.id,
      name: g.full_name,
      documentNumber: g.document_number,
      phone: g.phone,
      profession: g.profession,
      company: g.company,
      email: g.email,
      address: g.address,
      typeId: g.type_id
    } as GuardianResponse
  });
});

const createStudent = server$(async function (req: CreateStudentRequest) {
  const studentGuardians = await getGuardiansById(req.guardianIds);
  if (studentGuardians.length !== req.guardianIds.length) {
    console.error("ERROR: Invalid guardian IDs");
    return null;
  }

  const { data, error } = await getSupabase().from("students").insert({
    full_name: req.fullName,
    birth_date: req.birthDate,
    birth_place: req.birthPlace,
    department: req.department,
    document_number: req.documentNumber,
    weight: req.weight,
    height: req.height,
    blood_type: req.bloodType,
    social_security: req.socialSecurity,
    allergies: req.allergies.join(","),
    grade_id: req.gradeId,
  }).select();
  if (error) {
    console.error(`Unable to create student:\n`, error);
    return null;
  }

  const response: StudentResponse = data[0];

  for (const guardian of studentGuardians) {
    const res = await getSupabase().from("guardians_students").insert({
      student_id: response.id,
      guardian_id: guardian.id,
    });
    if (res.error) {
      console.error(`Unable to create student:\n`, res.error);
    }
  }

  return response;
});

export const useCreateStudent = routeAction$(async (req, event) => {
  const student = await createStudent(req);
  if (!student) {
    return event.fail(500, { message: "Error al registrar el estudiante" });
  }

  return student;
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
  gradeId: z.coerce.number().min(1, "Grade ID is required"),
  guardianIds: z.array(z.coerce.number().min(1)).min(1, "At least one guardian is required"),
}));

export const getStudent = server$(async function (id: number) {
  const { data, error } = await getSupabase().from("guardians_students").select(`
*,
student_id(*),
guardian_id(*)
`).in("student_id", [id]);
  if (error) {
    console.error(`Unable to get student:\n`, error);
    return null;
  }
  const group = mapGuardiansStudentsToResponse(data);
  if (group.length !== 1) {
    console.error("ERROR: More than one student? (getStudent)");
    return null;
  }
  return group[0];
});

export const useUpdateStudent = routeAction$(async (req, event) => {
  const student = await getStudent(req.id);
  if (!student) {
    return event.fail(404, { message: "Student not found" });
  }

  const guardianIds = req.guardianIds.split(',').map(id => Number(id.trim()));
  const studentGuardians = await getGuardiansById(guardianIds);
  if (studentGuardians.length !== guardianIds.length) {
    return event.fail(400, { message: "Invalid guardian IDs" });
  }

  const allergies = req.allergies.map(allergy => allergy.trim());
  //TODO: Update student guardians
  const { data, error } = await getSupabase().from("students").update({
    full_name: req.fullName,
    birth_date: req.birthDate,
    birth_place: req.birthPlace,
    department: req.department,
    document_number: req.documentNumber,
    weight: req.weight,
    height: req.height,
    blood_type: req.bloodType,
    social_security: req.socialSecurity,
    allergies: allergies.join(","),
    grade_id: req.gradeId,
  })
    .eq("id", req.id)
    .select()
    .single();
  if (error) {
    console.error(`Unable to update student:\n`, error);
    return event.fail(500, { message: "Error al actualizar el estudiante" });
  }

  return {
    id: data.id,
    fullName: data.full_name,
    birthDate: data.birth_date,
    birthPlace: data.birth_place,
    department: data.department,
    documentNumber: data.document_number,
    weight: data.weight,
    height: data.height,
    bloodType: data.blood_type,
    socialSecurity: data.social_security,
    allergies: allergies,
    gradeId: data.grade_id,
    guardians: studentGuardians
  } as StudentResponse;
}, zod$({
  id: z.coerce.number().min(1, "ID is required"),
  fullName: z.string().min(1, "Full name is required"),
  birthDate: z.coerce.date({ required_error: "Fecha de nacimiento requerida" }).refine(val => {
    return isAge1to6(val);
  }, "El estudiante debe tener entre 1 y 6 años."),
  birthPlace: z.string().min(1, "Birth place is required"),
  department: z.string().min(1, "Department is required"),
  documentNumber: z.string().min(6, "Número de documento requerido y mayor a 6").refine((val) => {
    return /^\d+$/.test(val);
  }, "El documento del estudiante debe ser numérico."),
  weight: z.coerce.number().positive("Weight must be a positive number"),
  height: z.coerce.number().positive("Height must be a positive number"),
  bloodType: z.string().min(1, "Blood type is required"),
  socialSecurity: z.string().min(1, "Social security is required"),
  allergies: z
    .string()
    .transform((val) =>
      val
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0)
    ),
  gradeId: z.coerce.number().min(1, "Grade ID is required"),
  guardianIds: z.string().min(1, "At least one guardian is required"),
}));

export const useDeleteStudent = routeAction$(async (data, event) => {
  const student = await getStudent(data.id);
  if (!student) {
    return event.fail(404, { message: "Student not found!" });
  }

  const bulletingResponse = await getSupabase().from("bulletins_students").delete().eq("student_id", data.id);
  if (bulletingResponse.error && bulletingResponse.status !== 204) {
    console.error(`Unable to delete student:\n`, bulletingResponse.error);
    return event.fail(500, { message: "Error al eliminar el estudiante" });
  }

  const response = await getSupabase().from("guardians_students").delete().eq("student_id", data.id)
  if (response.error && response.status !== 204) {
    console.error(`Unable to delete student:\n`, response.error);
    return event.fail(500, { message: "Error al eliminar el estudiante" });
  }
  const studentResponse = await getSupabase().from("students").delete().eq("id", data.id);
  if (studentResponse.error && studentResponse.status !== 204) {
    console.error(`Unable to delete student:\n`, studentResponse.error);
    return event.fail(500, { message: "Error al eliminar el estudiante" });
  }

  return student;
}, zod$({
  id: z.coerce.number().min(1),
}));

export const useGetGuardians = routeLoader$(async () => {
  const { data, error } = await getSupabase().from("guardians").select();
  if (error) {
    console.error(`Unable to get guardians:\n`, error);
    return [];
  }

  return data.map(g => {
    return {
      id: g.id,
      name: g.full_name,
      documentNumber: g.document_number,
      phone: g.phone,
      profession: g.profession,
      company: g.company,
      email: g.email,
      address: g.address,
      typeId: g.type_id
    } as GuardianResponse
  });
});

export const useGetGrades = routeLoader$(async () => {
  const { data, error } = await getSupabase().from("grades").select();
  if (error) {
    console.error(`Unable to get grades:\n`, error);
    return [];
  }
  return data.map(g => {
    return {
      id: g.id,
      name: g.name,
      displayName: g.display_name,
      professorId: g.professor_id
    } as GradeResponse
  });
});

export const useCreateGrade = routeAction$(async (grade, event) => {
  const { data, error } = await getSupabase().from("grades").insert({
    name: grade.name,
    display_name: grade.name,
    professor_id: grade.professorId
  }).select();
  if (error || !data || data.length === 0) {
    console.error("ERROR: Unable to create grade:\n", error);
    return event.fail(500, { message: "Error al crear la solicitud del estudiante" });
  }

  return data[0] as GradeResponse;
}, zod$({
  name: z.string().min(1, "Name is required"),
  professorId: z.coerce.number().min(1, "Professor ID is required")
}));

export const useDeleteGrade = routeAction$(async (data, event) => {
  const { error } = await getSupabase().from("grades").delete().eq("id", data.id);
  if (error) {
    console.error("Unable to delete grade:\n", error);
    return event.fail(500, { message: "Error al eliminar el curso." });
  }
}, zod$({
  id: z.coerce.number().min(1),
}));

export const useDeleteGuardian = routeAction$(async (data, event) => {
  const guardian = await getGuardian(data.id);
  if (!guardian) {
    return event.fail(404, { message: "Guardian not found!" });
  }
  const studentsWithGuardians = await getSupabase().from("guardians_students").select().eq("guardian_id", data.id);
  if (studentsWithGuardians.data?.length ?? 0 > 0) {
    return event.fail(400, { message: "No es posible eliminar el tutor ya que hay niños asociados a él." });
  }
  const { error } = await getSupabase().from("guardians").delete().eq("id", data.id);
  if (error) {
    console.error("Unable to delete guardian:\n", error);
    return event.fail(500, { message: "Error al eliminar el tutor." });
  }

  return guardian;
}, zod$({
  id: z.coerce.number().min(1),
}));

export const getGuardian = server$(async function (id: number) {
  const { data, error } = await getSupabase().from("guardians").select().eq("id", id).single();
  if (error) {
    console.error(`Unable to get guardian:\n`, error);
    return null;
  }
  return {
    id: data.id,
    name: data.full_name,
    documentNumber: data.document_number,
    phone: data.phone,
    profession: data.profession,
    company: data.company,
    email: data.email,
    address: data.address,
    typeId: data.type_id
  } as GuardianResponse
});

export const useUpdateGuardian = routeAction$(async (req, event) => {
  const guardian = await getGuardian(req.id);
  if (!guardian) {
    return event.fail(404, { message: "Guardian not found" });
  }

  const { data, error } = await getSupabase().from("guardians").update({
    full_name: req.fullName,
    document_number: req.documentNumber,
    phone: req.phone,
    profession: req.profession,
    company: req.company,
    email: req.email,
    address: req.address,
    type_id: req.typeId
  }).eq("id", req.id)
    .select()
    .single();
  if (error) {
    console.error(`Unable to update guardian:\n`, error);
    return event.fail(500, { message: "Error al actualizar el guardian" });
  }

  return {
    id: data.id,
    name: data.full_name,
    documentNumber: data.document_number,
    phone: data.phone,
    profession: data.profession,
    company: data.company,
    email: data.email,
    address: data.address,
    typeId: data.type_id
  } as GuardianResponse
}, zod$({
  id: z.coerce.number().min(1, "ID is required"),
  fullName: z.string().min(1, "Nombre del acudiente requerido"),
  documentNumber: z.string().min(6, "Número de documento del acudiente debe ser mayor a 6").refine((val) => {
    return /^\d+$/.test(val);
  }, "El documento del acudiente debe ser numérico."),
  phone: z.string().min(1, "Teléfono requerido").refine((val) => {
    return /^\d+$/.test(val);
  }, "El telefono del acudiente debe ser numérico."),
  profession: z.string().min(1, "Profession is required"),
  company: z.string().min(1, "Company is required"),
  email: z.string().email().min(1, "Email is required"),
  address: z.string().min(1, "Address is required"),
  typeId: z.coerce.number().min(1, "Type is required"),
}));

export const useGetGuardianTypes = routeLoader$(async () => {
  const { data, error } = await getSupabase().from("guardian_type").select();
  if (error) {
    console.error(`Unable to get guardian types:\n`, error);
    return [];
  }

  return data.map(t => {
    return {
      id: t.id,
      name: t.name,
      displayName: t.display_name,
      description: ""
    } as GuardianTypeResponse
  })
});

export const useGetBloodTypes = routeLoader$(() => {
  return bloodTypes;
});

export const useCreateStudentRequest = routeAction$(async (req, event) => {
  if (req.studentName === "test") {
    return event.fail(400, { message: "Error al registrar el estudiante" });
  }

  const { data, error } = await getSupabase().from("students_applications").insert({
    student_name: req.studentName,
    birth_date: req.birthDate,
    birth_place: req.birthPlace,
    department: req.department,
    student_document: req.studentDocument,
    weight: req.weight,
    height: req.height,
    blood_type: req.bloodType,
    social_security: req.socialSecurity,
    allergies: req.allergies.join(","),
    grade_id: req.gradeId,
    guardian_name: req.guardianName,
    guardian_document: req.guardianDocument,
    phone: req.phone,
    profession: req.profession,
    company: req.company,
    email: req.email,
    address: req.address,
    type_id: req.typeId,
  })
    .select(`
*,
type_id(*)
`);
  if (error) {
    console.error("ERROR: Unable to create student application:\n", error);
    return event.fail(500, { message: "Error al crear la solicitud del estudiante" });
  }

  return data[0] as StudentApplicationResponse;
}, zod$({
  studentName: z.string().min(1, "Nombre completo requerido"),
  birthDate: z.coerce.date({ required_error: "Fecha de nacimiento requerida" }).refine(val => {
    return isAge1to6(val);
  }, "El estudiante debe tener entre 1 y 6 años."),
  birthPlace: z.string().min(1, "Lugar de nacimiento requerido"),
  department: z.string().min(1, "Departamento requerido"),
  studentDocument: z.string().min(6, "Número de documento requerido y mayor a 6").refine((val) => {
    return /^\d+$/.test(val);
  }, "El documento del estudiante debe ser numérico."),
  weight: z.coerce.number().positive("El peso debe ser un número positivo"),
  height: z.coerce.number().positive("La altura debe ser un número positivo"),
  bloodType: z.string().min(1, "Tipo de sangre requerido"),
  socialSecurity: z.string().min(1, "EPS requerida"),
  allergies: z
    .string()
    .transform((val) =>
      val
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0)
    ),
  gradeId: z.string().min(1, "Grado requerido"),
  guardianName: z.string().min(1, "Nombre del acudiente requerido"),
  phone: z.string().min(1, "Teléfono requerido").refine((val) => {
    return /^\d+$/.test(val);
  }, "El telefono del acudiente debe ser numérico."),
  profession: z.string(),
  company: z.string(),
  email: z.string().email("Correo inválido"),
  address: z.string().min(1, "Dirección requerida"),
  typeId: z.string().min(1, "Tipo de acudiente requerido"),
  guardianDocument: z.string().min(6, "Número de documento del acudiente debe ser mayor a 6").refine((val) => {
    return /^\d+$/.test(val);
  }, "El documento del acudiente debe ser numérico."),
}));

export const useGetStudentApplications = routeLoader$(async () => {
  const { data, error } = await getSupabase().from("students_applications").select(`
*,
type_id(*),
grade_id(*)
`);
  if (error) {
    console.error("ERROR: Unable to get student applications:\n", error);
    return [];
  }

  return data.map(a => {
    return {
      id: a.id,
      studentName: a.student_name,
      birthDate: a.birth_date,
      birthPlace: a.birth_place,
      department: a.department,
      studentDocument: a.student_document,
      weight: a.weight,
      height: a.height,
      bloodType: a.blood_type,
      socialSecurity: a.social_security,
      allergies: a.allergies.split(","),
      gradeId: a.grade_id,
      guardianName: a.guardian_name,
      phone: a.phone,
      profession: a.profession,
      company: a.company,
      email: a.email,
      address: a.address,
      typeId: a.type_id,
      guardianDocument: a.guardian_document
    } as StudentApplicationResponse
  });
});

const getStudentApplication = server$(async (id: number) => {
  const { data, error } = await getSupabase().from("students_applications").select().eq("id", id).single();
  if (error) {
    console.error(`ERROR: Unable to get student application ${id}:\n`, error);
    return null;
  }

  return {
    id: data.id,
    studentName: data.student_name,
    birthDate: data.birth_date,
    birthPlace: data.birth_place,
    department: data.department,
    studentDocument: data.student_document,
    weight: data.weight,
    height: data.height,
    bloodType: data.blood_type,
    socialSecurity: data.social_security,
    allergies: data.allergies.split(","),
    gradeId: data.grade_id,
    guardianName: data.guardian_name,
    phone: data.phone,
    profession: data.profession,
    company: data.company,
    email: data.email,
    address: data.address,
    typeId: data.type_id,
    guardianDocument: data.guardian_document
  } as StudentApplicationResponse
})

const deleteStudentApplication = server$(async (id: number) => {
  const { error } = await getSupabase().from("students_applications").delete().eq("id", id);
  if (error) {
    console.error("ERROR: Unable to delete student application:\n", error);
    return false;
  }
  return true;
});

export const useDeleteStudentApplication = routeAction$(async (req, event) => {
  const application = await getStudentApplication(req.id);
  if (!application) {
    return event.fail(404, { message: "Application not found" });
  }

  const deleted = await deleteStudentApplication(application.id);
  if (!deleted) {
    return event.fail(500, { message: "Error al eliminar la solicitud del estudiante" });
  }

  return application;
}, zod$({
  id: z.coerce.number().min(1),
}));

const createGuardian = server$(async (guardian: CreateGuardianRequest) => {
  const { data, error } = await getSupabase().from("guardians").insert({
    full_name: guardian.name,
    document_number: guardian.documentNumber,
    phone: guardian.phone,
    profession: guardian.profession,
    company: guardian.company,
    email: guardian.email,
    address: guardian.address,
    type_id: guardian.typeId
  }).select();
  if (error || !data || data.length === 0) {
    console.error("ERROR: Unable to create guardian:\n", error);
    return null;
  }

  return data[0] as GuardianResponse;
});

export const useAcceptStudentApplication = routeAction$(async (req, event) => {
  const application = await getStudentApplication(req.id);
  if (!application) {
    return event.fail(404, { message: "Application not found" });
  }

  const guardian = await createGuardian({
    name: application.guardianName,
    documentNumber: application.guardianDocument,
    phone: application.phone,
    profession: application.profession,
    company: application.company,
    email: application.email,
    address: application.address,
    typeId: application.typeId
  });
  if (!guardian) {
    return event.fail(500, { message: "Error al crear el acudiente" });
  }

  const student = await createStudent({
    fullName: application.studentName,
    birthDate: application.birthDate,
    birthPlace: application.birthPlace,
    department: application.department,
    documentNumber: application.studentDocument,
    weight: application.weight,
    height: application.height,
    bloodType: application.bloodType,
    socialSecurity: application.socialSecurity,
    allergies: application.allergies,
    gradeId: application.gradeId,
    guardianIds: [guardian.id]
  })

  if (!student) {
    return event.fail(500, { message: "Error al crear el estudiante" });
  }
  const error = await deleteStudentApplication(application.id);
  if (!error) {
    return event.fail(500, { message: "Error al eliminar la solicitud del estudiante" });
  }

  return student;
}, zod$({
  id: z.coerce.number().min(1),
}));

export const getGrade = server$(async function (id: number) {
  const { data, error } = await getSupabase().from("grades").select().eq("id", id).single();
  if (error) {
    console.error(`Unable to get grades:\n`, error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    displayName: data.display_name
  } as GradeResponse;
});

export const useUpdateGrade = routeAction$(async (req, event) => {
  const grade = await getGrade(req.id);
  if (!grade) {
    return event.fail(404, { message: "Grade not found" });
  }

  const { data, error } = await getSupabase().from("grades").update({
    display_name: req.name,
    professor_id: req.professorId
  })
    .eq("id", req.id)
    .select()
    .single();
  if (error) {
    console.error(`Unable to update grade:\n`, error);
    return event.fail(500, { message: "Error al actualizar el grado" });
  }

  return {
    id: data.id,
    name: data.name,
    displayName: data.display_name
  } as GradeResponse;
}, zod$({
  id: z.coerce.number().min(1),
  name: z.string().min(1, "Name is required"),
  professorId: z.coerce.number().min(1),
}));

function isAge1to6(birthDate: unknown): boolean {
  if (!(birthDate instanceof Date) || Number.isNaN(birthDate.getTime())) return false;

  const today = new Date();
  if (birthDate > today) return false;                 // future → invalid

  let age = today.getFullYear() - birthDate.getFullYear();
  const hadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hadBirthday) age -= 1;

  return age >= 1 && age <= 6;   // 1,2,3,4,5,6 → true
}