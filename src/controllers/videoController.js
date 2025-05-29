const AWS = require('aws-sdk');
const VideoService = require("../services/videoService");
const { uploadVideoToS3Post } = require("../utils/uploadVideoPost");
const { uploadVideoToS3Update } = require("../utils/uploadVideoUpdate");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

//-----------------------------------------------------------------Create Video----------------------------------------------------------------------
const createVideo = async (req, res) => {
  const { user_id, title, description } = req.body; // user_id ahora viene directamente en el cuerpo de la solicitud

  // Verificación de si el video fue proporcionado
  if (!req.files || !req.files.video) {
    console.error("Archivo de video requerido (campo: 'video')");
    return res.status(400).json({ error: "Archivo de video requerido (campo: 'video')" });
  }

  const videoFile = req.files.video;
  const thumbnailFile = req.files.thumbnail || null;

  try {
    // Subir el video y la miniatura a S3
    const { videoUrl, thumbnailUrl } = await uploadVideoToS3Post(videoFile, thumbnailFile);

    // Crear el nuevo video en la base de datos
    const newVideo = await VideoService.createVideo({
      user_id, // Se incluye el user_id en la creación del video
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

//-----------------------------------------------------------------Get All Videos--------------------------------------------------------------
const getVideos = async (req, res) => {
  try {
    const videos = await VideoService.getAllVideos();
    res.status(200).json(videos);
  } catch (error) {
    res.status(400).json({ error: 'Error obteniendo los videos' });
  }
};

//-----------------------------------------------------------------Get Video By ID--------------------------------------------------------------
const getVideoById = async (req, res) => {
  try {
    const video = await VideoService.getVideoById(req.params.id);
    if (video) res.status(200).json(video);
    else res.status(404).json({ error: 'Video no encontrado' });
  } catch (error) {
    res.status(400).json({ error: 'Error obteniendo el video' });
  }
};

//-----------------------------------------------------------------Update Video--------------------------------------------------------------
const updateVideo = async (req, res) => {
  const { title, description, video_url, thumbnail_url } = req.body;

  try {
    const video = await VideoService.getVideoById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }

    const videoKey = video.video_url.split('/').pop();
    const thumbnailKey = video.thumbnail_url ? video.thumbnail_url.split('/').pop() : null;

    // Si se pasa un nuevo video o thumbnail
    if (req.files && (req.files.video || req.files.thumbnail)) {
      const videoFile = req.files.video || null;
      const thumbnailFile = req.files.thumbnail || null;

      const { videoUrl, thumbnailUrl } = await uploadVideoToS3Update(videoFile, thumbnailFile);

      // Eliminar el video anterior si se sube uno nuevo
      if (videoFile) {
        await s3.deleteObject({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: videoKey,
        }).promise();
      }

      // Eliminar el thumbnail anterior si se sube uno nuevo o si se generó automáticamente
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

    // Si no se pasó ningún archivo, solo actualizar datos básicos
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

//-----------------------------------------------------------------Delete Video--------------------------------------------------------------
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

module.exports = {
  createVideo,
  getVideos,
  getVideoById,
  updateVideo,
  deleteVideo
};
