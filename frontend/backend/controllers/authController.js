const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Fixed default password fallback configuration
const FIXED_PASSWORDS = {
  Student: '123',
  Teacher: '456',
  Principal: '789'
};

/**
 * Generate password variants based on First Name + Date of Birth.
 * Example: Name = "Heet Patel", DOB = "6 7 2008" (Day: 6, Month: 7, Year: 2008)
 * Generates: "heet0678" (firstname + 06 + 7 + 8), "heet060708", etc.
 */
const generateNameDobPassword = (fullName, dobStr) => {
  if (!fullName) return [];
  const firstName = fullName.trim().split(' ')[0].toLowerCase();
  
  if (!dobStr) return [];

  let day = '', month = '', year = '';

  if (dobStr.includes('-')) {
    const parts = dobStr.split('-');
    if (parts[0].length === 4) { // YYYY-MM-DD
      year = parts[0];
      month = parseInt(parts[1], 10).toString();
      day = parseInt(parts[2], 10).toString().padStart(2, '0');
    }
  } else {
    const parts = dobStr.trim().split(/[\/\s.]+/);
    if (parts.length >= 3) {
      day = parseInt(parts[0], 10).toString().padStart(2, '0');
      month = parseInt(parts[1], 10).toString();
      year = parts[2] || '';
    }
  }

  const lastYearDigit = year ? year.slice(-1) : '';
  const year2Digits = year ? year.slice(-2) : '';

  // Patterns:
  // heet + 06 + 7 + 8 = heet0678
  // heet + 06 + 07 + 08 = heet060708
  const p1 = `${firstName}${day}${month}${lastYearDigit}`;
  const p2 = `${firstName}${day}${month.padStart(2, '0')}${lastYearDigit}`;
  const p3 = `${firstName}${day}${month}${year2Digits}`;
  const p4 = `${firstName}${day}${month.padStart(2, '0')}${year2Digits}`;
  const p5 = `${firstName}${day}${month}${year}`;

  return [p1, p2, p3, p4, p5];
};

/**
 * Verify password against custom password, Name + DOB formula,
 * firstname + birthdate pattern, or default role fallback.
 */
const verifyUserPassword = (user, inputPassword, role) => {
  if (!inputPassword) return false;
  const input = inputPassword.trim();

  // 1. Custom explicit password stored on user object
  if (user.password && user.password.trim() === input) {
    return true;
  }

  // 2. DOB-based formula calculation
  if (user.dob) {
    const validPatterns = generateNameDobPassword(user.name, user.dob);
    if (validPatterns.includes(input.toLowerCase())) {
      return true;
    }
  }

  // 3. Pattern match: Firstname + Birthdate digits (e.g. "heet" + "0678" => "heet0678")
  const firstName = user.name ? user.name.trim().split(' ')[0].toLowerCase() : '';
  if (firstName && input.toLowerCase().startsWith(firstName)) {
    const digits = input.slice(firstName.length);
    if (/^\d{3,8}$/.test(digits)) {
      return true;
    }
  }

  // 4. Default role password fallback for testing (Student: 123, Teacher: 456, Principal: 789)
  const roleFallback = FIXED_PASSWORDS[role];
  if (input === roleFallback) {
    return true;
  }

  return false;
};

const login = async (req, res) => {
  const { loginId, password, role } = req.body;

  try {
    // 1. Basic validation
    if (!loginId || !password || !role) {
      return res.status(400).json({ message: 'Please provide Login ID, Password, and Role.' });
    }

    // 2. Validate role
    if (!FIXED_PASSWORDS[role]) {
      return res.status(400).json({ message: 'Invalid role selection.' });
    }

    // Enforce Principal ID constraint
    if (role === 'Principal' && loginId !== 'admin') {
      return res.status(401).json({ message: 'Invalid Principal ID.' });
    }

    // 3. Find user in database by loginId (case-insensitive) or name
    const cleanId = loginId.trim();
    let user = await User.findOne({ 
      loginId: { $regex: new RegExp(`^${cleanId}$`, 'i') }, 
      role 
    });

    // Fallback: search student by name or firstname
    if (!user && role === 'Student') {
      user = await User.findOne({ 
        name: { $regex: new RegExp(`^${cleanId}`, 'i') }, 
        role 
      });
    }

    if (!user) {
      return res.status(404).json({ message: `No ${role} profile found with ID or Name: ${loginId}` });
    }

    // 4. Verify password with Name + Birthdate logic & custom/fallback verification
    const isValid = verifyUserPassword(user, password, role);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials. Password should be firstname + birthdate (e.g. heet0678) or account password.' });
    }

    // 5. Generate JWT Token
    const token = jwt.sign(
      { 
        id: user._id, 
        loginId: user.loginId, 
        role: user.role,
        name: user.name 
      },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '30d' }
    );

    // 6. Send success response
    res.json({
      token,
      user: {
        _id: user._id,
        loginId: user.loginId,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        classOrSubject: user.classOrSubject,
        dob: user.dob
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      _id: user._id,
      loginId: user.loginId,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      classOrSubject: user.classOrSubject,
      dob: user.dob
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching profile.', error: error.message });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  const { name, classOrSubject, dob, password } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    const updatedName = name || user.name;
    const updatedSubject = classOrSubject || user.classOrSubject;
    const updatedDob = dob || user.dob;
    const updatedPassword = password || user.password;

    await User.findByIdAndUpdate(user._id, {
      name: updatedName,
      classOrSubject: updatedSubject,
      dob: updatedDob,
      password: updatedPassword
    });

    if (classOrSubject && user.role === 'Teacher') {
      const dbMock = require('../utils/dbMock');
      const allMarks = dbMock.readFile('markss');
      allMarks.forEach(m => {
        if (m.uploadedBy === user.loginId) {
          m.subject = updatedSubject;
        }
      });
      dbMock.writeFile('markss', allMarks);
    }

    res.json({
      message: 'Profile updated successfully.',
      user: {
        _id: user._id,
        loginId: user.loginId,
        name: updatedName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        classOrSubject: updatedSubject,
        dob: updatedDob
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user profile.', error: error.message });
  }
};

// Change Password Endpoint
const changePassword = async (req, res) => {
  const { oldPassword, newPassword, dob } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (oldPassword) {
      const isValid = verifyUserPassword(user, oldPassword, user.role);
      if (!isValid) {
        return res.status(401).json({ message: 'Current password is incorrect.' });
      }
    }

    if (newPassword) {
      user.password = newPassword.trim();
    }
    if (dob) {
      user.dob = dob.trim();
    }

    await user.save();
    res.json({ message: 'Password / Birthdate updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error changing password.', error: error.message });
  }
};

module.exports = {
  login,
  getMe,
  updateProfile,
  changePassword
};
