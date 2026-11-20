/**
 * MODELO DE EMPLEADO
 * Archivo: backend/models/Employee.js
 * Descripción: Define el modelo Employee para la tabla de empleados en la base de datos.
 *              Representa la información laboral de los empleados del sistema.
 *
 * CAMPOS:
 * - id: Identificador único del empleado
 * - posicion: Posición/puesto del empleado (cajero, supervisor, gerente, etc.)
 * - fecha_contratacion: Fecha en que fue contratado el empleado
 * - estado: Estado del empleado (activo/inactivo)
 * - id_usuario: FK al usuario asociado (relación uno a uno)
 * - created_at/updated_at: Timestamps de creación y actualización
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  /**
   * Definición del modelo Employee
   * @param {Sequelize} sequelize - Instancia de Sequelize
   * @returns {Model} Modelo Employee
   */
  const Employee = sequelize.define('Employee', {
    // ID único del empleado (auto-incremental)
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    // Posición o puesto del empleado
    posicion: {
      type: DataTypes.ENUM('cajero', 'supervisor', 'gerente', 'administrativo', 'tecnico', 'operador'),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La posición es obligatoria'
        },
        isIn: {
          args: [['cajero', 'supervisor', 'gerente', 'administrativo', 'tecnico', 'operador']],
          msg: 'La posición debe ser una de las opciones válidas'
        }
      }
    },
    // Fecha de contratación del empleado
    fecha_contratacion: {
      type: DataTypes.DATEONLY,  // Solo fecha, sin hora
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La fecha de contratación es obligatoria'
        },
        isDate: {
          msg: 'Debe proporcionar una fecha válida'
        },
        // Validador personalizado: no permitir fechas futuras
        isBeforeToday(value) {
          if (new Date(value) > new Date()) {
            throw new Error('La fecha de contratación no puede ser futura');
          }
        }
      }
    },
    // Estado del empleado (activo = true, inactivo = false)
    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: {
          msg: 'El estado debe ser un valor booleano'
        }
      }
    },
    // FK al usuario asociado (relación uno a uno)
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: {
        msg: 'Este usuario ya tiene un registro de empleado'
      },
      validate: {
        notEmpty: {
          msg: 'El ID de usuario es obligatorio'
        },
        isInt: {
          msg: 'El ID de usuario debe ser un número entero'
        }
      }
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
    tableName: 'employees',
    // Habilitar timestamps automáticos
    timestamps: true,
    // Nombres personalizados para los timestamps
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // Índices para optimizar consultas
    indexes: [
      {
        unique: true,
        fields: ['id_usuario']  // Índice único para relación con User
      },
      {
        fields: ['posicion']  // Índice para filtrar por posición
      },
      {
        fields: ['estado']  // Índice para filtrar empleados activos
      },
      {
        fields: ['fecha_contratacion']  // Índice para ordenar por antigüedad
      }
    ]
  });

  /**
   * Definir asociaciones con otros modelos
   * Establece las relaciones entre Employee y otros modelos de la base de datos
   *
   * @param {Object} models - Objeto con todos los modelos del sistema
   */
  Employee.associate = (models) => {
    // Relación uno a uno con User
    // Un empleado pertenece a un usuario
    Employee.belongsTo(models.User, {
      foreignKey: 'id_usuario',
      as: 'usuario',
      onDelete: 'CASCADE',  // Si se elimina el usuario, se elimina el empleado
      onUpdate: 'CASCADE'
    });

    // Relación uno a muchos con Schedule
    // Un empleado puede tener múltiples horarios asignados
    Employee.hasMany(models.Schedule, {
      foreignKey: 'id_empleado',
      as: 'horarios',
      onDelete: 'CASCADE',  // Si se elimina el empleado, se eliminan sus horarios
      onUpdate: 'CASCADE'
    });

    // Relación uno a muchos con ScheduleRequest
    // Un empleado puede hacer múltiples solicitudes de cambio de horario
    Employee.hasMany(models.ScheduleRequest, {
      foreignKey: 'id_empleado',
      as: 'solicitudes_horario',
      onDelete: 'CASCADE',  // Si se elimina el empleado, se eliminan sus solicitudes
      onUpdate: 'CASCADE'
    });
  };

  /**
   * Método de instancia: calcular antigüedad
   * Calcula la antigüedad del empleado basándose en la fecha de contratación
   *
   * @returns {Object} Objeto con años, meses y días de antigüedad
   */
  Employee.prototype.getAntiguedad = function() {
    const fechaContratacion = new Date(this.fecha_contratacion);
    const hoy = new Date();
    const diferencia = hoy - fechaContratacion;
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    const años = Math.floor(dias / 365);
    const meses = Math.floor((dias % 365) / 30);

    return { años, meses, dias: dias % 30 };
  };

  /**
   * Método de instancia: obtener horarios actuales
   * Obtiene los horarios del empleado para fechas actuales o futuras
   *
   * @returns {Promise<Array>} Promesa que resuelve a un array de horarios
   */
  Employee.prototype.getHorariosActuales = function() {
    const hoy = new Date().toISOString().split('T')[0];
    return this.getHorarios({
      where: {
        fecha: {
          [sequelize.Sequelize.Op.gte]: hoy  // Mayor o igual a hoy
        }
      },
      order: [['fecha', 'ASC'], ['hora_inicio', 'ASC']]  // Ordenar por fecha y hora
    });
  };

  return Employee;
};
