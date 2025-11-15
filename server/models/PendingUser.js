import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const PendingUser = sequelize.define(
  "PendingUser",
  {
    pending_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    birthday: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    verification_token: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "pending_users",
    timestamps: true,
    indexes: [
      {
        fields: ["email"],
      },
      {
        fields: ["expires_at"],
      },
    ],
  }
);

export default PendingUser;
