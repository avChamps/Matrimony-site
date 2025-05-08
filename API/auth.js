const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');
const accountSid = 'YOUR_TWILIO_ACCOUNT_SID';
const authToken = 'YOUR_TWILIO_AUTH_TOKEN';
const twilioClient = twilio(accountSid, authToken);
const twilioFromNumber = '+1234567890'; // Your Twilio phone number

const JWT_SECRET = 'matrimony';

router.post('/login', (req, res) => {
    const { mobileNumber, password } = req.body;
    console.log(req.body)
    const sql = 'SELECT * FROM personal_profiles WHERE mobile_number = ?';
    db.query(sql, [mobileNumber], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        console.log(results)
        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = results[0];

        // Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
        return res.status(200).json({ token, userId: user.id });
    });
})


router.post('/forgot-password', (req, res) => {
    const { mobileNumber } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // valid for 10 minutes

    const sql = 'UPDATE personal_profiles SET otp = ?, otp_expiry = ? WHERE mobile_number = ?';
    db.query(sql, [otp, expiry, mobileNumber], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Mobile number not found' });

        // Send OTP using Twilio
        twilioClient.messages.create({
            body: `Your OTP code is ${otp}`,
            from: twilioFromNumber,
            to: mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}` // Add country code if needed
        })
        .then(message => {
            console.log(`OTP sent to ${mobileNumber}: SID ${message.sid}`);
            res.status(200).json({ message: 'OTP sent to your mobile number' });
        })
        .catch(error => {
            console.error('Twilio error:', error);
            res.status(500).json({ error: 'Failed to send OTP' });
        });
    });
});



router.post('/reset-password', async (req, res) => {
    const { mobileNumber, otp, newPassword } = req.body;

    const sql = 'SELECT * FROM personal_profiles WHERE mobile_number = ?';
    db.query(sql, [mobileNumber], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = results[0];
        const now = new Date();

        if (user.otp !== otp || new Date(user.otp_expiry) < now) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateSql = 'UPDATE personal_profiles SET password = ?, otp = NULL, otp_expiry = NULL WHERE mobile_number = ?';
        db.query(updateSql, [hashedPassword, mobileNumber], (err) => {
            if (err) return res.status(500).json({ error: 'Password reset failed' });

            res.status(200).json({ message: 'Password reset successful' });
        });
    });
});










router.post('/run-query', (req, res) => {
    const { query, params } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    db.query(query, params || [], (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ error: 'Query execution failed' });
        }

        res.status(200).json({ data: results });
    });
});




module.exports = router;
