/**
 * MODELO DE SOLICITUD DE EMPLEADO
 * Archivo: backend/models/EmployeeRequest.js
 * Descripción: Define el modelo EmployeeRequest para solicitudes de empleo.
 *              Representa las solicitudes que hacen los usuarios para convertirse en empleados.
 *
 * CAMPOS:
 * - id: Identificador único de la solicitud
 * - id_usuario: FK al usuario que hace la solicitud
 * - posicion_deseada: Posición de trabajo deseada
 * - mensaje: Mensaje adicional del solicitante
 * - estado: Estado de la solicitud (pendiente, aprobada, rechazada)
 * - fecha_solicitud: Fecha en que se hizo la solicitud
 * - fecha_revision: Fecha en que fue revisada
 * - revisado_por: FK al admin que revisó la solicitud
 * - comentarios_admin: Comentarios del administrador
 * - created_at/updated_at: Timestamps de creación y actualización
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  /**
   * Definición del modelo EmployeeRequest
   * @param {Sequelize} sequelize - Instancia de Sequelize
   * @returns {Model} Modelo EmployeeRequest
   */
  const EmployeeRequest = sequelize.define('EmployeeRequest', {
    // ID único de la solicitud (auto-incremental)
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    // FK al usuario que hace la solicitud
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
    // Posición de trabajo deseada por el solicitante
    posicion_deseada: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La posición deseada es obligatoria'
        },
        len: {
          args: [2, 100],
          msg: 'La posición deseada debe tener entre 2 y 100 caracteres'
        }
      }
    },
    // Mensaje adicional del solicitante
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 1000],
          msg: 'El mensaje no puede exceder 1000 caracteres'
        }
      }
    },
    // Estado de la solicitud
    estado: {
      type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada'),
      allowNull: false,
      defaultValue: 'pendiente',
      validate: {
        isIn: {
          args: [['pendiente', 'aprobada', 'rechazada']],
          msg: 'El estado debe ser pendiente, aprobada o rechazada'
        }
      }
    },
    // Fecha en que se hizo la solicitud (automático)
    fecha_solicitud: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // Fecha en que fue revisada por un admin
    fecha_revision: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // FK al admin que revisó la solicitud
    revisado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    // Comentarios del administrador
    comentarios_admin: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: 'Los comentarios no pueden exceder 500 caracteres'
        }
      }
    }
  }, {
    // Nombre de la tabla en la base de datos
    tableName: 'employee_requests',
    // Habilitar timestamps automáticos
    timestamps: true,
    // Nombres personalizados para los timestamps
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // Índices para optimizar consultas
    indexes: [
      {
        fields: ['id_usuario']  // Índice para filtrar por solicitante
      },
      {
        fields: ['estado']  // Índice para filtrar por estado
      },
      {
        fields: ['fecha_solicitud']  // Índice para ordenar por fecha
      },
      {
        fields: ['revisado_por']  // Índice para filtrar por revisor
      }
    ]
  });

  /**
   * Definir asociaciones con otros modelos
   * Establece las relaciones entre EmployeeRequest y otros modelos de la base de datos
   *
   * @param {Object} models - Objeto con todos los modelos del sistema
   */
  EmployeeRequest.associate = (models) => {
    // Relación con el usuario solicitante
    // Una solicitud pertenece a un usuario (el solicitante)
    EmployeeRequest.belongsTo(models.User, {
      foreignKey: 'id_usuario',
      as: 'usuario',
      onDelete: 'CASCADE',  // Si se elimina el usuario, se eliminan sus solicitudes
      onUpdate: 'CASCADE'
    });

    // Relación con el administrador que revisa
    // Una solicitud puede ser revisada por un admin
    EmployeeRequest.belongsTo(models.User, {
      foreignKey: 'revisado_por',
      as: 'revisor',
      onDelete: 'SET NULL',  // Si se elimina el revisor, se deja como NULL
      onUpdate: 'CASCADE'
    });
  };

  /**
   * Método de instancia: aprobar solicitud
   * Aprueba la solicitud de empleo, cambia el rol del usuario a empleado
   * y crea el registro de empleado correspondiente
   *
   * @param {number} adminId - ID del administrador que aprueba
   * @param {string} comentarios - Comentarios opcionales del administrador
   * @returns {Promise<void>}
   */
  EmployeeRequest.prototype.aprobar = async function(adminId, comentarios = null) {
    this.estado = 'aprobada';
    this.fecha_revision = new Date();
    this.revisado_por = adminId;
    if (comentarios) {
      this.comentarios_admin = comentarios;
    }

    await this.save();

    // Cambiar el rol del usuario a empleado
    const User = sequelize.models.User;
    const Employee = sequelize.models.Employee;

    const usuario = await User.findByPk(this.id_usuario);
    if (usuario) {
      await usuario.update({ rol: 'empleado' });

      // Crear registro de empleado si no existe
      const existingEmployee = await Employee.findOne({
        where: { id_usuario: this.id_usuario }
      });

      if (!existingEmployee) {
        await Employee.create({
          id_usuario: this.id_usuario,
          posicion: this.posicion_deseada,
          fecha_contratacion: new Date(),
          estado: true
        });
      }
    }
  };

  /**
   * Método de instancia: rechazar solicitud
   * Rechaza la solicitud de empleo con comentarios opcionales
   *
   * @param {number} adminId - ID del administrador que rechaza
   * @param {string} comentarios - Comentarios opcionales del administrador
   * @returns {Promise<void>}
   */
  EmployeeRequest.prototype.rechazar = async function(adminId, comentarios = null) {
    this.estado = 'rechazada';
    this.fecha_revision = new Date();
    this.revisado_por = adminId;
    if (comentarios) {
      this.comentarios_admin = comentarios;
    }

    await this.save();
  };

  return EmployeeRequest;
};
