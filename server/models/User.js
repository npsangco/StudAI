// const { DataTypes } = require('sequelize');
// const sequelize = require('../db');
import DataTypes from "sequelize";
import sequelize from "../db.js";

const User = sequelize.define('User', {
    user_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    birthday: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    profile_picture: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Student', 
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending', 
    },
    points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0, 
    },
    createdAt: { 
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    },
    study_streak: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    last_activity_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    longest_streak: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
      daily_notes_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    daily_quizzes_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    daily_tasks_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    daily_reset_date: {
        type: DataTypes.DATEONLY
    }
}, {
    tableName: 'users',
    timestamps: false,
    });

// module.exports = User;
export default User;