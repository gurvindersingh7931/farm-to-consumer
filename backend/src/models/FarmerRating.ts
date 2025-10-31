import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';
const sequelize = db.sequelize;

interface FarmerRatingAttributes {
  id: number;
  farmerId: number; // references users.id (farmer user)
  userId: number;   // rater user id
  rating: number;   // 1..5
  createdAt: Date;
  updatedAt: Date;
}

interface FarmerRatingCreationAttributes extends Optional<FarmerRatingAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class FarmerRating extends Model<FarmerRatingAttributes, FarmerRatingCreationAttributes> implements FarmerRatingAttributes {
  public id!: number;
  public farmerId!: number;
  public userId!: number;
  public rating!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FarmerRating.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    farmerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  },
  {
    sequelize,
    tableName: 'farmer_ratings',
    timestamps: true,
    indexes: [
      { fields: ['farmerId'] },
      { fields: ['userId'] },
      { unique: true, fields: ['farmerId', 'userId'] }
    ]
  }
);

export default FarmerRating;


