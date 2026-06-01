// ============================================================
// src/middlewares/multer.js
//
// Multer stores files in memory (buffer) temporarily.
// Cloudinary then takes the buffer and uploads it.
// No files are saved to disk on the server.
// ============================================================
import multer from "multer";
import AppError from "../error/AppError.js";
import httpStatus from "http-status";

const storage = multer.memoryStorage();//store file in memory buffer

const fileFilter = ( req, file, cb ) => {
  console.log("multer file: ",file);

  //Profile photo - images only

  if(file.fieldname === "profilePhoto"){
    const allowedImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp"
    ];

    //Profile photo  -  images only
    if(!allowedImageTypes.includes(file.mimetype)){
      return cb(
        new AppError(
          httpStatus.BAD_REQUEST,
          "Profile photo must be JPEG, JPG, PNG, or WEBP"
        ),
        false//By passing false, you are explicitly telling Multer: "Do not save this file to the disk/memory."
      );
    }
  }

  //Document file - PDF, images allowed
  if( file.fieldname === "documentFile") {
    const allowedDocTypes = [
      "application/pdf",
      "image/jpg",
      "image/jpeg",
      "image/png",
    ];
    if(!allowedDocTypes.includes(file.mimetype)){
      return cb(
        new AppError(
          httpStatus.BAD_REQUEST,
          "Document must be a pdf, JPEGm JPG, or PNG"
        ),
        false
      )
    }
  }

  cb(null, true);

};

const limits = {
  fileSize: 5 * 1024 * 1024,// 5MB max per file
};

//upload both fields at once or individaully
export const upload = multer({ storage, fileFilter, limits});

//Middleware pressets for routes
export const uploadProfilePhoto = upload.single("profilePhoto");

export const uploadDocument = upload.single("documentFile");

export const uploadBoth = upload.fields([
  { name: "profilePhoto", maxCount: 1},
  { name: "documentFile", maxCount: 1},
])


// Client (image file)
//    ↓
// uploadProfilePhoto = upload.single("profilePhoto")
//    ↓
// multer({ storage, fileFilter, limits })
//    ↓
// fileFilter(req, file, cb)
//    ↓
// storage = memoryStorage()
//    ↓
// limits (fileSize check)
//    ↓
// req.file তৈরি হয়
//    ↓
// Controller

