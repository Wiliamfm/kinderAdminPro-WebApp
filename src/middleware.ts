import { createMiddleware } from '@solidjs/start/middleware';
import { resolveRequestAuth } from './lib/server/auth-session';

export default createMiddleware({
  onRequest: async (event) => {
    await resolveRequestAuth(event);
  },
});
