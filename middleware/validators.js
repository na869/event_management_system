const { body, param } = require('express-validator');
const Event = require('../models/Event');

const validateEvent = [
  body('_csrf').notEmpty().withMessage('CSRF token missing'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title must be under 100 characters')
    .escape(),
  body('description').trim().notEmpty().withMessage('Description is required').escape(),
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Event date must be in the future');
      }
      return true;
    }),
  body('location').trim().notEmpty().withMessage('Location is required').escape(),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('totalTickets')
    .notEmpty()
    .withMessage('Total tickets required')
    .isInt({ min: 1 })
    .withMessage('Total tickets must be a positive integer'),
];

const validateBooking = [
  body('_csrf').notEmpty().withMessage('CSRF token missing'),
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Please select at least one ticket')
    .custom(async (value, { req }) => {
      const event = await Event.findById(req.params.eventId);
      if (!event || value > event.availableTickets) {
        throw new Error('Requested quantity exceeds available tickets');
      }
      return true;
    }),
];

const validateFeedback = [
  body('_csrf').notEmpty().withMessage('CSRF token missing'),
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment').trim().escape().optional(),
];

const validateSession = [
  body('_csrf').notEmpty().withMessage('CSRF token missing'),
  body('title').trim().notEmpty().withMessage('Title is required').escape(),
  body('speaker').trim().notEmpty().withMessage('Speaker is required').escape(),
  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('Invalid start time'),
  body('endTime')
    .notEmpty()
    .withMessage('End time is required')
    .isISO8601()
    .withMessage('Invalid end time')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('description').trim().escape().optional(),
];

const validateContact = [
  body('_csrf').notEmpty().withMessage('CSRF token missing'),
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  body('email').trim().isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('message').trim().notEmpty().withMessage('Message is required').escape(),
];

const validateObjectId = param('*').isMongoId().withMessage('Invalid ID format');

module.exports = {
  validateEvent,
  validateBooking,
  validateFeedback,
  validateSession,
  validateContact,
  validateObjectId,
};