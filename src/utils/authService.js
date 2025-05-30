const jwt = require('jsonwebtoken');
require('dotenv').config();


const getNewAccessToken = (userId) => {
  return new Promise((resolve, reject) => {
    const newAccessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    if (!newAccessToken) {
      reject('No se pudo generar un nuevo access token');
    }
    resolve(newAccessToken);
  });
};

module.exports = { getNewAccessToken };
