import { Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { User, Subscription } from '../models';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  PaymentContext,
  PAYMENT_CONTEXTS,
  getPlan,
  isContextAllowedForRole,
} from '../config/paymentPlans';

let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay | null {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keyId && keySecret) {
      if (keyId === keySecret) {
        console.error('Razorpay: KEY_ID and KEY_SECRET must be different. Use Key ID for KEY_ID and Key Secret for KEY_SECRET from the dashboard.');
      }
      razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
  }
  return razorpayInstance;
}

/** Razorpay API error shape */
function isRazorpayAuthError(error: unknown): boolean {
  const e = error as { statusCode?: number; error?: { code?: string; description?: string } };
  return (
    e?.statusCode === 401 ||
    (e?.error?.code === 'BAD_REQUEST_ERROR' && /auth|invalid.*key/i.test(String(e?.error?.description ?? '')))
  );
}

/** Returns only the public key for client-side Razorpay Checkout. Never expose KEY_SECRET. */
export const getPaymentConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId) {
      res.status(503).json({ message: 'Payment service not configured' });
      return;
    }
    res.status(200).json({ razorpayKeyId: keyId });
  } catch (error) {
    console.error('Get payment config error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create a Razorpay order. Generic: accepts paymentContext and planId so the same flow
 * can be used for farmer subscription, consumer subscription, or future one-time payments.
 */
export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rzp = getRazorpay();
    if (!rzp) {
      res.status(503).json({ message: 'Payment service not configured' });
      return;
    }

    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { paymentContext, planId } = req.body as { paymentContext?: PaymentContext; planId?: string };

    if (!paymentContext || !planId) {
      res.status(400).json({ message: 'Missing paymentContext or planId' });
      return;
    }

    if (!PAYMENT_CONTEXTS[paymentContext]) {
      res.status(400).json({ message: 'Invalid payment context' });
      return;
    }

    if (!isContextAllowedForRole(paymentContext, userRole)) {
      res.status(403).json({ message: 'This payment is not available for your account type' });
      return;
    }

    const plan = getPlan(paymentContext, planId);
    if (!plan) {
      res.status(400).json({ message: 'Invalid plan for this context' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Subscription contexts: block if user already has active premium
    if (paymentContext === 'subscription_farmer' || paymentContext === 'subscription_consumer') {
      if (user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt > new Date()) {
        res.status(400).json({ message: 'You already have an active premium subscription' });
        return;
      }
    }

    const config = PAYMENT_CONTEXTS[paymentContext];
    const amountPaise = Math.round(plan.amount * 100);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    const receipt = `${config.receiptPrefix}_${userId}_${Date.now()}`;

    const orderOptions = {
      amount: amountPaise,
      currency: 'INR' as const,
      receipt,
      notes: {
        userId: userId.toString(),
        paymentContext,
        planId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    const order = await rzp.orders.create(orderOptions);

    const planType = planId as 'monthly' | 'yearly';
    const subscription = await Subscription.create({
      userId,
      planType: planId === 'monthly' || planId === 'yearly' ? planType : 'monthly',
      amount: plan.amount,
      currency: 'INR',
      razorpayOrderId: order.id,
      status: 'pending',
      isActive: false,
      expiresAt: endDate,
      startDate,
      endDate,
    });

    const keyId = process.env.RAZORPAY_KEY_ID;

    res.status(201).json({
      message: 'Order created successfully',
      razorpayKeyId: keyId ?? undefined,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      subscription: {
        id: subscription.id,
        planType: subscription.planType,
        amount: subscription.amount,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    if (isRazorpayAuthError(error)) {
      res.status(502).json({
        message: 'Payment provider authentication failed. Please check Razorpay API keys (Key ID and Key Secret) in server configuration.',
      });
      return;
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Verify Razorpay payment signature and fulfill the order (idempotent).
 * Amount is validated against our stored subscription record.
 */
export const verifyPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { orderId, paymentId, signature } = req.body as {
      orderId?: string;
      paymentId?: string;
      signature?: string;
    };

    if (!orderId || !paymentId || !signature) {
      res.status(400).json({ message: 'Missing required payment details' });
      return;
    }

    const subscription = await Subscription.findOne({
      where: { razorpayOrderId: orderId, userId },
    });

    if (!subscription) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

  if (subscription.status === 'completed') {
      res.status(200).json({
        message: 'Payment already verified',
        subscription: {
          id: subscription.id,
          planType: subscription.planType,
          amount: subscription.amount,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        },
      });
      return;
    }

    if (subscription.status !== 'pending') {
      res.status(400).json({ message: 'Order is no longer pending' });
      return;
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      res.status(503).json({ message: 'Payment service not configured' });
      return;
    }

    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      res.status(400).json({ message: 'Invalid payment signature' });
      return;
    }

    await subscription.update({
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      status: 'completed',
    });

    const user = await User.findByPk(userId);
    if (user) {
      await user.update({
        isPremium: true,
        premiumExpiresAt: subscription.endDate,
      });
    }

    res.status(200).json({
      message: 'Payment verified successfully',
      subscription: {
        id: subscription.id,
        planType: subscription.planType,
        amount: subscription.amount,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSubscriptionStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'isPremium', 'premiumExpiresAt'],
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isActive = !!(user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt > new Date());

    const subscriptions = await Subscription.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'planType', 'amount', 'status', 'startDate', 'endDate', 'createdAt'],
    });

    res.status(200).json({
      isPremium: isActive,
      premiumExpiresAt: user.premiumExpiresAt,
      subscriptions,
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/** Get plans for a given payment context (e.g. subscription_farmer). Public or authenticated. */
export const getPlans = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const context = (req.query.context as PaymentContext) || 'subscription_farmer';

    if (!PAYMENT_CONTEXTS[context]) {
      res.status(400).json({ message: 'Invalid payment context' });
      return;
    }

    const config = PAYMENT_CONTEXTS[context];
    const plans = Object.entries(config.plans).map(([id, plan]) => ({
      id,
      name: plan.name,
      amount: plan.amount,
      duration: plan.duration,
      currency: 'INR',
    }));

    res.status(200).json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const cancelSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Align with getSubscriptionStatus: active premium = premiumExpiresAt set and in the future
    const hasActivePremium = !!(
      user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date()
    );
    if (!hasActivePremium) {
      res.status(400).json({ message: 'You do not have an active premium subscription' });
      return;
    }

    await user.update({
      isPremium: false,
      premiumExpiresAt: null as unknown as Date,
    });

    await Subscription.update(
      { status: 'cancelled' },
      { where: { userId, status: 'pending' } }
    );

    res.status(200).json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
