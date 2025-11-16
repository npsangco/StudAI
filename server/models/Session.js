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
    scheduled_end: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    // actual_start: {
    //     type: DataTypes.DATE,
    //     allowNull: true,
    //     comment: 'Actual meeting start time from Zoom webhook'
    // },
    // actual_end: {
    //     type: DataTypes.DATE,
    //     allowNull: true,
    //     comment: 'Actual meeting end time from Zoom webhook'
    // },
    status: {
        type: DataTypes.STRING,
        defaultValue: "scheduled",
    },
    is_private: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    session_password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    host_name: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    tableName: "sessions",
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});

// Method to check if session is expired
Session.prototype.isExpired = function() {
    if (!this.scheduled_end) return false;
    return new Date() > new Date(this.scheduled_end);
};

// Method to check if session is active
Session.prototype.isActive = function() {
    if (!this.scheduled_start || !this.scheduled_end) return false;
    const now = new Date();
    return now >= new Date(this.scheduled_start) && now <= new Date(this.scheduled_end);
};

// Method to get actual duration in minutes
Session.prototype.getActualDuration = function() {
    if (this.actual_start && this.actual_end) {
        const durationMs = new Date(this.actual_end) - new Date(this.actual_start);
        return Math.round(durationMs / 60000); // Convert to minutes
    }
    return null;
};

export default Session;