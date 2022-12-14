const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter a last name"],
    },
    email: {
        type: String,
        required: [true, "Please enter an email"],
        unique: true,
        trim: true,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter a valid email address"
        ],
        unique: true
    },
    password: {
        type: String,
        required: [true, "Please enter a password"],
        minLength: [6, "Password must be at least 6 characters"],
        // maxLength: [23, "Password must not be more than 23 characters"],
    },
    dob: {
        type: Date,
        required: [true, "Please select your date of birth"],
        default: "01/01/1900"
    },
    photo: {
        type: String,
        required: [true, "Please select a photo"],
        default: "https://i.ibb.co/4pDNDk1/avatar.png",
    },
    phone: {
        type: String,
        default: "+234"
    },
    bio: {
        type: String,
        maxLength: [250, "Bio must not exceeed 250 characters"],
        default: "bio"
    },
    role: {
        type: String,
        required: true,
        default: "member",
        // member, author, admin, suspended
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    userAgent: {
        type: Array,
        required: true,
        default: []
    }
}, {
    timestamps: true,
    minimize: false,
});

    //Encrypt password using bcryptjs before saving to DB
    userSchema.pre("save", async function (next) {
        if(!this.isModified("password")) {
            return next();
        }

        // Hash password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(this.password, salt);
        this.password = hashedPassword;
        next();
    })


const User = mongoose.model("User", userSchema);
module.exports = User;