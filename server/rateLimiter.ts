interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number;
}

const attemptsMap = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 3 * 60 * 1000; // 3 minutes
const LOCKOUT_MS = 2 * 60 * 1000; // 2 minutes lockout

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attemptsMap.entries()) {
    if (now > record.lockedUntil && now - record.firstAttempt > WINDOW_MS * 2) {
      attemptsMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(ip: string): { isLocked: boolean; remainingLockoutSeconds: number } {
  const now = Date.now();
  const record = attemptsMap.get(ip);

  if (!record) {
    return { isLocked: false, remainingLockoutSeconds: 0 };
  }

  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, remainingLockoutSeconds: remainingSeconds };
  }

  // Window expired, reset
  if (now - record.firstAttempt > WINDOW_MS) {
    attemptsMap.delete(ip);
    return { isLocked: false, remainingLockoutSeconds: 0 };
  }

  return { isLocked: false, remainingLockoutSeconds: 0 };
}

export function recordFailedAttempt(ip: string): { isNowLocked: boolean; lockoutSeconds: number; attemptsRemaining: number } {
  const now = Date.now();
  let record = attemptsMap.get(ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    record = {
      count: 1,
      firstAttempt: now,
      lockedUntil: 0
    };
    attemptsMap.set(ip, record);
    return { isNowLocked: false, lockoutSeconds: 0, attemptsRemaining: MAX_ATTEMPTS - 1 };
  }

  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    return { isNowLocked: true, lockoutSeconds: Math.ceil(LOCKOUT_MS / 1000), attemptsRemaining: 0 };
  }

  return {
    isNowLocked: false,
    lockoutSeconds: 0,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - record.count)
  };
}

export function recordSuccessfulAttempt(ip: string): void {
  attemptsMap.delete(ip);
}
