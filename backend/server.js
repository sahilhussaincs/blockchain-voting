// Import required modules
const express = require('express');
const router = express.Router();  // Initialize router
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const sibApiV3Sdk = require('sib-api-v3-sdk');
const crypto = require('crypto');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const Web3 = require('web3');  // Correct Web3 import
const contractConfig = require('./contractConfig');  // Correct path to contractConfig
const { web3, votingContract } = contractConfig;  // Destructure web3 and votingContract from contractConfig

const voteRoutes = require("./routes/vote");
const resultsRoutes = require("./routes/results");


// Import models
const User = require('./models/User');
const Election = require('./models/Election');
const Candidate = require('./models/Candidate');
const Vote = require('./models/Vote');
const Admin = require('./models/Admin');

// Load environment variables
dotenv.config();

// Initialize the app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());


app.use("/api/vote", voteRoutes);
app.use("/api/results", resultsRoutes)

app.use(cors({ origin: "http://localhost:3000" })); // Allow requests from frontend
app.use(bodyParser.json());


app.use("/api/vote", voteRoutes);

// Middleware for CORS
const corsOptions = {
  origin: 'http://localhost:3000',  // Frontend URL
  credentials: true,  // Allow cookies and session to be sent with requests
};
app.use(cors(corsOptions));  // Enable CORS with credentials

// Handle preflight requests
app.options('*', cors(corsOptions));  // Handle preflight for all routes

// Session configuration for cross-origin support
app.use(session({
  secret: '892c3a0309ec724aca82625e067fc4c13548cd1d59aa2ef70e8c3327909c2e58e3a0d2afb6d8c4d5c2268d53c496909635681f8ccf5f2fc3595d6b6b2555c6a5',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,  // Set to true if using HTTPS
    httpOnly: true,
    sameSite: 'None',  // This is important for cross-origin cookies
  }
}));


// MongoDB connection
const uri = process.env.MONGO_URI;
mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Set up Brevo API (formerly Sendinblue)
const defaultClient = sibApiV3Sdk.ApiClient.instance;
const apiKeyInstance = defaultClient.authentications['api-key'];
apiKeyInstance.apiKey = process.env.BREVO_API_KEY;
const tranEmailApi = new sibApiV3Sdk.TransactionalEmailsApi();

// Helper function to generate a 6-digit OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999);
}
// Route to handle user registration
app.post('/api/register', async (req, res) => {
  const { name, email, dob, aadhar, voterId, secretKey } = req.body;

  // Validate that all required fields are provided
  if (!name || !email || !dob || !aadhar || !voterId || !secretKey) {
      return res.status(400).json({ message: 'All fields are required' });
  }

  // Check if the user is at least 18 years old
  const currentYear = new Date().getFullYear();
  const userYear = new Date(dob).getFullYear();
  if (currentYear - userYear < 18) {
      return res.status(400).json({ message: 'You must be at least 18 years old to register.' });
  }

  // Validate Aadhar number (12 digits)
  if (aadhar.length !== 12 || isNaN(aadhar)) {
      return res.status(400).json({ message: 'Aadhar number must be a valid 12-digit number.' });
  }

  // Check if the Aadhar number or email already exists in the database
  const existingUser = await User.findOne({ $or: [{ aadhar }, { email }] });
  if (existingUser) {
      return res.status(400).json({ message: 'Aadhar number or email already exists.' });
  }

  try {
      // Create a new user
      const newUser = new User({
          name,
          email,
          dob,
          aadhar,
          voterId,
          secretKey,
      });

      // Save the user to the database
      await newUser.save();

      // Respond with success message
      res.status(201).json({ message: 'Registration successful', secretKey });
  } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

// POST route for user login
app.post('/api/login', async (req, res) => {
  const { email, secretKey } = req.body;

  try {
    const user = await User.findOne({ email, secretKey });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or secret key.' });
    }

    // Generate OTP and send it via email
    const otp = generateOTP();
    user.otp = otp;
    user.otpGeneratedAt = new Date();
    await user.save();

    // Send OTP to user's email
    await sendOTPEmail(email, otp);

    res.status(200).json({ message: 'OTP sent to email', email });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Send OTP to email
const sendOTPEmail = async (recipientEmail, otp) => {
  const payload = {
    sender: { email: "info@sahilblockchainproject.work.gd" },
    to: [{ email: recipientEmail }],
    subject: "OTP to log in on Blockchain voting System",
    htmlContent: `<p><h3>Blockchain Based Electronic Voting System</h3><h4>OTP Valid for 3 Minutes : ${otp}</h4></p>`
  };

  try {
    await tranEmailApi.sendTransacEmail(payload);
    console.log('OTP sent successfully');
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Error sending OTP email');
  }
};

// Verify OTP route
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email, otp });

    if (!user) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    const otpAge = (new Date() - user.otpGeneratedAt) / 1000 / 60; // in minutes
    if (otpAge > 10) {
      return res.status(400).json({ message: 'OTP has expired.' });
    }

    user.otp = undefined;
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    res.status(200).json({ message: 'OTP Verified. Logging in...', token });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});


// Admin login route
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username, password });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid username or password.' });
    }
    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Create Election
app.post("/api/admin/elections", async (req, res) => {
  const { name, startDate, endDate } = req.body;

  try {
    // Validate inputs
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const startTimestamp = new Date(startDate).toISOString();
    const endTimestamp = new Date(endDate).toISOString();

    if (new Date(startTimestamp) >= new Date(endTimestamp)) {
      return res.status(400).json({ message: "Start date must be earlier than end date" });
    }

    // Save election to MongoDB
    const newElection = new Election({
      name,
      startDate: startTimestamp,
      endDate: endTimestamp,
      candidates: [],
    });

    const savedElection = await newElection.save();
    res.status(201).json(savedElection);
  } catch (error) {
    console.error("Error creating election:", error);
    res.status(500).json({ message: "Error creating election" });
  }
});

// Fetch All Elections
app.get("/api/admin/elections", async (req, res) => {
  try {
    const elections = await Election.find().populate("candidates");
    res.status(200).json(elections);
  } catch (error) {
    console.error("Error fetching elections:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/admin/candidates", async (req, res) => {
  const { electionId, candidates } = req.body;

  try {
    // Validate input
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ message: "Candidates must be a non-empty array" });
    }

    // Find the election by ID
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    // Check if candidates already exist for this election
    const existingCandidates = await Candidate.find({ votingId: electionId });
    const existingCandidateNames = existingCandidates.map((candidate) => candidate.name);

    // Filter out candidates that already exist
    const newCandidates = candidates.filter(
      (candidate) => !existingCandidateNames.includes(candidate.name)
    );

    // Create and save each new candidate
    const candidatePromises = newCandidates.map(async (candidate) => {
      const newCandidate = new Candidate({
        name: candidate.name,
        party: candidate.party,
        votingId: electionId, // Associate candidate with the election
      });

      return newCandidate.save(); // Save candidate
    });

    // Wait for all new candidates to be saved
    const savedCandidates = await Promise.all(candidatePromises);

    // Update election with the new candidates
    election.candidates.push(...savedCandidates.map((candidate) => candidate._id));

    // Save updated election
    await election.save();

    res.status(200).json({
      message: "Candidates added successfully",
      addedCandidates: savedCandidates.length,
    });
  } catch (error) {
    console.error("Error adding candidates:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
