const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const uploadUserImageToS3 = async (imageFile) => {
  const ext = path.extname(imageFile.name);
  const fileName = `${uuidv4()}${ext}`;
  const key = `${fileName}`;  // Subimos a esta carpeta del bucket

  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const tempImagePath = path.join(tempDir, fileName);
  fs.writeFileSync(tempImagePath, imageFile.data);

  await s3.upload({
    Bucket: process.env.AWS_USER_IMAGE_BUCKET_NAME,
    Key: key, 
    Body: fs.createReadStream(tempImagePath),
    ContentType: imageFile.mimetype,
  }).promise();

  fs.unlinkSync(tempImagePath);

  const imageUrl = `https://${process.env.AWS_USER_IMAGE_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  return imageUrl;
};

module.exports = { uploadUserImageToS3 };
