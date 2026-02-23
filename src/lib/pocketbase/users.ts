import pb, { normalizePocketBaseError } from './client';

export type AppUserRecord = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  verified: boolean;
};

export type CreateEmployeeUserInput = {
  email: string;
  name: string;
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toBooleanValue(value: unknown): boolean {
  return value === true;
}

function mapUserRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): AppUserRecord {
  return {
    id: record.id,
    email: toStringValue(record.get?.('email') ?? record.email),
    name: toStringValue(record.get?.('name') ?? record.name),
    isAdmin: toBooleanValue(record.get?.('is_admin') ?? record.is_admin),
    verified: toBooleanValue(record.get?.('verified') ?? record.verified),
  };
}

function buildTemporaryPassword(): string {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `Tmp_${Date.now()}_${randomPart}Aa1!`;
}

export async function createEmployeeUser(payload: CreateEmployeeUserInput): Promise<AppUserRecord> {
  const email = payload.email.trim();
  const name = payload.name.trim();
  const tempPassword = buildTemporaryPassword();

  try {
    const record = await pb.collection('users').create({
      email,
      name,
      password: tempPassword,
      passwordConfirm: tempPassword,
      is_admin: false,
    });

    return mapUserRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function sendVerificationEmail(email: string): Promise<void> {
  try {
    await pb.collection('users').requestVerification(email.trim());
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function sendPasswordSetupEmail(email: string): Promise<void> {
  try {
    await pb.collection('users').requestPasswordReset(email.trim());
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function sendUserOnboardingEmails(email: string): Promise<void> {
  await sendPasswordSetupEmail(email);
}

export async function resendUserOnboarding(email: string): Promise<void> {
  await sendUserOnboardingEmails(email);
}

export async function confirmVerificationToken(token: string): Promise<void> {
  try {
    await pb.collection('users').confirmVerification(token.trim());
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function confirmPasswordSetupToken(
  token: string,
  password: string,
  passwordConfirm: string,
): Promise<void> {
  try {
    await pb.collection('users').confirmPasswordReset(token.trim(), password, passwordConfirm);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
