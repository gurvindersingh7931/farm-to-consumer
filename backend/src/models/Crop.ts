import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';
const sequelize = db.sequelize;

interface CropAttributes {
  id: number;
  farmerId: number;
  name: string;
  description?: string;
  pricePerKg: number;
  quantity: number;
  unit: string; // kg, lbs, pieces, etc.
  category: string; // vegetables, fruits, grains, etc.
  imageUrl?: string;
  isActive: boolean;
  isPremium: boolean;
  isAvailable: boolean; // true = available, false = sold out
  harvestDate?: Date;
  expiryDate?: Date;
  location?: string;
  organic: boolean;
  isOrganic: boolean;
  // Moderation fields
  isApproved?: boolean;
  approvedAt?: Date | null;
  moderatedBy?: number | null;
  isSponsored?: boolean;
  sponsoredUntil?: Date | null;
  flaggedReason?: string | null;
  flaggedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CropCreationAttributes extends Optional<CropAttributes, 'id' | 'isActive' | 'isPremium' | 'isAvailable' | 'organic' | 'createdAt' | 'updatedAt'> {}

export class Crop extends Model<CropAttributes, CropCreationAttributes> implements CropAttributes {
  public id!: number;
  public farmerId!: number;
  public name!: string;
  public description?: string;
  public pricePerKg!: number;
  public quantity!: number;
  public unit!: string;
  public category!: string;
  public imageUrl?: string;
  public isActive!: boolean;
  public isPremium!: boolean;
  public isAvailable!: boolean;
  public harvestDate?: Date;
  public expiryDate?: Date;
  public location?: string;
  public organic!: boolean;
  public isOrganic!: boolean;
  public isApproved?: boolean;
  public approvedAt?: Date | null;
  public moderatedBy?: number | null;
  public isSponsored?: boolean;
  public sponsoredUntil?: Date | null;
  public flaggedReason?: string | null;
  public flaggedAt?: Date | null;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Crop.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    farmerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pricePerKg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'kg',
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isPremium: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    harvestDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
        organic: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        isOrganic: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
    // Moderation fields
    isApproved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    moderatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    isSponsored: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sponsoredUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    flaggedReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    flaggedAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'crops',
    timestamps: true,
    indexes: [
      {
        fields: ['farmerId'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['isActive'],
      },
      {
        fields: ['isPremium'],
      },
      {
        fields: ['isAvailable'],
      },
    ],
  }
);

export default Crop;
