const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    dob: { type: Date, required: true },
    aadhar: { type: String, required: true, unique: true },
    voterId: { type: String, required: true, unique: true },
    secretKey: { type: String, required: true },
    otp: { type: Number },  // Store OTP temporarily for verification
    otpGeneratedAt: { type: Date },  // Timestamp when OTP was generated
});

module.exports = mongoose.model('User', userSchema);
