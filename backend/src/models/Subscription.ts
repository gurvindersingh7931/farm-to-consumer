import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';
const sequelize = db.sequelize;

interface SubscriptionAttributes {
  id: number;
  userId: number;
  planType: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  isActive: boolean;
  expiresAt: Date;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionCreationAttributes extends Optional<SubscriptionAttributes, 'id' | 'razorpayPaymentId' | 'razorpaySignature' | 'createdAt' | 'updatedAt'> {}

export class Subscription extends Model<SubscriptionAttributes, SubscriptionCreationAttributes> implements SubscriptionAttributes {
  public id!: number;
  public userId!: number;
  public planType!: 'monthly' | 'yearly';
  public amount!: number;
  public currency!: string;
  public razorpayOrderId!: string;
  public razorpayPaymentId?: string;
  public razorpaySignature?: string;
  public status!: 'pending' | 'completed' | 'failed' | 'cancelled';
  public isActive!: boolean;
  public expiresAt!: Date;
  public startDate!: Date;
  public endDate!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Subscription.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    planType: {
      type: DataTypes.ENUM('monthly', 'yearly'),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'INR',
    },
    razorpayOrderId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    razorpayPaymentId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    razorpaySignature: {
      type: DataTypes.STRING,
      allowNull: true,
    },
        status: {
          type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending',
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: false,
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
    tableName: 'subscriptions',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['razorpayOrderId'],
      },
      {
        fields: ['endDate'],
      },
    ],
  }
);

// Establish associations
// Associations are defined in models/index.ts

export default Subscription;
