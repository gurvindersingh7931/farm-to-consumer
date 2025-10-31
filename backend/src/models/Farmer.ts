import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';
const sequelize = db.sequelize;

interface FarmerAttributes {
  id: number;
  userId: number;
  phone?: string;
  farmName?: string;
  farmDescription?: string;
  farmLocation?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  profilePhoto?: string;
  website?: string;
  isVerified: boolean;
  hasVerifiedBadge: boolean;
  isBoosted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface FarmerCreationAttributes extends Optional<FarmerAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Farmer extends Model<FarmerAttributes, FarmerCreationAttributes> implements FarmerAttributes {
  public id!: number;
  public userId!: number;
  public phone?: string;
  public farmName?: string;
  public farmDescription?: string;
  public farmLocation?: string;
  public latitude?: number;
  public longitude?: number;
  public address?: string;
  public city?: string;
  public state?: string;
  public zipCode?: string;
  public country?: string;
  public profilePhoto?: string;
  public website?: string;
  public isVerified!: boolean;
  public hasVerifiedBadge!: boolean;
  public isBoosted!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Farmer.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    farmName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    farmDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    farmLocation: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    zipCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    profilePhoto: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    hasVerifiedBadge: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isBoosted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Farmer',
    tableName: 'Farmers',
    timestamps: true,
  }
);

export default Farmer;
