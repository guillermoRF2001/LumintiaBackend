const express = require("express");
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser, 
  getTeachersWithVideoCount
} = require("../controllers/userController");

const router = express.Router();

router.post('/register', createUser);
router.post('/login', loginUser);

router.get('/teachers', getTeachersWithVideoCount);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

const authenticateToken = require("../middlewares/authMiddleware");
router.get("/protected-route", authenticateToken, (req, res) => {
  res.json({ message: "Acceso autorizado" });
});

module.exports = router;
