const multer = require("multer");

// Use memory storage so files are available as buffers (for ImageKit upload)
const storage = multer.memoryStorage();

const upload = multer({ storage });

module.exports = upload;
