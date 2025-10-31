import Order from '../models/Order';
import User from '../models/User';
import Farmer from '../models/Farmer';
import Crop from '../models/Crop';

export interface NotificationData {
  type: 'order_placed' | 'order_accepted' | 'order_rejected' | 'order_completed' | 'order_cancelled';
  orderId: number;
  recipientId: number;
  message: string;
  data?: any;
}

class NotificationService {
  // In a real application, this would integrate with email service, push notifications, etc.
  // For now, we'll just log the notifications
  
  async sendOrderNotification(order: Order, type: NotificationData['type']): Promise<void> {
    try {
      // Get order details with relations
      const orderWithDetails = await Order.findByPk(order.id, {
        include: [
          {
            model: User,
            as: 'consumer',
            attributes: ['id', 'firstName', 'lastName', 'email'],
          },
          {
            model: User,
            as: 'farmer',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            include: [
              {
                model: Farmer,
                as: 'farmerProfile',
                attributes: ['farmName', 'phone'],
              },
            ],
          },
          {
            model: Crop,
            as: 'crop',
            attributes: ['id', 'name', 'unit'],
          },
        ],
      });

      if (!orderWithDetails) {
        console.error('Order not found for notification:', order.id);
        return;
      }

      let notification: NotificationData;

      switch (type) {
        case 'order_placed':
          notification = {
            type,
            orderId: order.id,
            recipientId: order.farmerId,
            message: `New order received from ${orderWithDetails.consumer?.firstName} ${orderWithDetails.consumer?.lastName} for ${orderWithDetails.quantity} ${orderWithDetails.crop?.unit} of ${orderWithDetails.crop?.name}`,
            data: {
              consumerName: `${orderWithDetails.consumer?.firstName} ${orderWithDetails.consumer?.lastName}`,
              consumerEmail: orderWithDetails.consumer?.email,
              cropName: orderWithDetails.crop?.name,
              quantity: orderWithDetails.quantity,
              unit: orderWithDetails.crop?.unit,
              totalAmount: orderWithDetails.totalAmount,
            },
          };
          break;

        case 'order_accepted':
          notification = {
            type,
            orderId: order.id,
            recipientId: order.consumerId,
            message: `Your order for ${orderWithDetails.quantity} ${orderWithDetails.crop?.unit} of ${orderWithDetails.crop?.name} has been accepted by ${orderWithDetails.farmer?.firstName} ${orderWithDetails.farmer?.lastName}`,
            data: {
              farmerName: `${orderWithDetails.farmer?.firstName} ${orderWithDetails.farmer?.lastName}`,
              farmName: orderWithDetails.farmer?.farmerProfile?.farmName,
              farmerPhone: orderWithDetails.farmer?.farmerProfile?.phone,
              cropName: orderWithDetails.crop?.name,
              quantity: orderWithDetails.quantity,
              unit: orderWithDetails.crop?.unit,
            },
          };
          break;

        case 'order_rejected':
          notification = {
            type,
            orderId: order.id,
            recipientId: order.consumerId,
            message: `Your order for ${orderWithDetails.quantity} ${orderWithDetails.crop?.unit} of ${orderWithDetails.crop?.name} has been rejected by ${orderWithDetails.farmer?.firstName} ${orderWithDetails.farmer?.lastName}`,
            data: {
              farmerName: `${orderWithDetails.farmer?.firstName} ${orderWithDetails.farmer?.lastName}`,
              cropName: orderWithDetails.crop?.name,
              quantity: orderWithDetails.quantity,
              unit: orderWithDetails.crop?.unit,
              reason: order.notes || 'No reason provided',
            },
          };
          break;

        case 'order_completed':
          notification = {
            type,
            orderId: order.id,
            recipientId: order.consumerId,
            message: `Your order for ${orderWithDetails.quantity} ${orderWithDetails.crop?.unit} of ${orderWithDetails.crop?.name} has been completed`,
            data: {
              farmerName: `${orderWithDetails.farmer?.firstName} ${orderWithDetails.farmer?.lastName}`,
              cropName: orderWithDetails.crop?.name,
              quantity: orderWithDetails.quantity,
              unit: orderWithDetails.crop?.unit,
            },
          };
          break;

        case 'order_cancelled':
          notification = {
            type,
            orderId: order.id,
            recipientId: order.farmerId,
            message: `Order from ${orderWithDetails.consumer?.firstName} ${orderWithDetails.consumer?.lastName} for ${orderWithDetails.quantity} ${orderWithDetails.crop?.unit} of ${orderWithDetails.crop?.name} has been cancelled`,
            data: {
              consumerName: `${orderWithDetails.consumer?.firstName} ${orderWithDetails.consumer?.lastName}`,
              cropName: orderWithDetails.crop?.name,
              quantity: orderWithDetails.quantity,
              unit: orderWithDetails.crop?.unit,
            },
          };
          break;

        default:
          console.error('Unknown notification type:', type);
          return;
      }

      // Log the notification (in production, this would send email/push notification)
      console.log('📧 Notification sent:', {
        to: notification.recipientId,
        type: notification.type,
        message: notification.message,
        orderId: notification.orderId,
        timestamp: new Date().toISOString(),
      });

      // Here you would integrate with:
      // - Email service (SendGrid, AWS SES, etc.)
      // - Push notification service (Firebase, OneSignal, etc.)
      // - SMS service (Twilio, etc.)
      // - In-app notification system
      
      // Example email integration:
      // await this.sendEmail(notification);
      
      // Example push notification:
      // await this.sendPushNotification(notification);

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Placeholder methods for future integrations
  private async sendEmail(notification: NotificationData): Promise<void> {
    // Implement email sending logic
    console.log('📧 Email notification would be sent:', notification);
  }

  private async sendPushNotification(notification: NotificationData): Promise<void> {
    // Implement push notification logic
    console.log('📱 Push notification would be sent:', notification);
  }

  private async sendSMS(notification: NotificationData): Promise<void> {
    // Implement SMS sending logic
    console.log('📱 SMS notification would be sent:', notification);
  }
}

export default new NotificationService();
