const express = require("express");
const {
  createVideo,
  getVideos,
  getVideoById,
  updateVideo,
  deleteVideo
} = require("../controllers/videoController");

const router = express.Router();

router.post("/", createVideo);
router.get("/", getVideos);
router.get("/:id", getVideoById);
router.put("/:id", updateVideo);
router.delete("/:id", deleteVideo);

module.exports = router;
