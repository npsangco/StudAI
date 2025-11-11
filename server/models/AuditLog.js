import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import User from "./User.js";



const AuditLog = sequelize.define("AuditLog", {
    log_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    table_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    record_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: "audit_logs",
    timestamps: false,
});

AuditLog.belongsTo(User, { foreignKey: "user_id" });

export default AuditLog;