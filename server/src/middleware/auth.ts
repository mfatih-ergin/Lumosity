import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkilendirme tokenı bulunamadı.' });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'super-neuro-lumosity-secret-jwt-key-2026';

  try {
    const decoded = jwt.verify(token, secret) as { id: string; username: string; email: string };
    req.userId = decoded.id;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'super-neuro-lumosity-secret-jwt-key-2026';

  try {
    const decoded = jwt.verify(token, secret) as { id: string; username: string; email: string };
    req.userId = decoded.id;
    req.user = decoded;
  } catch {
    // Continue anonymously
  }
  next();
};
