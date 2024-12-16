const crypto = require('crypto');

// Generate a 64-character random string (256-bit key)
const secretKey = crypto.randomBytes(64).toString('hex');

console.log(secretKey);
