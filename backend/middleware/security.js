/**
 * MIDDLEWARE DE SEGURIDAD
 * Archivo: backend/middleware/security.js
 * Descripción: Contiene middleware para proteger la API contra vulnerabilidades comunes.
 *              Incluye configuración de CORS, rate limiting, sanitización de inputs,
 *              validación de archivos, logging y manejo de errores.
 *
 * FUNCIONALIDADES:
 * - CORS (Cross-Origin Resource Sharing) configuración
 * - Rate limiting para prevenir abusos
 * - Helmet para headers de seguridad HTTP
 * - Sanitización de inputs contra XSS
 * - Validación de archivos (tamaño y tipo)
 * - Logging de solicitudes
 * - Manejo centralizado de errores
 * - Verificación de conexión a base de datos
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

/**
 * Configuración de CORS (Cross-Origin Resource Sharing)
 * Controla qué orígenes pueden acceder a la API
 *
 * PERMITE:
 * - Orígenes locales de desarrollo (localhost y 127.0.0.1 en puertos 3000-3002)
 * - Credenciales (cookies, headers de autenticación)
 * - Métodos HTTP comunes
 * - Headers específicos
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Lista de orígenes permitidos (desarrollo)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002'
    ];

    // Verificar si el origen está permitido
    // !origin permite solicitudes sin origen (ej: apps móviles, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true, // Permitir cookies y headers de autenticación
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

/**
 * Rate limiting general
 * Limita el número de solicitudes por IP en una ventana de tiempo
 *
 * LÍMITES:
 * - Desarrollo: 1000 solicitudes por 15 minutos
 * - Producción: 100 solicitudes por 15 minutos
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP. Intenta más tarde.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: false,
  legacyHeaders: false,
});

/**
 * Rate limiting estricto para autenticación
 * Limita intentos de login para prevenir ataques de fuerza bruta
 *
 * LÍMITES:
 * - Desarrollo: 1000 intentos por 15 minutos
 * - Producción: 5 intentos por 15 minutos
 * - No cuenta solicitudes exitosas (login correcto)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  message: {
    success: false,
    message: 'Demasiados intentos de autenticación. Intenta más tarde.',
    error: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: false,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar solicitudes exitosas
});

/**
 * Rate limiting para creación de recursos
 * Limita creaciones para prevenir spam
 *
 * LÍMITES:
 * - 10 creaciones por minuto por IP
 */
const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // límite de 10 creaciones por minuto
  message: {
    success: false,
    message: 'Demasiadas creaciones. Intenta más tarde.',
    error: 'CREATE_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: false,
  legacyHeaders: false,
});

/**
 * Configuración de Helmet
 * Helmet establece headers HTTP de seguridad para proteger la aplicación
 *
 * NOTA: Algunos headers están desactivados para reducir el tamaño de los headers
 * en desarrollo. En producción deberían activarse según sea necesario.
 */
const helmetConfig = helmet({
  contentSecurityPolicy: false, // Desactivado para reducir tamaño de headers
  crossOriginEmbedderPolicy: false,
  hsts: false, // HTTP Strict Transport Security
  frameguard: false, // Protección contra clickjacking
  xssFilter: false, // Filtro XSS obsoleto (XSS Protection)
  noSniff: false, // Protección contra MIME sniffing
});

/**
 * Middleware para sanitizar entradas (prevención de XSS)
 * Limpia los datos de entrada para prevenir ataques de inyección de código
 *
 * SANITIZACIÓN:
 * - Elimina tags HTML básicos (< >)
 * - Elimina protocolos javascript:
 * - Elimina event handlers (onclick=, onload=, etc.)
 * - Aplica recursivamente a objetos anidados
 */
const sanitizeInput = (req, res, next) => {
  // Función para limpiar strings individuales
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;

    return str
      .trim()
      .replace(/[<>]/g, '') // Eliminar tags básicos
      .replace(/javascript:/gi, '') // Eliminar protocolos javascript
      .replace(/on\w+=/gi, ''); // Eliminar event handlers
  };

  // Función para limpiar objetos recursivamente
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
    return sanitized;
  };

  // Sanitizar body, params y query de la solicitud
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Middleware para validar tamaño de archivos
 * Verifica que los archivos subidos no excedan el tamaño máximo permitido
 *
 * @param {number} maxSize - Tamaño máximo en bytes (default: 5MB)
 * @returns {function} Middleware function
 */
