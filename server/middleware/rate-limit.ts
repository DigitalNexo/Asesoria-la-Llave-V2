import rateLimit from 'express-rate-limit';

/**
 * SEGURIDAD: Rate limiting para endpoints de autenticación
 * Previene ataques de fuerza bruta contra login
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos por IP en 15 minutos
  message: {
    error: 'Demasiados intentos de inicio de sesión. Por favor, inténtalo de nuevo en 15 minutos.'
  },
  standardHeaders: true, // Retorna info en headers `RateLimit-*`
  legacyHeaders: false, // Desactiva headers `X-RateLimit-*`
  skipSuccessfulRequests: false, // Contar todos los intentos (exitosos y fallidos)
  skipFailedRequests: false,
  // Logging de bloqueos
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit excedido en login desde IP: ${req.ip}`);
    res.status(429).json({
      error: 'Demasiados intentos de inicio de sesión. Por favor, inténtalo de nuevo en 15 minutos.',
      retryAfter: Math.ceil(15 * 60) // segundos
    });
  }
});

/**
 * SEGURIDAD: Rate limiting para registro de usuarios
 * Previene creación masiva de cuentas
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 registros por IP por hora
  message: {
    error: 'Demasiados intentos de registro. Por favor, inténtalo de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit excedido en registro desde IP: ${req.ip}`);
    res.status(429).json({
      error: 'Demasiados intentos de registro. Por favor, inténtalo de nuevo en 1 hora.',
      retryAfter: Math.ceil(60 * 60)
    });
  }
});

/**
 * SEGURIDAD: Rate limiting general para API
 * Previene abuse de endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requests por IP en 15 minutos
  message: {
    error: 'Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit excedido en API desde IP: ${req.ip} - Endpoint: ${req.path}`);
    res.status(429).json({
      error: 'Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde.',
      retryAfter: Math.ceil(15 * 60)
    });
  }
});

/**
 * SEGURIDAD: Rate limiting estricto para operaciones críticas
 * Para endpoints de administración, cambios de contraseña, etc.
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Máximo 10 operaciones por hora
  message: {
    error: 'Límite de operaciones excedido. Contacte al administrador si necesita realizar más acciones.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit ESTRICTO excedido desde IP: ${req.ip} - Endpoint: ${req.path}`);
    res.status(429).json({
      error: 'Límite de operaciones excedido. Por favor, inténtalo de nuevo en 1 hora.',
      retryAfter: Math.ceil(60 * 60)
    });
  }
});
