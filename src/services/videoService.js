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

   async incrementViews(id) {
    const video = await Video.findByPk(id);
    if (!video) throw new Error('Video not found');
    video.views += 1;
    return await video.save();
  }

  async addComment(videoId, comment) {
  const video = await Video.findByPk(videoId);
  if (!video) throw new Error("Video no encontrado");

  let comments = [];
  if (video.comments) {
    try {
      comments = JSON.parse(video.comments);
    } catch {
      comments = [];
    }
  }

  comments.push(comment);

  video.comments = JSON.stringify(comments);
  await video.save();

  return video;
}

async getComments(videoId) {
    const video = await Video.findByPk(videoId);
    if (!video) throw new Error("Video no encontrado");

    let comments = [];
    if (video.comments) {
      try {
        comments = JSON.parse(video.comments);
      } catch {
        comments = [];
      }
    }
    return comments;
  }

  async incrementLikes(id) {
  const video = await Video.findByPk(id);
  if (!video) throw new Error('Video no encontrado');
  video.likes = (video.likes || 0) + 1;  
  return await video.save();
}


}

module.exports = new VideoService();
