const express = require("express");
const router = express.Router();
const {protect, adminOnly, authorOnly} = require("../middleWare/authMiddleware");

const { registerUser, loginUser, logout,loginWithCode, getUser, getUsers, changeRole, loginStatus, sendLoginCode, updateUser, deleteUser, changePassword, forgotPassword, resetPassword, sendAutomatedEmail, sendVerificationEmail, verifyUser } = require("../controllers/userController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", logout);
router.get("/getUser", protect, getUser);
router.get("/getUsers", protect, authorOnly, getUsers);
router.get("/loginStatus", loginStatus);
router.patch("/updateuser", protect, updateUser);
router.delete("/:id", protect, adminOnly, deleteUser);
router.patch("/changePassword", protect, changePassword);
router.post("/forgotPassword", forgotPassword);
router.patch("/resetPassword/:resetToken", resetPassword);
router.post("/changeRole", protect, adminOnly, changeRole)
router.post("/sendAutomatedEmail", protect, sendAutomatedEmail);
router.post("/sendVerificationEmail", protect, sendVerificationEmail);
router.post("/sendLoginCode/:email", sendLoginCode);
router.post("/loginWithCode/:email", loginWithCode);




module.exports = router;