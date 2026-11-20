/**
 * RUTAS DE NOTIFICACIONES
 * Archivo: backend/routes/notifications.js
 * Descripción: Define los controladores para gestión de notificaciones.
 *              Incluye consulta, marcado como leído y eliminación de notificaciones.
 *
 * FUNCIONES:
 * - getNotifications: Obtener notificaciones del usuario autenticado
 * - getAdminNotifications: Obtener notificaciones para administradores
 * - markAsRead: Marcar notificación como leída
 * - markAllAsRead: Marcar todas las notificaciones como leídas
 * - deleteNotification: Eliminar notificación
 * - createNotification: Crear notificación (función interna)
 * - createAdminNotification: Crear notificación para todos los administradores
 */

const { Notification, User } = require('../models');

/**
 * Obtener todas las notificaciones del usuario autenticado
 * Retorna notificaciones con filtros opcionales y paginación
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.query - Query parameters
 * @param {number} req.query.page - Número de página (default: 1)
 * @param {number} req.query.limit - Límite por página (default: 50)
 * @param {string} req.query.unread_only - Filtrar solo no leídas (default: false)
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {number} req.user.id - ID del usuario
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con notificaciones, paginación y conteo de no leídas
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, unread_only = false } = req.query;
    
    const whereClause = { id_usuario: userId };
    if (unread_only === 'true') {
      whereClause.leida = false;
    }

    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'usuario',
        attributes: ['id', 'nombre', 'correo']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Calcular conteo de no leídas
    const unreadCount = await Notification.count({
      where: { 
        id_usuario: userId, 
        leida: false 
      }
    });

    res.json({
      success: true,
      data: {
        notifications: notifications.rows,
        pagination: {
          total: notifications.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(notifications.count / parseInt(limit))
        },
        unread_count: unreadCount
      }
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones',
      error: 'GET_NOTIFICATIONS_ERROR'
    });
  }
};

/**
 * Obtener notificaciones para administradores (solicitudes de empleo)
 * Retorna notificaciones de tipo employment_request para administradores
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.query - Query parameters
 * @param {number} req.query.page - Número de página (default: 1)
 * @param {number} req.query.limit - Límite por página (default: 50)
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con notificaciones y conteos por tipo
 */
const getAdminNotifications = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de administrador.',
        error: 'ACCESS_DENIED'
      });
    }

    const { page = 1, limit = 50 } = req.query;

    // Obtener solo notificaciones de tipo employment_request
    const notifications = await Notification.findAndCountAll({
      where: { 
        tipo: 'employment_request'
      },
      include: [{
        model: User,
        as: 'usuario',
        attributes: ['id', 'nombre', 'correo']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Calcular conteos de solicitudes
    const pendingCount = await Notification.count({
      where: { 
        tipo: 'employment_request',
        leida: false
      }
    });

    // Contar notificaciones de aprobación
    const approvedCount = await Notification.count({
      where: { 
        tipo: 'employment_approved'
      }
    });

    // Contar notificaciones de rechazo
    const rejectedCount = await Notification.count({
      where: { 
        tipo: 'employment_rejected'
      }
    });

    res.json({
      success: true,
      data: {
        notifications: notifications.rows,
        pagination: {
          total: notifications.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(notifications.count / parseInt(limit))
        },
        pending_count: pendingCount,
        approved_count: approvedCount,
        rejected_count: rejectedCount
      }
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones de admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones de administrador',
      error: 'GET_ADMIN_NOTIFICATIONS_ERROR'
    });
  }
};

/**
 * Marcar notificación como leída
 * Marca una notificación específica como leída para el usuario autenticado
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID de la notificación
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {number} req.user.id - ID del usuario
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON confirmando el marcado como leído
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: { 
        id, 
        id_usuario: userId 
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada',
        error: 'NOTIFICATION_NOT_FOUND'
      });
    }

    await notification.update({ leida: true });

    res.json({
      success: true,
      message: 'Notificación marcada como leída',
      data: { notification }
    });
  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación como leída',
      error: 'MARK_AS_READ_ERROR'
    });
  }
};

/**
 * Marcar todas las notificaciones como leídas
 * Marca todas las notificaciones no leídas del usuario autenticado como leídas
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {number} req.user.id - ID del usuario
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON confirmando el marcado como leído
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.update(
      { leida: true },
      { 
        where: { 
          id_usuario: userId,
          leida: false
        } 
      }
    );

    res.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas'
    });
  } catch (error) {
    console.error('Error marcando todas las notificaciones como leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar todas las notificaciones como leídas',
      error: 'MARK_ALL_AS_READ_ERROR'
    });
  }
};

/**
 * Eliminar notificación
 * Elimina una notificación específica del usuario autenticado
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID de la notificación
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {number} req.user.id - ID del usuario
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON confirmando la eliminación
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: { 
        id, 
        id_usuario: userId 
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada',
        error: 'NOTIFICATION_NOT_FOUND'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notificación eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificación',
      error: 'DELETE_NOTIFICATION_ERROR'
    });
  }
};

/**
 * Crear notificación (función interna)
 * Crea una notificación para un usuario específico
 *
 * @param {number} userId - ID del usuario destinatario
 * @param {string} title - Título de la notificación
 * @param {string} message - Mensaje de la notificación
 * @param {string} type - Tipo de notificación (default: 'info')
 * @param {number} referenceId - ID del objeto relacionado (opcional)
 * @param {string} referenceType - Tipo del objeto relacionado (opcional)
 * @param {Object} transaction - Transacción de Sequelize (opcional)
 * @returns {Promise<Model>} Promesa que resuelve a la notificación creada
 */
const createNotification = async (userId, title, message, type = 'info', referenceId = null, referenceType = null, transaction = null) => {
  try {
    const notification = await Notification.create({
      id_usuario: userId,
      titulo: title,
      mensaje: message,
      tipo: type,
      id_referencia: referenceId,
      tipo_referencia: referenceType
    }, transaction ? { transaction } : {});

    return notification;
  } catch (error) {
    console.error('Error creando notificación:', error);
    throw error;
  }
};

/**
 * Crear notificación para todos los administradores
 * Crea una notificación para todos los usuarios con rol 'admin' activos
 *
 * @param {string} title - Título de la notificación
 * @param {string} message - Mensaje de la notificación
 * @param {string} type - Tipo de notificación (default: 'info')
 * @param {number} referenceId - ID del objeto relacionado (opcional)
 * @param {string} referenceType - Tipo del objeto relacionado (opcional)
 * @returns {Promise<Array>} Promesa que resuelve a un array de notificaciones creadas
 */
const createAdminNotification = async (title, message, type = 'info', referenceId = null, referenceType = null) => {
  try {
    const admins = await User.findAll({
      where: { rol: 'admin', is_active: true },
      attributes: ['id']
    });

    const notifications = await Promise.all(
      admins.map(admin => 
        createNotification(admin.id, title, message, type, referenceId, referenceType)
      )
    );

    return notifications;
  } catch (error) {
    console.error('Error creando notificaciones de admin:', error);
    throw error;
  }
};

module.exports = {
  getNotifications,
  getAdminNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  createAdminNotification
};
