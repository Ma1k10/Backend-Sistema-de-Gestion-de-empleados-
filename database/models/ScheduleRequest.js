const { DataTypes } = require('sequelize'); // Importar DataTypes de sequelize

module.exports = (sequelize) => { // Definir el modelo de ScheduleRequest
  const ScheduleRequest = sequelize.define('ScheduleRequest', { // Definir el modelo de ScheduleRequest
    id: {
      type: DataTypes.INTEGER, // Tipo de dato
      primaryKey: true, // Clave primaria
      autoIncrement: true, // Auto incremento
      allowNull: false // No permitir nulos
    },
    id_empleado: {
      type: DataTypes.INTEGER, // Tipo de dato
      allowNull: false, // No permitir nulos
      validate: {
        notEmpty: {
          msg: 'El ID del empleado es obligatorio'
        },
        isInt: {
          msg: 'El ID del empleado debe ser un número entero'
        }
      }
    },
    fecha_solicitada: {
      type: DataTypes.DATEONLY, // Tipo de dato
      allowNull: false, // No permitir nulos
      validate: {
        notEmpty: {
          msg: 'La fecha solicitada es obligatoria'
        },
        isDate: {
          msg: 'Debe proporcionar una fecha válida'
        },
        isNotPast(value) {
          if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
            throw new Error('No se pueden solicitar cambios para fechas pasadas');
          }
        }
      }
    },
    nueva_hora_inicio: {
      type: DataTypes.TIME, // Tipo de dato
      allowNull: false, // No permitir nulos
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
    nueva_hora_fin: {
      type: DataTypes.TIME, // Tipo de dato
      allowNull: false, // No permitir nulos
      validate: {
        notEmpty: {
          msg: 'La nueva hora de fin es obligatoria'
        },
        is: {
          args: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
          msg: 'La hora de fin debe tener formato HH:MM (24 horas)'
        },
        isAfterInicio(value) {
          if (value <= this.nueva_hora_inicio) {
            throw new Error('La hora de fin debe ser posterior a la hora de inicio');
          }
        }
      }
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada'), // Tipo de dato
      allowNull: false, // No permitir nulos
      defaultValue: 'pendiente', // Valor por defecto
      validate: {
        isIn: {
          args: [['pendiente', 'aprobada', 'rechazada']],
          msg: 'El estado debe ser pendiente, aprobada o rechazada'
        }
      }
    },
    motivo: {
      type: DataTypes.TEXT, // Tipo de dato
      allowNull: true, // Permitir nulos consiste en habilitar que una variable, parámetro o campo pueda almacenar la ausencia de un valor 
      validate: {
        len: {
          args: [0, 500],
          msg: 'El motivo no puede exceder 500 caracteres'
        }
      }
    },
    id_revisor: {
      type: DataTypes.INTEGER, // Tipo de dato
      allowNull: true, // Permitir nulos consiste en habilitar que una variable, parámetro o campo pueda almacenar la ausencia de un valor 
      validate: {
        isInt: {
          msg: 'El ID del revisor debe ser un número entero'
        }
      }
    },
    fecha_revision: {
      type: DataTypes.DATE,
      allowNull: true // Permitir nulos consiste en habilitar que una variable, parámetro o campo pueda almacenar la ausencia de un valor 
    },
    comentarios_revision: {
      type: DataTypes.TEXT,
      allowNull: true, // Permitir nulos consiste en habilitar que una variable, parámetro o campo pueda almacenar la ausencia de un valor 
      validate: {
        len: {
          args: [0, 500],
          msg: 'Los comentarios de revisión no pueden exceder 500 caracteres'
        }
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false, // No permitir nulos significa obligar a que una variable, parámetro o columna tenga siempre un valor válido y real
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false, // No permitir nulos significa obligar a que una variable, parámetro o columna tenga siempre un valor válido y real
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'schedule_requests', // Nombre de la tabla en la base de datos
    timestamps: true, // Habilitar timestamps (created_at y updated_at) registro que indica la fecha y hora exacta en la que ocurrió un evento o se modificó un dato
    createdAt: 'created_at', // Nombre de la columna created_at
    updatedAt: 'updated_at', // Nombre de la columna updated_at
    indexes: [
      {
        fields: ['id_empleado'] // Índice para búsqueda por empleado
      },
      {
        fields: ['estado'] // Índice para búsqueda por estado
      },
      {
        fields: ['fecha_solicitada'] // Índice para búsqueda por fecha solicitada
      },
      {
        fields: ['id_empleado', 'estado'] // Índice compuesto para búsqueda por empleado y estado
      },
      {
        fields: ['id_revisor'] // Índice para búsqueda por revisor
      }
    ]
  });

  // Asociaciones
  ScheduleRequest.associate = (models) => { 
    // Relación muchos a uno con Employee (quien solicita)
    ScheduleRequest.belongsTo(models.Employee, {
      foreignKey: 'id_empleado',
      as: 'empleado_solicitante',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Relación muchos a uno con User (quien revisa)
    ScheduleRequest.belongsTo(models.User, {
      foreignKey: 'id_revisor',
      as: 'revisor',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  };

  // Métodos de instancia
  ScheduleRequest.prototype.getDuracionNueva = function() { // Método para calcular la duración de la nueva jornada
    const inicio = new Date(`2000-01-01T${this.nueva_hora_inicio}`); // Crear fecha con hora de inicio
    const fin = new Date(`2000-01-01T${this.nueva_hora_fin}`); // Crear fecha con hora de fin
    const diferencia = fin - inicio; // Calcular diferencia en milisegundos
    const horas = Math.floor(diferencia / (1000 * 60 * 60)); // Calcular horas
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60)); // Calcular minutos
    
    return { horas, minutos };
  };

  ScheduleRequest.prototype.aprobar = function(revisorId, comentarios) { // Método para aprobar la solicitud
    return this.update({ // Actualizar el estado de la solicitud
      estado: 'aprobada',
      id_revisor: revisorId, // ID del revisor
      fecha_revision: new Date(), // Fecha de revisión
      comentarios_revision: comentarios || null // Comentarios de revisión
    });
  };

  ScheduleRequest.prototype.rechazar = function(revisorId, comentarios) { // Método para rechazar la solicitud
    return this.update({ // Actualizar el estado de la solicitud
      estado: 'rechazada',
      id_revisor: revisorId, // ID del revisor
      fecha_revision: new Date(), // Fecha de revisión
      comentarios_revision: comentarios || null // Comentarios de revisión
    });
  };

  // Scopes para consultas comunes - Facilitan las consultas frecuentes
  ScheduleRequest.addScope('pendientes', () => ({
    where: {
      estado: 'pendiente'
    }
  }));
// Scope para filtrar por estado - Facilita las consultas por estado Scope es una forma de crear consultas reutilizables
  ScheduleRequest.addScope('aprobadas', () => ({ 
    where: {
      estado: 'aprobada'
    }
  }));
 // Scope para filtrar por estado - Facilita las consultas por estado Scope es una forma de crear consultas reutilizables
  ScheduleRequest.addScope('rechazadas', () => ({ 
    where: {
      estado: 'rechazada'
    }
  }));
 // Scope para filtrar por empleado - Facilita las consultas por empleado Scope es una forma de crear consultas reutilizables
  ScheduleRequest.addScope('deEmpleado', (empleadoId) => ({
    where: {
      id_empleado: empleadoId
    }
  }));
// Scope para filtrar por fecha - Facilita las consultas por fecha Scope es una forma de crear consultas reutilizables
  ScheduleRequest.addScope('delDia', (fecha) => ({
    where: {
      fecha_solicitada: fecha
    }
  }));

  return ScheduleRequest;
};
