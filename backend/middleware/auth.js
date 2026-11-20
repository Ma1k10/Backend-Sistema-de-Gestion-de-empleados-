/**
 * MIDDLEWARE DE AUTENTICACIÓN Y AUTORIZACIÓN
 * Archivo: backend/middleware/auth.js
 * Descripción: Contiene middleware para autenticación JWT, verificación de roles,
 *              control de acceso a recursos y validación de permisos.
 *
 * FUNCIONALIDADES:
 * - Autenticación de usuarios mediante tokens JWT
 * - Verificación de roles (admin, empleado)
 * - Control de acceso a recursos propios
 * - Rate limiting para prevenir abusos
 * - Validación de formato de email
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware de autenticación JWT
 * Verifica que el token JWT sea válido y que el usuario exista y esté activo
 *
 * PROCESO:
 * 1. Extrae el token del header Authorization (formato: Bearer <token>)
 * 2. Verifica la firma del token usando JWT_SECRET
 * 3. Busca el usuario en la base de datos
 * 4. Verifica que el usuario esté activo
 * 5. Agrega el usuario al objeto request para uso posterior
 *
 * ERRORES:
 * - 401: Token no proporcionado, inválido, expirado o usuario inactivo
 * - 500: Error interno del servidor
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Token no proporcionado.',
        error: 'TOKEN_REQUIRED'
      });
    }

    // Verificar la firma del token y decodificarlo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el usuario en la base de datos (excluyendo contraseña)
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['contraseña'] }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido. Usuario no encontrado.',
        error: 'USER_NOT_FOUND'
      });
    }

    // Verificar si el usuario está activo
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo. Contacte al administrador.',
        error: 'USER_INACTIVE'
      });
    }

    // Agregar el usuario al request para uso en siguientes middlewares/rutas
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido.',
        error: 'INVALID_TOKEN'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado.',
        error: 'TOKEN_EXPIRED'
      });
    } else {
      console.error('Error en autenticación:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor de autenticación.',
        error: 'AUTH_ERROR'
      });
    }
  }
};

/**
 * Middleware de verificación de roles
 * Verifica que el usuario autenticado tenga uno de los roles permitidos
 *
 * @param {string|string[]} roles - Rol o array de roles permitidos (ej: 'admin' o ['admin', 'empleado'])
 * @returns {function} Middleware function
 *
 * USO:
 * - checkRole('admin') - Solo admins
 * - checkRole(['admin', 'empleado']) - Admins o empleados
 */
const checkRole = (roles) => {
  return (req, res, next) => {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Usuario no autenticado.',
        error: 'NOT_AUTHENTICATED'
      });
    }

    // Convertir roles a array si es un string
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    // Verificar si el rol del usuario está en los roles permitidos
    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Permisos insuficientes.',
        error: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.rol
      });
    }

    next();
  };
};

// Middleware preconfigurados para roles específicos
const requireAdmin = checkRole('admin');          // Solo administradores
const requireEmployee = checkRole('empleado');    // Solo empleados
const requireAuth = checkRole(['admin', 'empleado']); // Admins o empleados

/**
 * Middleware de autenticación opcional
 * Permite acceso público pero agrega información del usuario si está autenticado
 *
 * USO: Útil para endpoints que funcionan tanto para usuarios autenticados
 *      como para usuarios anónimos (ej: ver catálogo público)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['contraseña'] }
      });

      if (user && user.is_active) {
        req.user = user;
      }
    }

    // Continuar aunque no haya token o sea inválido
    next();
  } catch (error) {
    // En caso de error con el token, continuamos sin usuario
    next();
  }
};

/**
 * Middleware para verificar propiedad de recursos
 * Verifica que el usuario pueda acceder solo a sus propios recursos
 *
 * @param {string} resourceIdParam - Nombre del parámetro con el ID del recurso (default: 'id')
 * @param {object} resourceModel - Modelo Sequelize para verificar propiedad (opcional)
 * @returns {function} Middleware function
 *
 * REGLAS:
 * - Los admins pueden acceder a cualquier recurso
 * - Los empleados solo pueden acceder a sus propios recursos
 * - Si se proporciona un modelo, verifica el campo id_usuario
 * - Si no hay modelo, verifica directamente el ID
 */
const checkResourceOwnership = (resourceIdParam = 'id', resourceModel = null) => {
  return async (req, res, next) => {
    try {
      // Los admins pueden acceder a cualquier recurso
      if (req.user.rol === 'admin') {
        return next();
      }

      // Los empleados solo pueden acceder a sus propios recursos
      const resourceId = req.params[resourceIdParam];

      if (resourceModel) {
        // Si se proporciona un modelo, verificamos la propiedad en la base de datos
        const resource = await resourceModel.findByPk(resourceId);

        if (!resource) {
          return res.status(404).json({
            success: false,
            message: 'Recurso no encontrado.',
            error: 'RESOURCE_NOT_FOUND'
          });
        }

        // Verificar si el recurso pertenece al usuario (campo id_usuario)
        if (resource.id_usuario !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Acceso denegado. No puedes acceder a este recurso.',
            error: 'RESOURCE_ACCESS_DENIED'
          });
        }
      } else {
        // Si no hay modelo, verificamos directamente que el ID coincida con el del usuario
        if (resourceId !== req.user.id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Acceso denegado. No puedes acceder a este recurso.',
            error: 'RESOURCE_ACCESS_DENIED'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Error en verificación de propiedad:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor.',
        error: 'OWNERSHIP_CHECK_ERROR'
      });
    }
  };
};

/**
 * Middleware de Rate Limiting (limitación de tasa de solicitudes)
 * Prevenir abusos limitando el número de solicitudes por IP en un periodo de tiempo
 *
 * @param {number} maxRequests - Máximo de solicitudes permitidas (default: 100)
 * @param {number} windowMs - Ventana de tiempo en milisegundos (default: 15 minutos)
 * @returns {function} Middleware function
 *
 * USO: Proteger endpoints contra ataques de fuerza bruta o DoS
 */
const rateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map(); // Almacena solicitudes por IP

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Limpiar solicitudes antiguas (fuera de la ventana de tiempo)
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter(timestamp => timestamp > windowStart);
      requests.set(key, userRequests);
    }

    // Obtener solicitudes actuales del usuario
    const currentRequests = requests.get(key) || [];

    // Verificar si se excedió el límite
    if (currentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes. Intenta más tarde.',
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Agregar solicitud actual y continuar
    currentRequests.push(now);
    requests.set(key, currentRequests);

    next();
  };
};

/**
 * Middleware para validar formato de email
 * Verifica que el email tenga un formato válido usando regex
 *
 * USO: Validar emails antes de procesar solicitudes
 */
const validateEmail = (req, res, next) => {
  const email = req.body.correo || req.body.email;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Formato de correo electrónico inválido.',
      error: 'INVALID_EMAIL_FORMAT'
    });
  }

  next();
};

/**
 * Exportar todos los middleware de autenticación y autorización
 */
module.exports = {
  authenticateToken,           // Verificar token JWT
  checkRole,                  // Verificar roles de usuario
  requireAdmin,               // Requerir rol de admin
  requireEmployee,            // Requerir rol de empleado
  requireAuth,                // Requerir autenticación (admin o empleado)
  optionalAuth,               // Autenticación opcional
  checkResourceOwnership,     // Verificar propiedad de recursos
  rateLimiter,                // Limitar tasa de solicitudes
  validateEmail               // Validar formato de email
};
