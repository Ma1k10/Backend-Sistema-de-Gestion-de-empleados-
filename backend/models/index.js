/**
 * MODELOS DE BASE DE DATOS - ÍNDICE
 * Archivo: backend/models/index.js
 * Descripción: Punto central de configuración de Sequelize ORM.
 *              Inicializa la conexión a la base de datos, importa todos los modelos,
 *              establece las asociaciones entre ellos y proporciona métodos de sincronización.
 *
 * MODELOS INCLUIDOS:
 * - User: Usuarios del sistema (admin, empleados)
 * - Employee: Información de empleados
 * - Schedule: Horarios asignados a empleados
 * - ScheduleRequest: Solicitudes de cambio de horario
 * - EmployeeRequest: Solicitudes de empleados
 * - Notification: Notificaciones del sistema
 */

const { Sequelize } = require('sequelize');
const config = require('../config/database');

// Determinar el entorno (development, test, production)
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

let sequelize;

console.log('🔧 Models - Usando configuración de database.js');

/**
 * Crear instancia de Sequelize
 * Inicializa la conexión a la base de datos usando la configuración del entorno actual
 *
 * CONFIGURACIÓN GLOBAL:
 * - underscored: Usa nombres de columnas con guiones bajos (snake_case)
 * - freezeTableName: No pluraliza automáticamente los nombres de tablas
 * - charset: utf8mb4 para soporte completo de Unicode (incluyendo emojis)
 * - collate: utf8mb4_unicode_ci para comparación de strings insensible a acentos
 */
sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    dialectOptions: dbConfig.dialectOptions,
    pool: dbConfig.pool,
    define: {
      underscored: true,          // Convertir camelCase a snake_case en columnas
      freezeTableName: true,      // Usar nombres de tablas exactos sin pluralizar
      charset: 'utf8mb4',         // Soporte completo de Unicode
      collate: 'utf8mb4_unicode_ci' // Comparación insensible a mayúsculas y acentos
    }
  }
);

/**
 * Importar todos los modelos
 * Cada modelo se importa pasando la instancia de sequelize
 */
const User = require('./User')(sequelize);
const Employee = require('./Employee')(sequelize);
const Schedule = require('./Schedule')(sequelize);
const ScheduleRequest = require('./ScheduleRequest')(sequelize);
const EmployeeRequest = require('./EmployeeRequest')(sequelize);
const Notification = require('./Notification')(sequelize);

/**
 * Establecer asociaciones entre modelos
 * Define las relaciones (hasMany, belongsTo, etc.) entre los modelos
 *
 * ASOCIACIONES:
 * - User tiene muchos Employees, EmployeeRequests y Notifications
 * - Employee pertenece a un User, tiene muchos Schedules y ScheduleRequests
 * - Schedule pertenece a un Employee
 * - ScheduleRequest pertenece a un Employee y es aprobado/rechazado por un User
 * - EmployeeRequest pertenece a un User
 * - Notification pertenece a un User
 */
const setupAssociations = () => {
  // User associations
  User.associate({ Employee, EmployeeRequest, Notification });

  // Employee associations
  Employee.associate({ User, Schedule, ScheduleRequest });

  // Schedule associations
  Schedule.associate({ Employee });

  // ScheduleRequest associations
  ScheduleRequest.associate({ Employee, User });

  // EmployeeRequest associations
  EmployeeRequest.associate({ User });

  // Notification associations
  Notification.associate({ User });
};

// Ejecutar configuración de asociaciones
setupAssociations();

/**
 * Objeto principal de la base de datos
 * Exporta la instancia de sequelize, la clase Sequelize y todos los modelos
 */
const db = {
  sequelize,          // Instancia de conexión a la base de datos
  Sequelize,          // Clase Sequelize para consultas y operaciones
  User,               // Modelo de usuarios
  Employee,           // Modelo de empleados
  Schedule,           // Modelo de horarios
  ScheduleRequest,    // Modelo de solicitudes de cambio de horario
  EmployeeRequest,    // Modelo de solicitudes de empleados
  Notification        // Modelo de notificaciones
};

/**
 * Sincronizar la base de datos
 * Crea o actualiza las tablas según los modelos definidos
 *
 * @param {boolean} force - Si es true, elimina y recrea todas las tablas (¡peligroso en producción!)
 * @returns {boolean} true si la sincronización fue exitosa, false en caso contrario
 *
 * MODO FORCE:
 * - force: true - Elimina todas las tablas y las recrea desde cero
 * - force: false (default) - Crea tablas si no existen, actualiza si hay cambios
 */
const syncDatabase = async (force = false) => {
  try {
    // Autenticar conexión a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente.');

    if (force) {
      // Modo peligroso: elimina y recrea todas las tablas
      await sequelize.sync({ force: true });
      console.log('🔄 Base de datos recreada (force sync).');
    } else {
      // Modo seguro: crea tablas nuevas, actualiza existentes
      await sequelize.sync({ alter: true });
      console.log('🔄 Base de datos sincronizada (alter sync).');
    }

    // Crear usuario administrador por defecto si no existe
    await createDefaultAdmin();

    console.log('✅ Base de datos sincronizada exitosamente.');
    return true;
  } catch (error) {
    console.error('❌ Error al sincronizar la base de datos:', error);
    return false;
  }
};

/**
 * Crear usuario administrador por defecto
 * Crea un usuario admin si no existe en la base de datos
 *
 * CREDENCIALES POR DEFECTO:
 * - Email: admin@example.com
 * - Contraseña: admin123
 *
 * NOTA: En producción, estas credenciales deben cambiarse inmediatamente
 */
const createDefaultAdmin = async () => {
  try {
    // Verificar si ya existe un admin
    const adminExists = await db.User.findOne({
      where: { correo: 'admin@example.com' }
    });

    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      // Hashear la contraseña con bcrypt (10 rounds)
      const hashedPassword = await bcrypt.hash('admin123', 10);

      // Crear usuario administrador
      await db.User.create({
        nombre: 'Administrador del Sistema',
        correo: 'admin@example.com',
        contraseña: hashedPassword,
        rol: 'admin',
        is_active: true
      });

      console.log('👤 Usuario administrador por defecto creado:');
      console.log('   📧 Email: admin@example.com');
      console.log('   🔑 Contraseña: admin123');
    }
  } catch (error) {
    console.error('❌ Error al crear usuario admin por defecto:', error);
  }
};

// Agregar métodos de utilidad al objeto db
db.syncDatabase = syncDatabase;
db.createDefaultAdmin = createDefaultAdmin;

/**
 * Exportar el objeto de base de datos
 * Este objeto se importa en toda la aplicación para acceder a los modelos y sequelize
 */
module.exports = db;
