import type { StudentCreateInput } from '../pocketbase/students';
import type { FieldErrorMap } from './realtime-validation';

export type StudentRegistrationFormValues = {
  name: string;
  grade_id: string;
  date_of_birth: string;
  birth_place: string;
  department: string;
  document_id: string;
  weight: string;
  height: string;
  blood_type: string;
  social_security: string;
  allergies: string;
};

export const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export const DOCUMENT_ID_REGEX = /^\d+$/;
export const DUPLICATE_STUDENT_DOCUMENT_MESSAGE = 'Ya existe un estudiante con este documento';

export const STUDENT_REGISTRATION_VALIDATED_FIELDS = [
  'name',
  'grade_id',
  'date_of_birth',
  'birth_place',
  'department',
  'document_id',
  'weight',
  'height',
  'blood_type',
] as const;

export type StudentRegistrationValidatedField = (typeof STUDENT_REGISTRATION_VALIDATED_FIELDS)[number];

export const emptyStudentRegistrationForm: StudentRegistrationFormValues = {
  name: '',
  grade_id: '',
  date_of_birth: '',
  birth_place: '',
  department: '',
  document_id: '',
  weight: '',
  height: '',
  blood_type: '',
  social_security: '',
  allergies: '',
};

function isAtLeastYearsOld(date: Date, minimumYears: number): boolean {
  const threshold = new Date();
  threshold.setFullYear(threshold.getFullYear() - minimumYears);
  return date.getTime() <= threshold.getTime();
}

export function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return Number.NaN;

  return numeric;
}

export function sanitizeNumericValue(value: string): string {
  return value.replace(/\D+/g, '');
}

export function isStudentRegistrationValidatedField(
  field: keyof StudentRegistrationFormValues,
): field is StudentRegistrationValidatedField {
  return (STUDENT_REGISTRATION_VALIDATED_FIELDS as readonly string[]).includes(field);
}

export function validateStudentRegistrationForm(
  form: StudentRegistrationFormValues,
  availableGradeIds: Set<string>,
): FieldErrorMap<StudentRegistrationValidatedField> {
  const errors: FieldErrorMap<StudentRegistrationValidatedField> = {};

  if (form.name.trim().length === 0) errors.name = 'Nombre es obligatorio.';
  if (form.grade_id.trim().length === 0) {
    errors.grade_id = 'Grado es obligatorio.';
  } else if (availableGradeIds.size > 0 && !availableGradeIds.has(form.grade_id.trim())) {
    errors.grade_id = 'Selecciona un grado válido.';
  }
  if (form.date_of_birth.trim().length === 0) errors.date_of_birth = 'Fecha de nacimiento es obligatorio.';
  if (form.birth_place.trim().length === 0) errors.birth_place = 'Lugar de nacimiento es obligatorio.';
  if (form.department.trim().length === 0) errors.department = 'Departamento es obligatorio.';
  if (form.document_id.trim().length === 0) {
    errors.document_id = 'Documento es obligatorio.';
  } else if (!DOCUMENT_ID_REGEX.test(form.document_id.trim())) {
    errors.document_id = 'Documento debe contener solo números.';
  }
  if (form.blood_type.trim().length === 0) {
    errors.blood_type = 'Tipo de sangre es obligatorio.';
  } else if (!BLOOD_TYPE_OPTIONS.includes(form.blood_type.trim() as (typeof BLOOD_TYPE_OPTIONS)[number])) {
    errors.blood_type = 'Selecciona un tipo de sangre válido.';
  }

  if (!errors.date_of_birth) {
    const dateOfBirth = new Date(form.date_of_birth.trim());
    if (Number.isNaN(dateOfBirth.getTime())) {
      errors.date_of_birth = 'La fecha de nacimiento no es válida.';
    } else if (!isAtLeastYearsOld(dateOfBirth, 2)) {
      errors.date_of_birth = 'El estudiante debe tener al menos 2 años.';
    }
  }

  const weight = parseOptionalNumber(form.weight);
  if (Number.isNaN(weight)) {
    errors.weight = 'El peso debe ser un número válido mayor o igual a 0.';
  }

  const height = parseOptionalNumber(form.height);
  if (Number.isNaN(height)) {
    errors.height = 'La altura debe ser un número válido mayor o igual a 0.';
  }

  return errors;
}

export function toStudentCreateInput(form: StudentRegistrationFormValues): StudentCreateInput {
  const weight = parseOptionalNumber(form.weight);
  const height = parseOptionalNumber(form.height);

  return {
    name: form.name.trim(),
    grade_id: form.grade_id.trim(),
    date_of_birth: new Date(form.date_of_birth.trim()).toISOString(),
    birth_place: form.birth_place.trim(),
    department: form.department.trim(),
    document_id: form.document_id.trim(),
    weight: typeof weight === 'number' && Number.isFinite(weight) ? weight : null,
    height: typeof height === 'number' && Number.isFinite(height) ? height : null,
    blood_type: form.blood_type.trim(),
    social_security: form.social_security.trim(),
    allergies: form.allergies.trim(),
  };
}
