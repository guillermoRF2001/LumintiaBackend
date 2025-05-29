const Video = require('../models/videoModel');

class VideoService {
  async createVideo(data) {
    return await Video.create(data);
  }

  async getAllVideos() {
    return await Video.findAll();
  }

  async getVideoById(id) {
    return await Video.findByPk(id);
  }

  async updateVideo(id, data) {
    const video = await Video.findByPk(id);
    if (!video) throw new Error('Video not found');
    return await video.update(data);
  }

  async deleteVideo(id) {
    const video = await Video.findByPk(id);
    if (!video) throw new Error('Video not found');
    return await video.destroy();
  }
}

module.exports = new VideoService();
