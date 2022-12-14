const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const Token = require("../models/tokenModel");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const {generateToken, hashToken} = require("../utils");
const parser = require("ua-parser-js");
const jwt = require("jsonwebtoken");
const Cryptr = require("cryptr");


const cryptr = new Cryptr(process.env.CRYPTR_KEY);



// REGISTER USER
const registerUser = asyncHandler (async (req, res) => {
    const {name, email, password} = req.body

    //Validation
    if(!name || !email || !password) { 
        res.status(400)
        throw new Error("Please fill in all the required fields");
    }
    if (password.length < 6) {
        res.status(400)
        throw new Error("Password must be at least 6 characters");
    }

    // Check if user email is already registered
    const userExists = await User.findOne({email});

    if (userExists) {
        res.status(400)
        throw new Error("Email is already registered");
    }

    // Get UserAgent
    const ua = parser(req.headers["user-agent"]);
    const userAgent = [ua.ua]
 

    // Create new user
    const user = await User.create({
        name,
        email,
        password,
        userAgent,
    });

    // Generate Token (json-web-token)
    const token = generateToken(user._id);

    // Send HTTP-only cookie
    res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400), // 1 day
        sameSite: "none", // backend and frontend can have different URL
        secure: true
    })

    if (user) {
        const {_id, name, dob, email, photo, phone, bio, role, isVerified} = user
        res.status(201).json({
            _id, name, dob, email, photo, phone, bio, role, isVerified, token
        })
    } else {
        res.status(400)
        throw new Error("Invalid user data");
    }
 
});



// LOGIN USER
const loginUser = asyncHandler (async (req, res) => {
    
    const {email, password} = req.body

    //Validate Request
    if (!email ||!password) { 
        res.status(400)
        throw new Error("Please add email and password");
    }

    // Check if user exists
    const user = await User.findOne({email});

    if (!user) {
        res.status(404)
        throw new Error("User not found. Please signup");
    }

    // User exists, check if password is correct
    const passwordIsCorrect = await bcrypt.compare(password, user.password) // comapares password provided by user with that in the db.

    // if password is incorrect
    if (!passwordIsCorrect) {
        res.status(400);
        throw new Error("Invalid email or password");
    }

    // Trigger 2FA authentication for unknown user agent.
    const ua = parser(req.headers["user-agent"]);
    const thisUserAgent = ua.ua;
    console.log(thisUserAgent);

    const allowedAgent = user.userAgent.includes(thisUserAgent);

    if (!allowedAgent) {
        // Generate 6 digit code
        const loginCode = Math.floor(100000 + Math.random() * 900000)
        console.log(loginCode);

        // Encrypt login code before saving to DB
        const encryptedLoginCode = cryptr.encrypt(loginCode.toString())

        // Delete Token if it exists in DB
        let userToken = await Token.findOne({userId: user._id});
        if (userToken) {
        await userToken.deleteOne();
        }
    
        // Save token to DB
        await new Token({
            userId: user._id,
            lToken: encryptedLoginCode,
            createdAt: Date.now(),
            expiresAt: Date.now() + 30 * (60 * 1000) // 30 minutes
        }).save()

        res.status(400)
        throw new Error("New browser or device detected.");

    }

    // If email and Password is correct, Generate Token to login user.
    const token = generateToken(user._id);

    if (user && passwordIsCorrect) {
        // Send HTTP-only cookie
        res.cookie("token", token, {
            path: "/",
            httpOnly: true,
            expires: new Date(Date.now() + 1000 * 86400), // 1 day
            sameSite: "none", // backend and frontend can have different URL
            secure: true
        });
    
        const {_id, name, dob, email, photo, phone, bio, role, isVerified} = user
        res.status(200).json({
            _id,
            name, 
            dob, 
            email, 
            photo, 
            phone, 
            bio, 
            role, 
            isVerified, 
            token,
        });

    } else {
        res.status(500)
        throw new Error("Something went wrong. Please try again.");
    }
});


// SEND LOGIN CODE
const sendLoginCode = asyncHandler ( async(req, res) => {
    const { email } = req.params;
    const user = await User.findOne({email});

    // If user is not found
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    // Find Login Code in DB
    let userToken = await Token.findOne({
        userId: user._id,
        expiresAt: {$gt: Date.now()}
    });

    // If user token is not valid
    if (!userToken) {
        res.status(404);
        throw new Error("Invalid or expired token. Please login again");
    }

    const loginCode = userToken.lToken;
    console.log(loginCode);

    // Decrypt loginCode
    const decryptedLoginCode = cryptr.decrypt(loginCode);

    // Send Login Code Email
    // Send Email
    const subject = "Login Access Code - OwerriGirls";
    const send_to = email;
    const sent_from = process.env.EMAIL_USER;
    const reply_to = "noreply@owerrigirls.com"; 
    const template = "loginCode"; 
    const name = user.name;
    const link = decryptedLoginCode;

    try {
        await sendEmail(subject, send_to, sent_from, reply_to, template, name, link)
        res.status(200).json({message: `Access code sent to ${email}`});
    } catch (error) {
        res.status(500);
        throw new Error("Email not sent. Please try again");
    }


});


