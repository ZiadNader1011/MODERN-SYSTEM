import { formatCurrency } from '@/data/store';

/* =========================
   TYPES
========================= */

export interface ProductItem {
  quantity?: number | string;
  unitPrice?: number | string;
  currency?: string;
}

export interface JobItem {
  currency: string;
  totalPrice?: number | string;
  discountPercentage?: number | string;
  rawMaterialWeight?: number | string;
  rawMaterialPricePerTon?: number | string;
  supplierDiscountPercentage?: number | string;
  pettyCash?: number | string;
  products?: ProductItem[];
}

/* =========================
   HELPERS
========================= */

export const toNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

/* =========================
   PRODUCT TOTAL
========================= */

export const calculateProductLineTotal = (
  quantity: number | string,
  unitPrice: number | string
): number => {
  return toNumber(quantity) * toNumber(unitPrice);
};

/* =========================
   JOB PRODUCTS TOTAL
========================= */

export const calculateProductsTotal = (
  products: ProductItem[] = [],
  fallbackCurrency = 'USD'
): Record<string, number> => {
  return products.reduce((acc, product) => {
    const currency = product.currency || fallbackCurrency;

    const total =
      toNumber(product.quantity) *
      toNumber(product.unitPrice);

    acc[currency] = (acc[currency] || 0) + total;

    return acc;
  }, {} as Record<string, number>);
};

/* =========================
   APPLY DISCOUNT
========================= */

export const applyDiscount = (
  totals: Record<string, number>,
  discountPercentage: number | string
): Record<string, number> => {
  const discount = toNumber(discountPercentage);

  const result: Record<string, number> = {};

  Object.entries(totals).forEach(([currency, value]) => {
    result[currency] =
      value - (value * discount) / 100;
  });

  return result;
};

/* =========================
   TOTAL JOB VALUE
========================= */

export const calculateJobValue = (
  job: JobItem
): Record<string, number> => {
  const hasProducts =
    job.products &&
    job.products.length > 0;

  let totals: Record<string, number>;

  if (hasProducts) {
    totals = calculateProductsTotal(
      job.products,
      job.currency
    );
  } else {
    totals = {
      [job.currency]: toNumber(job.totalPrice),
    };
  }

  return applyDiscount(
    totals,
    job.discountPercentage || 0
  );
};

/* =========================
   ALL JOBS TOTAL VALUE
========================= */

export const calculateJobsTotalValue = (
  jobs: JobItem[]
): Record<string, number> => {
  return jobs.reduce((acc, job) => {
    const jobTotals = calculateJobValue(job);

    Object.entries(jobTotals).forEach(
      ([currency, value]) => {
        acc[currency] =
          (acc[currency] || 0) + value;
      }
    );

    return acc;
  }, {} as Record<string, number>);
};

/* =========================
   RAW MATERIAL COST
========================= */

export const calculateRawMaterialCost = (
  weight: number | string,
  pricePerTon: number | string,
  supplierDiscount: number | string = 0
): number => {
  const total =
    toNumber(weight) *
    toNumber(pricePerTon);

  const discount = toNumber(supplierDiscount);

  return total - (total * discount) / 100;
};

/* =========================
   TOTAL COST
========================= */

export const calculateTotalCost = (
  rawMaterialCost: number | string,
  pettyCash: number | string
): number => {
  return (
    toNumber(rawMaterialCost) +
    toNumber(pettyCash)
  );
};

/* =========================
   FORMAT MULTI CURRENCY
========================= */

export const formatMultiCurrency = (
  obj: Record<string, number>
): string => {
  const parts = Object.entries(obj)
    .filter(([_, value]) => value !== 0)
    .map(([currency, value]) =>
      formatCurrency(value, currency)
    );

  return parts.length
    ? parts.join(' | ')
    : '0';
};

/* =========================
   CHECK EMPTY
========================= */

export const isCurrencyObjectEmpty = (
  obj: Record<string, number>
): boolean => {
  return Object.values(obj).every(
    value => value === 0
  );
};