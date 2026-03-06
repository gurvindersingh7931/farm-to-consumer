/**
 * Central payment plan configuration.
 * Add new contexts (e.g. subscription_consumer) here to support more payment flows.
 */

export type PaymentContext = 'subscription_farmer' | 'subscription_consumer';

export type PlanId = string;

export interface PlanDefinition {
  amount: number; // in rupees (will be converted to paise for Razorpay)
  duration: number; // days
  name: string;
}

export interface PaymentContextConfig {
  /** Allowed user roles for this context */
  allowedRoles: Array<'farmer' | 'consumer' | 'admin'>;
  plans: Record<PlanId, PlanDefinition>;
  /** Receipt prefix for Razorpay order (must be unique per context) */
  receiptPrefix: string;
}

export const PAYMENT_CONTEXTS: Record<PaymentContext, PaymentContextConfig> = {
  subscription_farmer: {
    allowedRoles: ['farmer'],
    receiptPrefix: 'sub_farmer',
    plans: {
      monthly: {
        amount: 1,
        duration: 30,
        name: 'Monthly Premium',
      },
      yearly: {
        amount: 10,
        duration: 365,
        name: 'Yearly Premium',
      },
    },
  },
  subscription_consumer: {
    allowedRoles: ['consumer'],
    receiptPrefix: 'sub_consumer',
    plans: {
      monthly: {
        amount: 1,
        duration: 30,
        name: 'Consumer Monthly',
      },
      yearly: {
        amount: 10,
        duration: 365,
        name: 'Consumer Yearly',
      },
    },
  },
};

export function getPlan(context: PaymentContext, planId: PlanId): PlanDefinition | null {
  const config = PAYMENT_CONTEXTS[context];
  if (!config || !config.plans[planId]) return null;
  return config.plans[planId];
}

export function isContextAllowedForRole(context: PaymentContext, role: string): boolean {
  const config = PAYMENT_CONTEXTS[context];
  return config?.allowedRoles.includes(role as 'farmer' | 'consumer' | 'admin') ?? false;
}
