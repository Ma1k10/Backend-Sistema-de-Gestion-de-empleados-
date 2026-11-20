/**
 * RUTAS DE SOLICITUDES DE EMPLEO
 * Archivo: backend/routes/employeeRequests.js
 * Descripción: Define los controladores para gestión de solicitudes de empleo.
 *              Incluye consulta, aprobación y rechazo de solicitudes.
 *
 * FUNCIONES:
 * - validatePosition: Validar posición contra valores ENUM válidos (helper)
 * - getEmployeeRequests: Obtener todas las solicitudes (solo admin)
 * - getEmployeeRequestById: Obtener solicitud por ID (solo admin)
 * - approveEmployeeRequest: Aprobar solicitud (solo admin)
 * - rejectEmployeeRequest: Rechazar solicitud (solo admin)
 * - getMyEmployeeRequests: Obtener solicitudes del usuario autenticado
 */

const { EmployeeRequest, User, Employee } = require('../models');
const { createNotification } = require('./notifications');

/**
 * Función para validar posición contra valores ENUM válidos
 * Normaliza la posición de trabajo a un valor válido del ENUM
 *
 * @param {string} position - Posición a validar
 * @returns {string} Posición validada o valor por defecto 'operador'
 */
const validatePosition = (position) => {
  // Si no hay posición, retornar valor por defecto
  if (!position || typeof position !== 'string') {
    return 'operador';
  }
  
  const validPositions = ['cajero', 'supervisor', 'gerente', 'administrativo', 'tecnico', 'operador'];
  
  // Si la posición es válida, retornarla tal cual
  if (validPositions.includes(position)) {
    return position;
  }
  
  // Intentar hacer coincidir de forma flexible (ignorando mayúsculas/minúsculas y acentos)
  const normalizedPosition = position.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Mapeo de posiciones comunes a valores válidos
  const positionMapping = {
    'cajero': 'cajero',
    'cajera': 'cajero',
    'supervisor': 'supervisor',
    'gerente': 'gerente',
    'administrativo': 'administrativo',
    'administrador': 'administrativo',
    'tecnico': 'tecnico',
    'técnico': 'tecnico',
    'operador': 'operador',
    'operario': 'operador'
  };
  
  return positionMapping[normalizedPosition] || 'operador';
};

/**
 * Obtener todas las solicitudes de empleo (solo admin)
 * Retorna solicitudes con filtros opcionales por estado y paginación
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.estado - Filtro por estado (opcional)
 * @param {number} req.query.page - Número de página (default: 1)
 * @param {number} req.query.limit - Límite por página (default: 50)
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con solicitudes y metadata de paginación
 */
const getEmployeeRequests = async (req, res) => {
  try {
    const { page = 1, limit = 50, estado = 'all' } = req.query;
    
    const whereClause = {};
    if (estado !== 'all') {
      whereClause.estado = estado;
    }

    const requests = await EmployeeRequest.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'usuario',
        attributes: ['id', 'nombre', 'correo', 'created_at']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        requests: requests.rows.map(request => ({
          ...request.toJSON(),
          motivo_rechazo: request.comentarios_admin // Include field name expected by frontend
        })),
        pagination: {
          total: requests.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(requests.count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo solicitudes de empleo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes de empleo',
      error: 'GET_EMPLOYEE_REQUESTS_ERROR'
    });
  }
};

/**
 * Obtener solicitud de empleo por ID (solo admin)
 * Retorna los detalles de una solicitud específica
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID de la solicitud
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con los datos de la solicitud
 */
const getEmployeeRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await EmployeeRequest.findByPk(id, {
      include: [{
        model: User,
        as: 'usuario',
        attributes: ['id', 'nombre', 'correo', 'created_at']
      }]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de empleo no encontrada',
        error: 'REQUEST_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: { 
        request: {
          ...request.toJSON(),
          motivo_rechazo: request.comentarios_admin // Include field name expected by frontend
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo solicitud de empleo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitud de empleo',
      error: 'GET_EMPLOYEE_REQUEST_ERROR'
    });
  }
};

/**
 * Aprobar solicitud de empleo (solo admin)
 * Aprueba una solicitud de empleo, convierte al usuario en empleado y crea el registro
 * Usa una transacción para asegurar consistencia de datos
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID de la solicitud
 * @param {Object} req.body - Cuerpo de la solicitud
 * @param {string} req.body.posicion - Posición oficial para el empleado (opcional)
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {number} req.user.id - ID del administrador
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con la solicitud aprobada
 */
