import httpStatus from "http-status";
import AppError from "../error/AppError.js";
import { hasPermission } from "../utils/permissions.js";


/**
 * Middleware to check if user has required permission
 * @param {string} resource - Resource name (e.g., "STUDENT", "INSTITUTION")
 * @param {string} action - Action name (e.g., "VIEW", "CREATE", "UPDATE", "DELETE")
 * @returns {Function} Express middleware function
 * 
 * Usage:
 * router.post("/students", 
 *   auth(), 
 *   requirePermission("STUDENT", "CREATE"),
 *   createStudent
 * );
 */
export function requirePermission(resource, action) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;

      //console.log("requestingUser Middleware : ", req.user);

      if (!userId) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "User not authenticated. Please login first."
        );
      }

      // Check if user has the required permission
      const allowed = await hasPermission(userId, resource, action);

      if (!allowed) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          `You don't have permission to ${action} ${resource}`
        );
      }

      //console.log("requestingUser Middleware : ", req.user);
      // User has permission, proceed to next middleware
      next();
    } catch (error) {
      next(error);
    }
  };
}


/**
 * Middleware to check if user has any of the required roles
 * @param {...string} roles - Array of role names
 * @returns {Function} Express middleware function
 * 
 * Usage:
 * router.get("/admin-panel", 
 *   auth(), 
 *   requireRole("SUPER_ADMIN", "ADMIN"),
 *   getAdminPanel
 * );
 */
export function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const userRoles = req.user?.roles || [];

      if (userRoles.length === 0) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "User not authenticated. Please login first."
        );
      }

      // Check if user has at least one of the required roles
      const hasRequiredRole = roles.some((role) => userRoles.includes(role));

      if (!hasRequiredRole) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          `Access denied. Required roles: ${roles.join(" or ")}`
        );
      }

      // User has required role, proceed to next middleware
      next();
    } catch (error) {
      next(error);
    }
  };
}