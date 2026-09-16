import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    title: { type: String, required: true },
    author: { type: String, default: "" },
    image: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const customerInfoSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    postalCode: { type: String, default: "" },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "return_requested",
        "returned",
        "refund_pending",
        "refunded",
      ],
    },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: "" },
    changedBy: { type: String, default: "system" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerInfo: {
      type: customerInfoSchema,
      default: () => ({}),
    },
    books: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0, default: 0 },
    shippingCost: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    couponCode: { type: String, default: "", trim: true },
    couponDiscount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    invoiceNumber: { type: String, default: "", index: true },
    totalAmount: { type: Number, required: true, min: 0 },
    shippingAddress: { type: shippingAddressSchema, default: () => ({}) },
    orderNote: { type: String, default: "" },
    paymentMethod: {
      type: String,
      enum: ["khalti", "cod", "card", "demo", "cash_on_delivery", "esewa"],
      default: "cod",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "paid",
        "completed",
        "failed",
        "partially_refunded",
        "refunded",
      ],
      default: "pending",
      index: true,
    },
    paymentId: { type: String, default: "", index: true },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "return_requested",
        "returned",
        "refund_pending",
        "refunded",
      ],
      default: "pending",
      index: true,
    },
    statusHistory: [statusHistorySchema],
    cancellationReason: { type: String, default: "" },
    cancelledAt: { type: Date },
    reservationExpiresAt: { type: Date, index: true },
    // Shipping and Delivery Tracking
    shippingProvider: { type: String, default: "" },
    trackingNumber: { type: String, default: "", index: true },
    shippedAt: { type: Date },
    estimatedDeliveryAt: { type: Date },
    deliveredAt: { type: Date },
    deliveryStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "failed",
      ],
      default: "pending",
      index: true,
    },
    // Soft Deletion
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        if (
          !ret.customerInfo ||
          (!ret.customerInfo.fullName && !ret.customerInfo.email)
        ) {
          ret.customerInfo = {
            fullName:
              ret.shippingAddress?.fullName ||
              ret.userId?.username ||
              "",
            email:
              ret.shippingAddress?.email ||
              ret.userId?.email ||
              "",
            phone: ret.shippingAddress?.phone || "",
          };
        }
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ isDeleted: 1, createdAt: -1 });

export const OrderModel = mongoose.model("Order", orderSchema);

