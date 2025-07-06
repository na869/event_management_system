const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  handler: (req, res) => {
    res.status(429).render('error', {
      status: 429,
      title: 'Too Many Requests',
      message: 'Too many login attempts. Please try again after 15 minutes.',
      user: req.session.user || null,
      csrfToken: req.csrfToken(),
      nonce: res.locals.nonce,
    });
  },
});

module.exports = { loginLimiter };