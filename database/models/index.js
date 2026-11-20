const { Sequelize } = require('sequelize'); // Importar Sequelize
const config = require('../config/config'); // Importar configuración

const env = process.env.NODE_ENV || 'development'; // Obtener ambiente
const dbConfig = config[env]; // Obtener configuración de la base de datos

// Crear instancia de Sequelize
const sequelize = new Sequelize( 
  dbConfig.database, // Nombre de la base de datos
  dbConfig.username, // Usuario
  dbConfig.password, // Contraseña
  {
    host: dbConfig.host, // Host
    dialect: dbConfig.dialect, // Dialecto
    logging: dbConfig.logging, // Logging
    pool: dbConfig.pool, // Pool
    define: {
      underscored: true, // Usar guiones bajos en los nombres de las tablas
      freezeTableName: true, // No pluralizar los nombres de las tablas
      charset: 'utf8mb4', // Charset
      collate: 'utf8mb4_unicode_ci' // Collate
    }
  }
);

// Importar modelos
const User = require('./User')(sequelize); // Importar modelo User
const Employee = require('./Employee')(sequelize); // Importar modelo Employee
const Schedule = require('./Schedule')(sequelize); // Importar modelo Schedule
const ScheduleRequest = require('./ScheduleRequest')(sequelize); // Importar modelo ScheduleRequest

// Establecer asociaciones
const setupAssociations = () => {
  // User associations
  User.associate({ Employee }); // Asociar User con Employee

  // Employee associations
  Employee.associate({ User, Schedule, ScheduleRequest }); // Asociar Employee con User, Schedule y ScheduleRequest

  // Schedule associations
  Schedule.associate({ Employee }); // Asociar Schedule con Employee

  // ScheduleRequest associations
  ScheduleRequest.associate({ Employee, User }); // Asociar ScheduleRequest con Employee y User
};

// Configurar asociaciones
setupAssociations();

// Objeto de la base de datos
const db = {
  sequelize,
  Sequelize,
  User,
  Employee,
  Schedule,
  ScheduleRequest
};

// Sincronización de la base de datos
const syncDatabase = async (force = false) => { // Sincronizar la base de datos
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente.');

    if (force) {
      await sequelize.sync({ force: true });
      console.log('🔄 Base de datos recreada (force sync).');
    } else {
      await sequelize.sync({ alter: true });
      console.log('🔄 Base de datos sincronizada (alter sync).');
    }

    // Crear usuario admin por defecto
    await createDefaultAdmin();

    console.log('✅ Base de datos sincronizada exitosamente.');
    return true;
  } catch (error) {
    console.error('❌ Error al sincronizar la base de datos:', error);
    return false;
  }
};

// Crear usuario administrador por defecto
const createDefaultAdmin = async () => { // Crear usuario administrador por defecto
  try {
    const adminExists = await db.User.findOne({
      where: { correo: 'admin@sistema.com' }
    });

    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await db.User.create({
        nombre: 'Administrador del Sistema',
        correo: 'admin@sistema.com',
        contraseña: hashedPassword,
        rol: 'admin',
        is_active: true
      });

      console.log('👤 Usuario administrador por defecto creado:');
      console.log('   📧 Email: admin@sistema.com');
      console.log('   🔑 Contraseña: admin123');
    }
  } catch (error) {
    console.error('❌ Error al crear usuario admin por defecto:', error);
  }
};

// Métodos de utilidad
db.syncDatabase = syncDatabase; // Sincronizar la base de datos
db.createDefaultAdmin = createDefaultAdmin; // Crear usuario administrador por defecto

module.exports = db; // Exportar el objeto de la base de datos
