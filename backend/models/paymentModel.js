const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    name: {
        type: String,
        required: [true, "Please add a payment name"],
        trim: true,
    },
    reference: {
        type: String,
        required: true,
        default: "REF",
        trim: true,
    },
    category: [{
        type: String,
        required: [true, "Please add a category"],
        default: "monthly dues"
    }],
    quantity: {
        type: String,
        required: [true, "Please add quantity"],
        trim: true,
    },
    amount: {
        type: String,
        required: [true, "Please add the cost price"],
        trim: true,
    },
    description: {
        type: String,
        required: [true, "Please add a description"],
        trim: true,
    },
    imageReceipt: {
        type: Object,
        default: {},
    },
}, {
    timestamps: true,
})


const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;