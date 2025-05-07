const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

const getProfileQuery = "id, full_name, date_of_birth,  gender,  marital_status,  have_children,  mother_tongue,  about_me,  height,  weight,  body_type,  complexion,  religion,  caste,  gothram,  zodiac_sign,  star,  smoking_status,  drinking_status,  diet_type,  profile_image_url,  created_at,  education,  profession,  location,  mobile_number ";

router.post('/getProfiles', (req, res) => {
  const {
      gender,
      ageFrom,
      ageTo,
      religion,
      caste,
      country,
      maritalStatus,
      userId
  } = req.body;

  let conditions = [];
  let params = [];
  let sql = `
      SELECT p.*, TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) AS age 
      FROM personal_profiles p
  `;

  if (userId) {
      // Apply interest filter if userId is provided
      sql += `
          LEFT JOIN interests i ON p.id = i.receiver_id AND i.sender_id = ?
          WHERE i.sender_id IS NULL
      `;
      params.push(userId);
  }

  if (gender) {
      conditions.push("p.gender = ?");
      params.push(gender);
  }
  if (ageFrom && ageTo) {
      conditions.push("TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) BETWEEN ? AND ?");
      params.push(ageFrom, ageTo);
  }
  if (religion) {
      conditions.push("p.religion = ?");
      params.push(religion);
  }
  if (caste) {
      conditions.push("p.caste = ?");
      params.push(caste);
  }
  if (country) {
      conditions.push("p.location = ?");
      params.push(country);
  }
  if (maritalStatus) {
      conditions.push("p.marital_status = ?");
      params.push(maritalStatus);
  }

  // Combine search conditions
  const whereClause = conditions.length ? `${userId ? 'AND' : 'WHERE'} ${conditions.join(' AND ')}` : '';
  sql += whereClause;

  db.query(sql, params, (err, results) => {
      if (err) {
          console.error('Search error:', err);
          return res.status(500).json({ error: 'Search failed' });
      }

      res.status(200).json({ data: results });
  });
});



router.post('/myProfile', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const sql = `SELECT ${getProfileQuery} FROM personal_profiles WHERE id = ?`;
  const params = [userId];

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching profiles:', err);
      return res.status(500).json({ error: 'Failed to get profile' });
    }

    res.status(200).json({ data: results });
  });
});


router.post('/saveProfile', async (req, res) => {
  const data = req.body;

  try {
    const hashedPassword = await bcrypt.hash(data.password, 10); // Securely hash password

    const sql = `
        INSERT INTO personal_profiles (
          full_name, date_of_birth, gender, marital_status, have_children,
          mother_tongue, about_me, height, weight, body_type, complexion,
          religion, caste, gothram, zodiac_sign, star,
          smoking_status, drinking_status, diet_type, profile_image_url,
          education, profession, location,
          mobile_number, email, password
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

    const values = [
      `${data.firstName} ${data.lastName}`,
      data.dob,
      data.gender,
      data.maritalStatus,
      data.haveChildren === 'true',
      data.motherTongue || 'N/A',
      data.aboutMe,
      data.height,
      data.weight,
      data.bodyType,
      data.complexion,
      data.religion,
      data.caste,
      data.gothram,
      data.sign,
      data.star,
      data.smoking,
      data.drinking,
      data.diet,
      data.profileImageUrl || 'https://default-image-url.com/default.jpg',
      data.education,
      data.profession,
      data.location,
      data.mobileNumber,
      data.email,
      hashedPassword
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error saving profile:', err);
        return res.status(500).json({ error: 'Failed to save profile' });
      }

      res.status(200).json({ message: 'Profile saved successfully', profileId: result.insertId });
    });
  } catch (error) {
    console.error('Hashing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



module.exports = router;
