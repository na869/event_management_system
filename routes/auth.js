const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');

// GET /login - Render login form (without role selection)
router.get('/login', (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    user: req.session.user,
    csrfToken: req.csrfToken(),
    nonce: res.locals.nonce,
    errors: [],
    success: null,
    oldInput: {},
  });
});

// POST /login - Authenticate user using email and password only
router.post('/login', [
  check('email').isEmail().withMessage('Invalid email format'),
  check('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(`[${new Date().toISOString()}] Login validation errors:`, errors.array());
    return res.render('auth/login', {
      title: 'Login',
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: errors.array().map(e => ({ path: e.param, msg: e.msg })),
      success: null,
      oldInput: req.body,
    });
  }

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).lean();
    if (!user) {
      console.log(`[${new Date().toISOString()}] Login failed: User not found for email ${email}`);
      return res.render('auth/login', {
        title: 'Login',
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [{ path: 'email', msg: 'No account found with this email. Please register.' }],
        success: null,
        oldInput: req.body,
      });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log(`[${new Date().toISOString()}] Login failed: Invalid password for ${email}`);
      return res.render('auth/login', {
        title: 'Login',
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [{ path: 'email', msg: 'Incorrect password.' }],
        success: null,
        oldInput: req.body,
      });
    }
    // Set session using the correct field name "username"
    req.session.user = { _id: user._id, username: user.username, email: user.email, role: user.role };
    console.log(`[${new Date().toISOString()}] Login success for ${email}`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Login error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to login',
      status: 500,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [],
      success: null,
    });
  }
});

// GET /register - Render registration form (with role selection)
router.get('/register', (req, res) => {
  res.render('auth/register', {
    title: 'Register',
    user: req.session.user,
    csrfToken: req.csrfToken(),
    nonce: res.locals.nonce,
    errors: [],
    success: null,
    oldInput: {},
  });
});

// POST /register - Register a new user
router.post('/register', [
  check('username').notEmpty().withMessage('Username is required'),
  check('email').isEmail().withMessage('Invalid email format'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  check('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  check('role').isIn(['user', 'staff']).withMessage('Invalid role'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(`[${new Date().toISOString()}] Register validation errors:`, errors.array());
    return res.render('auth/register', {
      title: 'Register',
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: errors.array().map(e => ({ path: e.param, msg: e.msg })),
      success: null,
      oldInput: req.body,
    });
  }

  try {
    const { username, email, password, role } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      console.log(`[${new Date().toISOString()}] Register failed: Email ${email} already registered`);
      return res.render('auth/register', {
        title: 'Register',
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [{ path: 'email', msg: 'Email already registered. Please login.' }],
        success: null,
        oldInput: req.body,
      });
    }
    // Check for duplicate username (using the field "username")
    user = await User.findOne({ username });
    if (user) {
      console.log(`[${new Date().toISOString()}] Register failed: Username ${username} already taken`);
      return res.render('auth/register', {
        title: 'Register',
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [{ path: 'username', msg: 'Username already taken.' }],
        success: null,
        oldInput: req.body,
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ username, email, password: hashedPassword, role });
    await user.save();
    req.session.user = { _id: user._id, username: user.username, email: user.email, role: user.role };
    req.session.success = 'Registration successful!';
    console.log(`[${new Date().toISOString()}] Register success for ${email}, role: ${role}`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Register error:`, err);
    res.render('auth/register', {
      title: 'Register',
      user: req.session.user,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
      errors: [{ path: 'email', msg: 'Registration failed. Please try again.' }],
      success: null,
      oldInput: req.body,
    });
  }
});

// GET /forgot-password - Render forgot password form
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password',
    user: req.session.user,
    csrfToken: req.csrfToken(),
    nonce: res.locals.nonce,
    errors: [],
    success: null,
    oldInput: {},
  });
});

// POST /forgot-password - Stub for forgot password functionality
router.post('/forgot-password', [
  check('email').isEmail().withMessage('Invalid email'),
], async (req, res) => {
  // Stub: Implement password reset logic
  res.render('auth/forgot-password', {
    title: 'Forgot Password',
    user: req.session.user,
    csrfToken: req.csrfToken(),
    nonce: res.locals.nonce,
    errors: [{ path: 'email', msg: 'Password reset not implemented' }],
    success: null,
    oldInput: req.body,
  });
});

// GET /reset-password/:token - Render reset password form
router.get('/reset-password/:token', (req, res) => {
  res.render('auth/reset-password', {
    title: 'Reset Password',
    user: req.session.user,
    csrfToken: req.csrfToken(),
    nonce: res.locals.nonce,
    errors: [],
    success: null,
    oldInput: {},
    token: req.params.token,
  });
});

// POST /reset-password/:token - Stub for reset password functionality
router.post('/reset-password/:token', [
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  check('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
], async (req, res) => {
  // Stub: Implement password reset logic
  res.render('auth/reset-password', {
    title: 'Reset Password',
    user: req.session.user,
    csrfToken: req.csrfToken(),
    nonce: res.locals.nonce,
    errors: [{ path: 'password', msg: 'Password reset not implemented' }],
    success: null,
    oldInput: req.body,
    token: req.params.token,
  });
});

// GET /logout - Log out and destroy the session
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
