const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  totalTickets: { type: Number, required: true, min: 1 },
  availableTickets: { type: Number, required: true, min: 0 },
  bookedTickets: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Removed status field – now every event is visible.
  // Updated attendees field: Defined as an array of ObjectIDs with no uniqueness constraint.
  attendees: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  sessions: [{
    title: { type: String, required: true },
    speaker: { type: String, default: '' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    description: { type: String, default: '' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
