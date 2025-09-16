const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50,
    match: [/^[a-zA-Z0-9-_]+$/, 'Project name can only contain letters, numbers, hyphens, and underscores']
  },
  domain: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})?(:[0-9]{1,5})?$/, 'Please enter a valid domain']
  },
  repository: {
    type: String,
    required: true,
    trim: true,
    match: [/^https?:\/\/[^\s]+\.git$/, 'Please enter a valid Git repository URL']
  },
  branch: {
    type: String,
    default: 'main',
    trim: true,
    maxlength: 100
  },
  buildCommand: {
    type: String,
    trim: true,
    maxlength: 500
  },
  startCommand: {
    type: String,
    trim: true,
    maxlength: 500
  },
  port: {
    type: Number,
    required: true,
    min: 1,
    max: 65535
  },
  autoPort: {
    type: Boolean,
    default: false
  },
  assignedPort: {
    type: Number,
    min: 1,
    max: 65535,
    default: null
  },
  environment: {
    type: Map,
    of: String,
    default: {}
  },
  status: {
    type: String,
    enum: ['running', 'stopped', 'deploying', 'error', 'building'],
    default: 'stopped'
  },
  containerId: {
    type: String,
    default: null
  },
  projectPath: {
    type: String,
    default: null
  },
  lastDeployed: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  // Project metadata and health tracking
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  healthStatus: {
    type: String,
    enum: ['healthy', 'unhealthy', 'unknown', 'checking'],
    default: 'unknown'
  },
  lastHealthCheck: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Virtual field for effective port (assignedPort or port)
projectSchema.virtual('effectivePort').get(function() {
  return this.assignedPort || this.port;
});

// Indexes for better performance
projectSchema.index({ name: 1 });
projectSchema.index({ domain: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ port: 1 });
projectSchema.index({ assignedPort: 1 });

// Update updatedAt field
projectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to update status
projectSchema.methods.updateStatus = function(status) {
  this.status = status;
  if (status === 'running') {
    this.lastDeployed = new Date();
  }
  return this.save();
};

// Instance method to set container info
projectSchema.methods.setContainerInfo = function(containerId, projectPath) {
  this.containerId = containerId;
  this.projectPath = projectPath;
  return this.save();
};

// Static method to find projects by user
projectSchema.statics.findByUser = function(userId) {
  return this.find({ createdBy: userId }).sort({ createdAt: -1 });
};

// Static method to find project by domain
projectSchema.statics.findByDomain = function(domain) {
  return this.findOne({ domain: domain.toLowerCase() });
};

// Static method to get project statistics
projectSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Project', projectSchema);