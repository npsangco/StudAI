import { DataTypes } from "sequelize";
import sequelize from "../db.js";

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
      type: DataTypes.STRING(255),
      allowNull: true,
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
