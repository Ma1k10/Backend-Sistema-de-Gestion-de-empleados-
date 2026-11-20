require('dotenv').config(); // Cargar variables de entorno

module.exports = { // Configuración de base de datos para diferentes entornos
  development: {
    username: process.env.DB_USER || 'root', // Usuario de la base de datos
    password: process.env.DB_PASSWORD || '', // Contraseña de la base de datos
    database: process.env.DB_NAME || 'sistema_horarios', // Nombre de la base de datos
    host: process.env.DB_HOST || 'localhost', // Host de la base de datos
    dialect: 'mysql',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: process.env.DB_USER || 'root', // Usuario de la base de datos
    password: process.env.DB_PASSWORD || '', // Contraseña de la base de datos
    database: process.env.DB_NAME_TEST || 'sistema_horarios_test', // Nombre de la base de datos de prueba
    host: process.env.DB_HOST || 'localhost', // Host de la base de datos
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    username: process.env.DB_USER, // Usuario de la base de datos
    password: process.env.DB_PASSWORD, // Contraseña de la base de datos
    database: process.env.DB_NAME, // Nombre de la base de datos
    host: process.env.DB_HOST, // Host de la base de datos
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};
