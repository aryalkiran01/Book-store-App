import axios from "axios";
import dotenv from "dotenv";
import { APIError } from "../../utils/error";

dotenv.config();

const KHALTI_API_KEY = process.env.KHALTI_API_KEY!;
const KHALTI_INITIATE_URL = "https://dev.khalti.com/api/v2/epayment/initiate/";
const KHALTI_LOOKUP_URL = "https://dev.khalti.com/api/v2/epayment/lookup/";
console.log("Khalti API Key:", process.env.KHALTI_API_KEY);
export async function initiatePaymentService(paymentData: object) {
  try {
    const response = await axios.post(KHALTI_INITIATE_URL, paymentData, {
      headers: {
        Authorization: `Key ${KHALTI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    throw new APIError(500, "Failed to initiate payment");
  }
}

export async function verifyPaymentService(pidx: string) {
  try {
    const response = await axios.post(
      KHALTI_LOOKUP_URL,
      { pidx },
      {
        headers: {
          Authorization: `Key ${KHALTI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new APIError(500, "Failed to verify payment");
  }
}
