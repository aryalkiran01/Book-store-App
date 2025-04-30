import mongoose from "mongoose";

const KhaltiPaymentSchema = new mongoose.Schema(
  {
    return_url: { type: String, required: true },
    website_url: { type: String, required: true },
    amount: { type: Number, required: true },
    purchase_order_id: { type: String, required: true, unique: true },
    purchase_order_name: { type: String, required: true },
    customer_info: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    merchant_name: { type: String, required: true },
    merchant_extra: { type: String },
    status: { type: String, required: true, default: "Pending" },
    transaction_id: { type: String },
  },
  { timestamps: true }
);

export const KhaltiPaymentModel = mongoose.model(
  "KhaltiPayment",
  KhaltiPaymentSchema
);
