import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';
const sequelize = db.sequelize;

interface UserAttributes {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'farmer' | 'consumer' | 'admin';
  isActive: boolean;
  isPremium: boolean;
  premiumExpiresAt?: Date;
  suspendedUntil?: Date;
  suspensionReason?: string;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'isActive' | 'isPremium' | 'premiumExpiresAt' | 'suspendedUntil' | 'suspensionReason' | 'deletedAt' | 'createdAt' | 'updatedAt'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public role!: 'farmer' | 'consumer' | 'admin';
  public isActive!: boolean;
  public isPremium!: boolean;
  public premiumExpiresAt?: Date;
  public suspendedUntil?: Date;
  public suspensionReason?: string;
  public deletedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 255],
      },
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 50],
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 50],
      },
    },
    role: {
      type: DataTypes.ENUM('farmer', 'consumer', 'admin'),
      allowNull: false,
      defaultValue: 'consumer',
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
    premiumExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    suspendedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    suspensionReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
  }
);

export default User;