const approveEmployeeRequest = async (req, res) => {
  try {
    console.log('🔄 Iniciando aprobación de solicitud de empleo...');
    const { id } = req.params;
    const { posicion } = req.body; // Posición oficial para el empleado
    
    console.log(`📋 Datos recibidos - ID: ${id}, Posición: ${posicion}`);

    // Verificar que la solicitud exista y esté pendiente
    const request = await EmployeeRequest.findByPk(id, {
      include: [{
        model: User,
        as: 'usuario',
        attributes: ['id', 'nombre', 'correo']
      }]
    });

    console.log(`🔍 Solicitud encontrada: ${!!request}`);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de empleo no encontrada',
        error: 'REQUEST_NOT_FOUND'
      });
    }

    if (request.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: 'Esta solicitud ya ha sido procesada',
        error: 'REQUEST_ALREADY_PROCESSED'
      });
    }

    console.log('✅ Solicitud validada, iniciando transacción...');

    // Iniciar transacción con timeout
    const transaction = await require('../models').sequelize.transaction({
      timeout: 10000 // 10 segundos timeout para la transacción
    });

    try {
      console.log('🔄 Actualizando solicitud...');
      // Actualizar solicitud
      await request.update({
        estado: 'aprobada',
        revisado_por: req.user.id,
        fecha_revision: new Date()
      }, { transaction });

      console.log('🔄 Cambiando rol del usuario...');
      // Cambiar rol del usuario a empleado
      await User.update(
        { rol: 'empleado' },
        { 
          where: { id: request.id_usuario },
          transaction 
        }
      );

      console.log('🔄 Creando registro de empleado...');
      // Crear registro de empleado
      const posicion = req.body.posicion || request.posicion_deseada;
      const validatedPosition = validatePosition(posicion);
      console.log(`📋 Posición validada: ${validatedPosition}`);
      
      // Verificar si el empleado ya existe
      const existingEmployee = await Employee.findOne({ 
        where: { id_usuario: request.id_usuario },
        transaction 
      });
      
      if (existingEmployee) {
        // Actualizar empleado existente
        await existingEmployee.update({
          posicion: validatedPosition || 'operador',
          estado: true
        }, { transaction });
        console.log('🔄 Empleado existente actualizado');
      } else {
        // Crear nuevo empleado
        await Employee.create({
          id_usuario: request.id_usuario,
          posicion: validatedPosition || 'operador', // Validar y usar valor por defecto
          fecha_contratacion: new Date(), // Usar objeto Date directamente
          estado: true // Usar boolean true en lugar de string
        }, { transaction });
        console.log('🔄 Nuevo empleado creado');
      }

      console.log('🔄 Creando notificación...');
      // Crear notificación para el usuario (dentro de la transacción)
      await createNotification(
        request.id_usuario,
        '¡Solicitud Aprobada!',
        `¡Felicidades! Tu solicitud de empleo ha sido aprobada. Ahora eres parte del equipo como ${validatedPosition || 'operador'}.`,
        'employment_approved',
        request.id,
        'employee_request',
        transaction
      );

      console.log('✅ Confirmando transacción...');
      // Confirmar transacción
      await transaction.commit();

      console.log('🎉 Solicitud aprobada exitosamente');
      res.json({
        success: true,
        message: 'Solicitud de empleo aprobada exitosamente',
        data: { 
          request: {
            ...request.toJSON(),
            motivo_rechazo: request.comentarios_admin // Include field name expected by frontend (will be null for approved)
          }
        }
      });
    } catch (error) {
      console.error('❌ Error en transacción:', error);
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error aprobando solicitud de empleo:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar solicitud de empleo',
      error: 'APPROVE_REQUEST_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Rechazar solicitud de empleo (solo admin)
 * Rechaza una solicitud de empleo con un motivo opcional
 * Usa una transacción para asegurar consistencia de datos
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID de la solicitud
 * @param {Object} req.body - Cuerpo de la solicitud
 * @param {string} req.body.motivo_rechazo - Motivo del rechazo (opcional)
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {number} req.user.id - ID del administrador
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con la solicitud rechazada
 */
const rejectEmployeeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_rechazo } = req.body;

    // Verificar que la solicitud exista y esté pendiente
    const request = await EmployeeRequest.findByPk(id, {
      include: [{
        model: User,
        as: 'usuario',
        attributes: ['id', 'nombre', 'correo']
      }]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de empleo no encontrada',
        error: 'REQUEST_NOT_FOUND'
      });
    }

    if (request.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: 'Esta solicitud ya ha sido procesada',
        error: 'REQUEST_ALREADY_PROCESSED'
      });
    }

    // Iniciar transacción con timeout
    const transaction = await require('../models').sequelize.transaction({
      timeout: 10000 // 10 segundos timeout para la transacción
    });

    try {
      // Actualizar solicitud
      await request.update({
        estado: 'rechazada',
        comentarios_admin: motivo_rechazo || 'Solicitud no aprobada por el administrador',
        revisado_por: req.user.id,
        fecha_revision: new Date()
      }, { transaction });

      // Crear notificación para el usuario
      await createNotification(
        request.id_usuario,
        'Solicitud Rechazada',
        `Lamentamos informarte que tu solicitud de empleo ha sido rechazada. ${motivo_rechazo ? `Motivo: ${motivo_rechazo}` : ''}`,
        'employment_rejected',
        request.id,
        'employee_request',
        transaction
      );

      // Confirmar transacción
      await transaction.commit();

      res.json({
        success: true,
        message: 'Solicitud de empleo rechazada exitosamente',
        data: { 
          request: {
            ...request.toJSON(),
            motivo_rechazo: request.comentarios_admin // Include field name expected by frontend
          }
        }
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error rechazando solicitud de empleo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar solicitud de empleo',
      error: 'REJECT_REQUEST_ERROR'
    });
  }
};

/**
 * Obtener mis solicitudes de empleo (usuario autenticado)
 * Retorna las solicitudes de empleo del usuario autenticado
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {number} req.user.id - ID del usuario
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con las solicitudes del usuario
 */
const getMyEmployeeRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await EmployeeRequest.findAll({
      where: { id_usuario: userId },
      include: [{
        model: User,
        as: 'revisor',
        attributes: ['id', 'nombre', 'correo'],
        required: false
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: { 
        requests: requests.map(request => ({
          ...request.toJSON(),
          motivo_rechazo: request.comentarios_admin // Include field name expected by frontend
        }))
      }
    });
  } catch (error) {
    console.error('Error obteniendo solicitudes del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes',
      error: 'GET_MY_REQUESTS_ERROR'
    });
  }
};

module.exports = {
  getEmployeeRequests,
  getEmployeeRequestById,
  approveEmployeeRequest,
  rejectEmployeeRequest,
  getMyEmployeeRequests
};
