const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  party: { type: String, required: true },
  votingId: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
});

const Candidate = mongoose.model("Candidate", candidateSchema);

module.exports = Candidate;
