declare module './services/update-service.js' {
  export function performSystemUpdate(...args: any[]): Promise<any>;
  export function verifyGitSetup(...args: any[]): Promise<any>;
  export function getUpdateHistory(...args: any[]): Promise<any>;
}

declare module './services/migration-service' {
  export function migrateStorage(...args: any[]): Promise<any>;
}
