const express = require("express");
const router = express.Router();
const {protect} = require("../middleWare/authMiddleware");
const { createPayment, getPayments, getPayment, deletePayment, updatePayment } = require("../controllers/paymentController");
const { upload } = require("../utils/fileUpload");


router.post("/", protect, upload.single("image"), createPayment); // upload.array for multiple files
router.get("/", protect, getPayments); 
router.get("/:id", protect, getPayment); 
router.delete("/:id", protect, deletePayment); 
router.patch("/:id", protect, upload.single("image"), updatePayment);



module.exports = router;