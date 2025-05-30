const AWS = require('aws-sdk');
const VideoService = require("../services/videoService");
const { uploadVideoToS3Post } = require("../utils/uploadVideoPost");
const { uploadVideoToS3Update } = require("../utils/uploadVideoUpdate");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const createVideo = async (req, res) => {
  const { user_id, title, description } = req.body; 

  if (!req.files || !req.files.video) {
    console.error("Archivo de video requerido (campo: 'video')");
    return res.status(400).json({ error: "Archivo de video requerido (campo: 'video')" });
  }

  const videoFile = req.files.video;
  const thumbnailFile = req.files.thumbnail || null;

  try {
    const { videoUrl, thumbnailUrl } = await uploadVideoToS3Post(videoFile, thumbnailFile);

    const newVideo = await VideoService.createVideo({
      user_id,
      title,
      description,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      uploaded_at: new Date(),
    });

    res.status(201).json({
      message: "Video subido correctamente a AWS S3",
      video: newVideo,
    });
  } catch (error) {
    console.error("Error subiendo video a S3:", error);
    res.status(500).json({
      error: "Error al subir el video",
      details: error.message,
    });
  }
};

const getVideos = async (req, res) => {
  try {
    const videos = await VideoService.getAllVideos();
    res.status(200).json(videos);
  } catch (error) {
    res.status(400).json({ error: 'Error obteniendo los videos' });
  }
};

const getVideoById = async (req, res) => {
  try {
    const video = await VideoService.getVideoById(req.params.id);
    if (video) res.status(200).json(video);
    else res.status(404).json({ error: 'Video no encontrado' });
  } catch (error) {
    res.status(400).json({ error: 'Error obteniendo el video' });
  }
};

const updateVideo = async (req, res) => {
  const { title, description, video_url, thumbnail_url } = req.body;

  try {
    const video = await VideoService.getVideoById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }

    const videoKey = video.video_url.split('/').pop();
    const thumbnailKey = video.thumbnail_url ? video.thumbnail_url.split('/').pop() : null;

    if (req.files && (req.files.video || req.files.thumbnail)) {
      const videoFile = req.files.video || null;
      const thumbnailFile = req.files.thumbnail || null;

      const { videoUrl, thumbnailUrl } = await uploadVideoToS3Update(videoFile, thumbnailFile);

      if (videoFile) {
        await s3.deleteObject({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: videoKey,
        }).promise();
      }

      if ((thumbnailFile || videoFile) && thumbnailKey) {
        await s3.deleteObject({
          Bucket: process.env.AWS_THUMBNAIL_BUCKET_NAME,
          Key: thumbnailKey,
        }).promise();
      }

      const updatedVideo = await VideoService.updateVideo(req.params.id, {
        title,
        description,
        video_url: videoUrl || video.video_url,
        thumbnail_url: thumbnailUrl || video.thumbnail_url,
      });

      return res.status(200).json({ message: 'Video actualizado correctamente', updatedVideo });
    }

    const updatedVideo = await VideoService.updateVideo(req.params.id, {
      title,
      description,
      video_url: video_url || video.video_url,
      thumbnail_url: thumbnail_url || video.thumbnail_url,
    });

    return res.status(200).json({ message: 'Video actualizado correctamente', updatedVideo });
  } catch (error) {
    console.error("Error actualizando el video:", error);
    res.status(500).json({ error: 'Error al actualizar el video', details: error.message });
  }
};

const deleteVideo = async (req, res) => {
  try {
    const video = await VideoService.getVideoById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }

    const videoKey = video.video_url.split('/').pop(); 
    const thumbnailKey = video.thumbnail_url ? video.thumbnail_url.split('/').pop() : null;

    await s3.deleteObject({ Bucket: process.env.AWS_BUCKET_NAME, Key: videoKey }).promise();

    if (thumbnailKey) {
      await s3.deleteObject({ Bucket: process.env.AWS_THUMBNAIL_BUCKET_NAME, Key: thumbnailKey }).promise();
    }

    await VideoService.deleteVideo(req.params.id);

    res.status(200).json({ message: 'Video y su archivo de S3 (y miniatura) eliminados correctamente' });
  } catch (error) {
    console.error("Error eliminando video:", error);
    res.status(500).json({
      error: "Error al eliminar el video y sus archivos",
      details: error.message,
    });
  }


  
};

const incrementVideoViews = async (req, res) => {
  try {
    const updatedVideo = await VideoService.incrementViews(req.params.id);
    res.status(200).json({ message: 'Visualizaciones incrementadas', views: updatedVideo.views });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Error incrementando las visualizaciones' });
  }
};

const addComment = async (req, res) => {
  const { id } = req.params;
  const { usuario, texto } = req.body;

  if (!usuario || !texto) {
    return res.status(400).json({ error: "Faltan datos: 'usuario' o 'texto'" });
  }

  try {
    const comment = { usuario, texto };

    const updatedVideo = await VideoService.addComment(id, comment);

    res.status(200).json({
      message: "Comentario agregado correctamente",
      comments: JSON.parse(updatedVideo.comments),
    });
  } catch (error) {
    console.error("Error agregando comentario:", error);
    res.status(500).json({ error: "Error al agregar comentario" });
  }
};

const getComments = async (req, res) => {
  try {
    const video = await VideoService.getVideoById(req.params.id);
    if (!video) return res.status(404).json({ error: "Video no encontrado" });

    let comments = [];
    if (video.comments) {
      try {
        comments = JSON.parse(video.comments);
      } catch {
        comments = [];
      }
    }
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener comentarios" });
  }
};

const incrementVideoLikes = async (req, res) => {
  try {
    const updatedVideo = await VideoService.incrementLikes(req.params.id);
    res.status(200).json({ message: 'Likes incrementados', likes: updatedVideo.likes });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Error incrementando los likes' });
  }
};


module.exports = {
  createVideo,
  getVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  incrementVideoViews,
  addComment,
  getComments,
  incrementVideoLikes
};
