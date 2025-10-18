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
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    session_code: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: "scheduled",
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    endedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    zoom_meeting_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Zoom meeting ID"
    },
    zoom_join_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Public join URL for participants"
    },
    zoom_start_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Host start URL (only for session creator)"
    },
    zoom_password: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Meeting password if required"
    },
    duration: {
        type: DataTypes.INTEGER,
        defaultValue: 60,
        comment: "Duration in minutes"
    },
    scheduled_start: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Scheduled start time for the session"
    },
}, {
    tableName: "sessions",
    timestamps: false, // manual createdAt
});

export default Session;