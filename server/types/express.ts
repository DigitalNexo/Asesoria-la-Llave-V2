import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    roleId: string;
    roleName?: string | null;
    permissions: string[];
  };
}
