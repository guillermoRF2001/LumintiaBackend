const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const sequelize = require("./src/config/db");

const app = require("./src/app");

// Crear servidor HTTP y WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"], 
  pingTimeout: 10000,
  pingInterval: 25000,
  allowEIO3: true,
});

const chatController = require("./src/controllers/chatController");
const setupVideoCallEvents = require("./src/utils/videoCall");
io.on("connection", (socket) => {

  // Eventos de chat
  socket.on("join_room", (data) => chatController.joinRoom(socket, data));
  socket.on("chat_message", (data) => chatController.sendMessage(socket, io, data));
  socket.on("chat_file", (data) => chatController.sendFile(socket, io, data));
  socket.on("get_user_chats", (data) => chatController.getUserChats(socket, data));
  setupVideoCallEvents(socket, io);
  socket.on("disconnect", (reason) => {
});
});

// Servir archivos estáticos
app.use("/images", express.static("public/images"));
 
sequelize.sync({})//force:true
  .then(() => {
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("❌ Error al iniciar la DB:", err));
