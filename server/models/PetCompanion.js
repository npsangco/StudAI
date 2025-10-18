import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const PetCompanion = sequelize.define(
  "PetCompanion",
  {
    pet_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    pet_name: { type: DataTypes.STRING, allowNull: false },
    pet_type: { type: DataTypes.STRING, allowNull: false },
    happiness_level: { type: DataTypes.INTEGER, defaultValue: 50 },
    hunger_level: { type: DataTypes.INTEGER, defaultValue: 50 },
    cleanliness_level: { type: DataTypes.INTEGER, defaultValue: 50 },
    energy_level: { type: DataTypes.INTEGER, defaultValue: 50 },
    experience_points: { type: DataTypes.INTEGER, defaultValue: 0 },
    level: { type: DataTypes.INTEGER, defaultValue: 1 },
    
    //decay tracking
    last_fed: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    last_played: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    last_cleaned: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    last_updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "pet_companion",
    timestamps: false,
  }
);

export default PetCompanion;