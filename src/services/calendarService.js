const Calendar = require('../models/calendarModel');

class CalendarService {
  async createEvent(data) {
    return await Calendar.create(data);
  }

  async getAllEvents() {
    return await Calendar.findAll();
  }

  async getEventById(id) {
    return await Calendar.findByPk(id);
  }

  async updateEvent(id, data) {
    const event = await Calendar.findByPk(id);
    if (!event) throw new Error('Event not found');
    return await event.update(data);
  }

  async deleteEvent(id) {
    const event = await Calendar.findByPk(id);
    if (!event) throw new Error('Event not found');
    return await event.destroy();
  }
}

module.exports = new CalendarService();