const validateFileSize = (maxSize = 5 * 1024 * 1024) => { // 5MB por defecto
  return (req, res, next) => {
    if (req.file && req.file.size > maxSize) {
      return res.status(413).json({
        success: false,
        message: 'Archivo demasiado grande.',
        error: 'FILE_TOO_LARGE',
        maxSize: maxSize
      });
    }
    next();
  };
};

/**
 * Middleware para validar tipos de archivos
 * Verifica que los archivos subidos sean de los tipos MIME permitidos
 *
 * @param {string[]} allowedTypes - Array de tipos MIME permitidos (default: imágenes comunes)
 * @returns {function} Middleware function
 */
const validateFileType = (allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) => {
  return (req, res, next) => {
    if (req.file && !allowedTypes.includes(req.file.mimetype)) {
      return res.status(415).json({
        success: false,
        message: 'Tipo de archivo no permitido.',
        error: 'UNSUPPORTED_FILE_TYPE',
        allowedTypes
      });
    }
    next();
  };
};

/**
 * Middleware para registrar solicitudes (logging)
 * Registra información sobre cada solicitud HTTP entrante y su respuesta
 *
 * INFORMACIÓN REGISTRADA:
 * - Método HTTP y URL
 * - IP del cliente
 * - Código de estado de la respuesta (con colores)
 * - Tiempo de respuesta en milisegundos
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Registrar solicitud entrante
  console.log(`📥 ${req.method} ${req.originalUrl} - IP: ${req.ip}`);

  // Capturar el método res.send para registrar la respuesta
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Color según status code
    let statusColor = '\x1b[32m'; // Verde por defecto (2xx)
    if (statusCode >= 400) statusColor = '\x1b[31m'; // Rojo para errores (4xx, 5xx)
    else if (statusCode >= 300) statusColor = '\x1b[33m'; // Amarillo para redirects (3xx)

    console.log(`📤 ${statusColor}${statusCode}\x1b[0m ${req.method} ${req.originalUrl} - ${duration}ms`);

    originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware para manejar errores globales
 * Captura y maneja errores de manera centralizada para toda la aplicación
 *
 * ERRORES MANEJADOS:
 * - SequelizeValidationError: Errores de validación de campos
 * - SequelizeUniqueConstraintError: Registros duplicados
 * - SequelizeForeignKeyConstraintError: Referencias inválidas
 * - Errores genéricos: Error interno del servidor
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error no manejado:', err);

  // Errores de validación de Sequelize
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      error: 'VALIDATION_ERROR',
      details: errors
    });
  }

  // Errores de restricción única (registros duplicados)
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Registro duplicado',
      error: 'DUPLICATE_ENTRY',
      field: err.errors[0]?.path
    });
  }

  // Errores de restricción de clave foránea
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida',
      error: 'FOREIGN_KEY_CONSTRAINT'
    });
  }

  // Error por defecto para errores no manejados
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    error: 'INTERNAL_SERVER_ERROR',
    // Incluir stack trace solo en desarrollo
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Middleware para verificar conexión a base de datos
 * Verifica que la instancia de Sequelize esté disponible antes de procesar la solicitud
 *
 * USO: Prevenir errores cuando la base de datos no está disponible
 */
const checkDatabaseConnection = (req, res, next) => {
  try {
    const { sequelize } = require('../models');

    if (!sequelize) {
      return res.status(503).json({
        success: false,
        message: 'Servicio de base de datos no disponible',
        error: 'DATABASE_UNAVAILABLE'
      });
    }

    next();
  } catch (error) {
    console.error('Error verificando conexión a DB:', error);
    return res.status(503).json({
      success: false,
      message: 'Error en el servicio de base de datos',
      error: 'DATABASE_ERROR'
    });
  }
};

/**
 * Exportar todos los middleware de seguridad
 */
module.exports = {
  corsOptions,              // Configuración de CORS
  generalLimiter,           // Rate limiting general
  authLimiter,              // Rate limiting para autenticación
  createLimiter,            // Rate limiting para creación de recursos
  helmetConfig,             // Configuración de Helmet
  sanitizeInput,            // Sanitización de inputs contra XSS
  validateFileSize,         // Validación de tamaño de archivos
  validateFileType,         // Validación de tipos de archivos
  requestLogger,            // Logging de solicitudes
  errorHandler,             // Manejo centralizado de errores
  checkDatabaseConnection   // Verificación de conexión a DB
};
