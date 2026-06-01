// ============================================================
// src/utils/cloudinaryHelper.js
//
// All Cloudinary operations in one place.
// Keeps services clean — they just call these helpers.
// ============================================================
import cloudinary from "../config/cloudinary.js";
import AppError from "../error/AppError.js";
import httpStatus from "http-status";

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer}  buffer      - file buffer from multer memoryStorage
 * @param {string}  folder      - Cloudinary folder path e.g. "school/students/photos"
 * @param {string}  publicId    - unique identifier e.g. "student_<userId>_photo"
 * @param {string}  resourceType - "image" | "raw" (raw = PDFs and non-image files)
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadToCloudinary = (buffer, folder, publicId, resourceType = "image") => {
  console.log("RResosurceType : ", resourceType);
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(// cloudinary special method
      {                                                    // buffer-based upload accept kore, stream hishebe data pathay
        folder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: true,          // replaces existing file with same publicId
        invalidate: true,         // purges CDN cache on overwrite
        // Image-specific transformations (ignored for raw)
        ...(resourceType === "image" && {
          transformation: [
            { width: 800, height: 800, crop: "limit" }, // cap at 800×800
            { quality: "auto" },                         // auto compress
            { fetch_format: "auto" },                    // serve webp where supported
          ],
        }),
      },
      (error, result) => {
        if (error) {
          return reject(
            new AppError(
              httpStatus.INTERNAL_SERVER_ERROR,
              `Cloudinary upload failed: ${error.message}`
            )
          );
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary by its publicId
 *
 * @param {string} publicId      - Cloudinary public_id of the file
 * @param {string} resourceType  - "image" | "raw"
 */
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return; // nothing to delete

  try {
    //await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    const type =  resourceType === 'raw' ? 'raw' : 'image';
    console.log("resourceType delete : ", resourceType);
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || "images",
      invalidate: true,
    });

    console.log(`Deleting ${publicId} as ${type}. Result:`, result);

    if (result.result !== "ok") {
      console.warn(`File not deleted: ${publicId}`);
    }
    if (result.result !== "ok" && result.result !== "not found") {
      console.warn(`File deletion issue: ${publicId}`, result);
    }
  } catch (error) {
    // Log but don't throw — a failed delete shouldn't block the main operation
    console.error(`Cloudinary delete failed for ${publicId}:`, error.message);
  }
};

/**
 * Determine resource type from mimetype
 * PDFs must be uploaded as "raw", images as "image"
 */
export const getResourceType = (mimetype) => {
  if (mimetype === "application/pdf") return "raw";
  return "image";
};

/**
 * Build a consistent Cloudinary folder path per user type
 *
 * Structure:
 *   school_management/
 *     students/
 *       photos/
 *       documents/
 *     teachers/
 *       photos/
 *       documents/
 *     ...
 */
export const buildFolderPath = (userType, fileType) => {
  // userType: "students" | "teachers" | "guardians" | "librarians"
  // fileType: "photos" | "documents"
  return `school_management/${userType}/${fileType}`;
};

/**
 * Build a consistent public_id for a file
 * Makes it easy to find and overwrite on update
 *
 * e.g. "student_abc123_photo", "teacher_xyz789_document"
 */
export const buildPublicId = (userType, userId, fileType) => {
  const prefix = userType.slice(0, -1); // "students" → "student"
  const suffix = fileType === "photos" ? "photo" : "document";
  return `${prefix}_${userId}_${suffix}`;
};