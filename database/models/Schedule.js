const { DataTypes } = require('sequelize'); // Importar DataTypes de sequelize

module.exports = (sequelize) => { // Definir el modelo Schedule
  const Schedule = sequelize.define('Schedule', { // Definir el modelo Schedule
    id: {
      type: DataTypes.INTEGER, // Tipo de dato
      primaryKey: true, // Clave primaria
      autoIncrement: true, // Auto incremento
      allowNull: false //  No permitir nulos significa obligar a que una variable, parámetro o columna tenga siempre un valor válido y real
    },
    id_empleado: {
      type: DataTypes.INTEGER, // Tipo de dato
      allowNull: false, //  No permitir nulos significa obligar a que una variable, parámetro o columna tenga siempre un valor válido y real
      validate: {
        notEmpty: {
          msg: 'El ID del empleado es obligatorio'
        },
        isInt: {
          msg: 'El ID del empleado debe ser un número entero'
        }
      }
    },
    fecha: {
      type: DataTypes.DATEONLY, // Tipo de dato
      allowNull: false, //  No permitir nulos significa obligar a que una variable, parámetro o columna tenga siempre un valor válido y real
      validate: {
        notEmpty: {
          msg: 'La fecha es obligatoria'
        },
        isDate: {
          msg: 'Debe proporcionar una fecha válida'
        },
        isNotPast(value) {
          if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
            throw new Error('No se pueden crear horarios para fechas pasadas');
          }
        }
      }
    },
    hora_inicio: {
      type: DataTypes.TIME, // Tipo de dato
      allowNull: false, //  No permitir nulos significa obligar a que una variable, parámetro o columna tenga siempre un valor válido y real
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
    hora_fin: {
      type: DataTypes.TIME, // Tipo de dato
      allowNull: false, //  No permitir nulos significa obligar a que una variable, parámetro o columna tenga siempre un valor válido y real
      validate: {
        notEmpty: {
          msg: 'La hora de fin es obligatoria'
        },
        is: {
          args: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
          msg: 'La hora de fin debe tener formato HH:MM (24 horas)'
        },
        isAfterInicio(value) {
          if (value <= this.hora_inicio) {
            throw new Error('La hora de fin debe ser posterior a la hora de inicio');
          }
        }
      }
    },
    created_at: {
      type: DataTypes.DATE, // Tipo de dato
      allowNull: false, //  No permitir nulos significa obligar a que una variable, parámetro o columna tenga siempre un valor válido y real
      defaultValue: DataTypes.NOW // Valor por defecto
    },
    updated_at: {
      type: DataTypes.DATE, // Tipo de dato
      allowNull: false, //  No permitir nulos significa obligar a que una variable, parámetro o columna tenga siempre un valor válido y real
      defaultValue: DataTypes.NOW // Valor por defecto
    }
  }, {
    tableName: 'schedules', // Nombre de la tabla en la base de datos
    timestamps: true, // Habilitar timestamps (created_at y updated_at)
    createdAt: 'created_at', // Nombre de la columna created_at
    updatedAt: 'updated_at', // Nombre de la columna updated_at
    indexes: [
      {
        fields: ['id_empleado'] // Índice para búsqueda por empleado
      },
      {
        fields: ['fecha'] // Índice para búsqueda por fecha
      },
      {
        fields: ['id_empleado', 'fecha'] // Índice compuesto para búsqueda por empleado y fecha
      },
      {
        fields: ['fecha', 'hora_inicio'] // Índice compuesto para búsqueda por fecha y hora de inicio
      }
    ]
  });

  // Asociaciones
  Schedule.associate = (models) => {
    // Relación muchos a uno con Employee
    Schedule.belongsTo(models.Employee, { // Relación muchos a uno con Employee
      foreignKey: 'id_empleado', // Campo foreign key
      as: 'empleado', // Alias para la asociación
      onDelete: 'CASCADE', // Eliminar el horario si se elimina el empleado
      onUpdate: 'CASCADE' // Actualizar el horario si se actualiza el empleado
    });
  };

  // Métodos de instancia
  Schedule.prototype.getDuracion = function() { // Método para calcular la duración del horario
    const inicio = new Date(`2000-01-01T${this.hora_inicio}`); // Fecha de inicio
    const fin = new Date(`2000-01-01T${this.hora_fin}`); // Fecha de fin
    const diferencia = fin - inicio; // Diferencia en milisegundos
    const horas = Math.floor(diferencia / (1000 * 60 * 60)); // Horas
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60)); // Minutos
    
    return { horas, minutos };
  };

  Schedule.prototype.getDiaSemana = function() { // Método para obtener el día de la semana
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']; // Días de la semana
    const fecha = new Date(this.fecha); // Fecha del horario
    return dias[fecha.getDay()]; // Retorna el día de la semana
  };

  // Scopes para consultas comunes
  Schedule.addScope('delDia', (fecha) => ({ // Scope para obtener los horarios de un día específico Scope es una forma de definir consultas reutilizables
    where: {
      fecha: fecha
    }
  }));

  Schedule.addScope('deEmpleado', (empleadoId) => ({ // Scope para obtener los horarios de un empleado específico Scope es una forma de definir consultas reutilizables
    where: {
      id_empleado: empleadoId
    }
  }));

  Schedule.addScope('futuros', () => ({ // Scope para obtener los horarios futuros Scope es una forma de definir consultas reutilizables
    where: {
      fecha: {
        [sequelize.Sequelize.Op.gte]: new Date().toISOString().split('T')[0]
      }
    }
  }));

  return Schedule;
};
