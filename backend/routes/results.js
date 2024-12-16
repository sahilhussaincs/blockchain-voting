const express = require('express');
const router = express.Router();
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');

// GET results for a selected election
router.get('/:electionId', async (req, res) => {
  const { electionId } = req.params;

  try {
    // Find the election by ID
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Fetch candidates for the selected election
    const candidates = await Candidate.find({ votingId: electionId });

    // Fetch vote count for each candidate
    const results = await Promise.all(
      candidates.map(async (candidate) => {
        const voteCount = await Vote.countDocuments({ candidate: candidate._id });
        return {
          candidate: candidate.name,
          party: candidate.party,
          voteCount,
        };
      })
    );

    // Sort the results by vote count in descending order
    results.sort((a, b) => b.voteCount - a.voteCount);

    // Get the leading candidate (the one with the most votes)
    const leadingCandidate = results.length > 0 ? results[0] : null;

    res.json({ election, results, leadingCandidate });
  } catch (err) {
    console.error('Error fetching results:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
