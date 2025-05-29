const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const sequelize = require("./src/config/db");

// Importar Express desde app.js
const app = require("./src/app");

// Crear servidor HTTP y WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],  // fallback en polling
  pingTimeout: 10000,
  pingInterval: 25000,
  allowEIO3: true,
});

// Importar controladores
const chatController = require("./src/controllers/chatController");

// Importar eventos de llamadas
const setupVideoCallEvents = require("./src/utils/videoCall");

// Configurar eventos de Socket.IO
io.on("connection", (socket) => {

  // Eventos de chat
  socket.on("join_room", (data) => chatController.joinRoom(socket, data));
  socket.on("chat_message", (data) => chatController.sendMessage(socket, io, data));
  socket.on("chat_file", (data) => chatController.sendFile(socket, io, data));
  socket.on("get_user_chats", (data) => chatController.getUserChats(socket, data));
  // Eventos de llamadas
  setupVideoCallEvents(socket, io);
  // Desconexión del usuario
  socket.on("disconnect", (reason) => {
});
});

// Servir archivos estáticos
app.use("/images", express.static("public/images"));

// Iniciar conexión a la base de datos  
sequelize.sync({})//force:true
  .then(() => {
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("❌ Error al iniciar la DB:", err));
