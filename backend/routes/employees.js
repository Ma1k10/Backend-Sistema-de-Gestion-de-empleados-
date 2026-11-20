/**
 * RUTAS DE EMPLEADOS
 * Archivo: backend/routes/employees.js
 * Descripción: Define los controladores para gestión de empleados y solicitudes de empleo.
 *              Incluye CRUD de empleados y gestión de solicitudes de empleo.
 *
 * FUNCIONES:
 * - getEmployees: Obtener todos los empleados
 * - createEmployee: Crear empleado (solo admin)
 * - getEmployeeById: Obtener empleado por ID
 * - updateEmployee: Actualizar empleado (solo admin)
 * - deleteEmployee: Eliminar empleado (solo admin)
 * - getEmployeeRequests: Obtener solicitudes de empleados (solo admin)
 * - createEmployeeRequest: Crear solicitud de empleado
 * - approveEmployeeRequest: Aprobar solicitud de empleado (solo admin)
 * - rejectEmployeeRequest: Rechazar solicitud de empleado (solo admin)
 */

const { User, Employee, EmployeeRequest } = require('../models');

/**
 * Obtener todos los empleados
 * Retorna la lista completa de empleados con sus datos de usuario
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con la lista de empleados
 */
const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      include: [{
        model: User,
        as: 'usuario',
        attributes: ['id', 'nombre', 'correo', 'rol', 'is_active']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: { employees }
    });
  } catch (error) {
    console.error('Error obteniendo empleados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener empleados',
      error: 'GET_EMPLOYEES_ERROR'
    });
  }
};

/**
 * Crear empleado (solo admin)
 * Crea un nuevo empleado, opcionalmente creando el usuario asociado
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Cuerpo de la solicitud
 * @param {string} req.body.posicion - Posición del empleado
 * @param {string} req.body.fecha_contratacion - Fecha de contratación
 * @param {boolean} req.body.estado - Estado del empleado (opcional)
 * @param {Object} req.body.usuario - Datos del usuario a crear (opcional)
 * @param {number} req.body.id_usuario - ID de usuario existente (opcional)
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con el empleado creado
 */
const createEmployee = async (req, res) => {
  try {
    const { posicion, fecha_contratacion, estado = true, usuario, id_usuario } = req.body;

    let userId;

    // Si se proporcionan datos de usuario, crear el usuario primero
    if (usuario) {
      // Verificar si el correo ya existe
      const existingUser = await User.findOne({ where: { correo: usuario.correo } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El correo ya está registrado',
          error: 'EMAIL_ALREADY_EXISTS'
        });
      }

      // Hashear contraseña si se proporciona
      const bcrypt = require('bcryptjs');
      const hashedPassword = usuario.contrasena 
        ? await bcrypt.hash(usuario.contrasena, 10) 
        : await bcrypt.hash('temp123', 10);

      // Crear usuario
      const newUser = await User.create({
        nombre: usuario.nombre,
        correo: usuario.correo,
        contraseña: hashedPassword,
        rol: usuario.rol || 'empleado',
        is_active: true
      });

      userId = newUser.id;
    } else if (id_usuario) {
      // Usar usuario existente
      const user = await User.findByPk(id_usuario);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
          error: 'USER_NOT_FOUND'
        });
      }
      userId = id_usuario;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Se debe proporcionar usuario o id_usuario',
        error: 'MISSING_USER_DATA'
      });
    }

    // Verificar si el usuario ya tiene un registro de empleado
    const existingEmployee = await Employee.findOne({ where: { id_usuario: userId } });
    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: 'Este usuario ya tiene un registro de empleado',
        error: 'EMPLOYEE_ALREADY_EXISTS'
      });
    }

    // Crear empleado
    const employee = await Employee.create({
      posicion,
      fecha_contratacion,
      estado,
      id_usuario: userId
    });

    // Obtener empleado creado con su usuario
    const createdEmployee = await Employee.findByPk(employee.id, {
      include: [{
        model: User,
        as: 'usuario',
        attributes: ['id', 'nombre', 'correo', 'rol', 'is_active']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Empleado creado exitosamente',
      data: { employee: createdEmployee }
    });
  } catch (error) {
    console.error('Error creando empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear empleado',
      error: 'CREATE_EMPLOYEE_ERROR'
    });
  }
};

