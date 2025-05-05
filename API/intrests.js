const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/sendInterest', (req, res) => {
    const { senderId, receiverId } = req.body;

    const sql = `
      INSERT INTO interests (sender_id, receiver_id, sender_status, receiver_status)
      VALUES (?, ?, 'accepted', 'pending')
    `;

    db.query(sql, [senderId, receiverId], (err, result) => {
        if (err) {
            console.error('Error sending interest:', err);
            return res.status(500).json({ error: 'Failed to send interest' });
        }

        return res.status(200).json({ message: 'Interest sent successfully' });
    });
});


router.post('/interests/sent', (req, res) => {
    const { userId } = req.body;

    const sql = `
      SELECT p.* FROM personal_profiles p
      JOIN interests i ON p.id = i.receiver_id
      WHERE i.sender_id = ?
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error fetching sent interests' });
        res.status(200).json({ data: results });
    });
});


router.post('/interests/received', (req, res) => {
    const { userId } = req.body;

    const sql = `
      SELECT p.*, i.sender_status, i.receiver_status
      FROM personal_profiles p
      JOIN interests i ON p.id = i.sender_id
      WHERE i.receiver_id = ? AND i.sender_status = 'accepted'
      UNION
      SELECT p.*, i.sender_status, i.receiver_status
      FROM personal_profiles p
      JOIN interests i ON p.id = i.receiver_id
      WHERE i.sender_id = ? AND i.receiver_status = 'accepted'
    `;

    db.query(sql, [userId, userId], (err, results) => {
        if (err) {
            console.error('Error fetching received interests:', err);
            return res.status(500).json({ error: 'Error fetching received interests' });
        }
        res.status(200).json({ data: results });
    });
});


router.post('/interests/accept', (req, res) => {
    const { senderId, receiverId } = req.body;

    const sql = `
      UPDATE interests
      SET receiver_status = 'accepted'
      WHERE sender_id = ? AND receiver_id = ?
    `;

    db.query(sql, [senderId, receiverId], (err, result) => {
        if (err) {
            console.error('Error accepting interest:', err);
            return res.status(500).json({ error: 'Failed to accept interest' });
        }

        res.status(200).json({ message: 'Interest accepted' });
    });
});

router.post('/interests/mutual', (req, res) => {
    const { userId } = req.body;

    const sql = `
      SELECT p.*, i.sender_status, i.receiver_status
      FROM personal_profiles p
      JOIN interests i ON p.id = i.sender_id
      WHERE i.receiver_id = ? AND i.sender_status = 'accepted' AND i.receiver_status = 'accepted'
      UNION
      SELECT p.*, i.sender_status, i.receiver_status
      FROM personal_profiles p
      JOIN interests i ON p.id = i.receiver_id
      WHERE i.sender_id = ? AND i.sender_status = 'accepted' AND i.receiver_status = 'accepted'
    `;

    db.query(sql, [userId, userId], (err, results) => {
        if (err) {
            console.error('Error fetching mutual interests:', err);
            return res.status(500).json({ error: 'Error fetching mutual interests' });
        }
        res.status(200).json({ data: results });
    });
});

module.exports = router;