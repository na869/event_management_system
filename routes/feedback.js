const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, (req, res) => {
  res.render('feedback/form', {
    title: 'Submit Feedback',
    user: req.session.user,
    csrfToken: req.csrfToken(),
    nonce: res.locals.nonce,
    errors: [],
    success: null,
  });
});

module.exports = router;