/**
 * Obtener empleado por ID
 * Retorna los detalles de un empleado específico incluyendo datos de usuario
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID del empleado
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con los datos del empleado
 */
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id, {
      include: [{
        model: User,
        as: 'usuario',
        attributes: ['id', 'nombre', 'correo', 'rol', 'is_active']
      }]
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado',
        error: 'EMPLOYEE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: { employee }
    });
  } catch (error) {
    console.error('Error obteniendo empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener empleado',
      error: 'GET_EMPLOYEE_ERROR'
    });
  }
};

/**
 * Actualizar empleado (solo admin)
 * Permite al administrador actualizar datos del empleado y del usuario asociado
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID del empleado
 * @param {Object} req.body - Cuerpo de la solicitud
 * @param {string} req.body.posicion - Nueva posición (opcional)
 * @param {string} req.body.fecha_contratacion - Nueva fecha de contratación (opcional)
 * @param {boolean} req.body.estado - Nuevo estado (opcional)
 * @param {Object} req.body.usuario - Datos del usuario a actualizar (opcional)
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con el empleado actualizado
 */
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { posicion, fecha_contratacion, estado, usuario } = req.body;

    // Verificar si el empleado existe
    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado',
        error: 'EMPLOYEE_NOT_FOUND'
      });
    }

    // Actualizar datos del usuario si se proporcionan
    if (usuario) {
      const user = await User.findByPk(employee.id_usuario);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario asociado no encontrado',
          error: 'USER_NOT_FOUND'
        });
      }

      await User.update(
        {
          nombre: usuario.nombre || user.nombre,
          correo: usuario.correo || user.correo,
          rol: usuario.rol || user.rol
        },
        { where: { id: employee.id_usuario } }
      );
    }

    // Actualizar empleado
    const [updatedRowsCount] = await Employee.update(
      { posicion, fecha_contratacion, estado },
      { where: { id } }
    );

    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado',
        error: 'EMPLOYEE_NOT_FOUND'
      });
    }

    // Obtener empleado actualizado
    const updatedEmployee = await Employee.findByPk(id, {
      include: [{
        model: User,
        as: 'usuario',
        attributes: ['id', 'nombre', 'correo', 'rol', 'is_active']
      }]
    });

    res.json({
      success: true,
      message: 'Empleado actualizado exitosamente',
      data: { employee: updatedEmployee }
    });
  } catch (error) {
    console.error('Error actualizando empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar empleado',
      error: 'UPDATE_EMPLOYEE_ERROR'
    });
  }
};

/**
 * Eliminar empleado (solo admin)
 * Permite al administrador eliminar un empleado del sistema
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID del empleado a eliminar
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON confirmando la eliminación
 */
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el empleado existe
    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado',
        error: 'EMPLOYEE_NOT_FOUND'
      });
    }

    // Eliminar empleado
    await Employee.destroy({ where: { id } });

    res.json({
      success: true,
      message: 'Empleado eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar empleado',
      error: 'DELETE_EMPLOYEE_ERROR'
    });
  }
};

/**
 * Obtener solicitudes de empleados (solo admin)
 * Retorna la lista de solicitudes de empleo pendientes y procesadas
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con la lista de solicitudes
 */
const getEmployeeRequests = async (req, res) => {
  try {
    // Primero intentar sin include para ver si funciona
    const requests = await EmployeeRequest.findAll({
      order: [['fecha_solicitud', 'DESC']]
    });

    console.log('Solicitudes encontradas (sin include):', requests.length);

    res.json({
      success: true,
      data: { requests }
    });
  } catch (error) {
    console.error('Error obteniendo solicitudes de empleados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes de empleados',
      error: 'GET_EMPLOYEE_REQUESTS_ERROR'
    });
  }
};

/**
 * Crear solicitud de empleado
 * Permite a un usuario solicitante crear una solicitud de empleo
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Cuerpo de la solicitud
 * @param {string} req.body.posicion_deseada - Posición de trabajo deseada
 * @param {string} req.body.mensaje - Mensaje opcional del solicitante
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {number} req.user.id - ID del usuario
 * @param {string} req.user.rol - Rol del usuario (debe ser 'solicitante')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con la solicitud creada
 */
