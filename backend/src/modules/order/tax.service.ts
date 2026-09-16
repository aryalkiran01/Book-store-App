export interface TaxCalculationItem {
  price: number;
  quantity: number;
  isTaxExempt?: boolean;
}

export interface TaxBreakdown {
  subtotal: number;
  taxableAmount: number;
  exemptAmount: number;
  taxRate: number; // e.g. 0.13 for 13%
  taxRatePercentage: number; // e.g. 13
  taxAmount: number;
  grandTotal: number;
  currency: string;
}

export interface TaxOptions {
  taxRate?: number; // e.g. 0.13
  countryCode?: string;
  isTaxInclusive?: boolean;
}

const DEFAULT_TAX_RATE = 0.13; // 13% standard VAT in Nepal / configurable

/**
 * Calculate tax breakdown for a list of items or subtotal
 */
export function calculateTaxBreakdown(
  items: TaxCalculationItem[],
  options: TaxOptions = {}
): TaxBreakdown {
  const taxRate = options.taxRate !== undefined ? options.taxRate : DEFAULT_TAX_RATE;
  let taxableAmount = 0;
  let exemptAmount = 0;

  for (const item of items) {
    const itemTotal = Number((item.price * item.quantity).toFixed(2));
    if (item.isTaxExempt) {
      exemptAmount += itemTotal;
    } else {
      taxableAmount += itemTotal;
    }
  }

  const subtotal = Number((taxableAmount + exemptAmount).toFixed(2));
  const taxAmount = Number((taxableAmount * taxRate).toFixed(2));
  const grandTotal = Number((subtotal + taxAmount).toFixed(2));

  return {
    subtotal,
    taxableAmount: Number(taxableAmount.toFixed(2)),
    exemptAmount: Number(exemptAmount.toFixed(2)),
    taxRate,
    taxRatePercentage: Number((taxRate * 100).toFixed(2)),
    taxAmount,
    grandTotal,
    currency: "NPR",
  };
}

/**
 * Quick tax helper for raw amount
 */
export function calculateSimpleTax(amount: number, taxRate: number = DEFAULT_TAX_RATE): {
  taxableAmount: number;
  taxAmount: number;
  totalWithTax: number;
} {
  const taxable = Math.max(0, amount);
  const tax = Number((taxable * taxRate).toFixed(2));
  return {
    taxableAmount: taxable,
    taxAmount: tax,
    totalWithTax: Number((taxable + tax).toFixed(2)),
  };
}
