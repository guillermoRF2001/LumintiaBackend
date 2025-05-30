const Calendar = require("../models/calendarModel");
const CalendarUsers = require("../models/calendarUsersModel");
const User = require("../models/userModel");
const { Op } = require("sequelize");
const generarLlave = require("../utils/generarLlave");
const sendEmail = require("../utils/sendEmail");

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const createEvent = async (req, res) => {
  let {
    start_time,
    end_time,
    title,
    comment,
    participants,
    repeatWeekly = false,
    repeatCount,
    repeatUntil
  } = req.body;

  if (!participants || participants.length < 2) {
    return res.status(400).json({ error: "Debe haber al menos un teacher y un student" });
  }

  try {
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (startDate >= endDate) {
      return res.status(400).json({ error: "La fecha de inicio debe ser anterior a la de fin." });
    }

    const roles = participants.map(p => p.role);
    if (!roles.includes("teacher") || !roles.includes("student")) {
      return res.status(400).json({ error: "Debe haber al menos un teacher y un student en los participantes." });
    }

    let repetitions = 1;
    if (repeatWeekly) {
      if (repeatCount && repeatCount > 0) {
        repetitions = repeatCount;
      } else if (repeatUntil) {
        const untilDate = new Date(repeatUntil);
        if (untilDate <= startDate) {
          return res.status(400).json({ error: "repeatUntil debe ser posterior a start_time." });
        }
        const diffMs = untilDate - startDate;
        repetitions = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
      }
    }

    const eventsToCreate = [];

    for (let i = 0; i < repetitions; i++) {
      const startRepeat = addDays(startDate, i * 7);
      const endRepeat = addDays(endDate, i * 7);

      for (const participant of participants) {
        const overlapping = await Calendar.findOne({
          include: {
            model: User,
            as: "participants",
            where: { id: participant.user_id }
          },
          where: {
            start_time: { [Op.lt]: endRepeat },
            end_time: { [Op.gt]: startRepeat }
          }
        });

        if (overlapping) {
          return res.status(400).json({
            error: `El usuario con ID ${participant.user_id} tiene un evento que se solapa con la repetición ${i + 1}.`
          });
        }
      }

      eventsToCreate.push({
        start_time: startRepeat,
        end_time: endRepeat,
        title,
        comment,
        idLlamada: generarLlave(20)
      });
    }

    const userIds = participants.map(p => p.user_id);
    const userDetails = await User.findAll({
      where: {
        id: { [Op.in]: userIds }
      }
    });

    const createdEvents = [];
    for (const eventData of eventsToCreate) {
      const newEvent = await Calendar.create(eventData);

      const userAssociations = participants.map(p => ({
        calendar_id: newEvent.id,
        user_id: p.user_id,
        role: p.role
      }));

      await CalendarUsers.bulkCreate(userAssociations);
      createdEvents.push(newEvent);

      const durationMs = new Date(eventData.end_time) - new Date(eventData.start_time);
      const durationMin = Math.round(durationMs / 60000);

      try {
        for (const user of userDetails) {
        try {
          if (!user.email) {
            console.warn(`El usuario ${user.name} (ID: ${user.id}) no tiene un correo válido, se omite el envío.`);
            continue;
          }

          await sendEmail(
              user.email,
              `Nuevo evento: ${eventData.title}`,
              `<p>Hola ${user.name},</p>
              <p>Has sido agregado a un nuevo evento:</p>
              <ul>
                <li><strong>Título:</strong> ${eventData.title}</li>
                <li><strong>Fecha:</strong> ${new Date(eventData.start_time).toLocaleString()}</li>
                <li><strong>Duración:</strong> ${durationMin} minutos</li>
                <li><strong>Comentario:</strong> ${eventData.comment || "Ninguno"}</li>
              </ul>
              <p>Saludos.</p>`
            );} catch (emailError) {
          console.error(`Error enviando correo a ${user.email}:`, emailError);
        }
      }
      } catch (emailError) {
        console.error("Error enviando correos:", emailError);
      }
    }

    res.status(201).json({
      message: `${createdEvents.length} evento(s) creado(s) con éxito.`,
      events: createdEvents
    });

  } catch (error) {
    console.error("Error creando evento con repetición:", error);
    res.status(500).json({ error: "Error interno al crear evento" });
  }
};

const getAllEvents = async (req, res) => {
  const { user_id } = req.query;

  try {
    const whereClause = user_id
      ? {
          include: {
            model: User,
            as: "participants",
            where: { id: user_id },
            attributes: ["id", "name", "role"]
          }
        }
      : {
          include: {
            model: User,
            as: "participants",
            attributes: ["id", "name", "role"]
          }
        };

    const events = await Calendar.findAll(whereClause);
    res.status(200).json(events);
  } catch (error) {
    console.error("Error obteniendo eventos:", error);
    res.status(500).json({ error: "Error interno al obtener eventos" });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await Calendar.findByPk(req.params.id, {
      include: {
        model: User,
        as: "participants",
        attributes: ["id", "name", "role"]
      }
    });

    if (!event) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ error: "Error interno al obtener evento" });
  }
};

const updateEvent = async (req, res) => {
  const { start_time, end_time, title, comment } = req.body;

  try {
    const event = await Calendar.findByPk(req.params.id, {
      include: { model: User, as: "participants" }
    });

    if (!event) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    if (start_time && end_time) {
      for (const participant of event.participants) {
        const overlapping = await Calendar.findOne({
          where: {
            id: { [Op.ne]: event.id },
            start_time: { [Op.lt]: end_time },
            end_time: { [Op.gt]: start_time }
          },
          include: {
            model: User,
            as: "participants",
            where: { id: participant.id }
          }
        });

        if (overlapping) {
          return res.status(400).json({
            error: `El usuario ${participant.name} ya tiene una sesión en ese horario.`,
          });
        }
      }
    }

    await event.update({ start_time, end_time, title, comment });
    res.status(200).json({ message: "Evento actualizado", event });
  } catch (error) {
    console.error("Error actualizando evento:", error);
    res.status(500).json({ error: "Error interno al actualizar evento" });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Calendar.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: "Evento no encontrado" });

    await event.destroy();
    res.status(200).json({ message: "Evento eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ error: "Error interno al eliminar evento" });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
};
