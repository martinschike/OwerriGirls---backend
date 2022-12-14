const multer = require("multer");

// Define file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
      cb(null, new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname)
    }
  })

  // Specify file format that can be saved
  function fileFilter (req, file, cb) {
    if (
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/jpeg" 
        ) {
            cb(null, true)
    } else {
            cb(null, false)
    }
  
  }



  const upload = multer({ storage, fileFilter });

  // File Size Formatter - Used to format the image size 
  const fileSizeFormatter = (bytes, decimals) => {
    if(bytes == 0) {
        return "0 Bytes";
    }
    const k = 1000;
    const dm = decimals || 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const index = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, index)).toFixed(dm)) + " " + sizes[index];
 }
 

  module.exports = {upload, fileSizeFormatter}