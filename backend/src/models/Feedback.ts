import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';
const sequelize = db.sequelize;

export type FeedbackType = 'complaint' | 'suggestion' | 'other';
export type FeedbackStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';
export type FeedbackPriority = 'low' | 'medium' | 'high';

interface FeedbackAttributes {
  id: number;
  userId: number;
  type: FeedbackType;
  subject: string;
  message: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  adminNotes?: string | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FeedbackCreationAttributes extends Optional<FeedbackAttributes, 'id' | 'status' | 'priority' | 'adminNotes' | 'resolvedAt' | 'createdAt' | 'updatedAt'> {}

class Feedback extends Model<FeedbackAttributes, FeedbackCreationAttributes> implements FeedbackAttributes {
  public id!: number;
  public userId!: number;
  public type!: FeedbackType;
  public subject!: string;
  public message!: string;
  public status!: FeedbackStatus;
  public priority!: FeedbackPriority;
  public adminNotes?: string | null;
  public resolvedAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Feedback.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    type: {
      type: DataTypes.ENUM('complaint', 'suggestion', 'other'),
      allowNull: false,
      defaultValue: 'other'
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('open', 'in_review', 'resolved', 'dismissed'),
      allowNull: false,
      defaultValue: 'open'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'medium'
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'feedback',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['type'] },
      { fields: ['priority'] }
    ]
  }
);

export default Feedback;


