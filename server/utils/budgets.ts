import crypto from 'crypto';

const SECRET = process.env.BUDGETS_SECRET || process.env.JWT_SECRET || 'change-me-budget-secret';

export function generateAcceptanceHash(code: string, createdAt: Date) {
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(code + '|' + createdAt.toISOString());
  return hmac.digest('hex');
}

export function verifyAcceptanceHash(code: string, createdAt: Date, hash: string) {
  const expected = generateAcceptanceHash(code, createdAt);
  // constant time comparison
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}
