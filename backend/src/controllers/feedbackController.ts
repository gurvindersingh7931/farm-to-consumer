import { Request, Response, RequestHandler } from 'express';
import { Op } from 'sequelize';
import { Feedback, User } from '../models';

interface AuthRequest extends Request { user?: any }

// User: submit feedback
export const submitFeedback: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { type, subject, message, priority } = req.body;

    if (!subject || !message) {
      res.status(400).json({ message: 'Subject and message are required' });
      return;
    }

    const feedback = await Feedback.create({
      userId,
      type: type || 'other',
      subject,
      message,
      priority: priority || 'medium'
    });

    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// User: list own feedback
export const getMyFeedback: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const items = await Feedback.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
    res.json({ message: 'Feedback retrieved', feedback: items });
  } catch (error) {
    console.error('Get my feedback error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: list/filter feedback
export const listFeedback: RequestHandler = async (req, res) => {
  try {
    const { status, type, priority, q, page = 1, limit = 20 } = req.query as any;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (q) where[Op.or] = [
      { subject: { [Op.iLike]: `%${q}%` } },
      { message: { [Op.iLike]: `%${q}%` } }
    ];

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Feedback.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      message: 'Feedback list retrieved',
      feedback: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('List feedback error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: update status/notes
export const updateFeedback: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, priority } = req.body;

    const feedback = await Feedback.findByPk(id);
    if (!feedback) {
      res.status(404).json({ message: 'Feedback not found' });
      return;
    }

    await feedback.update({
      status: status || feedback.status,
      adminNotes: adminNotes !== undefined ? adminNotes : feedback.adminNotes,
      priority: priority || feedback.priority,
      resolvedAt: status === 'resolved' ? new Date() : feedback.resolvedAt
    } as any);

    res.json({ message: 'Feedback updated', feedback });
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


