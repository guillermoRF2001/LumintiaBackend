// models/calendarModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Calendar = sequelize.define(
  "Calendar",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    start_time: { type: DataTypes.DATE, allowNull: false },
    end_time: { type: DataTypes.DATE, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    comment: { type: DataTypes.TEXT },
    idLlamada: {
      type: DataTypes.STRING(30),
      unique: true,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("available", "booked"),
      defaultValue: "booked",
    },
  },
  {
    tableName: "calendar",
    timestamps: false,
  }
);

module.exports = Calendar;
