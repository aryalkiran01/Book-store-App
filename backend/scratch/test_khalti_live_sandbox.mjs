import axios from "axios";
import { config } from "dotenv";
config();

const KHALTI_SECRET_KEY = (process.env.KHALTI_SECRET_KEY || process.env.KHALTI_API_KEY || "").trim();
const KHALTI_INITIATE_URL = process.env.KHALTI_INITIATE_URL || "https://dev.khalti.com/api/v2/epayment/initiate/";
const KHALTI_LOOKUP_URL = process.env.KHALTI_LOOKUP_URL || "https://dev.khalti.com/api/v2/epayment/lookup/";

console.log("=== KHALTI SANDBOX DIAGNOSTIC ===");
console.log("Initiate URL:", KHALTI_INITIATE_URL);
console.log("Lookup URL:", KHALTI_LOOKUP_URL);
console.log("Secret Configured:", Boolean(KHALTI_SECRET_KEY && !KHALTI_SECRET_KEY.startsWith("your_")));
console.log("Secret Length:", KHALTI_SECRET_KEY.length);
console.log("Secret Masked:", KHALTI_SECRET_KEY ? `${KHALTI_SECRET_KEY.substring(0, 8)}...` : "NONE");

async function testLiveInitiate() {
  if (!KHALTI_SECRET_KEY || KHALTI_SECRET_KEY.startsWith("your_")) {
    console.log("\n[RESULT] Khalti secret is a placeholder or not provided. Cannot make live request.");
    return;
  }

  const authHeader = KHALTI_SECRET_KEY.startsWith("Key ") ? KHALTI_SECRET_KEY : `Key ${KHALTI_SECRET_KEY}`;
  const payload = {
    return_url: "http://localhost:5173/payment/callback?provider=khalti",
    website_url: "http://localhost:5173",
    amount: 1000, // 10 NPR in paisa
    purchase_order_id: "test_order_" + Date.now(),
    purchase_order_name: "Test Khalti Book Order",
    customer_info: {
      name: "Test Customer",
      email: "testcustomer@example.com",
      phone: "9800000000",
    },
  };

  try {
    console.log("\nSending live POST to Khalti sandbox:", KHALTI_INITIATE_URL);
    const res = await axios.post(KHALTI_INITIATE_URL, payload, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
    console.log("[SUCCESS] Live Khalti Sandbox Initiation Status:", res.status);
    console.log("[SUCCESS] Response Data:", {
      pidx: res.data.pidx,
      payment_url: res.data.payment_url,
      expires_at: res.data.expires_at,
      expires_in: res.data.expires_in,
    });
  } catch (err) {
    console.error("[ERROR] Khalti Sandbox Initiation Error:", {
      status: err.response?.status,
      data: err.response?.data || err.message,
    });
  }
}

testLiveInitiate();
