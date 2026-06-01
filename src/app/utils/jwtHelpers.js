import jwt from "jsonwebtoken";

// for token generation
const createToken = (payload, secret, expireTime) => {
  return jwt.sign(payload, secret, {
    expiresIn: expireTime,
  });
};


// for token verification

const verifyToken = (token, secret) => {
  return jwt.verify(token, secret);
};


export const jwtHelpers = {
  createToken,
  verifyToken,
};