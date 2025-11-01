const mongoose = require('mongoose');

const chalanSchema = new mongoose.Schema({
  chalanNumber: {
    type: String,
    required: true,
    unique: true
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  class: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['unpaid', 'paid', 'cancelled'],
    default: 'unpaid'
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  installmentName: {
    type: String
  },
  academicYear: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster lookups
chalanSchema.index({ chalanNumber: 1, schoolId: 1 }, { unique: true });
chalanSchema.index({ studentId: 1, status: 1 });
chalanSchema.index({ schoolId: 1, academicYear: 1 });

// Pre-save hook to update updatedAt
chalanSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Chalan', chalanSchema);
