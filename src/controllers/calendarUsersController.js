const CalendarUsers = require("../models/calendarUsersModel");
const Calendar = require("../models/calendarModel");
const User = require("../models/userModel");
const { Op } = require("sequelize");

const getAllRelations = async (req, res) => {
  try {
    const relations = await CalendarUsers.findAll();
    res.status(200).json(relations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo relaciones" });
  }
};

const addUserToEvent = async (req, res) => {
  const { calendar_id, user_id, role } = req.body;

  try {
    const calendar = await Calendar.findByPk(calendar_id);
    if (!calendar) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    const overlapping = await Calendar.findOne({
      include: {
        model: User,
        as: "participants",
        where: { id: user_id }
      },
      where: {
        id: { [Op.ne]: calendar_id },
        start_time: { [Op.lt]: calendar.end_time },
        end_time: { [Op.gt]: calendar.start_time }
      }
    });

    if (overlapping) {
      return res.status(400).json({
        error: "El usuario ya tiene una sesión en ese horario."
      });
    }

    const [relation, created] = await CalendarUsers.findOrCreate({
      where: { calendar_id, user_id },
      defaults: { role }
    });

    if (!created) {
      return res.status(400).json({ error: "Usuario ya está en el evento" });
    }

    res.status(201).json({ message: "Usuario agregado al evento", relation });
  } catch (error) {
    console.error("Error añadiendo participante:", error);
    res.status(500).json({ error: "Error interno al añadir participante" });
  }
};

const removeUserFromEvent = async (req, res) => {
  const { calendar_id, user_id } = req.params;

  try {
    const deleted = await CalendarUsers.destroy({
      where: { calendar_id, user_id }
    });

    if (deleted) {
      res.status(200).json({ message: "Participante eliminado" });
    } else {
      res.status(404).json({ error: "Participación no encontrada" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar participante" });
  }
};

module.exports = {
  getAllRelations,
  addUserToEvent,
  removeUserFromEvent,
};
