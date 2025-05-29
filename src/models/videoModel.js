const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Video = sequelize.define(
    "Video",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      video_url: { type: DataTypes.TEXT, allowNull: false },
      thumbnail_url: { type: DataTypes.TEXT, allowNull: true },
      likes: { type: DataTypes.INTEGER, defaultValue: 0 },
      views: { type: DataTypes.INTEGER, defaultValue: 0 },
      comments: { type: DataTypes.TEXT,allowNull: true,collate: "utf8mb4_unicode_ci" },
      uploaded_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { tableName: "videos", timestamps: false }
  );
  
  module.exports = Video;
  