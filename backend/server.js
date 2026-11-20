require('dotenv').config({ path: '.env' }); // Cargar variables de entorno
require('dotenv').config({ path: '.env.production' }); // Cargar variables de entorno de producción

const express = require('express'); // Framework web
const http = require('http'); // Servidor HTTP
const cors = require('cors'); // Middleware para CORS
const helmet = require('helmet'); // Middleware para seguridad HTTP
const rateLimit = require('express-rate-limit'); // Middleware para limitar peticiones
const { sequelize } = require('./models'); // Conexión a la base de datos

// Forzar NODE_ENV a production para asegurar configuración correcta
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
console.log('🔧 NODE_ENV forzado a:', process.env.NODE_ENV);

// Importar middlewares
const { 
  corsOptions, 
  generalLimiter, 
  authLimiter, 
  helmetConfig, 
  sanitizeInput, 
  requestLogger, 
  errorHandler,
  checkDatabaseConnection 
} = require('./middleware/security');

// Importar rutas
const authRoutes = require('./routes/auth'); // Rutas de autenticación
const employeeRoutes = require('./routes/employees'); // Rutas de empleados
const scheduleRoutes = require('./routes/schedules'); // Rutas de horarios
const scheduleRequestRoutes = require('./routes/scheduleRequests'); // Rutas de solicitudes de horarios
const notificationRoutes = require('./routes/notifications'); // Rutas de notificaciones
const employeeRequestRoutes = require('./routes/employeeRequests'); // Rutas de solicitudes de empleados

// Crear aplicación Express
const app = express();

// Middlewares de seguridad
app.use(helmetConfig);
app.use(cors(corsOptions));
if (process.env.NODE_ENV === 'production') {
  app.use(generalLimiter);
}
app.use(sanitizeInput);
app.use(requestLogger);

// Middlewares básicos
app.use(express.json({ limit: '10mb' })); // Parsear JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parsear URL encoded

// Verificar conexión a base de datos
app.use(checkDatabaseConnection);

// Rutas de autenticación (sin rate limiting en desarrollo)
if (process.env.NODE_ENV === 'production') { 
  app.use('/api/auth', authLimiter);
}
app.post('/api/auth/register', authRoutes.register); // Registrar usuario
app.post('/api/auth/login', authRoutes.login); // Iniciar sesión
app.post('/api/auth/logout', authRoutes.logout); // Cerrar sesión
app.get('/api/auth/profile', authRoutes.getProfile); // Obtener perfil
app.put('/api/auth/profile', authRoutes.updateProfile); // Actualizar perfil
app.put('/api/auth/change-password', authRoutes.changePassword); // Cambiar contraseña
app.post('/api/auth/refresh', authRoutes.refreshToken); // Refrescar token
app.post('/api/auth/forgot-password', authRoutes.forgotPassword); // Recuperar contraseña
app.post('/api/auth/reset-password', authRoutes.resetPassword); // Restablecer contraseña
app.get('/api/auth/approve-reset/:token', authRoutes.approvePasswordReset); // Aprobar restablecimiento de contraseña
app.get('/api/auth/reject-reset/:token', authRoutes.rejectPasswordReset); // Rechazar restablecimiento de contraseña


// Rutas de empleados (protegidas)
app.use('/api/employees', require('./middleware/auth').authenticateToken); // Autenticar token
app.get('/api/employees', require('./middleware/auth').requireAdmin, employeeRoutes.getEmployees); // Obtener todos los empleados (solo admin)
app.get('/api/employees/:id', require('./middleware/auth').requireAdmin, employeeRoutes.getEmployeeById); // Obtener empleado por ID (solo admin)
app.post('/api/employees', require('./middleware/auth').requireAdmin, employeeRoutes.createEmployee); // Crear empleado (solo admin)
app.put('/api/employees/:id', require('./middleware/auth').requireAdmin, employeeRoutes.updateEmployee); // Actualizar empleado (solo admin)
app.delete('/api/employees/:id', require('./middleware/auth').requireAdmin, employeeRoutes.deleteEmployee); // Eliminar empleado (solo admin)

// Rutas de horarios (protegidas)
app.get('/api/schedules', require('./middleware/auth').authenticateToken, require('./middleware/auth').requireAdmin, scheduleRoutes.getSchedules); // Obtener todos los horarios (solo admin)
app.post('/api/schedules', require('./middleware/auth').authenticateToken, require('./middleware/auth').requireAdmin, scheduleRoutes.createSchedule); // Crear horario (solo admin)
app.put('/api/schedules/:id', require('./middleware/auth').authenticateToken, require('./middleware/auth').requireAdmin, scheduleRoutes.updateSchedule); // Actualizar horario (solo admin)
app.delete('/api/schedules/:id', require('./middleware/auth').authenticateToken, require('./middleware/auth').requireAdmin, scheduleRoutes.deleteSchedule); // Eliminar horario (solo admin)

