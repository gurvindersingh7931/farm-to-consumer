import { Request, Response } from 'express';
import Order, { OrderStatus } from '../models/Order';
import Crop from '../models/Crop';
import User from '../models/User';
import Farmer from '../models/Farmer';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import notificationService from '../services/notificationService';

interface CreateOrderRequest extends AuthenticatedRequest {
  body: {
    cropId: number;
    quantity: number;
    deliveryAddress?: string;
    deliveryDate?: string;
    notes?: string;
  };
}

interface UpdateOrderStatusRequest extends AuthenticatedRequest {
  body: {
    status: OrderStatus;
    notes?: string;
  };
}

export const createOrder = async (req: CreateOrderRequest, res: Response): Promise<void> => {
  try {
    const consumerId = req.user.id;
    const { cropId, quantity, deliveryAddress, deliveryDate, notes } = req.body;

    // Validate input
    if (!cropId || !quantity || quantity <= 0) {
      res.status(400).json({ message: 'Crop ID and valid quantity are required' });
      return;
    }

    // Get crop details
    const crop = await Crop.findByPk(cropId, {
      include: [
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    if (!crop) {
      res.status(404).json({ message: 'Crop not found' });
      return;
    }

    if (!crop.isActive || !crop.isAvailable) {
      res.status(400).json({ message: 'Crop is not available for order' });
      return;
    }

    if (quantity > crop.quantity) {
      res.status(400).json({
        message: `Insufficient quantity. Available: ${crop.quantity} ${crop.unit}`
      });
      return;
    }

    // Prevent farmers from ordering their own crops
    if (crop.farmerId === consumerId) {
      res.status(400).json({ message: 'Cannot order your own crops' });
      return;
    }

    // Calculate total amount
    const pricePerUnit = crop.pricePerKg;
    const totalAmount = quantity * pricePerUnit;

    // Create order
    const order = await Order.create({
      consumerId,
      farmerId: crop.farmerId,
      cropId,
      quantity,
      pricePerUnit,
      totalAmount,
      deliveryAddress,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      notes,
      status: OrderStatus.PENDING,
    });

    // Update crop available quantity
    await crop.update({
      quantity: crop.quantity - quantity,
    });

    // Get complete order details for response
    const completeOrder = await Order.findByPk(order.id, {
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
        },
        {
          model: Crop,
          as: 'crop',
          attributes: ['id', 'name', 'unit', 'imageUrl'],
        },
      ],
    });

    // Send notification to farmer
    await notificationService.sendOrderNotification(order, 'order_placed');

    res.status(201).json({
      message: 'Order placed successfully',
      order: completeOrder,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getConsumerOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const consumerId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const whereClause: any = { consumerId };
    if (status) {
      whereClause.status = status;
    }

    const orders = await Order.findAndCountAll({
      where: whereClause,
      include: [
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
          attributes: ['id', 'name', 'unit', 'imageUrl', 'category'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string),
      offset: (parseInt(page as string) - 1) * parseInt(limit as string),
    });

    res.status(200).json({
      message: 'Orders retrieved successfully',
      orders: orders.rows,
      pagination: {
        total: orders.count,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(orders.count / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get consumer orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFarmerOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const farmerId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const whereClause: any = { farmerId };
    if (status) {
      whereClause.status = status;
    }

    const orders = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'consumer',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Crop,
          as: 'crop',
          attributes: ['id', 'name', 'unit', 'imageUrl', 'category'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string),
      offset: (parseInt(page as string) - 1) * parseInt(limit as string),
    });

    res.status(200).json({
      message: 'Orders retrieved successfully',
      orders: orders.rows,
      pagination: {
        total: orders.count,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(orders.count / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get farmer orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await Order.findByPk(id, {
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
              attributes: ['farmName', 'phone', 'address', 'city'],
            },
          ],
        },
        {
          model: Crop,
          as: 'crop',
          attributes: ['id', 'name', 'unit', 'imageUrl', 'category', 'description'],
        },
      ],
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Check if user is authorized to view this order
    if (order.consumerId !== userId && order.farmerId !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.status(200).json({
      message: 'Order retrieved successfully',
      order,
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateOrderStatus = async (req: UpdateOrderStatusRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const farmerId = req.user.id;
    const { status, notes } = req.body;

    // Validate status
    if (!Object.values(OrderStatus).includes(status)) {
      res.status(400).json({ message: 'Invalid order status' });
      return;
    }

    const order = await Order.findByPk(id);

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Only farmer can update order status
    if (order.farmerId !== farmerId) {
      res.status(403).json({ message: 'Only the farmer can update order status' });
      return;
    }

    // Validate status transitions
    const validTransitions: { [key in OrderStatus]: OrderStatus[] } = {
      [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED],
      [OrderStatus.ACCEPTED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      [OrderStatus.REJECTED]: [],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      res.status(400).json({ 
        message: `Cannot change status from ${order.status} to ${status}` 
      });
      return;
    }

    // If order is being rejected or cancelled, restore crop quantity
    if ((status === OrderStatus.REJECTED || status === OrderStatus.CANCELLED) && 
        (order.status === OrderStatus.PENDING || order.status === OrderStatus.ACCEPTED)) {
      const crop = await Crop.findByPk(order.cropId);
      if (crop) {
        await crop.update({
          quantity: crop.quantity + order.quantity,
        });
      }
    }

    // Update order
    await order.update({
      status,
      notes: notes || order.notes,
    });

    // Send notification to consumer
    if (status === OrderStatus.ACCEPTED) {
      await notificationService.sendOrderNotification(order, 'order_accepted');
    } else if (status === OrderStatus.REJECTED) {
      await notificationService.sendOrderNotification(order, 'order_rejected');
    } else if (status === OrderStatus.COMPLETED) {
      await notificationService.sendOrderNotification(order, 'order_completed');
    }

    // Get updated order with relations
    const updatedOrder = await Order.findByPk(order.id, {
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
        },
        {
          model: Crop,
          as: 'crop',
          attributes: ['id', 'name', 'unit', 'imageUrl'],
        },
      ],
    });

    res.status(200).json({
      message: 'Order status updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const cancelOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const consumerId = req.user.id;

    const order = await Order.findByPk(id);

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Only consumer can cancel their own order
    if (order.consumerId !== consumerId) {
      res.status(403).json({ message: 'You can only cancel your own orders' });
      return;
    }

    // Can only cancel pending orders
    if (order.status !== OrderStatus.PENDING) {
      res.status(400).json({ 
        message: 'Can only cancel pending orders' 
      });
      return;
    }

    // Restore crop quantity
    const crop = await Crop.findByPk(order.cropId);
    if (crop) {
      await crop.update({
        quantity: crop.quantity + order.quantity,
      });
    }

    // Update order status
    await order.update({
      status: OrderStatus.CANCELLED,
    });

    // Send notification to farmer
    await notificationService.sendOrderNotification(order, 'order_cancelled');

    res.status(200).json({
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};