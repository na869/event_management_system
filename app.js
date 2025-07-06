// Load environment variables first
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const csrf = require('csurf');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Stripe = require('stripe');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

// Routes
const dashboardRoutes = require('./routes/dashboard');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');
const feedbackRoutes = require('./routes/feedback');
const sessionRoutes = require('./routes/sessions');
const certificateRoutes = require('./routes/certificate');
const reportRoutes = require('./routes/reports');
const contactRoutes = require('./routes/contact');
const authRoutes = require('./routes/auth');
const staffRoutes = require('./routes/staff');
const { requireLogin } = require('./middleware/auth');

// Models
const Event = require('./models/Event');
const Booking = require('./models/Booking');

const app = express();

// Configuration
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/event_management';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your_session_secret';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
console.log('✅ View engine setup completed');

// Middleware
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: { maxAge: 86400000 } // 24 hours
}));
app.use(csrf());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
}));

// Global view variables (including flash messages)
app.use((req, res, next) => {
  res.locals.nonce = uuidv4();
  res.locals.csrfToken = req.csrfToken();
  res.locals.stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
  res.locals.stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  res.locals.transporter = transporter;
  res.locals.user = req.session.user || null;
  // Pass flash message if available.
  res.locals.success = req.session.success || null;
  delete req.session.success;
  next();
});

// Routes
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/', async (req, res) => {
  try {
    const events = await Event.find({ status: 'approved' }).sort({ date: 1 }).limit(6).lean();
    res.render('home', {
      title: 'Event Management System',
      events,
      user: req.session.user,
      errors: [],
      success: null
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Home page error:`, err);
    res.render('error', {
      title: 'Error',
      message: 'Failed to load homepage',
      status: 500,
      user: req.session.user,
      errors: [],
      success: null
    });
  }
});

app.get('/dashboard', requireLogin, async (req, res) => {
  try {
    if (req.session.user.role === 'staff') {
      const events = await Event.find({ createdBy: req.session.user._id }).lean();
      res.render('dashboard/staff', {
        title: 'Staff Dashboard',
        events,
        user: req.session.user,
        errors: [],
        success: null
      });
    } else {
      const bookings = await Booking.find({ user: req.session.user._id }).populate('event').lean();
      res.render('dashboard/user', {
        title: 'User Dashboard',
        bookings,
        user: req.session.user,
        errors: [],
        success: null
      });
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Dashboard error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to load dashboard',
      status: 500,
      user: req.session.user,
      errors: [],
      success: null
    });
  }
});

// Register Routes
app.use('/events', eventRoutes);
app.use('/bookings', bookingRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/sessions', sessionRoutes);
app.use('/certificate', certificateRoutes);
app.use('/reports', reportRoutes);
app.use('/contact', contactRoutes);
app.use('/auth', authRoutes);
app.use('/staff', staffRoutes);
app.use('/dashboard', dashboardRoutes);

// 404 Page
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'Page not found',
    status: 404,
    user: req.session.user,
    errors: [],
    success: null
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  res.status(500).render('error', {
    title: 'Server Error',
    message: 'Something went wrong',
    status: 500,
    user: req.session.user,
    errors: [],
    success: null
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err);
  process.exit(1);
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
