/**
 * SEGURIDAD: Validaciones estrictas de configuración en producción
 * Este archivo previene errores de configuración que comprometarían la seguridad
 */

/**
 * Valida que JWT_SECRET esté configurado y sea seguro
 * @throws Error si JWT_SECRET no cumple requisitos de seguridad
 */
export function validateJWTSecret(): void {
  const jwtSecret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  // En producción, JWT_SECRET es OBLIGATORIO
  if (isProduction && !jwtSecret) {
    throw new Error(
      '\n' +
      '╔═══════════════════════════════════════════════════════════════════════╗\n' +
      '║  ❌ ERROR CRÍTICO DE SEGURIDAD: JWT_SECRET NO CONFIGURADO             ║\n' +
      '╠═══════════════════════════════════════════════════════════════════════╣\n' +
      '║                                                                       ║\n' +
      '║  En producción, JWT_SECRET es OBLIGATORIO y debe ser una cadena      ║\n' +
      '║  aleatoria fuerte de al menos 64 caracteres.                         ║\n' +
      '║                                                                       ║\n' +
      '║  Configura JWT_SECRET en tu archivo .env con un valor único:         ║\n' +
      '║                                                                       ║\n' +
      '║  Genera uno con:                                                      ║\n' +
      '║    node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"  ║\n' +
      '║                                                                       ║\n' +
      '║  O:                                                                   ║\n' +
      '║    openssl rand -hex 64                                               ║\n' +
      '║                                                                       ║\n' +
      '║  El servidor se detendrá por seguridad.                               ║\n' +
      '║                                                                       ║\n' +
      '╚═══════════════════════════════════════════════════════════════════════╝\n'
    );
  }

  // Validar que no sea un valor de ejemplo conocido
  const forbiddenSecrets = [
    'your-secret-key-change-this-in-production',
    'your-secret-key',
    'change-this-in-production',
    'change_this_in_production',
    'secret',
    'jwt-secret',
    'jwt_secret',
    '123456',
    'password',
    'admin',
    'test',
    'development',
    'prod',
    'production',
  ];

  if (jwtSecret && forbiddenSecrets.some(forbidden => jwtSecret.toLowerCase().includes(forbidden))) {
    throw new Error(
      '\n' +
      '╔═══════════════════════════════════════════════════════════════════════╗\n' +
      '║  ❌ ERROR CRÍTICO DE SEGURIDAD: JWT_SECRET INSEGURO                   ║\n' +
      '╠═══════════════════════════════════════════════════════════════════════╣\n' +
      '║                                                                       ║\n' +
      '║  El JWT_SECRET actual contiene un valor de ejemplo o predecible.     ║\n' +
      '║  Esto compromete COMPLETAMENTE la seguridad de la aplicación.        ║\n' +
      '║                                                                       ║\n' +
      `║  Valor detectado: ${jwtSecret.substring(0, 20)}...                    ║\n` +
      '║                                                                       ║\n' +
      '║  DEBES cambiar JWT_SECRET a un valor aleatorio único.                ║\n' +
      '║                                                                       ║\n' +
      '║  Genera uno seguro con:                                               ║\n' +
      '║    node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"  ║\n' +
      '║                                                                       ║\n' +
      '║  El servidor se detendrá por seguridad.                               ║\n' +
      '║                                                                       ║\n' +
      '╚═══════════════════════════════════════════════════════════════════════╝\n'
    );
  }

  // En producción, validar longitud mínima
  if (isProduction && jwtSecret && jwtSecret.length < 64) {
    throw new Error(
      '\n' +
      '╔═══════════════════════════════════════════════════════════════════════╗\n' +
      '║  ⚠️  ADVERTENCIA DE SEGURIDAD: JWT_SECRET DEMASIADO CORTO            ║\n' +
      '╠═══════════════════════════════════════════════════════════════════════╣\n' +
      '║                                                                       ║\n' +
      `║  JWT_SECRET actual: ${jwtSecret.length} caracteres                   ║\n` +
      '║  Longitud mínima recomendada: 64 caracteres                          ║\n' +
      '║                                                                       ║\n' +
      '║  Un secret corto puede ser vulnerable a ataques de fuerza bruta.     ║\n' +
      '║                                                                       ║\n' +
      '║  Genera uno de 64+ caracteres con:                                   ║\n' +
      '║    node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"  ║\n' +
      '║                                                                       ║\n' +
      '║  El servidor se detendrá por seguridad.                               ║\n' +
      '║                                                                       ║\n' +
      '╚═══════════════════════════════════════════════════════════════════════╝\n'
    );
  }

  // En desarrollo, advertir si se usa valor por defecto
  if (!isProduction && (!jwtSecret || jwtSecret === 'your-secret-key-change-this-in-production')) {
    console.warn(
      '\n' +
      '⚠️  ADVERTENCIA: Usando JWT_SECRET por defecto en desarrollo.\n' +
      'Esto es aceptable SOLO en desarrollo local.\n' +
      'En producción, esto sería un ERROR CRÍTICO DE SEGURIDAD.\n'
    );
  }
}

/**
 * Valida todas las configuraciones de seguridad críticas
 * Debe llamarse al inicio del servidor
 */
export function validateSecurityConfig(): void {
  validateJWTSecret();

  const isProduction = process.env.NODE_ENV === 'production';

  // Validar DATABASE_URL en producción
  if (isProduction && !process.env.DATABASE_URL) {
    throw new Error('ERROR CRÍTICO: DATABASE_URL no configurado en producción');
  }

  // Advertir si FRONTEND_URL no está configurado en producción
  if (isProduction && !process.env.FRONTEND_URL) {
    console.warn('⚠️  ADVERTENCIA: FRONTEND_URL no configurado en producción. CORS podría fallar.');
  }

  console.log('✅ Validaciones de seguridad completadas exitosamente');
}
