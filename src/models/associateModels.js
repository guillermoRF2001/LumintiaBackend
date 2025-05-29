const User = require("./userModel");
const Calendar = require("./calendarModel");
const CalendarUsers = require("./calendarUsersModel");

function associateModels() {
  Calendar.belongsToMany(User, {
    through: CalendarUsers,
    foreignKey: "calendar_id",
    otherKey: "user_id",
    as: "participants",
  });

  User.belongsToMany(Calendar, {
    through: CalendarUsers,
    foreignKey: "user_id",
    otherKey: "calendar_id",
    as: "events",
  });
}

module.exports = associateModels;
