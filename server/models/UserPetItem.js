import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const UserPetItem = sequelize.define(
  "UserPetItem",
  {
    inventory_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: DataTypes.INTEGER,
    item_id: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
  },
  {
    tableName: "user_pet_items",
    timestamps: false,
  }
);

export default UserPetItem;
