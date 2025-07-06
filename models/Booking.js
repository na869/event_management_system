const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // May be null for custom requests.
  quantity: { type: Number, default: 0 }, // Used for actual ticket bookings.
  
  // Legacy booking request fields
  requestName: { type: String },
  requestEmail: { type: String },
  requestPhone: { type: String },
  customEventName: { type: String }, // If no event is selected from DB.
  
  // New fields for detailed booking requests (e.g., wedding bookings)
  eventType: { type: String },          // E.g., "Wedding", "Birthday", etc.
  numberOfPeople: { type: Number },
  selectedEvents: { type: String },      // E.g., dropdown value like "Ceremony", "Reception", etc.
  eventDate: { type: Date },
  eventTime: { type: String },           // e.g., "18:00" (could also be Date if you wish to combine date/time)
  budget: { type: Number },
  payAmount: { type: Number },           // Dummy payment amount field
  additionalNotes: { type: String },
  
  isRequest: { type: Boolean, default: false } // true for booking requests (detailed forms)  
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
