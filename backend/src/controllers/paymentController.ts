import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { User, Subscription } from '../models';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// Initialize Razorpay (only if keys are provided)
let razorpay: Razorpay | null = null;

const initializeRazorpay = () => {
  if (!razorpay && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });
  }
  return razorpay;
};

// Subscription plans
const SUBSCRIPTION_PLANS = {
  monthly: {
    amount: 999, // ₹9.99
    duration: 30, // days
    name: 'Monthly Premium'
  },
  yearly: {
    amount: 9999, // ₹99.99
    duration: 365, // days
    name: 'Yearly Premium'
  }
};

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const razorpayInstance = initializeRazorpay();
    if (!razorpayInstance) {
      res.status(503).json({ message: 'Payment service not configured' });
      return;
    }

    const userId = req.user!.id;
    const { planType } = req.body;

    if (!planType || !SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS]) {
      res.status(400).json({ message: 'Invalid plan type. Must be monthly or yearly.' });
      return;
    }

    // Check if user already has an active premium subscription
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt > new Date()) {
      res.status(400).json({ message: 'User already has an active premium subscription' });
      return;
    }

    const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];
    const amount = plan.amount * 100; // Convert to paise
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    // Create Razorpay order
    const orderOptions = {
      amount: amount,
      currency: 'INR',
      receipt: `sub_${userId}_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        planType: planType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    };

    const order = await razorpayInstance.orders.create(orderOptions);

    // Create subscription record
    const subscription = await Subscription.create({
      userId,
      planType: planType as 'monthly' | 'yearly',
      amount: plan.amount,
      currency: 'INR',
      razorpayOrderId: order.id,
      status: 'pending',
      isActive: false,
      expiresAt: endDate,
      startDate,
      endDate
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      subscription: {
        id: subscription.id,
        planType: subscription.planType,
        amount: subscription.amount,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      res.status(400).json({ message: 'Missing required payment details' });
      return;
    }

    // Find the subscription
    const subscription = await Subscription.findOne({
      where: {
        razorpayOrderId: orderId,
        userId: userId
      }
    });

    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    if (subscription.status !== 'pending') {
      res.status(400).json({ message: 'Payment already processed' });
      return;
    }

    // Verify the signature
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== signature) {
      res.status(400).json({ message: 'Invalid payment signature' });
      return;
    }

    // Update subscription status
    await subscription.update({
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      status: 'completed'
    });

    // Update user premium status
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({
        isPremium: true,
        premiumExpiresAt: subscription.endDate
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
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSubscriptionStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'isPremium', 'premiumExpiresAt']
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if premium is still active
    const isActive = user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt > new Date();

    // Get recent subscriptions
    const subscriptions = await Subscription.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'planType', 'amount', 'status', 'startDate', 'endDate', 'createdAt']
    });

    res.status(200).json({
      isPremium: isActive,
      premiumExpiresAt: user.premiumExpiresAt,
      subscriptions
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSubscriptionPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      amount: plan.amount,
      duration: plan.duration,
      currency: 'INR'
    }));

    res.status(200).json({ plans });
  } catch (error) {
    console.error('Error getting subscription plans:', error);
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

    if (!user.isPremium) {
      res.status(400).json({ message: 'User does not have an active premium subscription' });
      return;
    }

    // Update user premium status
    await user.update({
      isPremium: false,
      premiumExpiresAt: undefined
    });

    // Update any pending subscriptions to cancelled
    await Subscription.update(
      { status: 'cancelled' },
      {
        where: {
          userId,
          status: 'pending'
        }
      }
    );

    res.status(200).json({
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
