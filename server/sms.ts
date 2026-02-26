const ENTITY_ID = "1001037440275109040";
const DLT_MESSAGE_TEMPLATE = "Your OTP for verification is {#var#}. It is valid for 10 minutes. Do not share this OTP with anyone. - VIDEH";

export async function sendOtpSms(mobileNumber: string, otp: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const senderId = process.env.FAST2SMS_SENDER_ID || "VIDEHE";
  const templateId = process.env.DLT_TEMPLATE_ID || "1007181628875366114";

  if (!apiKey) {
    throw new Error("FAST2SMS_API_KEY not configured");
  }

  const cleanNumber = mobileNumber.replace(/\D/g, "").replace(/^91/, "");
  if (cleanNumber.length !== 10) {
    throw new Error("Invalid Indian mobile number");
  }

  const url = "https://www.fast2sms.com/dev/bulkV2";
  const messageText = DLT_MESSAGE_TEMPLATE.replace("{#var#}", otp);

  const routes = [
    {
      name: "DLT_Manual",
      payload: {
        route: "dlt_manual",
        sender_id: senderId,
        message: messageText,
        template_id: templateId,
        entity_id: ENTITY_ID,
        flash: "0",
        numbers: cleanNumber,
      },
    },
    {
      name: "DLT",
      payload: {
        route: "dlt",
        sender_id: senderId,
        message: templateId,
        variables_values: otp,
        flash: "0",
        numbers: cleanNumber,
      },
    },
    {
      name: "OTP",
      payload: {
        route: "otp",
        variables_values: otp,
        flash: "0",
        numbers: cleanNumber,
      },
    },
  ];

  for (const { name, payload } of routes) {
    try {
      console.log(`[SMS] Trying ${name} route for ${cleanNumber}...`);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "authorization": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log(`[SMS] ${name} route response:`, JSON.stringify(data));

      if (data.return) {
        console.log(`[SMS] Successfully sent OTP via ${name} route to ${cleanNumber}`);
        return;
      }
    } catch (err) {
      console.log(`[SMS] ${name} route error:`, err);
    }
  }

  throw new Error("All SMS routes failed. Please check your FAST2SMS account configuration.");
}

export function isSmsConfigured(): boolean {
  return !!(process.env.FAST2SMS_API_KEY);
}

export function isIndianMobile(input: string): boolean {
  const cleaned = input.replace(/\D/g, "").replace(/^91/, "");
  return /^[6-9]\d{9}$/.test(cleaned);
}

export function normalizeMobile(input: string): string {
  return input.replace(/\D/g, "").replace(/^91/, "");
}

export function maskMobile(mobile: string): string {
  const cleaned = normalizeMobile(mobile);
  if (cleaned.length < 4) return cleaned;
  return `${cleaned.slice(0, 2)}${"*".repeat(cleaned.length - 4)}${cleaned.slice(-2)}`;
}
