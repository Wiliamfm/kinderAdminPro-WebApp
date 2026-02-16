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

export function subscribeAuth(callback: AuthChangeCallback): () => void {
  return pb.authStore.onChange(() => {
    callback(pb.authStore.isValid);
  });
}
