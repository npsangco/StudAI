const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Planner = sequelize.define("Planner", {
    planner_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    due_date: {
        type: DataTypes.DATE
    },
}, {
    timestamps: true,
    tableName: "study_planner"
});

module.exports = Planner;
