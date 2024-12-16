const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true,
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
  },
  userSecretKey: {  // Store the secret key to track votes
    type: String,
    required: true,
  },
}, { timestamps: true });

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;
