const express = require('express');
const { check, validationResult } = require('express-validator');
const { requireLogin } = require('../middleware/auth');
const Event = require('../models/Event');

const router = express.Router();

/* =========================================================================
   EVENTS LISTING & STATIC ROUTES
   ========================================================================= */

// GET / - list all events (without filtering by status)
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({}).sort({ date: 1 }).lean();
    res.render('events/index', {
      title: 'Events',
      events,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
      query: typeof req.query.q !== 'undefined' ? req.query.q : ''
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Events error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to load events',
      status: 500,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
});

// GET /create - render create event form (staff only)
router.get('/create', requireLogin, (req, res) => {
  if (req.session.user.role !== 'staff') {
    return res.render('error', {
      title: 'Unauthorized',
      message: 'Only staff can create events',
      status: 403,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
  res.render('events/create', {
    title: 'Create Event',
    user: req.session.user,
    csrfToken: req.csrfToken(),
    nonce: res.locals.nonce,
    errors: [],
    success: null,
    oldInput: {},
  });
});

// POST /create - create a new event (staff only)
router.post('/create', requireLogin, [
  check('title').notEmpty().withMessage('Title is required'),
  check('description').notEmpty().withMessage('Description is required'),
  check('date').isISO8601().withMessage('Invalid date'),
  check('location').notEmpty().withMessage('Location is required'),
  check('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  check('totalTickets').isInt({ min: 1 }).withMessage('Total tickets must be at least 1'),
], async (req, res) => {
  if (req.session.user.role !== 'staff') {
    return res.render('error', {
      title: 'Unauthorized',
      message: 'Only staff can create events',
      status: 403,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('events/create', {
      title: 'Create Event',
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: errors.array().map(e => ({ path: e.param, msg: e.msg })),
      success: null,
      oldInput: req.body,
    });
  }
  try {
    const { title, description, date, location, price, totalTickets } = req.body;
    const event = new Event({
      title,
      description,
      date,
      location,
      price,
      totalTickets,
      availableTickets: totalTickets,
      createdBy: req.session.user._id,
      // Note: status is removed or ignored
    });
    await event.save();
    res.redirect('/dashboard');
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Create event error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to create event',
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
   DYNAMIC ROUTES
   ========================================================================= */

// GET /:id - Event details (no status check)
router.get('/:id', async (req, res) => {
  // Prevent conflict if "create" is passed as an id.
  if (req.params.id === 'create') {
    return res.redirect('/events/create');
  }
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) {
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
    res.render('events/details', {
      title: event.title,
      event,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Event details error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to load event details',
      status: 500,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
});

// GET /:id/edit - render event edit form (only by creator)
router.get('/:id/edit', requireLogin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) {
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
    if (req.session.user.role !== 'staff' ||
        event.createdBy.toString() !== req.session.user._id.toString()) {
      return res.render('error', {
        title: 'Unauthorized',
        message: 'You are not authorized to edit this event',
        status: 403,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [],
        success: null,
      });
    }
    res.render('events/edit', {
      title: 'Edit Event',
      event,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
      oldInput: event
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Edit event form error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to load edit form',
      status: 500,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
});

// POST /:id/edit - update an event (only by creator)
router.post('/:id/edit', requireLogin, [
  check('title').notEmpty().withMessage('Title is required'),
  check('description').notEmpty().withMessage('Description is required'),
  check('date').isISO8601().withMessage('Invalid date'),
  check('location').notEmpty().withMessage('Location is required'),
  check('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  check('totalTickets').isInt({ min: 1 }).withMessage('Total tickets must be at least 1'),
], async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
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
    if (req.session.user.role !== 'staff' ||
        event.createdBy.toString() !== req.session.user._id.toString()) {
      return res.render('error', {
        title: 'Unauthorized',
        message: 'You are not authorized to edit this event',
        status: 403,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [],
        success: null,
      });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('events/edit', {
        title: 'Edit Event',
        event,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: errors.array().map(e => ({ path: e.param, msg: e.msg })),
        success: null,
        oldInput: req.body,
      });
    }
    // Update event fields
    event.title = req.body.title;
    event.description = req.body.description;
    event.date = req.body.date;
    event.location = req.body.location;
    event.price = req.body.price;
    event.totalTickets = req.body.totalTickets;
    event.availableTickets = req.body.totalTickets; // Optionally update availableTickets
    await event.save();
    res.redirect('/dashboard');
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Edit event error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to update event',
      status: 500,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
});

// POST /:id/delete - delete an event (only by creator)
router.post('/:id/delete', requireLogin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
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
    if (req.session.user.role !== 'staff' ||
        event.createdBy.toString() !== req.session.user._id.toString()) {
      return res.render('error', {
        title: 'Unauthorized',
        message: 'You are not authorized to delete this event',
        status: 403,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [],
        success: null,
      });
    }
    await  event.deleteOne();
    res.redirect('/dashboard');
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Delete event error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to delete event',
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
   EVENT SESSIONS MANAGEMENT
   ========================================================================= */

// GET /:id/sessions - list sessions for a specific event
router.get('/:id/sessions', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) {
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
    res.render('sessions/list', {
      title: `${event.title} - Sessions`,
      event,
      sessions: event.sessions || [],
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Sessions listing error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to load sessions',
      status: 500,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
});

// GET /:id/sessions/create - render create session form (only by creator)
router.get('/:id/sessions/create', requireLogin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) {
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
    if (req.session.user.role !== 'staff' ||
        event.createdBy.toString() !== req.session.user._id.toString()) {
      return res.render('error', {
        title: 'Unauthorized',
        message: 'You cannot add sessions to this event',
        status: 403,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [],
        success: null,
      });
    }
    res.render('sessions/create', {
      title: 'Create Session',
      event,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
      oldInput: {},
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Render create session error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to load session creation form',
      status: 500,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
});

// POST /:id/sessions/create - create a new session
router.post('/:id/sessions/create', requireLogin, [
  check('title').notEmpty().withMessage('Session title is required'),
  check('startTime').isISO8601().withMessage('Invalid start time'),
  check('endTime').isISO8601().withMessage('Invalid end time'),
], async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
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
    if (req.session.user.role !== 'staff' ||
        event.createdBy.toString() !== req.session.user._id.toString()) {
      return res.render('error', {
        title: 'Unauthorized',
        message: 'You cannot add sessions to this event',
        status: 403,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [],
        success: null,
      });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('sessions/create', {
        title: 'Create Session',
        event: event.toObject(),
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: errors.array().map(e => ({ path: e.param, msg: e.msg })),
        success: null,
        oldInput: req.body,
      });
    }
    if (new Date(req.body.startTime) >= new Date(req.body.endTime)) {
      return res.render('sessions/create', {
        title: 'Create Session',
        event: event.toObject(),
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [{ path: 'endTime', msg: 'End time must be after start time' }],
        success: null,
        oldInput: req.body,
      });
    }
    event.sessions.push({
      title: req.body.title,
      speaker: req.body.speaker || '',
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      description: req.body.description || '',
    });
    await event.save();
    res.redirect(`/events/${event._id}/sessions`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Create session error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to create session',
      status: 500,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
});

// GET /:id/sessions/edit/:sessionId - render edit session form
router.get('/:id/sessions/edit/:sessionId', requireLogin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
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
    if (req.session.user.role !== 'staff' ||
        event.createdBy.toString() !== req.session.user._id.toString()) {
      return res.render('error', {
        title: 'Unauthorized',
        message: 'You cannot edit sessions for this event',
        status: 403,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [],
        success: null,
      });
    }
    const sessionToEdit = event.sessions.id(req.params.sessionId);
    if (!sessionToEdit) {
      return res.render('error', {
        title: 'Not Found',
        message: 'Session not found',
        status: 404,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [],
        success: null,
      });
    }
    res.render('sessions/edit', {
      title: 'Edit Session',
      event: event.toObject(),
      session: sessionToEdit,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
      oldInput: sessionToEdit,
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Edit session form error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to load session edit form',
      status: 500,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
});

// POST /:id/sessions/edit/:sessionId - update a session
router.post('/:id/sessions/edit/:sessionId', requireLogin, [
  check('title').notEmpty().withMessage('Session title is required'),
  check('startTime').isISO8601().withMessage('Invalid start time'),
  check('endTime').isISO8601().withMessage('Invalid end time'),
], async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
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
    if (req.session.user.role !== 'staff' ||
        event.createdBy.toString() !== req.session.user._id.toString()) {
      return res.render('error', {
        title: 'Unauthorized',
        message: 'You are not authorized to edit sessions for this event',
        status: 403,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [],
        success: null,
      });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('sessions/edit', {
        title: 'Edit Session',
        event: event.toObject(),
        session: event.sessions.id(req.params.sessionId),
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: errors.array().map(e => ({ path: e.param, msg: e.msg })),
        success: null,
        oldInput: req.body,
      });
    }
    if (new Date(req.body.startTime) >= new Date(req.body.endTime)) {
      return res.render('sessions/edit', {
        title: 'Edit Session',
        event: event.toObject(),
        session: event.sessions.id(req.params.sessionId),
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [{ path: 'endTime', msg: 'End time must be after start time' }],
        success: null,
        oldInput: req.body,
      });
    }
    const sessionToEdit = event.sessions.id(req.params.sessionId);
    if (!sessionToEdit) {
      return res.render('error', {
        title: 'Not Found',
        message: 'Session not found',
        status: 404,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [],
        success: null,
      });
    }
    // Update session fields
    sessionToEdit.title = req.body.title;
    sessionToEdit.speaker = req.body.speaker || '';
    sessionToEdit.startTime = req.body.startTime;
    sessionToEdit.endTime = req.body.endTime;
    sessionToEdit.description = req.body.description || '';
    await event.save();
    res.redirect(`/events/${event._id}/sessions`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Edit session error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to edit session',
      status: 500,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
});

// POST /:id/sessions/delete/:sessionId - delete a session
router.post('/:id/sessions/delete/:sessionId', requireLogin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
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
    if (req.session.user.role !== 'staff' ||
        event.createdBy.toString() !== req.session.user._id.toString()) {
      return res.render('error', {
        title: 'Unauthorized',
        message: 'You are not authorized to delete sessions for this event',
        status: 403,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [],
        success: null,
      });
    }
    event.sessions.id(req.params.sessionId).remove();
    await event.save();
    res.redirect(`/events/${event._id}/sessions`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Delete session error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to delete session',
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
