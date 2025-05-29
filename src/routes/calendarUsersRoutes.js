const express = require("express");
const router = express.Router();
const controller = require("../controllers/calendarUsersController");

router.get("/", controller.getAllRelations);
router.post("/", controller.addUserToEvent);
router.delete("/:calendar_id/:user_id", controller.removeUserFromEvent);

module.exports = router;
