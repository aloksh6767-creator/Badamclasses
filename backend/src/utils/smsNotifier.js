const truncate = (value, maxLength = 500) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
};

const getSmsConfig = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

  if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
    return null;
  }

  return {
    accountSid,
    authToken,
    fromNumber,
    messagingServiceSid
  };
};

const normalizePhoneForSms = (value = "") => {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.startsWith("+")) return digits;
  return `+${digits}`;
};

export const getSmsDebugSummary = () => {
  const config = getSmsConfig();
  return {
    configured: Boolean(config),
    provider: config ? "twilio" : "none"
  };
};

export const sendOfflineTestResultSms = async ({
  phone,
  studentName,
  examName,
  rollNumber,
  marksObtained,
  totalMarks,
  rank,
  resultNotes
}) => {
  const config = getSmsConfig();
  if (!config) {
    return { sent: false, reason: "sms_not_configured" };
  }

  const to = normalizePhoneForSms(phone);
  if (!to) {
    return { sent: false, reason: "phone_missing" };
  }

  const body = truncate(
    `BadamClasses Result: ${studentName || "Student"}, ${examName || "Offline Test"} result uploaded. Roll No: ${rollNumber || "-"}, Marks: ${marksObtained ?? "-"}${totalMarks !== null && totalMarks !== undefined ? `/${totalMarks}` : ""}, Rank: ${rank || "-"}${resultNotes ? `. Note: ${resultNotes}` : ""}`,
    1200
  );

  const authHeader = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");
  const params = new URLSearchParams({
    To: to,
    Body: body
  });

  if (config.messagingServiceSid) {
    params.set("MessagingServiceSid", config.messagingServiceSid);
  } else if (config.fromNumber) {
    params.set("From", config.fromNumber);
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      sent: false,
      reason: "sms_send_failed",
      error: truncate(data?.message || `Twilio error ${response.status}`, 200)
    };
  }

  return {
    sent: true,
    provider: "twilio",
    sid: data?.sid || ""
  };
};
