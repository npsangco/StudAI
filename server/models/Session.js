// models/Session.js
import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Session = sequelize.define("Session", {
    session_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    zoom_meeting_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    zoom_join_url: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    zoom_start_url: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    zoom_password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    duration: {
        type: DataTypes.INTEGER,
        defaultValue: 60,
    },
    scheduled_start: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: "scheduled",
    }
}, {
    tableName: "sessions",
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});

export default Session;