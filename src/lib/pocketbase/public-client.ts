import type PocketBase from 'pocketbase';
import { createServerPocketBase } from '../server/auth-session';

export function getPublicPb(): PocketBase {
  "use server";
  return createServerPocketBase();
}
