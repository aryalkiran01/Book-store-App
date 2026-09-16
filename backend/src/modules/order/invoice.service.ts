import { OrderModel } from "./model";
import { APIError } from "../../utils/error";
import { validateObjectId } from "../../utils/security";
import { calculateTaxBreakdown, TaxBreakdown } from "./tax.service";

export interface InvoiceData {
  invoiceNumber: string;
  orderId: string;
  date: Date;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: Array<{
    title: string;
    author?: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  couponCode?: string;
  couponDiscount?: number;
  shippingCost: number;
  tax: TaxBreakdown;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
}

/**
 * Generate or retrieve invoice data for an order
 */
export async function getOrderInvoiceService(
  orderId: string,
  requestingUserId: string,
  isAdmin: boolean = false
): Promise<InvoiceData> {
  validateObjectId(orderId, "Order ID");

  const order = await OrderModel.findById(orderId).populate("userId", "username email");
  if (!order) throw APIError.notFound("Order not found");

  const ownerId = (order.userId as any)?._id?.toString() || order.userId?.toString();
  if (!isAdmin && ownerId !== requestingUserId) {
    throw APIError.forbidden("You are not authorized to access this invoice.");
  }

  // Ensure an invoice number exists
  if (!order.invoiceNumber) {
    const year = new Date((order as any).createdAt || Date.now()).getFullYear();
    const shortId = order._id.toString().slice(-6).toUpperCase();
    order.invoiceNumber = `INV-${year}-${shortId}`;
    await order.save();
  }

  const taxCalculation = calculateTaxBreakdown(
    order.books.map((b: any) => ({ price: b.price, quantity: b.quantity }))
  );

  const customerName =
    order.shippingAddress?.fullName ||
    (order.userId as any)?.username ||
    order.customerInfo?.fullName ||
    "Valued Customer";

  const customerEmail =
    order.shippingAddress?.email ||
    (order.userId as any)?.email ||
    order.customerInfo?.email ||
    "";

  const street = order.shippingAddress?.street || "";
  const city = order.shippingAddress?.city || "";
  const state = order.shippingAddress?.state || "";
  const postalCode = order.shippingAddress?.postalCode || "";
  const address = [street, city, state, postalCode].filter(Boolean).join(", ") || "Standard Shipping";

  return {
    invoiceNumber: order.invoiceNumber,
    orderId: order._id.toString(),
    date: (order as any).createdAt || new Date(),
    customer: {
      name: customerName,
      email: customerEmail,
      phone: order.shippingAddress?.phone || order.customerInfo?.phone || "",
      address,
    },
    items: order.books.map((b: any) => ({
      title: b.title,
      author: b.author || "",
      quantity: b.quantity,
      price: b.price,
      subtotal: b.subtotal || b.price * b.quantity,
    })),
    subtotal: order.subtotal || order.books.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0),
    discount: order.discount || 0,
    couponCode: order.couponCode || "",
    couponDiscount: order.couponDiscount || 0,
    shippingCost: order.shippingCost || 0,
    tax: taxCalculation,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
  };
}

/**
 * Generate a printable, professional HTML invoice
 */
export async function getOrderInvoiceHtmlService(
  orderId: string,
  requestingUserId: string,
  isAdmin: boolean = false
): Promise<string> {
  const invoice = await getOrderInvoiceService(orderId, requestingUserId, isAdmin);

  const itemsRows = invoice.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0;">
        <strong style="color: #0f172a;">${item.title}</strong>
        ${item.author ? `<br><small style="color: #64748b;">Author: ${item.author}</small>` : ""}
      </td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">NPR ${item.price.toFixed(2)}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">NPR ${item.subtotal.toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${invoice.invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #334155;
      background: #f8fafc;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 800;
      color: #4f46e5;
      margin: 0;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      margin: 0;
      font-size: 22px;
      color: #0f172a;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-pending { background: #fef9c3; color: #a16207; }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 30px;
    }
    .meta-box h4 {
      margin: 0 0 8px 0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .table th {
      background: #f1f5f9;
      padding: 10px 8px;
      text-align: left;
      font-size: 13px;
      color: #475569;
      border-bottom: 2px solid #cbd5e1;
    }
    .summary-table {
      width: 320px;
      margin-left: auto;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 6px 0;
    }
    .grand-total {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      border-top: 2px solid #0f172a;
      padding-top: 8px;
    }
    @media print {
      body { background: white; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header-row">
      <div>
        <h1 class="brand-title">BookStore</h1>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">Kathmandu, Nepal<br>support@bookreviewapp.com</p>
      </div>
      <div class="invoice-title">
        <h2>INVOICE</h2>
        <p style="margin: 4px 0; font-weight: 600; color: #0f172a;">${invoice.invoiceNumber}</p>
        <span class="badge ${invoice.paymentStatus === "paid" || invoice.paymentStatus === "completed" ? "badge-paid" : "badge-pending"}">
          ${invoice.paymentStatus.toUpperCase()}
        </span>
      </div>
    </div>

    <div class="grid-2">
      <div class="meta-box">
        <h4>Billed To:</h4>
        <strong style="color: #0f172a;">${invoice.customer.name}</strong><br>
        ${invoice.customer.email ? `${invoice.customer.email}<br>` : ""}
        ${invoice.customer.phone ? `Phone: ${invoice.customer.phone}<br>` : ""}
        ${invoice.customer.address}
      </div>
      <div class="meta-box" style="text-align: right;">
        <h4>Invoice Details:</h4>
        <strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString()}<br>
        <strong>Order ID:</strong> ${invoice.orderId}<br>
        <strong>Payment Method:</strong> ${invoice.paymentMethod.toUpperCase()}<br>
        <strong>Status:</strong> ${invoice.status.toUpperCase()}
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Item Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <table class="summary-table">
      <tr>
        <td style="color: #64748b;">Subtotal:</td>
        <td style="text-align: right; font-weight: 600;">NPR ${invoice.subtotal.toFixed(2)}</td>
      </tr>
      ${
        invoice.couponDiscount
          ? `
      <tr>
        <td style="color: #16a34a;">Coupon Discount (${invoice.couponCode}):</td>
        <td style="text-align: right; color: #16a34a; font-weight: 600;">- NPR ${invoice.couponDiscount.toFixed(2)}</td>
      </tr>`
          : ""
      }
      <tr>
        <td style="color: #64748b;">Shipping Cost:</td>
        <td style="text-align: right; font-weight: 600;">${invoice.shippingCost === 0 ? "FREE" : `NPR ${invoice.shippingCost.toFixed(2)}`}</td>
      </tr>
      <tr>
        <td style="color: #64748b;">VAT (${invoice.tax.taxRatePercentage}%):</td>
        <td style="text-align: right; font-weight: 600;">NPR ${invoice.tax.taxAmount.toFixed(2)}</td>
      </tr>
      <tr class="grand-total">
        <td>Total Amount:</td>
        <td style="text-align: right; color: #4f46e5;">NPR ${invoice.totalAmount.toFixed(2)}</td>
      </tr>
    </table>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 13px; color: #94a3b8;">
      Thank you for shopping with BookStore App. If you have questions about this invoice, please contact support.
    </div>
  </div>
</body>
</html>
  `.trim();
}
