// ============================================================
// src/utils/defaultPassword.js
//
// Generates the initial default password for a new user.
// Rule: phone number if available, else DOB formatted as DDMMYYYY
// ============================================================

/**
 * Build the default password for a new user.
 *
 * @param {string|null} phone     - e.g. "01711234567"
 * @param {Date|null}   dateOfBirth
 * @returns {string}              - the plain-text default password
 */
export const buildDefaultPassword = (phone, dateOfBirth) => {
    if (phone) {
      // Strip non-digits, use raw local number
      return phone.replace(/\D/g, "");
    }
  
    if (dateOfBirth) {
      const d = new Date(dateOfBirth);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}${mm}${yyyy}`; // e.g. "15061985"
    }
  
    // Fallback — should rarely happen
    return "Change@1234";
  };
  
  
  // ============================================================
  // PATCH: src/modules/auth/auth.service.js
  //
  // Update loginUserFromDB to:
  //  1. Include isFirstLogin in the JWT payload
  //  2. Set isFirstLogin = false on first login
  // ============================================================
  
  // --- FIND THIS BLOCK in your existing auth.service.js ---
  //
  //   const accessToken = jwtHelpers.generateToken(
  //     { userId: user.id, roles: userRoles, institutionId: user.institutionId },
  //     process.env.JWT_ACCESS_SECRET,
  //     process.env.JWT_ACCESS_EXPIRES_IN
  //   );
  //
  // --- REPLACE WITH ---
  //
  //   const accessToken = jwtHelpers.generateToken(
  //     {
  //       userId: user.id,
  //       roles: userRoles,
  //       institutionId: user.institutionId,
  //       isFirstLogin: user.isFirstLogin,   // ← ADD THIS
  //     },
  //     process.env.JWT_ACCESS_SECRET,
  //     process.env.JWT_ACCESS_EXPIRES_IN
  //   );
  //
  //   // Mark first login as done after successful login
  //   if (user.isFirstLogin) {
  //     await prisma.user.update({
  //       where: { id: user.id },
  //       data: { isFirstLogin: false },
  //     });
  //   }
  
  
  // ============================================================
  // PATCH: Every module that creates a User
  // (student.service.js, teacher.service.js, guardian.service.js,
  //  library.service.js — createLibrarianIntoDB, etc.)
  //
  // When creating the user inside the $transaction, set the
  // default password using buildDefaultPassword().
  // ============================================================
  
  // Example — in createStudentIntoDB (inside the $transaction):
  //
  //   import { buildDefaultPassword } from "../../utils/defaultPassword.js";
  //   import { hashPassword } from "../user/user.utils.js";
  //
  //   // payload has: dateOfBirth, phone (optional)
  //   const defaultPlainPassword = buildDefaultPassword(payload.phone, payload.dateOfBirth);
  //   const hashedDefaultPassword = await hashPassword(defaultPlainPassword);
  //
  //   const user = await tx.user.create({
  //     data: {
  //       username,
  //       email,
  //       password: hashedDefaultPassword,   // ← use this instead of hashPassword(password)
  //       institutionId,
  //       isFirstLogin: true,                // ← always true on creation
  //     },
  //   });
  //
  //   // Then send a welcome email telling the user their default password:
  //   // sendWelcomeEmail(email, fullNameEnglish, defaultPlainPassword)
  //   // (optional — implement in emailSender.js)
  
  
  // ============================================================
  // .env additions required
  // ============================================================
  //
  // # Nodemailer (Gmail example)
  // SMTP_HOST=smtp.gmail.com
  // SMTP_PORT=587
  // SMTP_USER=yourschool@gmail.com
  // SMTP_PASS=your_app_password_here
  // SMTP_FROM_NAME=Demo High School
  //
  // # SSL Wireless SMS
  // SSL_WIRELESS_API_TOKEN=your_ssl_wireless_token
  // SSL_WIRELESS_SID=your_registered_sender_id