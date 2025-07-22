const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProjectSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  collaborators: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  canvasData: {
    type: String, // Storing canvas data as JSON string or base64
    default: '',
  },
}, {
  timestamps: true,
});

const Project = mongoose.model('Project', ProjectSchema);

module.exports = Project; 