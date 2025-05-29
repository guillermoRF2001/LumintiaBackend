// models/calendarUserModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CalendarUsers = sequelize.define(
  "CalendarUser",
  {
    calendar_id: {
      type: DataTypes.INTEGER,
      references: { model: "calendar", key: "id" },
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      references: { model: "users", key: "id" },
      primaryKey: true,
    },
    role: {
      type: DataTypes.ENUM("teacher", "student"),
      allowNull: false,
    },
  },
  {
    tableName: "calendar_users",
    timestamps: false,
  }
);

module.exports = CalendarUsers;
