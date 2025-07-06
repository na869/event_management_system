const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { requireLogin } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Event = require('../models/Event');

router.get('/:bookingId', requireLogin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('event')
      .populate('user')
      .lean();

    if (!booking || booking.user._id.toString() !== req.session.user._id.toString()) {
      return res.render('error', {
        title: 'Not Found',
        message: 'Booking not found or unauthorized',
        status: 404,
        user: req.session.user,
        csrfToken: req.csrfToken(),
        nonce: res.locals.nonce,
        errors: [],
        success: null,
      });
    }

    // Create PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificate-${booking._id}.pdf`);

    doc.pipe(res);

    // PDF content
    doc.fontSize(25).text('Certificate of Participation', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`This certifies that ${booking.user.name}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`has successfully participated in`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(booking.event.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Date: ${new Date(booking.event.date).toLocaleDateString()}`, { align: 'center' });
    doc.text(`Location: ${booking.event.location}`, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Certificate error:`, err);
    res.render('error', {
      title: 'Server Error',
      message: 'Failed to generate certificate',
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