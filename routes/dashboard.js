const express = require('express');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const { requireLogin } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'staff') {
    return res.render('error', {
      title: 'Unauthorized',
      message: 'Only staff can access this page.',
      status: 403,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }

  try {
    // Fetch events created by the logged-in staff user.
    const events = await Event.find({ createdBy: req.session.user._id }).lean();
    const eventIds = events.map(event => event._id);
    console.log(`[${new Date().toISOString()}] Staff Events found: ${events.length}`);

    // Fetch regular ticket bookings for those events.
    const regularBookings = await Booking.find({
      event: { $in: eventIds },
      isRequest: false
    })
      .populate('user')
      .populate('event')
      .sort({ createdAt: -1 })
      .lean();
    console.log(`[${new Date().toISOString()}] Regular ticket bookings found: ${regularBookings.length}`);

    // Fetch new detailed booking requests (custom projects).
    // Include those tied to one of the staff’s events OR those with event null (custom requests).
    const newRequests = await Booking.find({
      isRequest: true,
      $or: [
        { event: { $in: eventIds } },
        { event: null }
      ]
    })
      .populate('user')
      .populate('event')
      .sort({ createdAt: -1 })
      .lean();
    console.log(`[${new Date().toISOString()}] Detailed booking requests found: ${newRequests.length}`);

    res.render('dashboard/staff', {
      title: 'Staff Dashboard',
      events,
      regularBookings,
      newRequests,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Staff dashboard error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to load staff dashboard',
      status: 500,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
});

/* =========================================================================
   USER DASHBOARD
   ========================================================================= */
router.get('/user', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'user') {
    return res.render('error', {
      title: 'Unauthorized',
      message: 'Only regular users can access this page.',
      status: 403,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
  
  try {
    const bookings = await Booking.find({ user: req.session.user._id })
      .populate('event')
      .sort({ createdAt: -1 })
      .lean();
    console.log(`[${new Date().toISOString()}] User bookings found: ${bookings.length}`);
    
    res.render('dashboard/user', {
      title: 'User Dashboard',
      bookings,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] User dashboard error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to load user dashboard',
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
