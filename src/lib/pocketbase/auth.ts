import pb from './client';

export type AuthChangeCallback = (isAuthenticated: boolean) => void;

export async function loginWithPassword(email: string, password: string): Promise<void> {
  await pb.collection('users').authWithPassword(email, password);
}

export function logout(): void {
  pb.authStore.clear();
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}

export function getAuthUser() {
  return pb.authStore.record;
}

export function getAuthUserIdentity(): { name: string; email: string } {
  const record = getAuthUser();
  const rawName = typeof record?.name === 'string' ? record.name.trim() : '';
  const rawEmail = typeof record?.email === 'string' ? record.email.trim() : '';

  return {
    name: rawName || 'Usuario',
    email: rawEmail || 'Sin correo',
  };
}

export function subscribeAuth(callback: AuthChangeCallback): () => void {
  return pb.authStore.onChange(() => {
    callback(pb.authStore.isValid);
  });
}
