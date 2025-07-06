const nodemailer = require('nodemailer');
const User = require('../models/User');

async function notifyOrganizer(organizerId, feedback) {
  try {
    // Find the organizer by ID
    const organizer = await User.findById(organizerId).lean();
    if (!organizer) return;

    // Create a transporter using Gmail's SMTP on port 587 (STARTTLS)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,      // Using port 587 for STARTTLS
      secure: false,  // false means we'll use STARTTLS.
      auth: {
        user: process.env.EMAIL_USER, // your email address
        pass: process.env.EMAIL_PASS  // your email password or app password
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates if any; you can remove this for production if not needed.
      }
    });

    // Setup email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: organizer.email, // organizer's email
      subject: `New Feedback Received on Your Event`,
      text: `Hi ${organizer.username},

You have received new feedback on your event:
Rating: ${feedback.rating}
Comment: ${feedback.comment}

Please log in to review further details.

Thank you!`
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${organizer.email} regarding new feedback.`);
  } catch (err) {
    console.error("Email notification error:", err);
  }
}

module.exports = notifyOrganizer;
