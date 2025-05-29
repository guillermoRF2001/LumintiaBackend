const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Video = require("./videoModel.js");
const Calendar = require("./calendarModel");
const CalendarUsers = require("./calendarUsersModel.js");

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password_hash: { type: DataTypes.TEXT, allowNull: false },
    role: { type: DataTypes.ENUM("student", "teacher"), allowNull: false },
    is_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
    profile_picture: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "users",
    timestamps: false,
  }
);


module.exports = User;