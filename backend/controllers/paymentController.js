const asyncHandler = require("express-async-handler");
const Payment = require("../models/paymentModel");
const { fileSizeFormatter } = require("../utils/fileUpload");
const cloudinary = require("cloudinary").v2;

// Create Payment
const createPayment = asyncHandler(async (req, res) => {
    const {name, reference, category, quantity, amount, description} = req.body;

    // Validation
    if (!name ||!category ||!quantity ||!amount ||!description) {
        res.status(400)
           throw new Error("Please fill in all required fields");
        };

        // Handle Image Upload
        let fileData = {}
        if (req.file) {
            // Save image to cloudinary
            let uploadedFile;
            try {
                uploadedFile = await cloudinary.uploader.upload(req.file.path, {folder: "OwerriGirls", resource_type: "image"})
            } catch (error) {
                res.status(500)
                throw new Error("Image could not be uploaded");
            }


            fileData = {
                fileData: req.file.originalname,
                filePath: uploadedFile.secure_url,
                fileType: req.file.mimetype,
                fileSize: fileSizeFormatter(req.file.size, 2), // 2 stands for two decimal places
            }
           
        }

        // Create payment
        const payment = await Product.create({
            user: req.user.id,
            name,
            reference,
            category,
            quantity,
            amount,
            description,
            imageReceipt: fileData,
        })

        res.status(201).json(payment);
    }
);

// get all products
const getPayments = asyncHandler (async (req, res) => {
    const payments = await Payment.find({user: req.user.id}).sort("-createdAt");

    res.status(200).json(payments);
});

// Get Single Payment
const getPayment = asyncHandler (async (req, res) => {
    const payment = await Payment.findById(req.params.id);

    // If payment does not exist
    if (!payment) {
        res.status(404)
        throw new Error("Payment not found");
    }

    // Match payment to the user that made it
    if (payment.user.toString() !== req.user.id) {
        res.status(401)
        throw new Error("User not authorized");
    }
    res.status(200).json(payment);
});

// Delete Payment record
const deletePayment = asyncHandler (async (req, res) => {
    const payment = await Product.findById(req.params.id);

    // If payment record does not exist
    if (!payment) {
        res.status(404)
        throw new Error("Payment record not found");
    }

    // Match payment to its user
    if (payment.user.toString() !== req.user.id) {
        res.status(401)
        throw new Error("User not authorized");
    }
    await payment.remove();
    res.status(200).json({message: "Payment record deleted successfully"});
});

// Update Payment
const updatePayment = asyncHandler(async (req, res) => {
    const {name, category, quantity, amount, description} = req.body;
    const {id} = req.params;

    const payment = await Payment.findById(id)

     // If product does not exist
     if (!payment) {
        res.status(404)
        throw new Error("Payment record not found");
    }

      // Match payment to its user
      if (payment.user.toString() !== req.user.id) {
        res.status(401)
        throw new Error("User not authorized");
    }

        // Handle Image Upload
        let fileData = {}
        if (req.file) {
            // Save image to cloudinary
            let uploadedFile;
            try {
                uploadedFile = await cloudinary.uploader.upload(req.file.path, {folder: "OwerriGirls", resource_type: "image"})
            } catch (error) {
                res.status(500)
                throw new Error("Image could not be uploaded");
            }


            fileData = {
                fileData: req.file.originalname,
                filePath: uploadedFile.secure_url,
                fileType: req.file.mimetype,
                fileSize: fileSizeFormatter(req.file.size, 2), // 2 stands for two decimal places
            }
           
        }

        // Update product
        const updatedPayment = await Product.findByIdAndUpdate(
            {_id: id},
            {
                name,
                category,
                quantity,
                amount,
                description,
                imageReceipt: Object.keys(fileData).length === 0 ? product?.image : fileData,
            },
            {
              new: true,
              runValidators: true  
            }
        );

        res.status(200).json(updatedPayment);
    }
);


module.exports = {
    createPayment,
    getPayments,
    getPayment,
    deletePayment,
    updatePayment,
}