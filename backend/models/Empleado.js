import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Empleado = sequelize.define('Empleado', {
  id_empleado: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  apellido: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  correo: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  telefono: DataTypes.STRING(20),
  dui: DataTypes.STRING(10),
  nit: DataTypes.STRING(17),
  cuenta_banco: DataTypes.STRING(50),
  afp: DataTypes.STRING(20),
  cargo: {
    type: DataTypes.ENUM('administrador', 'farmaceutico', 'cajero'),
    allowNull: false,
    defaultValue: 'cajero',
  },
  fecha_contratacion: DataTypes.DATEONLY,
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: 1,
  },
  token_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  debe_cambiar: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: false,
  },
  invitation_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  invitation_expires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'empleados',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion',
});

export default Empleado;