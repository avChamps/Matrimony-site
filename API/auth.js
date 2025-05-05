const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const bcrypt = require('bcryptjs');

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
module.exports = router;
