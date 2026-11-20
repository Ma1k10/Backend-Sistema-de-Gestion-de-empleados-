const { DataTypes } = require('sequelize'); // Importar DataTypes de sequelize

module.exports = (sequelize) => { // Definir el modelo de empleado
  const Employee = sequelize.define('Employee', { // Definir el modelo de empleado
    id: {
      type: DataTypes.INTEGER, // Tipo de dato
      primaryKey: true, // Clave primaria
      autoIncrement: true, // Auto incremento
      allowNull: false // No permitir nulos
    },
    posicion: {
      type: DataTypes.ENUM('cajero', 'supervisor', 'gerente', 'administrativo', 'tecnico', 'operador'), // Tipo de dato
      allowNull: false, // No permitir nulos
      validate: {
        notEmpty: {
          msg: 'La posición es obligatoria'
        },
        isIn: {
          args: [['cajero', 'supervisor', 'gerente', 'administrativo', 'tecnico', 'operador']], // Valores permitidos
          msg: 'La posición debe ser una de las opciones válidas'
        }
      }
    },
    fecha_contratacion: {
      type: DataTypes.DATEONLY, // Tipo de dato
      allowNull: false, // No permitir nulos
      validate: {
        notEmpty: {
          msg: 'La fecha de contratación es obligatoria'
        },
        isDate: {
          msg: 'Debe proporcionar una fecha válida'
        },
        isBeforeToday(value) {
          if (new Date(value) > new Date()) {
            throw new Error('La fecha de contratación no puede ser futura');
          }
        }
      }
    },
    estado: {
      type: DataTypes.BOOLEAN, // Tipo de dato
      allowNull: false, // No permitir nulos
      defaultValue: true, // Valor por defecto
      validate: {
        isBoolean: {
          msg: 'El estado debe ser un valor booleano'
        }
      }
    },
    id_usuario: {
      type: DataTypes.INTEGER, // Tipo de dato
      allowNull: false, // No permitir nulos
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
    created_at: {
      type: DataTypes.DATE, // Tipo de dato
      allowNull: false, // No permitir nulos
      defaultValue: DataTypes.NOW // Valor por defecto
    },
    updated_at: {
      type: DataTypes.DATE, // Tipo de dato
      allowNull: false, // No permitir nulos
      defaultValue: DataTypes.NOW // Valor por defecto
    }
  }, {
    tableName: 'employees', // Nombre de la tabla
    timestamps: true, // Habilitar timestamps
    createdAt: 'created_at', // Nombre de la columna created_at
    updatedAt: 'updated_at', // Nombre de la columna updated_at
    indexes: [
      {
        unique: true, // Índice único
        fields: ['id_usuario']
      },
      {
        fields: ['posicion'] // Índice para búsqueda por posición
      },
      {
        fields: ['estado'] // Índice para búsqueda por estado
      },
      {
        fields: ['fecha_contratacion'] // Índice para búsqueda por fecha de contratación
      }
    ]
  });

  // Asociaciones
  Employee.associate = (models) => { 
    // Relación uno a uno con User
    Employee.belongsTo(models.User, { 
      foreignKey: 'id_usuario',
      as: 'usuario',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Relación uno a muchos con Schedule
    Employee.hasMany(models.Schedule, { 
      foreignKey: 'id_empleado',
      as: 'horarios',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Relación uno a muchos con ScheduleRequest
    Employee.hasMany(models.ScheduleRequest, {
      foreignKey: 'id_empleado',
      as: 'solicitudes_horario',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  // Métodos de instancia
  Employee.prototype.getAntiguedad = function() { // Calcula la antigüedad del empleado
    const fechaContratacion = new Date(this.fecha_contratacion); // Fecha de contratación
    const hoy = new Date(); // Fecha actual
    const diferencia = hoy - fechaContratacion; // Diferencia en milisegundos
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24)); // Diferencia en días
    const años = Math.floor(dias / 365); // Diferencia en años
    const meses = Math.floor((dias % 365) / 30); // Diferencia en meses
    
    return { años, meses, dias: dias % 30 };
  };

  Employee.prototype.getHorariosActuales = function() { // Obtiene los horarios actuales del empleado
    const hoy = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD
    return this.getHorarios({
      where: {
        fecha: {
          [sequelize.Sequelize.Op.gte]: hoy // Fecha mayor o igual a hoy
        }
      },
      order: [['fecha', 'ASC'], ['hora_inicio', 'ASC']] // Ordenar por fecha y hora de inicio
    });
  };

  return Employee;
};
