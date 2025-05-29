function setupVideoCallEvents(socket, io) {
  // Mapa para almacenar la relación entre socket.id y peerId
  const socketToPeerMap = new Map();

  socket.on("register-peer", (peerId) => {
    // Registrar la relación entre socket.id y peerId
    socketToPeerMap.set(socket.id, peerId);
  });

  socket.on("join-call", (roomId) => {
    socket.join(roomId);

    // Obtener todos los sockets en la sala excepto el actual
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId)) || [];
    const otherClients = clients.filter(id => id !== socket.id);

    // Enviar al nuevo usuario los peerIds de los usuarios existentes
    const otherPeers = otherClients.map(id => socketToPeerMap.get(id)).filter(Boolean);
    socket.emit("all-users", otherPeers);

    // Avisar a los demás en la sala que un nuevo usuario llegó
    socket.to(roomId).emit("user-joined", socketToPeerMap.get(socket.id));
  });

  // Resto de los manejadores permanecen igual...
  socket.on("call-user", ({ roomId, signal, from }) => {
    socket.to(roomId).emit("receive-call", { signal, from });
  });

  socket.on("answer-call", ({ roomId, signal }) => {
    socket.to(roomId).emit("call-accepted", { signal, from: socketToPeerMap.get(socket.id) });
  });

  socket.on("leave-call", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { userId: socketToPeerMap.get(socket.id) });
  });

  socket.on("disconnect", () => {
    socketToPeerMap.delete(socket.id);
  });
}

module.exports = setupVideoCallEvents;