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
        defaultValue: 'active', 
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
    }
}, {
    tableName: 'users',
    timestamps: false,
    });

// module.exports = User;
export default User;