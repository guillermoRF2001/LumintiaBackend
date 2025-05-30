function setupVideoCallEvents(socket, io) {
  const socketToPeerMap = new Map();

  socket.on("register-peer", (peerId) => {
    socketToPeerMap.set(socket.id, peerId);
  });

  socket.on("join-call", (roomId) => {
    socket.join(roomId);

    const clients = Array.from(io.sockets.adapter.rooms.get(roomId)) || [];
    const otherClients = clients.filter(id => id !== socket.id);

    const otherPeers = otherClients.map(id => socketToPeerMap.get(id)).filter(Boolean);
    socket.emit("all-users", otherPeers);

    socket.to(roomId).emit("user-joined", socketToPeerMap.get(socket.id));
  });

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