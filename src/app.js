  const express = require("express");
  const cors = require("cors");
  const expressFileUpload = require("express-fileupload");

  const app = express();

  // Carga de modelos antes de las rutas
  const User = require("./models/userModel");
  const Calendar = require("./models/calendarModel");
  const CalendarUsers = require("./models/calendarUsersModel");
  const associateModels = require("./models/associateModels");
  associateModels(); 

  // Middlewares
  app.use(cors());

  app.use(expressFileUpload({
    limits: { fileSize: 6 * 1024 * 1024 * 1024 }, // 6 GB
  }));

  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ extended: true, limit: '500mb' }));

  // Middleware de manejo de errores
  app.use((err, req, res, next) => {
    console.error("Middleware de error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Error interno del servidor",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  });

  // Rutas
  const userRoutes = require("./routes/userRoutes");
  const videoRoutes = require("./routes/videoRoutes");
  const calendarRoutes = require("./routes/calendarRoutes");
  const calendarUsersRoutes = require("./routes/calendarUsersRoutes");

  app.use("/api/users", userRoutes);
  app.use("/api/videos", videoRoutes);
  app.use("/api/calendar", calendarRoutes);
  app.use("/api/calendar-users", calendarUsersRoutes);

  module.exports = app;
