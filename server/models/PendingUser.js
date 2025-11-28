import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import { encryptField, decryptField } from "../utils/fieldEncryption.js";

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
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const raw = this.getDataValue('verification_token');
        if (!raw) return raw;
        return decryptField(raw);
      },
      set(val) {
        this.setDataValue('verification_token', encryptField(val));
      }
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
