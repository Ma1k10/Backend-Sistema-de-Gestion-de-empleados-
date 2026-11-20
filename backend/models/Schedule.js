/**
 * MODELO DE HORARIO
 * Archivo: backend/models/Schedule.js
 * Descripción: Define el modelo Schedule para la tabla de horarios en la base de datos.
 *              Representa los horarios de trabajo asignados a los empleados.
 *
 * CAMPOS:
 * - id: Identificador único del horario
 * - id_empleado: FK al empleado asignado
 * - fecha: Fecha del horario de trabajo
 * - hora_inicio: Hora de inicio del turno
 * - hora_fin: Hora de fin del turno
 * - created_at/updated_at: Timestamps de creación y actualización
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  /**
   * Definición del modelo Schedule
   * @param {Sequelize} sequelize - Instancia de Sequelize
   * @returns {Model} Modelo Schedule
   */
  const Schedule = sequelize.define('Schedule', {
    // ID único del horario (auto-incremental)
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    // FK al empleado asignado
    id_empleado: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El ID del empleado es obligatorio'
        },
        isInt: {
          msg: 'El ID del empleado debe ser un número entero'
        }
      }
    },
    // Fecha del horario de trabajo
    fecha: {
      type: DataTypes.DATEONLY,  // Solo fecha, sin hora
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La fecha es obligatoria'
        },
        isDate: {
          msg: 'Debe proporcionar una fecha válida'
        }
      }
    },
    // Hora de inicio del turno (formato HH:MM)
    hora_inicio: {
      type: DataTypes.TIME,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La hora de inicio es obligatoria'
        },
        is: {
          args: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
          msg: 'La hora de inicio debe tener formato HH:MM (24 horas)'
        }
      }
    },
    // Hora de fin del turno (formato HH:MM)
    hora_fin: {
      type: DataTypes.TIME,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La hora de fin es obligatoria'
        },
        is: {
          args: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
          msg: 'La hora de fin debe tener formato HH:MM (24 horas)'
        },
        // Validador personalizado: hora_fin debe ser posterior a hora_inicio
        isAfterInicio(value) {
          if (value <= this.hora_inicio) {
            throw new Error('La hora de fin debe ser posterior a la hora de inicio');
          }
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
    tableName: 'schedules',
    // Habilitar timestamps automáticos
    timestamps: true,
    // Nombres personalizados para los timestamps
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // Índices para optimizar consultas
    indexes: [
      {
        fields: ['id_empleado']  // Índice para filtrar por empleado
      },
      {
        fields: ['fecha']  // Índice para filtrar por fecha
      },
      {
        fields: ['id_empleado', 'fecha']  // Índice compuesto para horarios de un empleado en una fecha
      },
      {
        fields: ['fecha', 'hora_inicio']  // Índice para ordenar cronológicamente
      }
    ]
  });

  /**
   * Definir asociaciones con otros modelos
   * Establece las relaciones entre Schedule y otros modelos de la base de datos
   *
   * @param {Object} models - Objeto con todos los modelos del sistema
   */
  Schedule.associate = (models) => {
    // Relación muchos a uno con Employee
    // Un horario pertenece a un empleado
    Schedule.belongsTo(models.Employee, {
      foreignKey: 'id_empleado',
      as: 'empleado',
      onDelete: 'CASCADE',  // Si se elimina el empleado, se eliminan sus horarios
      onUpdate: 'CASCADE'
    });
  };

  /**
   * Método de instancia: calcular duración del turno
   * Calcula la duración del horario en horas y minutos
   *
   * @returns {Object} Objeto con horas y minutos de duración
   */
  Schedule.prototype.getDuracion = function() {
    const inicio = new Date(`2000-01-01T${this.hora_inicio}`);
    const fin = new Date(`2000-01-01T${this.hora_fin}`);
    const diferencia = fin - inicio;
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));

    return { horas, minutos };
  };

  /**
   * Método de instancia: obtener día de la semana
 * Obtiene el nombre del día de la semana de la fecha del horario
   *
   * @returns {string} Nombre del día de la semana en español
   */
  Schedule.prototype.getDiaSemana = function() {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const fecha = new Date(this.fecha);
    return dias[fecha.getDay()];
  };

  /**
   * Scopes para consultas comunes
   * Definir filtros reutilizables para consultas frecuentes
   */

  // Scope: horarios de una fecha específica
  Schedule.addScope('delDia', (fecha) => ({
    where: {
      fecha: fecha
    }
  }));

  // Scope: horarios de un empleado específico
  Schedule.addScope('deEmpleado', (empleadoId) => ({
    where: {
      id_empleado: empleadoId
    }
  }));

  // Scope: horarios futuros (a partir de hoy)
  Schedule.addScope('futuros', () => ({
    where: {
      fecha: {
        [sequelize.Sequelize.Op.gte]: new Date().toISOString().split('T')[0]
      }
    }
  }));

  return Schedule;
};
