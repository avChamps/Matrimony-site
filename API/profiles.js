const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/getProfiles', (req, res) => {
    const {
      gender,
      ageFrom,
      ageTo,
      religion,
      caste,
      country,
      maritalStatus
    } = req.body;
  
    let conditions = [];
    let params = [];
  
    if (gender) {
      conditions.push("gender = ?");
      params.push(gender);
    }
    if (ageFrom && ageTo) {
      conditions.push("TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN ? AND ?");
      params.push(ageFrom, ageTo);
    }
    if (religion) {
      conditions.push("religion = ?");
      params.push(religion);
    }
    if (caste) {
      conditions.push("caste = ?");
      params.push(caste);
    }
    if (country) {
      conditions.push("location = ?");
      params.push(country);
    }
    if (maritalStatus) {
      conditions.push("marital_status = ?");
      params.push(maritalStatus);
    }
  
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT *, TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) AS age FROM personal_profiles ${whereClause}`;
  
    db.query(sql, params, (err, results) => {
      if (err) {
        console.error('Search error:', err);
        return res.status(500).json({ error: 'Search failed' });
      }
  
      res.status(200).json({ data: results });
    });
  });
  

  const bcrypt = require('bcrypt');

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
