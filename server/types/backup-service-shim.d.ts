declare module '../../infra/backup-service.js' {
  export const createSystemBackup: (...args: any[]) => Promise<any>;
  export const listBackups: (...args: any[]) => Promise<any>;
  export const restoreFromBackup: (...args: any[]) => Promise<any>;
  export const restartService: (...args: any[]) => Promise<any>;
}
