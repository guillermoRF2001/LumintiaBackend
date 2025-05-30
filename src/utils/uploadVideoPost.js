const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const generateThumbnail = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        count: 1,
        folder: path.dirname(outputPath),
        filename: path.basename(outputPath),
        size: '320x240',
        timemarks: ['1'],
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });
};

const uploadVideoToS3Post = async (videoFile, thumbnailFile = null) => {
  const ext = path.extname(videoFile.name);
  const fileName = `${uuidv4()}${ext}`;
  const baseName = path.basename(fileName, ext);

  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  
  const tempVideo = path.join(tempDir, fileName);
  const tempThumb = path.join(tempDir, `${baseName}.jpg`);

  fs.writeFileSync(tempVideo, videoFile.data);

  await s3.upload({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: fs.createReadStream(tempVideo),
    ContentType: videoFile.mimetype,
  }).promise();

  const videoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

  let thumbnailUrl;

  if (!thumbnailFile) {
    await generateThumbnail(tempVideo, tempThumb);

    await s3.upload({
      Bucket: process.env.AWS_THUMBNAIL_BUCKET_NAME,
      Key: `thumbnails/${baseName}.jpg`,
      Body: fs.createReadStream(tempThumb),
      ContentType: 'image/jpeg',
    }).promise();

    thumbnailUrl = `https://${process.env.AWS_THUMBNAIL_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/thumbnails/${baseName}.jpg`;
  } else {
    const thumbnailFileName = `thumbnails/${baseName}.jpg`;

    await s3.upload({
      Bucket: process.env.AWS_THUMBNAIL_BUCKET_NAME,
      Key: thumbnailFileName,
      Body: thumbnailFile.data,
      ContentType: 'image/jpeg',
    }).promise();

    thumbnailUrl = `https://${process.env.AWS_THUMBNAIL_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbnailFileName}`;
  }

  fs.unlinkSync(tempVideo);
  if (fs.existsSync(tempThumb)) fs.unlinkSync(tempThumb);

  return { videoUrl, thumbnailUrl };
};

module.exports = { uploadVideoToS3Post };
