const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const Event = require('../models/Event');

router.get('/', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'staff') {
    return res.render('error', {
      title: 'Unauthorized',
      message: 'Only staff can access this page',
      status: 403,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }

  try {
    const events = await Event.find({ createdBy: req.session.user._id }).lean();
    res.render('dashboard/staff', {
      title: 'Staff Dashboard',
      events,
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

module.exports = router;