// Rutas de horarios para empleados
app.get('/api/my-schedules', require('./middleware/auth').authenticateToken, scheduleRoutes.getMySchedules); // Obtener horarios del empleado autenticado

// Rutas de solicitudes de cambio de horario (protegidas)
app.use('/api/schedule-requests', require('./middleware/auth').authenticateToken); // Autenticar token
app.get('/api/schedule-requests', scheduleRequestRoutes.getScheduleRequests); // Obtener todas las solicitudes (solo admin)
app.post('/api/schedule-requests', scheduleRequestRoutes.createScheduleRequest); // Crear solicitud
app.put('/api/schedule-requests/:id', require('./middleware/auth').requireAdmin, scheduleRequestRoutes.approveOrRejectScheduleRequest); // Aprobar o rechazar solicitud (solo admin)

// Rutas de notificaciones (protegidas)
app.use('/api/notifications', require('./middleware/auth').authenticateToken); // Autenticar token
app.get('/api/notifications', notificationRoutes.getNotifications); // Obtener notificaciones del empleado autenticado
app.get('/api/notifications/admin', require('./middleware/auth').requireAdmin, notificationRoutes.getAdminNotifications); // Obtener todas las notificaciones (solo admin)
app.put('/api/notifications/:id/read', notificationRoutes.markAsRead); // Marcar notificación como leída
app.put('/api/notifications/read-all', notificationRoutes.markAllAsRead); // Marcar todas las notificaciones como leídas
app.delete('/api/notifications/:id', notificationRoutes.deleteNotification); // Eliminar notificación

// Rutas de solicitudes de empleo (protegidas)
app.use('/api/employee-requests', require('./middleware/auth').authenticateToken); // Autenticar token
app.get('/api/employee-requests', require('./middleware/auth').requireAdmin, employeeRequestRoutes.getEmployeeRequests); // Obtener todas las solicitudes (solo admin)
app.get('/api/employee-requests/my', employeeRequestRoutes.getMyEmployeeRequests); // Obtener solicitudes del empleado autenticado
app.get('/api/employee-requests/:id', require('./middleware/auth').requireAdmin, employeeRequestRoutes.getEmployeeRequestById); // Obtener solicitud por ID (solo admin)
app.put('/api/employee-requests/:id/approve', require('./middleware/auth').requireAdmin, employeeRequestRoutes.approveEmployeeRequest); // Aprobar solicitud (solo admin)
app.put('/api/employee-requests/:id/reject', require('./middleware/auth').requireAdmin, employeeRequestRoutes.rejectEmployeeRequest); // Rechazar solicitud (solo admin)


// Ruta de health check - Verificar estado del servidor
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta de API info - Información sobre los endpoints disponibles
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'API del Sistema de Gestión de Empleados y Horarios',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Registrar usuario (público - crea solicitante)', // Crear solicitud de registro
        'POST /api/auth/login': 'Iniciar sesión', // Iniciar sesión
        'POST /api/auth/logout': 'Cerrar sesión', // Cerrar sesión
        'GET /api/auth/profile': 'Obtener perfil', // Obtener perfil del usuario autenticado
        'PUT /api/auth/profile': 'Actualizar perfil', // Actualizar perfil del usuario autenticado
        'PUT /api/auth/change-password': 'Cambiar contraseña', // Cambiar contraseña del usuario autenticado
        'POST /api/auth/refresh': 'Refrescar token', // Refrescar token de autenticación
        'POST /api/auth/forgot-password': 'Solicitar recuperación de contraseña (envía email a admin)',
        'POST /api/auth/reset-password': 'Restablecer contraseña con token'
      },
      employees: {
        'GET /api/employees': 'Listar empleados (admin)', // Listar todos los empleados (solo admin)
        'POST /api/employees': 'Crear empleado (admin)', // Crear empleado (solo admin)
        'PUT /api/employees/:id': 'Actualizar empleado (admin)', // Actualizar empleado (solo admin)
        'DELETE /api/employees/:id': 'Eliminar empleado (admin)' // Eliminar empleado (solo admin)
      },
      schedules: {
        'GET /api/schedules': 'Listar horarios (admin)', // Listar todos los horarios (solo admin)
        'POST /api/schedules': 'Crear horario (admin)', // Crear horario (solo admin)
        'PUT /api/schedules/:id': 'Actualizar horario (admin)', // Actualizar horario (solo admin)
        'DELETE /api/schedules/:id': 'Eliminar horario (admin)', // Eliminar horario (solo admin)
        'GET /api/my-schedules': 'Ver mis horarios asignados (empleado)' // Ver horarios asignados al empleado autenticado
      },
      scheduleRequests: {
        'GET /api/schedule-requests': 'Listar solicitudes de cambio (admin)', // Listar todas las solicitudes de cambio (solo admin)
        'POST /api/schedule-requests': 'Crear solicitud de cambio (empleado)', // Crear solicitud de cambio (solo empleado)
        'PUT /api/schedule-requests/:id': 'Aprobar/rechazar solicitud (admin)' // Aprobar/rechazar solicitud (solo admin)
      },
      notifications: {
        'GET /api/notifications': 'Listar notificaciones del usuario', // Listar notificaciones del usuario autenticado
        'GET /api/notifications/admin': 'Listar notificaciones de administrador (solicitudes empleo)', // Listar notificaciones de administrador (solicitudes empleo)
        'PUT /api/notifications/:id/read': 'Marcar notificación como leída', // Marcar notificación como leída
        'PUT /api/notifications/read-all': 'Marcar todas como leídas', // Marcar todas como leídas
        'DELETE /api/notifications/:id': 'Eliminar notificación' // Eliminar notificación
      },
      employeeRequests: {
        'GET /api/employee-requests': 'Listar solicitudes de empleo (admin)', // Listar todas las solicitudes de empleo (solo admin)
        'GET /api/employee-requests/my': 'Listar mis solicitudes de empleo', // Listar solicitudes del empleado autenticado
        'GET /api/employee-requests/:id': 'Ver solicitud de empleo (admin)', // Ver solicitud de empleo por ID (solo admin)
        'PUT /api/employee-requests/:id/approve': 'Aprobar solicitud de empleo (admin)', // Aprobar solicitud de empleo (solo admin)
        'PUT /api/employee-requests/:id/reject': 'Rechazar solicitud de empleo (admin)' // Rechazar solicitud de empleo (solo admin)
      }
    }
  });
});

