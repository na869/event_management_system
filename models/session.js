const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  speaker: {
    type: String,
    required: true,
    trim: true,
  },
  startTime: {
    type: Date,
    required: true,
    index: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

// Validate endTime > startTime
sessionSchema.pre('save', function (next) {
  if (this.endTime <= this.startTime) {
    return next(new Error('End time must be after start time'));
  }
  next();
});

module.exports = mongoose.model('Session', sessionSchema);