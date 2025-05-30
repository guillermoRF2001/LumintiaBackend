const AWS = require('aws-sdk');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { uploadUserImageToS3 } = require('../utils/uploadUserImageToS3');
const UserService = require('../services/userService');
require('dotenv').config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const createUser = async (req, res) => {
  const { name, email, password, role, is_admin } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
    }

    const userRole = role || "student";
    const adminFlag = is_admin || false;

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await UserService.createUser({
      name,
      email,
      password_hash: hashedPassword,
      role: userRole,
      is_admin: adminFlag,
    });

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      is_admin: newUser.is_admin
    });
  } catch (error) {
    res.status(400).json({ error: 'Error creando el usuario', details: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await UserService.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo los usuarios', details: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    if (user) res.status(200).json(user);
    else res.status(404).json({ error: 'Usuario no encontrado' });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo el usuario', details: error.message });
  }
};

const updateUser = async (req, res) => {
  const { name, email, password, role, is_admin } = req.body;
  const imageFile = req.files?.image;

  try {
    const user = await UserService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    let updatedFields = { name, email };

    if (role !== undefined) updatedFields.role = role;
    if (is_admin !== undefined) updatedFields.is_admin = is_admin;
    if (password) {
      updatedFields.password_hash = await bcrypt.hash(password, 10);
    }

    if (imageFile) {
      const oldImageKey = user.profile_picture ? user.profile_picture.split('/').pop() : null;

      if (oldImageKey) {
        try {
          await s3.deleteObject({
            Bucket: process.env.AWS_USER_IMAGE_BUCKET_NAME,
            Key: oldImageKey,
          }).promise();
        } catch (err) {
          console.warn(`No se pudo eliminar la imagen anterior: ${err.message}`);
        }
      }

      const imageUrl = await uploadUserImageToS3(imageFile);
      updatedFields.profile_picture = imageUrl;
    }

    const updatedUser = await UserService.updateUser(req.params.id, updatedFields);

    res.status(200).json({ message: 'Usuario actualizado', updatedUser });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(400).json({ error: 'Error actualizando el usuario', details: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const imageKey = user.profile_picture ? user.profile_picture.split('/').pop() : null;
    if (imageKey) {
      try {
        await s3.deleteObject({
          Bucket: process.env.AWS_USER_IMAGE_BUCKET_NAME,
          Key: imageKey,
        }).promise();
      } catch (err) {
        console.warn(`Error al eliminar imagen del bucket: ${err.message}`);
      }
    }

    await UserService.deleteUser(req.params.id);
    res.status(200).json({ message: 'Usuario y su imagen eliminados correctamente' });
  } catch (error) {
    console.error("Error eliminando usuario:", error);
    res.status(500).json({ error: 'Error eliminando el usuario', details: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor', details: error.message });
  }
};

const getTeachersWithVideoCount = async () => {
  try {
    const teachers = await User.findAll({
      where: { role: 'teacher' }, 
      include: [
        {
          model: VideoService.Video, 
          as: 'videos', 
          attributes: [] 
        }
      ],
      attributes: {
        include: [
          [sequelize.fn('COUNT', sequelize.col('videos.id')), 'videos_count']
        ]
      },
      group: ['User.id'] 
    });

    return teachers;
  } catch (error) {
    throw new Error('Error obteniendo los profesores con el conteo de videos');
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  getTeachersWithVideoCount,
};
