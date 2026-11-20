/**
 * MIDDLEWARE DE VALIDACIÓN
 * Archivo: backend/middleware/validation.js
 * Descripción: Contiene middleware para validar datos de entrada usando express-validator.
 *              Valida campos de formularios, parámetros de URL y query parameters.
 *
 * FUNCIONALIDADES:
 * - Validación de usuarios (registro, login, actualización)
 * - Validación de empleados (creación, actualización)
 * - Validación de horarios (creación, actualización)
 * - Validación de solicitudes de cambio de horario
 * - Validación de parámetros de URL y query parameters
 * - Validación de paginación
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Función auxiliar para parsear fechas locales
 * @param {string} value - Fecha en formato YYYY-MM-DD
 * @returns {Date} Objeto Date parseado
 */
const parseLocalDate = (value) => {
  if (!value || typeof value !== 'string') {
    return new Date(NaN);
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Middleware para manejar resultados de validación
 * Verifica si hay errores de validación y los retorna en formato JSON
 *
 * Si hay errores, retorna un objeto con detalles de cada campo inválido
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      error: 'VALIDATION_ERROR',
      details: errorDetails
    });
  }

  next();
};

// ========== VALIDACIONES PARA USUARIOS ==========

/**
 * Validación para registro de usuarios
 * Valida los campos requeridos para crear un nuevo usuario
 */
const validateUserRegistration = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
  
  body('correo')
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un correo electrónico válido')
    .normalizeEmail()
    .withMessage('Formato de correo inválido'),
  
  body('contraseña')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
  body('rol')
    .optional()
    .isIn(['admin', 'empleado'])
    .withMessage('El rol debe ser admin o empleado'),
  
  handleValidationErrors
];

/**
 * Validación para login de usuarios
 * Valida correo y contraseña para autenticación
 */
const validateUserLogin = [
  body('correo')
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un correo electrónico válido')
    .normalizeEmail(),
  
  body('contraseña')
    .notEmpty()
    .withMessage('La contraseña es obligatoria'),
  
  handleValidationErrors
];

/**
 * Validación para actualización de usuarios
 * Valida campos opcionales al actualizar un usuario existente
 */
