// const DIR="./public/";

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, '/tmp/my-uploads')
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
//     cb(null, file.fieldname + '-' + uniqueSuffix)
//   }
// })

// const upload = multer({ 
//     storage: storage ,
//      fileFilter :(req, file, cb) =>{

  
//   if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'){
//     cb(null, true);
//   } else {
//     cb(new Error('Only .jpeg and .png files are allowed!'), false);
//   }             

  

// }

// })
// module.exports = upload;




const multer = require("multer");
const path = require("path");
const fs = require("fs");

const DIR = path.join(__dirname, "..", "public", "uploads", "packages");

if (!fs.existsSync(DIR)) {
  fs.mkdirSync(DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, DIR);
  },

  filename: function (req, file, cb) {
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    const ext = path.extname(file.originalname);

    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,

  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpg"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only jpeg, jpg and png files are allowed"));
    }
  },
});

module.exports = upload;