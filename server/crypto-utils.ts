import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Cache para la clave de encriptación (determinística por proceso)
let cachedEncryptionKey: Buffer | null = null;

// La clave de encriptación debe estar en una variable de entorno
// Si no existe, se genera una clave fija basada en un valor determinístico
const getEncryptionKey = (): Buffer => {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn('⚠️  ENCRYPTION_KEY no configurada, usando clave determinística temporal (NO seguro para producción)');
    // Usar una clave determinística basada en un salt fijo para desarrollo
    // IMPORTANTE: En producción DEBE configurarse ENCRYPTION_KEY
    cachedEncryptionKey = crypto.pbkdf2Sync('dev-fallback-key-not-secure', 'smtp-salt-fixed', 100000, KEY_LENGTH, 'sha256');
  } else {
    // Derivar clave de 32 bytes desde la clave de entorno
    cachedEncryptionKey = crypto.pbkdf2Sync(key, 'smtp-salt', 100000, KEY_LENGTH, 'sha256');
  }
  
  return cachedEncryptionKey;
};

export function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Retornar: iv + authTag + encrypted (todo en hex)
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

export function decryptPassword(encryptedPassword: string): string {
  try {
    const iv = Buffer.from(encryptedPassword.slice(0, IV_LENGTH * 2), 'hex');
    const authTag = Buffer.from(encryptedPassword.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedPassword.slice((IV_LENGTH + TAG_LENGTH) * 2);
    
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error al desencriptar password SMTP:', error);
    throw new Error('Error al desencriptar credencial SMTP');
  }
}
