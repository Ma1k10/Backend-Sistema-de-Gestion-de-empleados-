const { DataTypes } = require('sequelize'); // Importar DataTypes de sequelize

module.exports = (sequelize) => { // Definir el modelo User
  const User = sequelize.define('User', { 
    id: {
      type: DataTypes.INTEGER, // Tipo de dato entero
      primaryKey: true, // Es la llave primaria
      autoIncrement: true, // Autoincremental
      allowNull: false // No puede ser nulo
    },
    nombre: {
      type: DataTypes.STRING(100), // Tipo de dato string con longitud máxima de 100 caracteres
      allowNull: false, // No puede ser nulo
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
    correo: {
      type: DataTypes.STRING(150), // Tipo de dato string con longitud máxima de 150 caracteres
      allowNull: false, // No puede ser nulo
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
    contraseña: {
      type: DataTypes.STRING(255), // Tipo de dato string con longitud máxima de 255 caracteres
      allowNull: false, // No puede ser nulo
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
    rol: {
      type: DataTypes.ENUM('admin', 'empleado'), // Roles disponibles
      allowNull: false, // No puede ser nulo (siempre debe tener un valor)
      defaultValue: 'empleado', // Por defecto empleado
      validate: { // Validaciones
        isIn: {
          args: [['admin', 'empleado']],
          msg: 'El rol debe ser admin o empleado'
        }
      }
    },
    is_active: { // Estado de activación del usuario
      type: DataTypes.BOOLEAN, // Tipo de dato booleano
      allowNull: false, // No puede ser nulo (siempre debe tener un valor)
      defaultValue: true // Por defecto true (el usuario está activo)
    },
    created_at: { // Fecha de creación del usuario
      type: DataTypes.DATE, // Tipo de dato fecha
      allowNull: false, // No puede ser nulo (siempre debe tener un valor)
      defaultValue: DataTypes.NOW // Por defecto la fecha actual
    },
    updated_at: { // Fecha de actualización del usuario
      type: DataTypes.DATE, // Tipo de dato fecha
      allowNull: false, // No puede ser nulo (siempre debe tener un valor)
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'users', // Nombre de la tabla en la base de datos
    timestamps: true, // Habilitar timestamps
    createdAt: 'created_at', // Nombre de la columna para la fecha de creación
    updatedAt: 'updated_at', // Nombre de la columna para la fecha de actualización
    indexes: [ // Índices para optimizar las consultas
      { // Índice único para el correo
        unique: true,
        fields: ['correo']
      },
      { // Índice para el rol
        fields: ['rol']
      },
      { // Índice para el estado de activación
        fields: ['is_active']
      }
    ]
  });

  // Asociaciones
  User.associate = (models) => {
    // Relación uno a uno con Employee
    User.hasOne(models.Employee, { // Relación uno a uno con Employee
      foreignKey: 'id_usuario', // Clave foránea en la tabla Employee
      as: 'empleado', // Alias para la relación
      onDelete: 'CASCADE', // Si se elimina el usuario, se elimina el empleado
      onUpdate: 'CASCADE' // Si se actualiza el usuario, se actualiza el empleado
    });
  };

  // Métodos de instancia
  User.prototype.toJSON = function() { // Método para ocultar la contraseña en las respuestas
    const values = Object.assign({}, this.get()); // Copiar los valores del modelo
    delete values.contraseña; // Eliminar la contraseña
    return values; // Retornar los valores sin la contraseña
  };

  return User;
};