// LOGIN WITH CODE
const loginWithCode = asyncHandler ( async (req, res) => {
    const { email } = req.params;
    const { loginCode } = req.body;

    const user = await User.findOne({email});

    if (!user) {
        res.status(404)
        throw new Error("User not found");
    }

    // Find user Login Token
    const userToken = await Token.findOne({
        userId: user._id,
        expiresAt: {$gt: Date.now()},
    });

    if (!userToken) {
        res.status(404);
        throw new Error("Invalid or expired token. Please login again.");
    }

    const decryptedLoginCode = cryptr.decrypt(userToken.lToken);

    if (loginCode !== decryptedLoginCode) {
        res.status(400)
        throw new Error("Incorrect login code. Please try again");
    } else {
        // Register userAgent
        const ua = parser(req.headers["user-agent"]);
        const thisUserAgent = ua.ua;
        // add to database
        user.userAgent.push(thisUserAgent);
        await user.save();

        // Generate Token (json-web-token)
        const token = generateToken(user._id);

        // Send HTTP-only cookie
        res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400), // 1 day
        sameSite: "none", // backend and frontend can have different URL
        secure: true
        });

   
        const {_id, name, dob, email, photo, phone, bio, role, isVerified} = user
        res.status(200).json({
            _id, 
            name, 
            dob, 
            email, 
            photo, 
            phone, 
            bio, 
            role, 
            isVerified, 
            token
        });
                
    }

})


// SEND VERIFICATION EMAIL
const sendVerificationEmail = asyncHandler (async (req, res) => {
    
    const user = await User.findById(req.user._id)

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    if (user.isVerified) {
        res.status(400);
        throw new Error("User already verified");
    }
    // Delete Token if it exists in DB
    let token = await Token.findOne({ userId: user._id})

    if (token) {
        await token.deleteOne();
    }

    // Create Verification Token and Save
    const verificationToken = crypto.randomBytes(32).toString("hex") + user._id;
    console.log("verification token" + verificationToken);

    // Hash token and save to DB
    const hashedToken = hashToken(verificationToken)
    await new Token({
        userId: user._id,
        vToken: hashedToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60 * (60*1000) // 1 hour
    }).save()

    // Construct a Verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;

    // Send Email
    const subject = "Verify your Account - OwerriGirls" 
    const send_to = user.email
    const sent_from = process.env.EMAIL_USER
    const reply_to = "noreply@owerrigirls.com" 
    const template = "verifyEmail" 
    const name = user.name
    const link = verificationUrl

    try {
        await sendEmail(subject, send_to, sent_from, reply_to, template, name, link)
        res.status(200).json({message: "Verification Email sent"})
    } catch (error) {
        res.status(500);
        throw new Error("Email not sent. Please try again");
    }
    
});


// VERIFY USER
const verifyUser = asyncHandler(async(req, res) => {
    const { verificationToken } = req.params;

    const hashedToken = hashToken(verificationToken)

// verify token validity
const userToken = await Token.findOne({
    vToken: hashedToken,
    expiresAt: {$gt: Date.now()}
})

if (!userToken) {
    res.status(404);
    throw new Error("Invalid or Expired token");
}

// Find User
const user = await User.findOne({_id: userToken.userId})

if (user.isVerified) {
    res.status(400)
    throw new Error("User is already verified");
}

// Now verify the user
user.isVerified = true;
await user.save();

res.status(200).json({message: "Account Verification Successful"});

})


// LOGOUT USER

const logout = asyncHandler(async (req, res) => {
    res.cookie("token", "", {
        path: "/",
        httpOnly: true,
        expires: new Date(0), // expire immediately
        sameSite: "none", // backend and frontend can have different URL
        secure: true
    })
    return res.status(200).json({message: "User logged out successfully"});
});



// GET USER DATA
const getUser = asyncHandler(async (req, res) => {
   
    const user = await User.findById(req.user._id)

    if (user) {
        const {_id, name, dob, email, photo, phone, bio, role, isVerified} = user
        res.status(200).json({
            _id,  
            name, 
            dob, 
            email, 
            photo, 
            phone, 
            bio, 
            role, 
            isVerified
        })
    } else {
        res.status(400)
        throw new Error("User not found");
    }
});

// GET ALL USERS
const getUsers = asyncHandler(async (req, res) => {
    const users = await User.find().sort("-createdAt").select("-password")

    if (!users) {
        res.status(500);
        throw new Error("Something went wrong");
    }
    res.status(200).json(users)
});


// GET LOGIN STATUS
const loginStatus = asyncHandler(async (req, res) => {
    const token = req.cookies.token;

    // Check if token exists
    if (!token) {
        return res.json(false);
    }

    // Verify Token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (verified) {
        return res.json(true);
    } 
    return res.json(false);
});


