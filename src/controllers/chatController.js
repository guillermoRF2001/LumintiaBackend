const chatService = require("../services/chatService");
const { uploadArchiveS3 } = require("../utils/uploadArchiveS3");

const joinRoom = async (socket, { room, user1_id, user2_id }, callback) => {
  try {
    let chat;
    if (!room && user1_id && user2_id) {
      chat = await chatService.obtenerChatEntreUsuarios(user1_id, user2_id);
      if (!chat) {
        room = await chatService.generarLlaveUnica();
        chat = await chatService.crearChat(room, user1_id, user2_id);
      } else {
        room = chat.room;
      }
    } else if (room) {
      chat = await chatService.obtenerChat(room);
    }

    if (!chat) throw new Error("No se pudo obtener o crear chat.");

    let historial = JSON.parse(chat.mensajes);

    historial = historial.map((mensaje) => {
      if (mensaje.archivo && mensaje.nombreArchivo && mensaje.fechaSubida) {
        const fechaArchivo = new Date(mensaje.fechaSubida);
        const ahora = new Date();
        const diffDias = (ahora - fechaArchivo) / (1000 * 60 * 60 * 24);
        if (diffDias > 3) {
          mensaje.texto = "Archivo caducado";
          mensaje.archivo = null;
        }
      }
      return mensaje;
    });

    socket.join(room);
    socket.emit("chat_history", historial);

    if (callback) callback({ success: true, room });
  } catch (err) {
    console.error("❌ Error en join_room:", err);
    socket.emit("chat_error", "Error al unirse a la sala.");
    if (callback) callback({ success: false, message: err.message });
  }
};

const sendMessage = async (socket, io, { room, usuario, texto }) => {
  try {
    const chat = await chatService.obtenerChat(room);
    if (!chat) return;

    let historial = JSON.parse(chat.mensajes);
    historial.push({ usuario, texto });

    await chatService.actualizarMensajes(room, historial);
    io.to(room).emit("chat_message", { usuario, texto });
  } catch (err) {
    console.error("❌ Error en chat_message:", err);
    socket.emit("chat_error", "Error al enviar el mensaje.");
  }
};

const sendFile = async (socket, io, { room, usuario, archivo, nombreArchivo, tipoArchivo }) => {
  try {
    if (!archivo || !nombreArchivo || !tipoArchivo) {
      throw new Error("Archivo incompleto o malformado.");
    }

    const tiposPermitidos = ["image/jpeg", "image/png", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!tiposPermitidos.includes(tipoArchivo)) {
      throw new Error("Tipo de archivo no permitido.");
    }

    const base64Data = archivo.split(';base64,').pop();
    const bufferArchivo = Buffer.from(base64Data, 'base64');

   
    const maxBytes = 500 * 1024 * 1024;
    if (bufferArchivo.length > maxBytes) {
      throw new Error("El archivo excede el tamaño máximo permitido (500 MB).");
    }

    const uploadResult = await uploadArchiveS3(bufferArchivo, nombreArchivo, tipoArchivo);

    if (!uploadResult || !uploadResult.fileUrl || !uploadResult.key) {
      throw new Error("Error al subir el archivo a S3.");
    }

    const { fileUrl, key } = uploadResult;

    const chat = await chatService.obtenerChat(room);
    if (!chat) throw new Error("No se encontró el chat.");

    let historial = JSON.parse(chat.mensajes);

    historial.push({
      usuario,
      texto: "",
      archivo: fileUrl,
      nombreArchivo,
      tipoArchivo,
      s3Key: key,
      fechaSubida: new Date().toISOString(),
    });

    await chatService.actualizarMensajes(room, historial);
    io.to(room).emit("chat_file", { usuario, archivo: fileUrl, nombreArchivo, tipoArchivo });

  } catch (err) {
    console.error("❌ Error en chat_file:", err.message);
    socket.emit("chat_error", err.message || "Error al enviar el archivo.");
  }
};


const getUserChats = async (socket, usuarioId) => {
  try {
    const chats = await chatService.obtenerChatsDeUsuario(usuarioId);
    socket.emit("user_chats", chats);
  } catch (err) {
    console.error("❌ Error al obtener los chats del usuario:", err);
    socket.emit("chat_error", "Error al obtener los chats.");
  }
};

module.exports = { joinRoom, sendMessage, sendFile, getUserChats };
