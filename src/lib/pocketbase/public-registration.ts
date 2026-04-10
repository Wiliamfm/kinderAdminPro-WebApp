import { createServerPocketBase } from '../server/auth-session';
import { normalizePocketBaseError } from './errors';
import { publicCreateFather } from './public-fathers';
import { publicCreateStudent } from './public-students';
import { publicCreateStudentFatherLink } from './public-students-fathers';
import type { FatherCreateInput } from './fathers';
import type { StudentCreateInput } from './students';
import type { StudentFatherRelationship } from './students-fathers';

export type PublicRegistrationInput = {
  father: FatherCreateInput;
  student: StudentCreateInput;
  relationship: StudentFatherRelationship;
};

function getRequiredEnvValue(name: 'BASE_ADMIN_EMAIL' | 'BASE_ADMIN_PASSWORD'): string {
  const value = process.env[name]?.trim() ?? '';
  if (!value) {
    throw new Error(`${name} must be set to process public registration rollbacks.`);
  }

  return value;
}

async function getRollbackPb() {
  const pb = createServerPocketBase();
  await pb.collection('_superusers').authWithPassword(
    getRequiredEnvValue('BASE_ADMIN_EMAIL'),
    getRequiredEnvValue('BASE_ADMIN_PASSWORD'),
  );
  return pb;
}

async function rollbackCreatedRecords(studentId: string, fatherId: string): Promise<void> {
  const pb = await getRollbackPb();

  if (studentId) {
    try {
      await pb.collection('students').delete(studentId);
    } catch (error) {
      console.error('Failed to rollback student after public registration error.', error);
    }
  }

  if (fatherId) {
    try {
      await pb.collection('fathers').delete(fatherId);
    } catch (error) {
      console.error('Failed to rollback father after public registration error.', error);
    }
  }
}

export async function submitPublicRegistration(payload: PublicRegistrationInput): Promise<void> {
  "use server";

  let createdFatherId = '';
  let createdStudentId = '';

  try {
    const createdFather = await publicCreateFather(payload.father);
    createdFatherId = createdFather.id;

    const createdStudent = await publicCreateStudent(payload.student);
    createdStudentId = createdStudent.id;

    await publicCreateStudentFatherLink(
      createdStudent.id,
      createdFather.id,
      payload.relationship,
    );
  } catch (error) {
    if (createdStudentId || createdFatherId) {
      await rollbackCreatedRecords(createdStudentId, createdFatherId);
    }

    throw normalizePocketBaseError(error);
  }
}
