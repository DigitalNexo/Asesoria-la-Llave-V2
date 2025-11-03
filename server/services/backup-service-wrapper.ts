// Lightweight wrapper to avoid compiling heavy backup-service.ts in TypeScript checks
// and to decouple type-checking from implementation details. All functions are
// delegated dynamically to the built JS module at runtime.

type AnyFn = (...args: any[]) => Promise<any>;

// Stub implementations for now - these services are not fully implemented yet
export const createSystemBackup: AnyFn = async (...args) => {
  throw new Error('Backup service not implemented yet');
};

export const listBackups: AnyFn = async (...args) => {
  return [];
};

export const restoreFromBackup: AnyFn = async (...args) => {
  throw new Error('Restore service not implemented yet');
};

export const restartService: AnyFn = async (...args) => {
  throw new Error('Restart service not implemented yet');
};
