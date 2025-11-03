// models/ZoomToken.js
import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const ZoomToken = sequelize.define("ZoomToken", {
    token_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true, // One Zoom connection per user
    },
    access_token: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    refresh_token: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    zoom_user_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    zoom_email: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    tableName: "zoom_tokens",
    timestamps: true,
});

export default ZoomToken;