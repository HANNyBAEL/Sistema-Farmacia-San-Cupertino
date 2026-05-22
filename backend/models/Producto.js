import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Producto = sequelize.define('Producto', {
  id_producto: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_producto: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  precio: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lote: {
    type: DataTypes.STRING(30),
    unique: true
  },
  fecha_vencimiento: {
    type: DataTypes.DATEONLY
  },
  id_proveedor: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'productos',
  timestamps: false
});

export default Producto;
