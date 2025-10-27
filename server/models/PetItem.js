// PetItem.js (Clean)
import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const PetItem = sequelize.define(
  "PetItem",
  {
    item_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    item_name: { type: DataTypes.STRING, allowNull: false },
    item_type: DataTypes.STRING,
    item_description: DataTypes.STRING,
    cost: DataTypes.INTEGER,
    effect_type: DataTypes.STRING,
    effect_value: DataTypes.INTEGER,
  },
  {
    tableName: "pet_items",
    timestamps: false,
  }
);

export default PetItem;
