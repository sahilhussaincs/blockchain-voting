const express = require('express');
const router = express.Router();
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const User = require('../models/User');  // Add the User model

// GET all elections with their candidates
router.get('/elections', async (req, res) => {
  try {
    const elections = await Election.find();

    const electionsWithCandidates = await Promise.all(
      elections.map(async (election) => {
        const candidates = await Candidate.find({ votingId: election._id });
        return {
          ...election.toObject(),
          candidates,
        };
      })
    );

    res.json(electionsWithCandidates);
  } catch (err) {
    console.error('Error fetching elections:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST to check if user has already voted
router.post('/check', async (req, res) => {
  const { electionId, secretKey } = req.body;

  if (!electionId || !secretKey) {
    return res.status(400).json({ message: 'Election ID and secret key are required' });
  }

  try {
    // Find user by secret key
    const user = await User.findOne({ secretKey });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user has already voted in this election
    const vote = await Vote.findOne({ election: electionId, userSecretKey: secretKey });

    if (vote) {
      return res.json({ voted: true });
    }

    res.json({ voted: false });
  } catch (err) {
    console.error('Error checking vote status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST to submit a vote
router.post('/', async (req, res) => {
  const { electionId, candidateId, secretKey } = req.body;

  if (!electionId || !candidateId || !secretKey) {
    return res.status(400).json({ message: 'Election, candidate, and secret key are required' });
  }

  try {
    // Find user by secret key
    const user = await User.findOne({ secretKey });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user has already voted in this election
    const existingVote = await Vote.findOne({ election: electionId, userSecretKey: secretKey });

    if (existingVote) {
      return res.status(400).json({ message: 'You have already voted in this election' });
    }

    // Find the election and candidate
    const election = await Election.findById(electionId);
    const candidate = await Candidate.findById(candidateId);

    if (!election || !candidate) {
      return res.status(404).json({ message: 'Election or candidate not found' });
    }

    // Create a new vote
    const newVote = new Vote({
      election: electionId,
      candidate: candidateId,
      userSecretKey: secretKey,  // Store the user's secret key to prevent multiple votes
    });

    // Save the vote
    await newVote.save();

    // Optionally, update vote count for the candidate (if you're storing vote count)
    candidate.voteCount = (candidate.voteCount || 0) + 1;
    await candidate.save();

    res.status(201).json({ message: 'Vote submitted successfully' });
  } catch (err) {
    console.error('Error submitting vote:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
