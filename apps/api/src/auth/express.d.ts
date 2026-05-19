import type { UserPayload } from '@/auth/auth.interface';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
