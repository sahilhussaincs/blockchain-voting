const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User'); // Create this model

router.post('/login', async (req, res) => {
    const { email, secretKey } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Check if the provided secret key matches the stored secret key
        if (user.secretKey !== secretKey) {
            return res.status(400).json({ message: 'Invalid secret key' });
        }

        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
});


router.post('/register', async (req, res) => {
    const { name, email, dob, aadhar, voterId, secretKey } = req.body;

    try {
        // Save user to the database
        const newUser = new User({ name, email, dob, aadhar, voterId, secretKey });
        await newUser.save();
        res.status(200).send('Registration successful');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error registering user');
    }
});

module.exports = router;
