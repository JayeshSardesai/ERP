const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipients: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: Date,
    deletedAt: Date
  }],
  sentTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of student IDs
  readBy: { type: Map, of: Date, default: new Map() }, // Map of studentId -> read timestamp
  
  // Message content
  subject: { type: String, required: true },
  content: { type: String, required: true },
  messageType: { 
    type: String, 
    enum: ['general', 'announcement', 'assignment', 'result', 'attendance', 'urgent'], 
    default: 'general' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'], 
    default: 'normal' 
  },
  
  // Message settings
  isAnnouncement: { type: Boolean, default: false },
  isUrgent: { type: Boolean, default: false },
  requiresConfirmation: { type: Boolean, default: false },
  expiresAt: Date,
  
  // Attachments
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Message status
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'delivered', 'read', 'archived'], 
    default: 'draft' 
  },
  sentAt: Date,
  deliveredAt: Date,
  
  // Message categories and tags
  category: String, // Academic, Administrative, Sports, Events
  tags: [String],
  
  // Target information
  target: {
    class: { type: String, required: true }, // e.g., "10", "ALL"
    section: { type: String, default: 'ALL' } // e.g., "A", "ALL"
  },
  
  // Message tracking
  readCount: { type: Number, default: 0 },
  totalRecipients: { type: Number, default: 0 },
  
  // Created and updated by
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for read percentage
messageSchema.virtual('readPercentage').get(function() {
  if (this.totalRecipients === 0) return 0;
  return Math.round((this.readCount / this.totalRecipients) * 100);
});

// Virtual for message age
messageSchema.virtual('messageAge').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
});

// Virtual for urgency indicator
messageSchema.virtual('urgencyIndicator').get(function() {
  if (this.isUrgent || this.priority === 'urgent') return 'urgent';
  if (this.priority === 'high') return 'high';
  if (this.priority === 'normal') return 'normal';
  return 'low';
});

// Index for better query performance
messageSchema.index({ schoolId: 1, status: 1 });
messageSchema.index({ createdBy: 1 });
messageSchema.index({ 'recipients.user': 1 });
messageSchema.index({ sentTo: 1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ priority: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ 'target.class': 1, 'target.section': 1 });
messageSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
