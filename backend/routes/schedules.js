/**
 * RUTAS DE HORARIOS
 * Archivo: backend/routes/schedules.js
 * Descripción: Define los controladores para gestión de horarios de trabajo.
 *              Incluye CRUD de horarios y consulta de horarios propios.
 *
 * FUNCIONES:
 * - getSchedules: Obtener todos los horarios con filtros y paginación
 * - createSchedule: Crear horario (solo admin)
 * - getScheduleById: Obtener horario por ID
 * - updateSchedule: Actualizar horario (solo admin)
 * - deleteSchedule: Eliminar horario (solo admin)
 * - getMySchedules: Obtener horarios del empleado autenticado
 */

const { Employee, Schedule } = require('../models');

/**
 * Obtener todos los horarios
 * Retorna horarios con filtros opcionales por empleado y rango de fechas, con paginación
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.query - Query parameters
 * @param {number} req.query.id_empleado - Filtro por ID de empleado (opcional)
 * @param {string} req.query.fecha_inicio - Fecha inicio del rango (opcional)
 * @param {string} req.query.fecha_fin - Fecha fin del rango (opcional)
 * @param {number} req.query.page - Número de página (default: 1)
 * @param {number} req.query.limit - Límite por página (default: 50)
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con horarios y metadata de paginación
 */
const getSchedules = async (req, res) => {
  try {
    const { 
      id_empleado, 
      fecha_inicio, 
      fecha_fin, 
      page = 1, 
      limit = 50 
    } = req.query;

    // Construir filtros
    const where = {};
    
    if (id_empleado) {
      where.id_empleado = id_empleado;
    }
    
    if (fecha_inicio && fecha_fin) {
      where.fecha = {
        [require('../models').Sequelize.Op.between]: [fecha_inicio, fecha_fin]
      };
    } else if (fecha_inicio) {
      where.fecha = {
        [require('../models').Sequelize.Op.gte]: fecha_inicio
      };
    } else if (fecha_fin) {
      where.fecha = {
        [require('../models').Sequelize.Op.lte]: fecha_fin
      };
    }

    // Calcular offset para paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const schedules = await Schedule.findAndCountAll({
      where,
      include: [{
        model: Employee,
        as: 'empleado',
        include: [{
          model: require('../models').User,
          as: 'usuario',
          attributes: ['id', 'nombre', 'correo']
        }]
      }],
      order: [['fecha', 'ASC'], ['hora_inicio', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        schedules: schedules.rows,
        pagination: {
          total: schedules.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(schedules.count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo horarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener horarios',
      error: 'GET_SCHEDULES_ERROR'
    });
  }
};

/**
 * Crear horario (solo admin)
 * Crea un nuevo horario de trabajo para un empleado
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Cuerpo de la solicitud
 * @param {number} req.body.id_empleado - ID del empleado
 * @param {string} req.body.fecha - Fecha del horario
 * @param {string} req.body.hora_inicio - Hora de inicio
 * @param {string} req.body.hora_fin - Hora de fin
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con el horario creado
 */
const createSchedule = async (req, res) => {
  try {
    const { id_empleado, fecha, hora_inicio, hora_fin } = req.body;

    // Verificar si el empleado existe
    const employee = await Employee.findByPk(id_empleado);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado',
        error: 'EMPLOYEE_NOT_FOUND'
      });
    }

    // Verificar si ya existe un horario para ese empleado en esa fecha
    const existingSchedule = await Schedule.findOne({
      where: {
        id_empleado,
        fecha
      }
    });

    if (existingSchedule) {
      return res.status(409).json({
        success: false,
        message: 'El empleado ya tiene un horario asignado para esa fecha',
        error: 'SCHEDULE_ALREADY_EXISTS'
      });
    }

    // Crear horario
    const schedule = await Schedule.create({
      id_empleado,
      fecha,
      hora_inicio,
      hora_fin
    });

    // Obtener horario creado con su empleado
    const createdSchedule = await Schedule.findByPk(schedule.id, {
      include: [{
        model: Employee,
        as: 'empleado',
        include: [{
          model: require('../models').User,
          as: 'usuario',
          attributes: ['id', 'nombre', 'correo']
        }]
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Horario creado exitosamente',
      data: { schedule: createdSchedule }
    });
  } catch (error) {
    console.error('Error creando horario:', error);
    
    // Extract validation errors from Sequelize extraer y responder de forma controlada los errores de validación que ocurren al interactuar con una base de datos.
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }
    
    // Handle database errors capturar y responder de forma controlada a los fallos que ocurren al interactuar con una base de datos.
    if (error.name === 'SequelizeDatabaseError') {
      // Handle foreign key constraint violations gestionar o manejar las violaciones de restricciones de clave foránea en una base de datos
      if (error.original?.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
          success: false,
          message: 'El empleado seleccionado no existe',
          error: 'EMPLOYEE_NOT_FOUND'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Error de base de datos',
        error: 'DATABASE_ERROR',
        details: error.message
      });
    }
    
    // Handle foreign key constraint errors from Sequelize gestionar o manejar las violaciones de restricciones de clave foránea en una base de datos
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'El empleado seleccionado no existe',
        error: 'EMPLOYEE_NOT_FOUND'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear horario',
      error: 'CREATE_SCHEDULE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener horario por ID
 * Retorna los detalles de un horario específico incluyendo datos del empleado
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID del horario
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con los datos del horario
 */
const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findByPk(id, {
      include: [{
        model: Employee,
        as: 'empleado',
        include: [{
          model: require('../models').User,
          as: 'usuario',
          attributes: ['id', 'nombre', 'correo']
        }]
      }]
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Horario no encontrado',
        error: 'SCHEDULE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: { schedule }
    });
  } catch (error) {
    console.error('Error obteniendo horario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener horario',
      error: 'GET_SCHEDULE_ERROR'
    });
  }
};

