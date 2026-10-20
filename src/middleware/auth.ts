// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: {
    id: number;
    uid: string;
    email: string;
    displayName: string | null;
    role: string;
  };
}

/**
 * Validates Firebase ID token if provided.
 * If token is present, links/syncs user with Cloud SQL database.
 * If optional is true, allows unauthenticated or local staff session requests through.
 */
export const requireAuth = (requiredRole?: 'manager' | 'employee') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const staffRoleHeader = (req.headers['x-staff-role'] as string) || '';
    const staffNameHeader = (req.headers['x-staff-name'] as string) || '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        req.user = decoded;

        // Upsert user in Cloud SQL
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.uid, decoded.uid));

        let currentRole = 'employee';
        if (existingUsers.length > 0) {
          req.dbUser = existingUsers[0];
          currentRole = existingUsers[0].role;
        } else {
          // First registered user or specific email can default to manager
          const isManagerEmail = decoded.email?.includes('admin') || decoded.email?.includes('ashish') || false;
          const [newUser] = await db
            .insert(users)
            .values({
              uid: decoded.uid,
              email: decoded.email || 'user@retailcotton.com',
              displayName: decoded.name || decoded.email?.split('@')[0] || 'Store Associate',
              role: isManagerEmail ? 'manager' : 'employee',
            })
            .returning();
          req.dbUser = newUser;
          currentRole = newUser.role;
        }

        if (requiredRole === 'manager' && currentRole !== 'manager') {
          return res.status(403).json({ error: 'Access denied: Manager role required' });
        }

        return next();
      } catch (err) {
        console.warn('Firebase token verification warning:', err);
        // Fall back to staff header if token expired or client offline
      }
    }

    // Role-based verification via staff headers (useful for POS counter cashier shifts)
    if (staffRoleHeader) {
      req.dbUser = {
        id: 0,
        uid: 'staff-' + staffRoleHeader,
        email: staffRoleHeader + '@retailcotton.com',
        displayName: staffNameHeader || (staffRoleHeader === 'manager' ? 'Store Manager' : 'Cashier Counter'),
        role: staffRoleHeader,
      };

      if (requiredRole === 'manager' && staffRoleHeader !== 'manager') {
        return res.status(403).json({ error: 'Access denied: Manager role required' });
      }

      return next();
    }

    // If no role strictly required, allow request to proceed as guest/counter cashier
    if (!requiredRole) {
      req.dbUser = {
        id: 1,
        uid: 'pos-terminal-1',
        email: 'terminal@retailcotton.com',
        displayName: 'POS Main Terminal',
        role: 'employee',
      };
      return next();
    }

    return res.status(401).json({ error: 'Authentication required' });
  };
};
