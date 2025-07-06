const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { check, validationResult } = require('express-validator');

// Ensure that you have these environment variables defined
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error("ERROR: EMAIL_USER and/or EMAIL_PASS are not defined in your environment.");
}
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,  // Switch to 587
  secure: false, // false for STARTTLS
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  }
});

// GET /contact - Render the Contact Form
router.get('/', (req, res) => {
  res.render('contact', {
    title: 'Contact Us',
    user: req.session.user,
    csrfToken: req.csrfToken(),
    errors: [],
    success: null
  });
});

// POST /contact - Process the Contact Form
router.post('/', [
  check('name').notEmpty().withMessage('Name is required'),
  check('email').isEmail().withMessage('A valid email is required'),
  check('message').notEmpty().withMessage('Please write a message.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('contact', {
      title: 'Contact Us',
      user: req.session.user,
      csrfToken: req.csrfToken(),
      errors: errors.array(),
      success: null
    });
  }
  
  try {
    const { name, email, message } = req.body;
    const mailOptions = {
      from: EMAIL_USER,
      to: EMAIL_USER, // you can change it to your support or recipient address
      subject: `New Contact Form Submission from ${name}`,
      text: `You have a new message from ${name} (${email}):\n\n${message}`
    };
    
    await transporter.sendMail(mailOptions);
    res.render('contact', {
      title: 'Contact Us',
      user: req.session.user,
      csrfToken: req.csrfToken(),
      errors: [],
      success: 'Your message has been sent successfully!'
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Contact error:`, err);
    res.render('contact', {
      title: 'Contact Us',
      user: req.session.user,
      csrfToken: req.csrfToken(),
      errors: [{ msg: 'There was an error sending your message. Please try again later.' }],
      success: null
    });
  }
});

module.exports = router;
