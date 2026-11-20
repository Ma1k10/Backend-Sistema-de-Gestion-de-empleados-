/**
 * MODELO DE USUARIO
 * Archivo: backend/models/User.js
 * Descripción: Define el modelo User para la tabla de usuarios en la base de datos.
 *              Representa a los usuarios del sistema (administradores, empleados, solicitantes).
 *
 * CAMPOS:
 * - id: Identificador único del usuario
 * - nombre: Nombre completo del usuario
 * - correo: Email único para autenticación
 * - contraseña: Contraseña hasheada (nunca almacenar en texto plano)
 * - rol: Rol del usuario (admin, empleado, solicitante)
 * - is_active: Estado del usuario (activo/inactivo)
 * - created_at/updated_at: Timestamps de creación y actualización
 * - reset_token: Token para recuperación de contraseña
 * - reset_token_expiry: Fecha de expiración del token
 * - last_login: Fecha del último inicio de sesión
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  /**
   * Definición del modelo User
   * @param {Sequelize} sequelize - Instancia de Sequelize
   * @returns {Model} Modelo User
   */
  const User = sequelize.define('User', {
    // ID único del usuario (auto-incremental)
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    // Nombre completo del usuario
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El nombre es obligatorio'
        },
        len: {
          args: [2, 100],
          msg: 'El nombre debe tener entre 2 y 100 caracteres'
        }
      }
    },
    // Email único del usuario (usado para login)
    correo: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: {
        msg: 'Este correo electrónico ya está registrado'
      },
      validate: {
        isEmail: {
          msg: 'Debe proporcionar un correo electrónico válido'
        },
        notEmpty: {
          msg: 'El correo es obligatorio'
        }
      }
    },
    // Contraseña hasheada (usar bcrypt antes de guardar)
    contraseña: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La contraseña es obligatoria'
        },
        len: {
          args: [6, 255],
          msg: 'La contraseña debe tener al menos 6 caracteres'
        }
      }
    },
    // Rol del usuario en el sistema
    rol: {
      type: DataTypes.ENUM('admin', 'empleado', 'solicitante'),
      allowNull: false,
      defaultValue: 'solicitante',
      validate: {
        isIn: {
          args: [['admin', 'empleado', 'solicitante']],
          msg: 'El rol debe ser admin, empleado o solicitante'
        }
      }
    },
    // Estado del usuario (activo/inactivo)
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    // Timestamp de creación (automático)
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // Timestamp de actualización (automático)
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // Token para recuperación de contraseña
    reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    // Fecha de expiración del token de recuperación
    reset_token_expiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Fecha del último inicio de sesión
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    // Nombre de la tabla en la base de datos
    tableName: 'users',
    // Habilitar timestamps automáticos
    timestamps: true,
    // Nombres personalizados para los timestamps
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // Índices para optimizar consultas
    indexes: [
      {
        unique: true,
        fields: ['correo']  // Índice único para email (login)
      },
      {
        fields: ['rol']  // Índice para filtrar por rol
      },
      {
        fields: ['is_active']  // Índice para filtrar usuarios activos
      },
      {
        fields: ['reset_token']  // Índice para búsqueda de token de recuperación
      },
      {
        fields: ['reset_token_expiry']  // Índice para limpieza de tokens expirados
      }
    ]
  });

  /**
   * Definir asociaciones con otros modelos
   * Establece las relaciones entre User y otros modelos de la base de datos
   *
   * @param {Object} models - Objeto con todos los modelos del sistema
   */
  User.associate = (models) => {
    // Relación uno a uno con Employee
    // Un usuario puede tener un perfil de empleado
    User.hasOne(models.Employee, {
      foreignKey: 'id_usuario',
      as: 'empleado',
      onDelete: 'CASCADE',  // Si se elimina el usuario, se elimina el empleado
      onUpdate: 'CASCADE'  // Si se actualiza el ID del usuario, se actualiza en empleado
    });

    // Relación uno a muchos con EmployeeRequest (como solicitante)
    // Un usuario puede hacer múltiples solicitudes de empleo
    User.hasMany(models.EmployeeRequest, {
      foreignKey: 'id_usuario',
      as: 'solicitudes_empleo',
      onDelete: 'CASCADE',  // Si se elimina el usuario, se eliminan sus solicitudes
      onUpdate: 'CASCADE'
    });

    // Relación uno a muchos con EmployeeRequest (como revisor)
    // Un usuario (admin) puede revisar múltiples solicitudes
    User.hasMany(models.EmployeeRequest, {
      foreignKey: 'revisado_por',
      as: 'solicitudes_revisadas',
      onDelete: 'SET NULL',  // Si se elimina el revisor, se deja como NULL
      onUpdate: 'CASCADE'
    });

    // Relación uno a muchos con Notification
    // Un usuario puede tener múltiples notificaciones
    User.hasMany(models.Notification, {
      foreignKey: 'id_usuario',
      as: 'notificaciones',
      onDelete: 'CASCADE',  // Si se elimina el usuario, se eliminan sus notificaciones
      onUpdate: 'CASCADE'
    });
  };

  /**
   * Método personalizado toJSON
   * Sobrescribe el método toJSON para excluir la contraseña al serializar
   * Esto evita que la contraseña se envíe en respuestas JSON
   *
   * @returns {Object} Objeto del usuario sin la contraseña
   */
  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.contraseña;  // Eliminar contraseña antes de enviar
    return values;
  };

  return User;
};
