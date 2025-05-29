const Calendar = require("../models/calendarModel");
const CalendarUsers = require("../models/calendarUsersModel");
const User = require("../models/userModel");
const { Op } = require("sequelize");
const generarLlave = require("../utils/generarLlave");
const sendEmail = require("../utils/sendEmail");

// Función auxiliar para sumar días a una fecha
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// 📅 Crear un nuevo evento con validación de solapamiento para todos los participantes y opción de repetición semanal
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

    // Validar roles (al menos un teacher y un student)
    const roles = participants.map(p => p.role);
    if (!roles.includes("teacher") || !roles.includes("student")) {
      return res.status(400).json({ error: "Debe haber al menos un teacher y un student en los participantes." });
    }

    // Calcular repeticiones
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

    // Validar solapamientos para cada repetición y participante
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

    // Obtener detalles de los usuarios solo una vez para optimizar
    const userIds = participants.map(p => p.user_id);
    const userDetails = await User.findAll({
      where: {
        id: { [Op.in]: userIds }
      }
    });

    // Crear eventos y relaciones
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
        // No interrumpir la creación de eventos si falla el envío de email
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

// 📥 Obtener todos los eventos (puedes filtrar por user_id con ?user_id=)
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

// 📥 Obtener evento por ID
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

// 🔄 Actualizar evento (título, comentario, fechas y validar solapamiento si cambia)
const updateEvent = async (req, res) => {
  const { start_time, end_time, title, comment } = req.body;

  try {
    const event = await Calendar.findByPk(req.params.id, {
      include: { model: User, as: "participants" }
    });

    if (!event) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    // Validar solapamiento si hay cambio de horario
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

// ❌ Eliminar evento
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
