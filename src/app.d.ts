import type PocketBase from 'pocketbase';
import type { AuthUser } from './lib/auth/shared';

declare namespace App {
  interface RequestEventLocals {
    pb?: PocketBase;
    authUser?: AuthUser | null;
  }
}

export {};
