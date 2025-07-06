const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { requireLogin } = require('../middleware/auth');
const Event = require('../models/Event');
const Booking = require('../models/Booking');

/* ------------------------------------------------------------------------
   Detailed Booking Request Route (for custom/detailed bookings, e.g., wedding)
   URL: POST /bookings/request
   (Declared before the dynamic :eventId route to avoid conflict)
------------------------------------------------------------------------ */
router.post('/request', requireLogin, [
  // Legacy Basic Validations
  check('name').notEmpty().withMessage('Name is required'),
  check('email').isEmail().withMessage('A valid Email is required'),
  check('phone').notEmpty().withMessage('Phone is required'),
  // New validation for Location 
  check('location').notEmpty().withMessage('Location is required'),
  // Extended validations for detailed booking:
  check('numberOfPeople')
    .isInt({ min: 1 }).withMessage('Please specify a valid number of people'),
  check('selectedEvents')
    .notEmpty().withMessage('Please select at least one event'),
  check('eventDate')
    .isISO8601().withMessage('Please provide a valid date'),
  check('eventTime')
    .notEmpty().withMessage('Please provide a valid time'),
  check('budget')
    .isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
  check('payAmount')
    .isFloat({ min: 0 }).withMessage('Pay Amount must be a positive number')
], async (req, res) => {
  console.log(`[${new Date().toISOString()}] Detailed booking request initiated`);
  const errors = validationResult(req);
  if (!errors.isEmpty()){
    console.error(`[${new Date().toISOString()}] Detailed booking request validation errors:`, errors.array());
    // Render home page with error messages; you might want to later update this to re-render the modal.
    return res.render('home', {
      title: 'Event Management System',
      errors: errors.array(),
      success: null,
      user: req.session.user,
      events: [] // Optionally, pass upcoming events.
    });
  }
  
  try {
    // Destructure all fields from the form submission, including location
    const {
      eventId,        // Optional; branch-specific bookings might be tied to an event.
      eventName,      // Custom event name if provided.
      name,
      email,
      phone,
      location,       // New location field from the form.
      eventType,      // For example, "Wedding".
      numberOfPeople,
      selectedEvents,
      eventDate,
      eventTime,
      budget,
      payAmount,
      additionalNotes
    } = req.body;
    
    const bookingRequest = new Booking({
      user: req.session.user._id,
      event: eventId || null,
      customEventName: eventName,
      requestName: name,
      requestEmail: email,
      requestPhone: phone,
      location: location, // Save the location data
      eventType,
      numberOfPeople,
      selectedEvents,
      eventDate: new Date(eventDate),
      eventTime,
      budget,
      payAmount,
      additionalNotes,
      isRequest: true
    });
    
    await bookingRequest.save();
    console.log(`[${new Date().toISOString()}] Detailed booking request saved successfully`);
    
    // Instead of rendering home directly, redirect to a dedicated success page.
    return res.redirect(`/bookings/success/${bookingRequest._id}`);
    
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Detailed booking request error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to submit booking request',
      status: 500,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
});

/* ------------------------------------------------------------------------
   Success Route for Detailed Booking Requests
   URL: GET /bookings/success/:bookingId
------------------------------------------------------------------------ */
router.get('/success/:bookingId', requireLogin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('event')
      .lean();
      
    if (!booking) {
      return res.render('error', {
        title: 'Not Found',
        message: 'Booking not found',
        status: 404,
        user: req.session.user,
        errors: [],
        success: null
      });
    }
    
    // Use associated event details if available; otherwise, use custom fields and the booking location.
    const event = booking.event ? booking.event : {
      title: booking.customEventName || 'N/A',
      date: booking.eventDate || new Date(),
      location: booking.location || 'N/A'
    };
    
    res.render('bookings/success', {
      title: 'Booking Confirmed',
      booking,
      event,
      user: req.session.user,
      errors: [],
      success: 'Your booking request has been submitted successfully!',
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Success route error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to load success page',
      status: 500,
      user: req.session.user,
      errors: [],
      success: null
    });
  }
});

/* ------------------------------------------------------------------------
   Ticket Booking Route (for immediate ticket purchases)
   URL: POST /bookings/:eventId
------------------------------------------------------------------------ */
router.post('/:eventId', requireLogin, [
  check('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res) => {
  console.log(`[${new Date().toISOString()}] Ticket booking initiated for eventId: ${req.params.eventId}`);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const event = await Event.findById(req.params.eventId).lean();
    console.log(`[${new Date().toISOString()}] Ticket booking validation errors: `, errors.array());
    return res.render('events/details', {
      title: event ? event.title : 'Event Details',
      event,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: errors.array(),
      success: null,
    });
  }

  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      console.error(`[${new Date().toISOString()}] Event not found for id: ${req.params.eventId}`);
      return res.render('error', {
        title: 'Not Found',
        message: 'Event not found',
        status: 404,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [],
        success: null,
      });
    }

    const { quantity } = req.body;
    if (quantity > event.availableTickets) {
      console.error(`[${new Date().toISOString()}] Insufficient tickets: Requested ${quantity}, Available ${event.availableTickets}`);
      return res.render('events/details', {
        title: event.title,
        event,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [{ msg: 'Not enough tickets available' }],
        success: null,
      });
    }

    // Create new booking for ticket purchase
    const booking = new Booking({
      user: req.session.user._id,
      event: event._id,
      quantity,
      isRequest: false
    });
    await booking.save();
    console.log(`[${new Date().toISOString()}] Ticket booking saved for event ${event._id}`);

    // Update event: decrement available tickets and increment booked tickets
    event.availableTickets -= quantity;
    event.bookedTickets += quantity;
    await event.save();
    console.log(`[${new Date().toISOString()}] Event updated: availableTickets: ${event.availableTickets}, bookedTickets: ${event.bookedTickets}`);

    // Redirect based on user role
    if (req.session.user.role === 'staff') {
      console.log(`[${new Date().toISOString()}] Redirecting staff to dashboard`);
      res.redirect('/dashboard');
    } else {
      console.log(`[${new Date().toISOString()}] Redirecting user to dashboard/user`);
      res.redirect('/dashboard/user');
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Ticket booking error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to create booking',
      status: 500,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
});

module.exports = router;