/**
 * Actualizar horario (solo admin)
 * Permite al administrador actualizar un horario existente
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID del horario
 * @param {Object} req.body - Cuerpo de la solicitud
 * @param {number} req.body.id_empleado - Nuevo ID de empleado (opcional)
 * @param {string} req.body.fecha - Nueva fecha (opcional)
 * @param {string} req.body.hora_inicio - Nueva hora de inicio (opcional)
 * @param {string} req.body.hora_fin - Nueva hora de fin (opcional)
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con el horario actualizado
 */
const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_empleado, fecha, hora_inicio, hora_fin } = req.body;

    // Verificar si el horario existe
    const schedule = await Schedule.findByPk(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Horario no encontrado',
        error: 'SCHEDULE_NOT_FOUND'
      });
    }

    // Si se actualiza el empleado, verificar que exista
    if (id_empleado && id_empleado !== schedule.id_empleado) {
      const employee = await Employee.findByPk(id_empleado);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Empleado no encontrado',
          error: 'EMPLOYEE_NOT_FOUND'
        });
      }

      // Verificar si ya existe un horario para ese empleado en esa fecha
      const existingSchedule = await Schedule.findOne({
        where: {
          id_empleado,
          fecha,
          id: { [require('../models').Sequelize.Op.ne]: id }
        }
      });

      if (existingSchedule) {
        return res.status(409).json({
          success: false,
          message: 'El empleado ya tiene un horario asignado para esa fecha',
          error: 'SCHEDULE_ALREADY_EXISTS'
        });
      }
    }

    // Actualizar horario
    const [updatedRowsCount] = await Schedule.update(
      { id_empleado, fecha, hora_inicio, hora_fin },
      { where: { id } }
    );

    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Horario no encontrado',
        error: 'SCHEDULE_NOT_FOUND'
      });
    }

    // Obtener horario actualizado
    const updatedSchedule = await Schedule.findByPk(id, {
      include: [{
        model: Employee,
        as: 'empleado',
        include: [{
          model: require('../models').User,
          as: 'usuario',
          attributes: ['id', 'nombre', 'correo']
        }]
      }]
    });

    res.json({
      success: true,
      message: 'Horario actualizado exitosamente',
      data: { schedule: updatedSchedule }
    });
  } catch (error) {
    console.error('Error actualizando horario:', error);
    
    // Extract validation errors from Sequelize
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }
    
    // Extract database constraint errors
    if (error.name === 'SequelizeDatabaseError') {
      return res.status(400).json({
        success: false,
        message: 'Error de base de datos',
        error: 'DATABASE_ERROR',
        details: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar horario',
      error: 'UPDATE_SCHEDULE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Eliminar horario (solo admin)
 * Permite al administrador eliminar un horario del sistema
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID del horario a eliminar
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON confirmando la eliminación
 */
const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el horario existe
    const schedule = await Schedule.findByPk(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Horario no encontrado',
        error: 'SCHEDULE_NOT_FOUND'
      });
    }

    // Eliminar horario
    await Schedule.destroy({ where: { id } });

    res.json({
      success: true,
      message: 'Horario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando horario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar horario',
      error: 'DELETE_SCHEDULE_ERROR'
    });
  }
};

/**
 * Obtener horarios del empleado autenticado
 * Retorna los horarios del empleado logueado con filtros opcionales y paginación
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.fecha_inicio - Fecha inicio del rango (opcional)
 * @param {string} req.query.fecha_fin - Fecha fin del rango (opcional)
 * @param {number} req.query.page - Número de página (default: 1)
 * @param {number} req.query.limit - Límite por página (default: 50)
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {number} req.user.id - ID del usuario
 * @param {string} req.user.rol - Rol del usuario (debe ser 'empleado')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con horarios y metadata de paginación
 */
const getMySchedules = async (req, res) => {
  try {
    const { 
      fecha_inicio, 
      fecha_fin, 
      page = 1, 
      limit = 50 
    } = req.query;

    // Obtener el ID del empleado logueado
    const userId = req.user.id;
    
    // Buscar el registro del empleado
    const employee = await Employee.findOne({ 
      where: { id_usuario: userId } 
    });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró registro de empleado para este usuario',
        error: 'EMPLOYEE_NOT_FOUND'
      });
    }

    // Construir filtros
    const where = { id_empleado: employee.id };
    
    if (fecha_inicio && fecha_fin) {
      where.fecha = {
        [require('../models').Sequelize.Op.between]: [fecha_inicio, fecha_fin]
      };
    } else if (fecha_inicio) {
      where.fecha = {
        [require('../models').Sequelize.Op.gte]: fecha_inicio
      };
    } else if (fecha_fin) {
      where.fecha = {
        [require('../models').Sequelize.Op.lte]: fecha_fin
      };
    }

    // Calcular offset para paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const schedules = await Schedule.findAndCountAll({
      where,
      include: [{
        model: Employee,
        as: 'empleado',
        include: [{
          model: require('../models').User,
          as: 'usuario',
          attributes: ['id', 'nombre', 'correo']
        }]
      }],
      order: [['fecha', 'ASC'], ['hora_inicio', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        schedules: schedules.rows,
        pagination: {
          total: schedules.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(schedules.count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error en getMySchedules:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener horarios del empleado',
      error: 'GET_MY_SCHEDULES_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getMySchedules
};
