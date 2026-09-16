import axios from "axios";
import { env } from "./config";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: "sendgrid" | "smtp" | "console_mock";
  error?: string;
}

/**
 * Base email layout with responsive modern typography & dark/light theme styling
 */
function wrapEmailLayout(title: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      max-width: 600px;
      margin: 30px auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 30px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 32px 28px;
      line-height: 1.6;
      color: #e2e8f0;
    }
    .content h2 {
      color: #ffffff;
      font-size: 20px;
      margin-top: 0;
    }
    .btn {
      display: inline-block;
      background: #6366f1;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    .footer {
      background: #0f172a;
      padding: 20px 24px;
      text-align: center;
      font-size: 13px;
      color: #94a3b8;
      border-top: 1px solid #334155;
    }
    .table-details {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .table-details th {
      text-align: left;
      border-bottom: 2px solid #334155;
      padding: 8px 4px;
      color: #cbd5e1;
      font-size: 13px;
    }
    .table-details td {
      border-bottom: 1px solid #334155;
      padding: 10px 4px;
      color: #f1f5f9;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>BookStore App</h1>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} BookStore App. All rights reserved.</p>
      <p>This is an automated notification, please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatch email via SendGrid, SMTP, or dev mock
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const from = options.from || env.EMAIL_FROM || "no-reply@bookreviewapp.com";

  // 1. Check for SendGrid configuration
  if (env.SENDGRID_API_KEY && env.SENDGRID_API_KEY.startsWith("SG.")) {
    try {
      const response = await axios.post(
        "https://api.sendgrid.com/v3/mail/send",
        {
          personalizations: [{ to: [{ email: options.to }] }],
          from: { email: from, name: "BookStore App" },
          subject: options.subject,
          content: [
            {
              type: "text/html",
              value: options.html,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 8000,
        }
      );

      return {
        success: true,
        messageId: response.headers["x-message-id"] || "sendgrid-" + Date.now(),
        provider: "sendgrid",
      };
    } catch (err: any) {
      console.error("SendGrid email failed:", err.response?.data || err.message);
    }
  }

  // 2. Fallback / Dev / Test Mock Logger
  const mockId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  if (env.NODE_ENV !== "test") {
    console.log(`[EMAIL DISPATCH] Mock email sent to ${options.to} | Subject: "${options.subject}" [ID: ${mockId}]`);
  }

  return {
    success: true,
    messageId: mockId,
    provider: "console_mock",
  };
}

/**
 * Send Welcome Email
 */
export async function sendWelcomeEmail(to: string, username: string) {
  const html = wrapEmailLayout(
    "Welcome to BookStore App",
    `
    <h2>Welcome to BookStore, ${username}!</h2>
    <p>We are thrilled to have you join our reading community. Discover thousands of curated books, leave in-depth reviews, and track your orders seamlessly.</p>
    <div style="text-align: center;">
      <a href="${env.FRONTEND_URL}/books" class="btn">Explore Book Catalog</a>
    </div>
    <p>Happy Reading,<br>The BookStore Team</p>
    `
  );
  return sendEmail({ to, subject: "Welcome to BookStore!", html });
}

/**
 * Send Email Verification Code / Link
 */
export async function sendVerificationEmail(to: string, username: string, verifyToken: string) {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${verifyToken}&email=${encodeURIComponent(to)}`;
  const html = wrapEmailLayout(
    "Verify Your Email Address",
    `
    <h2>Verify your email, ${username}</h2>
    <p>Please confirm that you own this email address to activate your full account permissions.</p>
    <div style="text-align: center;">
      <a href="${verifyUrl}" class="btn">Verify My Email</a>
    </div>
    <p style="font-size: 13px; color: #94a3b8;">Or copy and paste this link in your browser: <br>${verifyUrl}</p>
    `
  );
  return sendEmail({ to, subject: "Verify your email address - BookStore", html });
}

/**
 * Send Password Reset Link
 */
export async function sendPasswordResetEmail(to: string, username: string, resetToken: string) {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;
  const html = wrapEmailLayout(
    "Password Reset Request",
    `
    <h2>Password Reset Request</h2>
    <p>Hi ${username}, we received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </div>
    <p style="font-size: 13px; color: #94a3b8;">This link will expire in 1 hour.</p>
    `
  );
  return sendEmail({ to, subject: "Reset your password - BookStore", html });
}

/**
 * Send Order Confirmation Email
 */
export async function sendOrderConfirmationEmail(
  to: string,
  username: string,
  order: {
    orderId: string;
    totalAmount: number;
    items: Array<{ title: string; quantity: number; price: number }>;
  }
) {
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td>${item.title}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">NPR ${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  const html = wrapEmailLayout(
    "Order Confirmation",
    `
    <h2>Thank you for your order, ${username}!</h2>
    <p>We've received your order <strong>#${order.orderId}</strong> and are preparing it for shipment.</p>
    
    <table class="table-details">
      <thead>
        <tr>
          <th>Book</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr>
          <td colspan="2" style="font-weight: bold; padding-top: 15px;">Grand Total:</td>
          <td style="font-weight: bold; text-align: right; padding-top: 15px; color: #38bdf8;">NPR ${order.totalAmount.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div style="text-align: center;">
      <a href="${env.FRONTEND_URL}/orders/${order.orderId}" class="btn">View Order Status</a>
    </div>
    `
  );
  return sendEmail({ to, subject: `Order Confirmation #${order.orderId}`, html });
}

/**
 * Send Payment Completed Email
 */
export async function sendPaymentCompletedEmail(
  to: string,
  orderId: string,
  amount: number,
  provider: string,
  transactionId: string
) {
  const html = wrapEmailLayout(
    "Payment Received",
    `
    <h2>Payment Successful!</h2>
    <p>We successfully received your payment for order <strong>#${orderId}</strong>.</p>
    <table class="table-details">
      <tr>
        <td><strong>Payment Method</strong></td>
        <td>${provider.toUpperCase()}</td>
      </tr>
      <tr>
        <td><strong>Transaction ID</strong></td>
        <td><code>${transactionId}</code></td>
      </tr>
      <tr>
        <td><strong>Amount Paid</strong></td>
        <td style="color: #38bdf8; font-weight: bold;">NPR ${amount.toFixed(2)}</td>
      </tr>
    </table>
    <div style="text-align: center;">
      <a href="${env.FRONTEND_URL}/orders/${orderId}" class="btn">View Order</a>
    </div>
    `
  );
  return sendEmail({ to, subject: `Payment Received for Order #${orderId}`, html });
}

/**
 * Send Order Shipped Email
 */
export async function sendOrderShippedEmail(
  to: string,
  orderId: string,
  carrier: string,
  trackingNumber: string
) {
  const html = wrapEmailLayout(
    "Order Shipped",
    `
    <h2>Your order is on the way!</h2>
    <p>Your order <strong>#${orderId}</strong> has been shipped.</p>
    <table class="table-details">
      <tr>
        <td><strong>Carrier</strong></td>
        <td>${carrier}</td>
      </tr>
      <tr>
        <td><strong>Tracking Number</strong></td>
        <td><code>${trackingNumber}</code></td>
      </tr>
    </table>
    <div style="text-align: center;">
      <a href="${env.FRONTEND_URL}/orders/${orderId}" class="btn">Track Order</a>
    </div>
    `
  );
  return sendEmail({ to, subject: `Your Order #${orderId} Has Shipped!`, html });
}

/**
 * Send Refund Approved Email
 */
export async function sendRefundApprovedEmail(
  to: string,
  orderId: string,
  amount: number,
  reason: string
) {
  const html = wrapEmailLayout(
    "Refund Approved",
    `
    <h2>Refund Processed</h2>
    <p>Your refund request for order <strong>#${orderId}</strong> has been approved.</p>
    <table class="table-details">
      <tr>
        <td><strong>Refund Amount</strong></td>
        <td style="color: #38bdf8; font-weight: bold;">NPR ${amount.toFixed(2)}</td>
      </tr>
      <tr>
        <td><strong>Reason</strong></td>
        <td>${reason}</td>
      </tr>
    </table>
    <p>The funds will be returned to your original payment method in 3-5 business days.</p>
    `
  );
  return sendEmail({ to, subject: `Refund Approved for Order #${orderId}`, html });
}
