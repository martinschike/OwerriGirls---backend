require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const { logger } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const cookieParser = require("cookie-parser")
const bodyParser = require("body-parser");
const cors = require("cors");
const corsOptions = require("./config/corsOptions")
const connectDB = require("./config/dbConnect");
const { logEvents } = require("./middleware/logger")
const PORT = process.env.PORT || 5000
const userRoute = require("./routes/userRoute");
const paymentRoute = require("./routes/paymentRoute");
const contactRoute = require("./routes/contactRoute");

connectDB();

// Custom middleware
app.use(logger);

// 3rd party middleware
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(cors(corsOptions)); // Make API available to the public but securely.

app.use("/", express.static(path.join(__dirname, "public")));

app.use("/", require("./routes/root"));


// Main Routes
app.use("/api/users", userRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/contactus", contactRoute);

// Route for 404 Not Found error handling
app.all("*", (req, res) => {
    res.status(404);

    if (req.accepts("html")) {
        res.sendFile(path.join(__dirname, "views", "404.html"));
    } else if (req.accepts("json")) {
        res.json({message: "404 Not Found"});
    } else {
        res.type("txt").send("404 Not Found");
    }
})

app.use(errorHandler);


mongoose.connection.once("open", () => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})

mongoose.connection.on("error", (error) =>{
    console.log(error)
    logEvents(`${error.no}: ${error.code}\t${error.syscall}\t${error.hostname}`, "mongoErrorLog.log")
})
