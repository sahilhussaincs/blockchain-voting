const express = require('express');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const router = express.Router();

// Route to fetch all elections with candidates
router.get('/elections', async (req, res) => {
  try {
    // Fetch elections and populate candidates
    const elections = await Election.find().populate('candidates');
    res.status(200).json(elections); // Send the populated elections
  } catch (error) {
    console.error('Error fetching elections:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route to create a new election
router.post('/elections', async (req, res) => {
  const { name, startDate, endDate, candidates } = req.body;

  try {
    // Validate candidates before saving
    if (!candidates || candidates.length === 0) {
      return res.status(400).json({ message: 'At least one candidate is required.' });
    }

    // Save the election
    const election = new Election({ name, startDate, endDate });
    await election.save();

    // Prepare and save candidates with references to the election
    const newCandidates = candidates.map((candidate) => ({
      ...candidate,
      election: election._id, // Link candidates to the election
    }));

    const addedCandidates = await Candidate.insertMany(newCandidates);

    // Update the election with candidate references
    election.candidates = addedCandidates.map((c) => c._id);
    await election.save();

    res.status(201).json(election); // Respond with the created election
  } catch (error) {
    console.error('Error creating election:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