const validateUserUpdate = [
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
  
  body('correo')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un correo electrónico válido')
    .normalizeEmail(),
  
  body('rol')
    .optional()
    .isIn(['admin', 'empleado'])
    .withMessage('El rol debe ser admin o empleado'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser un valor booleano'),
  
  handleValidationErrors
];

// ========== VALIDACIONES PARA EMPLEADOS ==========

/**
 * Validación para creación de empleados
 * Valida los campos requeridos para crear un nuevo empleado
 */
const validateEmployeeCreation = [
  body('posicion')
    .isIn(['cajero', 'supervisor', 'gerente', 'administrativo', 'tecnico', 'operador'])
    .withMessage('La posición debe ser una de las opciones válidas'),
  
  body('fecha_contratacion')
    .isISO8601()
    .withMessage('Debe proporcionar una fecha válida')
    .custom((value) => {
      const fecha = new Date(value);
      const hoy = new Date();
      if (fecha > hoy) {
        throw new Error('La fecha de contratación no puede ser futura');
      }
      return true;
    }),
  
  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser un valor booleano'),
  
  body('id_usuario')
    .isInt({ min: 1 })
    .withMessage('El ID de usuario debe ser un número entero positivo'),
  
  handleValidationErrors
];

/**
 * Validación para actualización de empleados
 * Valida campos opcionales al actualizar un empleado existente
 */
const validateEmployeeUpdate = [
  body('posicion')
    .optional()
    .isIn(['cajero', 'supervisor', 'gerente', 'administrativo', 'tecnico', 'operador'])
    .withMessage('La posición debe ser una de las opciones válidas'),
  
  body('fecha_contratacion')
    .optional()
    .isISO8601()
    .withMessage('Debe proporcionar una fecha válida')
    .custom((value) => {
      const fecha = new Date(value);
      const hoy = new Date();
      if (fecha > hoy) {
        throw new Error('La fecha de contratación no puede ser futura');
      }
      return true;
    }),
  
  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser un valor booleano'),
  
  handleValidationErrors
];

// ========== VALIDACIONES PARA HORARIOS ==========

/**
 * Validación para creación de horarios
 * Valida los campos requeridos para asignar un horario a un empleado
 */
const validateScheduleCreation = [
  body('id_empleado')
    .isInt({ min: 1 })
    .withMessage('El ID del empleado debe ser un número entero positivo'),
  
  body('fecha')
    .isISO8601()
    .withMessage('Debe proporcionar una fecha válida')
    .custom((value) => {
      const fecha = parseLocalDate(value);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fecha < hoy) {
        throw new Error('No se pueden crear horarios para fechas pasadas');
      }
      return true;
    }),
  
  body('hora_inicio')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora de inicio debe tener formato HH:MM (24 horas)'),
  
  body('hora_fin')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora de fin debe tener formato HH:MM (24 horas)')
    .custom((value, { req }) => {
      if (value <= req.body.hora_inicio) {
        throw new Error('La hora de fin debe ser posterior a la hora de inicio');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Validación para actualización de horarios
 * Valida campos opcionales al actualizar un horario existente
 */
const validateScheduleUpdate = [
  body('fecha')
    .optional()
    .isISO8601()
    .withMessage('Debe proporcionar una fecha válida')
    .custom((value) => {
      const fecha = parseLocalDate(value);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fecha < hoy) {
        throw new Error('No se pueden actualizar horarios para fechas pasadas');
      }
      return true;
    }),
  
  body('hora_inicio')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora de inicio debe tener formato HH:MM (24 horas)'),
  
  body('hora_fin')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora de fin debe tener formato HH:MM (24 horas)'),
  
  handleValidationErrors
];

// ========== VALIDACIONES PARA SOLICITUDES DE CAMBIO DE HORARIO ==========

/**
 * Validación para creación de solicitudes de cambio de horario
 * Valida los campos requeridos para solicitar un cambio de horario
 */
const validateScheduleRequestCreation = [
  body('id_empleado')
    .isInt({ min: 1 })
    .withMessage('El ID del empleado debe ser un número entero positivo'),
  
  body('fecha_solicitada')
    .isISO8601()
    .withMessage('Debe proporcionar una fecha válida')
    .custom((value) => {
      const fecha = parseLocalDate(value);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fecha < hoy) {
        throw new Error('No se pueden solicitar cambios para fechas pasadas');
      }
      return true;
    }),
  
  body('nueva_hora_inicio')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La nueva hora de inicio debe tener formato HH:MM (24 horas)'),
  
  body('nueva_hora_fin')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La nueva hora de fin debe tener formato HH:MM (24 horas)')
    .custom((value, { req }) => {
      if (value <= req.body.nueva_hora_inicio) {
        throw new Error('La hora de fin debe ser posterior a la hora de inicio');
      }
      return true;
    }),
  
  body('motivo')
    .optional()
    .isLength({ max: 500 })
    .withMessage('El motivo no puede exceder 500 caracteres')
    .trim(),
  
  handleValidationErrors
];

/**
 * Validación para actualización de solicitudes de cambio de horario
 * Valida campos opcionales al actualizar una solicitud existente
 */
const validateScheduleRequestUpdate = [
  body('estado')
    .optional()
    .isIn(['pendiente', 'aprobada', 'rechazada'])
    .withMessage('El estado debe ser pendiente, aprobada o rechazada'),
  
  body('motivo')
    .optional()
    .isLength({ max: 500 })
    .withMessage('El motivo no puede exceder 500 caracteres')
    .trim(),
  
  body('comentarios_revision')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Los comentarios de revisión no pueden exceder 500 caracteres')
    .trim(),
  
  handleValidationErrors
];

// ========== VALIDACIONES PARA PARÁMETROS DE URL Y QUERY ==========

/**
 * Validación para parámetro ID en URL
 * Valida que el ID sea un entero positivo
 */
const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID debe ser un número entero positivo'),
  
  handleValidationErrors
];

/**
 * Validación para query parameters de fechas
 * Valida parámetros de fecha en query string (filtros por fecha)
 */
const validateDateQuery = [
  query('fecha')
    .optional()
    .isISO8601()
    .withMessage('La fecha debe tener formato válido'),
  
  query('fecha_inicio')
    .optional()
    .isISO8601()
    .withMessage('La fecha de inicio debe tener formato válido'),
  
  query('fecha_fin')
    .optional()
    .isISO8601()
    .withMessage('La fecha de fin debe tener formato válido')
    .custom((value, { req }) => {
      if (req.query.fecha_inicio && value <= req.query.fecha_inicio) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Validación para query parameters de paginación
 * Valida parámetros page y limit para paginación de resultados
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
  
  handleValidationErrors
];

/**
 * Exportar todos los middleware de validación
 */
module.exports = {
  handleValidationErrors,              // Manejar errores de validación
  validateUserRegistration,           // Validar registro de usuarios
  validateUserLogin,                  // Validar login de usuarios
  validateUserUpdate,                // Validar actualización de usuarios
  validateEmployeeCreation,          // Validar creación de empleados
  validateEmployeeUpdate,             // Validar actualización de empleados
  validateScheduleCreation,           // Validar creación de horarios
  validateScheduleUpdate,             // Validar actualización de horarios
  validateScheduleRequestCreation,    // Validar creación de solicitudes de cambio
  validateScheduleRequestUpdate,     // Validar actualización de solicitudes
  validateIdParam,                   // Validar parámetro ID en URL
  validateDateQuery,                 // Validar query parameters de fechas
  validatePagination                 // Validar query parameters de paginación
};
