/**
 * MODELO DE SOLICITUD DE CAMBIO DE HORARIO
 * Archivo: backend/models/ScheduleRequest.js
 * Descripción: Define el modelo ScheduleRequest para solicitudes de cambio de horario.
 *              Representa las solicitudes que hacen los empleados para modificar sus horarios.
 *
 * CAMPOS:
 * - id: Identificador único de la solicitud
 * - id_empleado: FK al empleado que solicita el cambio
 * - fecha_solicitada: Fecha para la que se solicita el cambio
 * - hora_actual_inicio/hora_actual_fin: Horario actual (opcional)
 * - nueva_hora_inicio/nueva_hora_fin: Nuevo horario solicitado
 * - estado: Estado de la solicitud (pendiente, aprobada, rechazada)
 * - motivo: Motivo del cambio
 * - id_revisor: FK al admin que revisa la solicitud
 * - fecha_revision: Fecha de revisión
 * - comentarios_revision: Comentarios del revisor
 * - created_at/updated_at: Timestamps de creación y actualización
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  /**
   * Definición del modelo ScheduleRequest
   * @param {Sequelize} sequelize - Instancia de Sequelize
   * @returns {Model} Modelo ScheduleRequest
   */
  const ScheduleRequest = sequelize.define('ScheduleRequest', {
    // ID único de la solicitud (auto-incremental)
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    // FK al empleado que solicita el cambio
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
    // Fecha para la que se solicita el cambio
    fecha_solicitada: {
      type: DataTypes.DATEONLY,  // Solo fecha, sin hora
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La fecha solicitada es obligatoria'
        },
        isDate: {
          msg: 'Debe proporcionar una fecha válida'
        },
        // Validador personalizado: no permitir fechas pasadas
        isNotPast(value) {
          if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
            throw new Error('No se pueden solicitar cambios para fechas pasadas');
          }
        }
      }
    },
    // Hora de inicio actual (opcional, para referencia)
    hora_actual_inicio: {
      type: DataTypes.TIME,
      allowNull: true,
      validate: {
        is: {
          args: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
          msg: 'La hora de inicio actual debe tener formato HH:MM (24 horas)'
        }
      }
    },
    // Hora de fin actual (opcional, para referencia)
    hora_actual_fin: {
      type: DataTypes.TIME,
      allowNull: true,
      validate: {
        is: {
          args: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
          msg: 'La hora de fin actual debe tener formato HH:MM (24 horas)'
        }
      }
    },
    // Nueva hora de inicio solicitada
    nueva_hora_inicio: {
      type: DataTypes.TIME,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La nueva hora de inicio es obligatoria'
        },
        is: {
          args: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
          msg: 'La hora de inicio debe tener formato HH:MM (24 horas)'
        }
      }
    },
    // Nueva hora de fin solicitada
    nueva_hora_fin: {
      type: DataTypes.TIME,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La nueva hora de fin es obligatoria'
        },
        is: {
          args: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
          msg: 'La hora de fin debe tener formato HH:MM (24 horas)'
        },
        // Validador personalizado: hora_fin debe ser posterior a hora_inicio
        isAfterInicio(value) {
          if (value <= this.nueva_hora_inicio) {
            throw new Error('La hora de fin debe ser posterior a la hora de inicio');
          }
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
    // Motivo del cambio de horario
    motivo: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: 'El motivo no puede exceder 500 caracteres'
        }
      }
    },
    // FK al admin que revisa la solicitud
    id_revisor: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: {
          msg: 'El ID del revisor debe ser un número entero'
        }
      }
    },
    // Fecha en que fue revisada la solicitud
    fecha_revision: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Comentarios del revisor
    comentarios_revision: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: 'Los comentarios de revisión no pueden exceder 500 caracteres'
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
    tableName: 'schedule_requests',
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
        fields: ['estado']  // Índice para filtrar por estado
      },
      {
        fields: ['fecha_solicitada']  // Índice para filtrar por fecha
      },
      {
        fields: ['id_empleado', 'estado']  // Índice compuesto para solicitudes de un empleado por estado
      },
      {
        fields: ['id_revisor']  // Índice para filtrar por revisor
      }
    ]
  });

  /**
   * Definir asociaciones con otros modelos
   * Establece las relaciones entre ScheduleRequest y otros modelos de la base de datos
   *
   * @param {Object} models - Objeto con todos los modelos del sistema
   */
  ScheduleRequest.associate = (models) => {
    // Relación muchos a uno con Employee (quien solicita)
    // Una solicitud pertenece a un empleado
    ScheduleRequest.belongsTo(models.Employee, {
      foreignKey: 'id_empleado',
      as: 'empleado_solicitante',
      onDelete: 'CASCADE',  // Si se elimina el empleado, se eliminan sus solicitudes
      onUpdate: 'CASCADE'
    });

    // Relación muchos a uno con User (quien revisa)
    // Una solicitud puede ser revisada por un admin
    ScheduleRequest.belongsTo(models.User, {
      foreignKey: 'id_revisor',
      as: 'revisor',
      onDelete: 'SET NULL',  // Si se elimina el revisor, se deja como NULL
      onUpdate: 'CASCADE'
    });
  };

  /**
   * Método de instancia: calcular duración del nuevo horario
   * Calcula la duración del nuevo horario solicitado en horas y minutos
   *
   * @returns {Object} Objeto con horas y minutos de duración
   */
  ScheduleRequest.prototype.getDuracionNueva = function() {
    const inicio = new Date(`2000-01-01T${this.nueva_hora_inicio}`);
    const fin = new Date(`2000-01-01T${this.nueva_hora_fin}`);
    const diferencia = fin - inicio;
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));

    return { horas, minutos };
  };

  /**
   * Método de instancia: aprobar solicitud
   * Aprueba la solicitud de cambio de horario
   *
   * @param {number} revisorId - ID del administrador que aprueba
   * @param {string} comentarios - Comentarios opcionales del revisor
   * @returns {Promise<Model>} Promesa que resuelve al modelo actualizado
   */
  ScheduleRequest.prototype.aprobar = function(revisorId, comentarios) {
    return this.update({
      estado: 'aprobada',
      id_revisor: revisorId,
      fecha_revision: new Date(),
      comentarios_revision: comentarios || null
    });
  };

  /**
   * Método de instancia: rechazar solicitud
   * Rechaza la solicitud de cambio de horario
   *
   * @param {number} revisorId - ID del administrador que rechaza
   * @param {string} comentarios - Comentarios opcionales del revisor
   * @returns {Promise<Model>} Promesa que resuelve al modelo actualizado
   */
  ScheduleRequest.prototype.rechazar = function(revisorId, comentarios) {
    return this.update({
      estado: 'rechazada',
      id_revisor: revisorId,
      fecha_revision: new Date(),
      comentarios_revision: comentarios || null
    });
  };

  /**
   * Scopes para consultas comunes
   * Definir filtros reutilizables para consultas frecuentes
   */

  // Scope: solicitudes pendientes
  ScheduleRequest.addScope('pendientes', () => ({
    where: {
      estado: 'pendiente'
    }
  }));

  // Scope: solicitudes aprobadas
  ScheduleRequest.addScope('aprobadas', () => ({
    where: {
      estado: 'aprobada'
    }
  }));

  // Scope: solicitudes rechazadas
  ScheduleRequest.addScope('rechazadas', () => ({
    where: {
      estado: 'rechazada'
    }
  }));

  // Scope: solicitudes de un empleado específico
  ScheduleRequest.addScope('deEmpleado', (empleadoId) => ({
    where: {
      id_empleado: empleadoId
    }
  }));

  // Scope: solicitudes de una fecha específica
  ScheduleRequest.addScope('delDia', (fecha) => ({
    where: {
      fecha_solicitada: fecha
    }
  }));

  return ScheduleRequest;
};
