/**
 * CONFIGURACIÓN DE BASE DE DATOS
 * Archivo: backend/config/database.js
 * Descripción: Configura la conexión a la base de datos MySQL usando Sequelize ORM.
 *              Soporta múltiples entornos (development, test, production) y
 *              diferentes métodos de configuración (URL completa o variables individuales).
 */

// Cargar variables de entorno desde archivo .env
require('dotenv').config();

/**
 * Función para parsear MYSQL_URL
 * @param {string} url - URL de conexión a MySQL (ej: mysql://user:pass@host:port/db)
 * @returns {object|null} Objeto con configuración de conexión o null si hay error
 *
 * Esta función limpia y parsea una URL de conexión MySQL para extraer:
 * - host: servidor de base de datos
 * - port: puerto de conexión (default 3306)
 * - database: nombre de la base de datos
 * - username: usuario de la base de datos
 * - password: contraseña del usuario
 */
const parseMySqlUrl = (url) => {
  if (!url) return null;

  try {
    // Limpiar URL si viene con prefijo de variable de entorno
    let cleanUrl = url.trim();
    if (cleanUrl.startsWith('MYSQL_URL=')) {
      cleanUrl = cleanUrl.replace('MYSQL_URL=', '').trim();
    }

    // Remover comillas si existen (comunes en archivos .env)
    cleanUrl = cleanUrl.replace(/^["']|["']$/g, '');

    // Asegurar que tenga el protocolo correcto mysql://
    if (!cleanUrl.startsWith('mysql://')) {
      cleanUrl = 'mysql://' + cleanUrl;
    }

    console.log('🔧 Sequelize - URL original:', url);
    console.log('🔧 Sequelize - URL limpiada:', cleanUrl);

    // Parsear la URL usando la API nativa de Node.js
    const parsed = new URL(cleanUrl);
    const config = {
      host: parsed.hostname,
      port: parsed.port || 3306,
      database: parsed.pathname.substring(1), // Remove leading /
      username: parsed.username,
      password: parsed.password
    };

    console.log('✅ Sequelize - Config parseada:', {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password ? '***CONFIGURADO***' : 'NO DEFINIDO'
    });

    return config;
  } catch (error) {
    console.error('❌ Sequelize - Error parsing MYSQL_URL:', error.message);
    console.error('❌ Sequelize - URL que causó error:', url);
    return null;
  }
};

/**
 * Configuración de conexión a base de datos para diferentes entornos
 * Sequelize usará la configuración según la variable de entorno NODE_ENV
 */
module.exports = {
  /**
   * Configuración para entorno de DESARROLLO
   * Utiliza base de datos local MySQL con logging activado para debugging
   */
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Root123456!',
    database: process.env.DB_NAME || 'sistema_horarios',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: console.log, // Muestra queries SQL en consola
    pool: {
      max: 5,      // Máximo de conexiones en el pool
      min: 0,      // Mínimo de conexiones en el pool
      acquire: 30000,  // Tiempo máximo para obtener conexión (ms)
      idle: 10000  // Tiempo máximo que una conexión puede estar inactiva (ms)
    }
  },

  /**
   * Configuración para entorno de PRUEBAS
   * Utiliza base de datos separada para tests sin logging
   */
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Root123456!',
    database: process.env.DB_NAME_TEST || 'sistema_horarios_test',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false, // Desactiva logging para tests
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },

  /**
   * Configuración para entorno de PRODUCCIÓN
   * Soporta múltiples métodos de configuración para plataformas como Railway
   * Prioridad 1: MYSQL_URL completa
   * Prioridad 2: Variables individuales de Railway
   */
  production: (() => {
    // Prioridad 1: Usar MYSQL_URL si está disponible (formato completo)
    if (process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL) {
      const mysqlUrl = process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;
      console.log('🔗 Usando MYSQL_URL para conexión a base de datos');
      const parsed = parseMySqlUrl(mysqlUrl);
      if (parsed) {
        return {
          username: parsed.username,
          password: parsed.password,
          database: parsed.database,
          host: parsed.host,
          port: parsed.port,
          dialect: 'mysql',
          dialectOptions: {
            ssl: { rejectUnauthorized: false }, // SSL para conexiones seguras
            connectTimeout: 60000  // Timeout de 60 segundos
          },
          logging: console.log,
          pool: {
            max: 10,     // Pool más grande para producción
            min: 0,
            acquire: 60000,
            idle: 10000,
            evict: 1000  // Tiempo entre verificaciones de conexiones
          }
        };
      }
    }

    // Prioridad 2: Usar variables Railway individuales (fallback)
    console.log('🔧 Usando variables de entorno individuales para conexión');
    return {
      username: process.env.DB_USER || process.env.RAILWAY_PRIVATE_MYSQL_USER || process.env.MYSQLUSER,
      password: process.env.DB_PASSWORD || process.env.RAILWAY_PRIVATE_MYSQL_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD,
      database: process.env.DB_NAME || process.env.RAILWAY_PRIVATE_MYSQL_DATABASE || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE,
      host: process.env.DB_HOST || process.env.RAILWAY_PRIVATE_MYSQL_HOST || process.env.MYSQLHOST || process.env.RAILWAY_PRIVATE_DOMAIN,
      port: process.env.DB_PORT || process.env.RAILWAY_PRIVATE_MYSQL_PORT || process.env.MYSQLPORT || 3306,
      dialect: 'mysql',
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      },
      logging: console.log,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    };
  })()
};
