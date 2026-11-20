/**
 * MODELO DE NOTIFICACIÓN
 * Archivo: backend/models/Notification.js
 * Descripción: Define el modelo Notification para notificaciones del sistema.
 *              Representa las notificaciones enviadas a los usuarios (empleados, admins).
 *
 * CAMPOS:
 * - id: Identificador único de la notificación
 * - id_usuario: FK al usuario destinatario
 * - titulo: Título breve de la notificación
 * - mensaje: Contenido del mensaje
 * - tipo: Tipo de notificación (info, success, warning, error, etc.)
 * - leida: Estado de lectura (leída/no leída)
 * - id_referencia: ID del objeto relacionado (opcional)
 * - tipo_referencia: Tipo del objeto relacionado (opcional)
 * - created_at/updated_at: Timestamps de creación y actualización
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  /**
   * Definición del modelo Notification
   * @param {Sequelize} sequelize - Instancia de Sequelize
   * @returns {Model} Modelo Notification
   */
  const Notification = sequelize.define('Notification', {
    // ID único de la notificación (auto-incremental)
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    // FK al usuario destinatario de la notificación
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // Título breve de la notificación
    titulo: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El título es obligatorio'
        },
        len: {
          args: [1, 200],
          msg: 'El título debe tener entre 1 y 200 caracteres'
        }
      }
    },
    // Contenido del mensaje de la notificación
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El mensaje es obligatorio'
        }
      }
    },
    // Tipo de notificación para categorizar y estilizar
    tipo: {
      type: DataTypes.ENUM('info', 'success', 'warning', 'error', 'employment_request', 'employment_approved', 'employment_rejected'),
      allowNull: false,
      defaultValue: 'info',
      validate: {
        isIn: {
          args: [['info', 'success', 'warning', 'error', 'employment_request', 'employment_approved', 'employment_rejected']],
          msg: 'Tipo de notificación no válido'
        }
      }
    },
    // Estado de lectura de la notificación
    leida: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // ID del objeto relacionado (ej: id_solicitud_empleo)
    id_referencia: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del objeto relacionado (ej: id_solicitud_empleo)'
    },
    // Tipo del objeto relacionado (ej: employee_request)
    tipo_referencia: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Tipo del objeto relacionado (ej: employee_request)'
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
    }
  }, {
    // Nombre de la tabla en la base de datos
    tableName: 'notifications',
    // Habilitar timestamps automáticos
    timestamps: true,
    // Nombres personalizados para los timestamps
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // Índices para optimizar consultas
    indexes: [
      {
        fields: ['id_usuario']  // Índice para filtrar por usuario
      },
      {
        fields: ['leida']  // Índice para filtrar por estado de lectura
      },
      {
        fields: ['tipo']  // Índice para filtrar por tipo
      },
      {
        fields: ['created_at']  // Índice para ordenar por fecha
      },
      {
        fields: ['id_usuario', 'leida']  // Índice compuesto para notificaciones no leídas de un usuario
      }
    ]
  });

  /**
   * Definir asociaciones con otros modelos
   * Establece las relaciones entre Notification y otros modelos de la base de datos
   *
   * @param {Object} models - Objeto con todos los modelos del sistema
   */
  Notification.associate = (models) => {
    // Relación con User (muchas a uno)
    // Una notificación pertenece a un usuario
    Notification.belongsTo(models.User, {
      foreignKey: 'id_usuario',
      as: 'usuario',
      onDelete: 'CASCADE',  // Si se elimina el usuario, se eliminan sus notificaciones
      onUpdate: 'CASCADE'
    });
  };

  return Notification;
};
