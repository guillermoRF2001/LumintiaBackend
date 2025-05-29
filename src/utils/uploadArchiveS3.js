const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const uploadArchiveS3 = async (bufferArchivo, nombreArchivo, tipoArchivo) => {
  const ext = path.extname(nombreArchivo);
  const fileName = `${uuidv4()}${ext}`;
  const key = fileName;

  await s3.upload({
    Bucket: process.env.AWS_CHAT_FILES_BUCKET_NAME, 
    Key: key,
    Body: bufferArchivo,
    ContentType: tipoArchivo,
  }).promise();

  const fileUrl = `https://${process.env.AWS_CHAT_FILES_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  return { fileUrl, key };
};

module.exports = { uploadArchiveS3 };