// Middleware para manejar rutas no encontradas - Manejar 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    error: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Middleware de manejo de errores (debe ir al final) - Manejar errores globales
app.use(errorHandler);

// Función para iniciar el servidor - Inicializar servidor y base de datos
const startServer = async () => {
  try {
    // Mostrar configuración de Sequelize antes de conectar
    console.log('🔍 Configuración actual de Sequelize:'); // Mostrar configuración de Sequelize antes de conectar
    console.log('  Dialect:', sequelize.config.dialect); // Dialecto de la base de datos
    console.log('  Host:', sequelize.config.host); // Host de la base de datos
    console.log('  Port:', sequelize.config.port); // Puerto de la base de datos
    console.log('  Database:', sequelize.config.database); // Nombre de la base de datos
    console.log('  Username:', sequelize.config.username); // Usuario de la base de datos
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    
    // Esperar a que la base de datos esté disponible
    const { waitForDatabase } = require('./wait-for-db');
    await waitForDatabase(5, 5000); // Esperar máximo 5 segundos
    
    console.log('✅ Conexión a MySQL establecida correctamente.');
    
    // Intentar inicializar base de datos desde archivo SQL
    const { initDatabase } = require('./scripts/init-database');
    const sqlImported = await initDatabase();
    
    if (!sqlImported) {
      console.log('⚠️ No se pudo importar desde SQL, continuando con sincronización normal...');
    }

    // Sincronizar modelos y ajustar columnas faltantes en la base de datos
    console.log('🔄 Sincronizando base de datos...');
    await sequelize.sync({ alter: true, force: false });
    console.log('✅ Base de datos sincronizada correctamente.');

    // Crear usuario admin por defecto si no existe
    const { User } = require('./models');
    const adminExists = await User.findOne({ where: { correo: 'adminexample@admin.com' } });
    
    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await User.create({
        nombre: 'Administrador del Sistema',
        correo: 'adminexample@admin.com',
        contraseña: hashedPassword,
        rol: 'admin',
        is_active: true
      });
      
      console.log('👤 Usuario administrador creado: adminexample@admin.com / admin123');
    }

    // Iniciar servidor con http.createServer para controlar maxHeadersCount
    const PORT = process.env.PORT || 3001;
    const server = http.createServer(app);
    
    // Set max header size on the HTTP server
    server.maxHeadersCount = 1000;
    
    server.listen(PORT, () => {
      console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
      console.log(`🌐 API disponible en: http://localhost:${PORT}/api`);
      console.log(`📚 Documentación en: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check en: http://localhost:${PORT}/health`);
      console.log('');
      console.log('🔐 Credenciales de administrador:');
      console.log('   📧 Email: adminexample@admin.com');
      console.log('   🔑 Password: admin123');
    });

    // Manejar cierre del servidor
    server.on('close', () => {
      console.error('❌ El servidor se ha cerrado inesperadamente');
    });

    return server;

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});

// Iniciar servidor
startServer();

// Mantener el proceso vivo
process.stdin.resume();

module.exports = app;
