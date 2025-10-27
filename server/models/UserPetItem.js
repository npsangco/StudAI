import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import PetItem from "./PetItem.js";

const UserPetItem = sequelize.define(
  "UserPetItem",
  {
    inventory_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: DataTypes.INTEGER,
    item_id: DataTypes.INTEGER,
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    is_equipped: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "user_pet_items",
    timestamps: false,
  }
);

UserPetItem.belongsTo(PetItem, { foreignKey: "item_id" });

export default UserPetItem;