// UPDATE USER
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        const {name, dob, email, photo, phone, bio, role, isVerified} = user;
        user.email = email;// Because we don't want it to change
        user.name = req.body.name || name;
        user.phone = req.body.phone || phone;
        user.dob = req.body.dob || dob;
        user.bio = req.body.bio || bio;
        user.photo = req.body.photo || photo;
        

        const updatedUser = await user.save();
        res.status(200).json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            photo: updatedUser.photo,
            dob: updatedUser.dob,
            phone: updatedUser.phone, 
            bio: updatedUser.bio, 
            role: updatedUser.role,
            isVerified: updatedUser.isVerified,
        })
    } else {
        res.status(400)
        throw new Error("User not found");
    }
});

// DELETE USER
const deleteUser = asyncHandler (async (req, res) => {
    const user = User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    await user.remover()
    res.status(200).json({message: "User deleted successfully"});
});

// CHANGE PASSWORD
const changePassword = asyncHandler(async (req, res) => {

    const { oldPassword, password } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error("User not found, please signup");
    }

    // Validate
    if (!oldPassword || !password) {
        res.status(400);
        throw new Error("Please enter old and new password");
    }

    // Check if password matches password in DB
    const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

    // Save new Password
    if (user && passwordIsCorrect) {
        user.password = password;
        await user.save();
        res.status(200).send("Password was successfully changed");
    } else {
        res.status(400);
        throw new Error("Old password is incorrect");
    }

});

// FORGOT PASSWORD
const forgotPassword = asyncHandler (async (req, res) => {
    const {email} = req.body;
    const user = await User.findOne({email});

    if (!user) {
        res.status(404);
        throw new Error("No user with this email");
    }

    // Delete Token if it exists in DB
    let token = await Token.findOne({userId: user._id});
    if (token) {
        await token.deleteOne();
    }

    // Create a Reset Token
    let resetToken = crypto.randomBytes(32).toString("hex") + user._id
    console.log("the reset token is " + resetToken);

    // Hash token before saving to DB
    const hashedToken = hashToken(resetToken);
    
    // Save token to DB
    await new Token({
        userId: user._id,
        rToken: hashedToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * (60 * 1000) // 30 minutes
    }).save()

    // Construct Reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/resetPassword/${resetToken}`

    // Send Email
    const subject = "Password Reset Request - OwerriGirls";
    const send_to = user.email;
    const sent_from = process.env.EMAIL_USER;
    const reply_to = "noreply@owerrigirls.com"; 
    const template = "forgotPassword"; 
    const name = user.name;
    const link = resetUrl;

    try {
        await sendEmail(subject, send_to, sent_from, reply_to, template, name, link)
        res.status(200).json({message: "Password Reset Email sent"})
    } catch (error) {
        res.status(500);
        throw new Error("Email not sent. Please try again");
    }

});

// RESET PASSWORD
const resetPassword = asyncHandler(async (req, res) => {
    
    const {resetToken} = req.params;
    const {password} = req.body;
   

    // Hash token then comapare to token in the database
    const hashedToken = hashToken(resetToken);
    // Find token in the database
    const userToken = await Token.findOne({
        rToken: hashedToken,
        expiresAt: {$gt: Date.now()}
    })

    if (!userToken) {
        res.status(400);
        throw new Error("Invalid or Expired Token");
    }

    // Find user
    const user = await User.findOne({_id: userToken.userId})
    // Now Reset password
    user.password = password;
    await user.save();

    res.status(200).json({
        message: "Password reset successful. Please Login"
    });

});

// CHANGE USER ROLE
const changeRole = asyncHandler (async (req, res) => {
    const { role, id } = req.body;


    const user = await User.findById(id);

    // If no user
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    user.role = role
    await user.save();

    res.status(200).json({ message: `User role updated to ${role}`});
})


// SEND AUTOMATED EMAILS
const sendAutomatedEmail = asyncHandler (async (req, res) => {
    const { subject, send_to, reply_to, template, url  } = req.body;

    if (!subject || !send_to || !reply_to || !template) {
        res.status(500);
        throw new Error("Missing email parameter");
    }

    // Get User
    const user = await User.findOne({email: send_to})

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    const sent_from = process.env.EMAIL_USER
    const name = user.name
    const link = `${process.env.FRONTEND_URL}${url}`

    try {
        await sendEmail(subject, send_to, sent_from, reply_to, template, name, link)
        res.status(200).json({message: "Email sent successfully"})
    } catch (error) {
        res.status(500);
        throw new Error("Email not sent. Please try again");
    }
    

});
    

module.exports = {
    registerUser,
    loginUser,
    logout,
    getUser,
    getUsers,
    loginStatus,
    updateUser,
    deleteUser,
    changePassword,
    forgotPassword,
    resetPassword,
    changeRole,
    sendAutomatedEmail,
    sendVerificationEmail,
    verifyUser,
    sendLoginCode,
    loginWithCode,
}