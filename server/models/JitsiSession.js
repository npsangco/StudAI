import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import { encryptField, decryptField } from "../utils/fieldEncryption.js";

const JitsiSession = sequelize.define(
  "JitsiSession",
  {
    session_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    room_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    topic: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_private: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    session_password: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('session_password');
        if (!raw) return raw;
        return decryptField(raw);
      },
      set(val) {
        this.setDataValue('session_password', encryptField(val));
      }
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'active', 'completed', 'cancelled'),
      defaultValue: 'scheduled',
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "jitsi_sessions",
    timestamps: false,
  }
);

export default JitsiSession;