const createEmployeeRequest = async (req, res) => {
  try {
    const { posicion_deseada, mensaje = '' } = req.body;
    const userId = req.user.id;

    // Verificar si el usuario ya tiene una solicitud pendiente
    const existingRequest = await EmployeeRequest.findOne({
      where: { 
        id_usuario: userId,
        estado: 'pendiente'
      }
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: 'Ya tienes una solicitud de empleo pendiente de revisión',
        error: 'PENDING_REQUEST_EXISTS'
      });
    }

    // Verificar si el usuario ya es empleado
    const user = await User.findByPk(userId);
    if (user && user.rol === 'empleado') {
      return res.status(400).json({
        success: false,
        message: 'Ya eres empleado del sistema',
        error: 'ALREADY_EMPLOYEE'
      });
    }

    // Crear solicitud
    const employeeRequest = await EmployeeRequest.create({
      id_usuario: userId,
      posicion_deseada,
      mensaje,
      estado: 'pendiente'
    });

    // Obtener solicitud creada con relaciones
    const createdRequest = await EmployeeRequest.findByPk(employeeRequest.id, {
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'nombre', 'correo', 'rol']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Solicitud de empleo creada exitosamente',
      data: { request: createdRequest }
    });
  } catch (error) {
    console.error('Error creando solicitud de empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear solicitud de empleado',
      error: 'CREATE_EMPLOYEE_REQUEST_ERROR'
    });
  }
};

/**
 * Aprobar solicitud de empleado (solo admin)
 * Aprueba una solicitud de empleo, convierte al usuario en empleado y crea el registro
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID de la solicitud
 * @param {Object} req.body - Cuerpo de la solicitud
 * @param {string} req.body.comentarios_admin - Comentarios del administrador (opcional)
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {number} req.user.id - ID del administrador
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con la solicitud aprobada
 */
const approveEmployeeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comentarios_admin } = req.body;
    const adminId = req.user.id;

    // Buscar la solicitud
    const employeeRequest = await EmployeeRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'nombre', 'correo', 'rol']
        }
      ]
    });

    if (!employeeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada',
        error: 'REQUEST_NOT_FOUND'
      });
    }

    if (employeeRequest.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: 'Esta solicitud ya ha sido procesada',
        error: 'REQUEST_ALREADY_PROCESSED'
      });
    }

    // Aprobar la solicitud usando el método del modelo
    await employeeRequest.aprobar(adminId, comentarios_admin);

    // Obtener la solicitud actualizada
    const updatedRequest = await EmployeeRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'nombre', 'correo', 'rol']
        },
        {
          model: User,
          as: 'revisor',
          attributes: ['id', 'nombre', 'correo']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Solicitud aprobada exitosamente. El usuario ahora es empleado.',
      data: { request: updatedRequest }
    });
  } catch (error) {
    console.error('Error aprobando solicitud de empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar solicitud de empleado',
      error: 'APPROVE_EMPLOYEE_REQUEST_ERROR'
    });
  }
};

/**
 * Rechazar solicitud de empleado (solo admin)
 * Rechaza una solicitud de empleo con comentarios opcionales
 *
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID de la solicitud
 * @param {Object} req.body - Cuerpo de la solicitud
 * @param {string} req.body.comentarios_admin - Comentarios del administrador (opcional)
 * @param {Object} req.user - Usuario autenticado (del middleware)
 * @param {number} req.user.id - ID del administrador
 * @param {string} req.user.rol - Rol del usuario (debe ser 'admin')
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} Respuesta JSON con la solicitud rechazada
 */
const rejectEmployeeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comentarios_admin } = req.body;
    const adminId = req.user.id;

    // Buscar la solicitud
    const employeeRequest = await EmployeeRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'nombre', 'correo', 'rol']
        }
      ]
    });

    if (!employeeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada',
        error: 'REQUEST_NOT_FOUND'
      });
    }

    if (employeeRequest.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: 'Esta solicitud ya ha sido procesada',
        error: 'REQUEST_ALREADY_PROCESSED'
      });
    }

    // Rechazar la solicitud usando el método del modelo
    await employeeRequest.rechazar(adminId, comentarios_admin);

    // Obtener la solicitud actualizada
    const updatedRequest = await EmployeeRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'nombre', 'correo', 'rol']
        },
        {
          model: User,
          as: 'revisor',
          attributes: ['id', 'nombre', 'correo']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Solicitud rechazada exitosamente',
      data: { request: updatedRequest }
    });
  } catch (error) {
    console.error('Error rechazando solicitud de empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar solicitud de empleado',
      error: 'REJECT_EMPLOYEE_REQUEST_ERROR'
    });
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeRequests,
  createEmployeeRequest,
  approveEmployeeRequest,
  rejectEmployeeRequest
};
