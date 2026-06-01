// ============================================================
// src/utils/smsSender.js
// SSL Wireless Bangladesh SMS API
// Docs: https://doc.sslwireless.com/
// ============================================================
import axios from "axios";

/**
 * Send OTP via SSL Wireless SMS
 * @param {string} phone - Bangladesh phone number (e.g. 01711234567)
 * @param {string} otp   - plain 6-digit OTP
 * @param {string} purpose - "CHANGE_USERNAME" | "CHANGE_PASSWORD"
 */
export const sendOTPSMS = async (phone, otp, purpose) => {
  const purposeLabel =
    purpose === "CHANGE_USERNAME" ? "username change" : "password change";

  const message = `Your OTP for ${purposeLabel} is: ${otp}. Valid for 5 minutes. Do not share with anyone. - School System`;

  // SSL Wireless API endpoint
  const url = "https://sms.sslwireless.com/api/v3/send-sms";

  const payload = {
    api_token: process.env.SSL_WIRELESS_API_TOKEN,
    sid: process.env.SSL_WIRELESS_SID,         // sender ID registered with SSL
    sms: message,
    msisdn: formatBDPhone(phone),               // must be 88017XXXXXXXX format
    csmsid: `OTP-${Date.now()}`,                // unique client message id
  };

  const response = await axios.post(url, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 10000,
  });

  // SSL Wireless returns { status: "ACCEPTED" } on success
  if (response.data?.status !== "ACCEPTED") {
    throw new Error(
      `SMS delivery failed: ${JSON.stringify(response.data)}`
    );
  }

  return response.data;
};

/**
 * Convert local BD number to international format
 * 01711234567 → 8801711234567
 */
const formatBDPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("880")) return cleaned;
  if (cleaned.startsWith("0")) return "88" + cleaned;
  return "880" + cleaned;
};