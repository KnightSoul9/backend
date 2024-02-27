//here we are uploading file through multer  
import multer from "multer";
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")//here we store the files temporarly in public file
        //after that we will remove that file
    },
    filename: function (req, file, cb) {
         cb(null, file.originalname)//naming the file with the name provided by user
        }   
    })
export const upload = multer({ storage, })