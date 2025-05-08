const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const s3 = require('../S3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const getProfileQuery = "id, email, full_name,profile_for, date_of_birth,  gender,  marital_status,  have_children,  mother_tongue,  about_me,  height,  weight,  body_type,  complexion,  religion,  caste,  gothram,  zodiac_sign,  star,  smoking_status,  drinking_status,  diet_type,  profile_image_url,  created_at,  education,  profession,  location,  mobile_number ";

const BUCKET_NAME = 'matrimony';
const upload = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET_NAME,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const filename = `profile-images/${Date.now()}_${file.originalname}`;
      cb(null, filename);
    }
  })
});


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


router.post('/saveProfile', upload.single('profileImage'), async (req, res) => {
  const data = req.body;
  try {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    let profileImageUrl = data.profileImageUrl;
    if (req.file) {
      profileImageUrl = req.file.location;
    }

    const sql = `
        INSERT INTO personal_profiles (
          full_name, date_of_birth, gender, marital_status, have_children,
          mother_tongue, about_me, height, weight, body_type, complexion,
          religion, caste, gothram, zodiac_sign, star,
          smoking_status, drinking_status, diet_type, profile_image_url, profile_for,
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
      profileImageUrl,
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


router.post('/updateProfile', upload.single('profileImage'), async (req, res) => {
  const data = req.body;

  try {
    let hashedPassword = null;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    let newImageUrl = data.profileImageUrl;
    if (req.file) {
      newImageUrl = req.file.location;

      // delete old image
      if (data.profileImageUrl && data.profileImageUrl.includes('cellar-c2.services.clever-cloud.com')) {
        const key = new URL(data.profileImageUrl).pathname.slice(1);
        await deleteObject('matrimony', key);
      }
    }
    const sql = `
      UPDATE personal_profiles SET
        full_name = ?, date_of_birth = ?, gender = ?, marital_status = ?, have_children = ?,
        mother_tongue = ?, about_me = ?, height = ?, weight = ?, body_type = ?, complexion = ?,
        religion = ?, caste = ?, gothram = ?, zodiac_sign = ?, star = ?,
        smoking_status = ?, drinking_status = ?, diet_type = ?, profile_image_url = ?, profile_for = ?,
        education = ?, profession = ?, location = ?, mobile_number = ?, email = ?
        ${hashedPassword ? ', password = ?' : ''}
      WHERE id = ?
    `;

    const values = [
      `${data.firstName} ${data.lastName}`,
      data.dob,
      data.gender,
      data.maritalStatus,
      data.haveChildren === 'true' || data.haveChildren === true ? 1 : 0,
      data.motherTongue,
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
      newImageUrl,
      data.profileFor,
      data.education,
      data.profession,
      data.location,
      data.mobileNumber,
      data.email
    ];

    if (hashedPassword) {
      values.push(hashedPassword);
    }

    values.push(data.userId);

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error updating profile:', err);
        return res.status(500).json({ error: 'Failed to update profile' });
      }

      res.status(200).json({ message: 'Profile updated successfully' });
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function deleteObject(bucket, key) {
  const deleteParams = {
    Bucket: bucket,
    Key: key,
  };

  try {
    const data = await s3.send(new DeleteObjectCommand(deleteParams));
    console.log("Object deleted successfully:", data);
    return data;
  } catch (err) {
    console.error("Error deleting object:", err);
    throw err;
  }
}

module.exports = router;
