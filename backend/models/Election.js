const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: String,
  party: String,
});

const electionSchema = new mongoose.Schema({
  name: String,
  startDate: Date,
  endDate: Date,
  candidates: [candidateSchema], // Store an array of candidates
});

const Election = mongoose.model('Election', electionSchema);

module.exports = Election;
