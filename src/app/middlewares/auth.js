import jwt from "jsonwebtoken";
import AppError from "../error/AppError.js";
import httpStatus from "http-status";
import { jwtHelpers } from "../utils/jwtHelpers.js";

const auth = (...requiredRoles) => {
  return async (req, res, next) => {
    try {

      // Get token from cookie or Authorization header
      let token = req.cookies.accessToken;

      // If not in cookie, check Authorization header
      if (!token && req.headers.authorization) {
        token = req.headers.authorization.split(" ")[1];
      }

      if (!token) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "You are not logged in! Please login to access this resource",
        );
      }

      // token verification

      // const decodedUser = jwtHelpers.verifyToken(
      //   token,
      //   process.env.JWT_ACCESS_SECRET,
      // );

      // // check for Authorization
      // if (requiredRoles.length && !requiredRoles.includes(decodedUser.role)) {
      //   throw new AppError(httpStatus.FORBIDDEN, "You are not authorized");
      // }

      // req.user = decodedUser;
      // next();

      // Verify token
      let decodedUser;
      try {
        decodedUser = jwtHelpers.verifyToken(
          token,
          process.env.JWT_ACCESS_SECRET,
        );
      } catch (error) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "Invalid or expired token. Please login again.",
        );
      }

      //console.log("decodeUser : ", decodedUser);
      console.log("Result roles: ", requiredRoles);
      // check for authorization (support multiple roles if provided)
      if (requiredRoles.length > 0) {
        // decodedUser.roles is an array now
        const userRoles = decodedUser.roles || [];
        console.log(userRoles);
        const hasRequiredRole = requiredRoles.some((role) =>
          userRoles.includes(role),
        );
        console.log("Result roles: ", hasRequiredRole);
        if (!hasRequiredRole) {
          throw new AppError(
            httpStatus.FORBIDDEN,
            "You are not authorized to access this resource",
          );
        }
      }
      // attach user to request object
      
      req.user = decodedUser;
      //console.log("midd Auht : ", req.user);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
