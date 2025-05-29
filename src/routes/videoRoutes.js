const express = require("express");
const {
  createVideo,
  getVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  incrementVideoViews,
  addComment,
  getComments,
  incrementVideoLikes
} = require("../controllers/videoController");

const router = express.Router();

router.post("/", createVideo);
router.get("/", getVideos);
router.get("/:id", getVideoById);
router.put("/:id", updateVideo);
router.delete("/:id", deleteVideo);
router.put("/:id/views", incrementVideoViews);
router.post("/:id/comments", addComment);
router.get("/:id/comments", getComments);
router.put('/:id/likes', incrementVideoLikes);



module.exports = router;
