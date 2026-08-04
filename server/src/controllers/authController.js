const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const config = require('../config/env');

const generateAccessToken = (userId, role) => {
  return jwt.sign({ userId, role }, config.jwtAccessSecret, { expiresIn: config.jwtAccessExpiry });
};

const generateRefreshToken = (userId, role) => {
  return jwt.sign({ userId, role }, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiry });
};

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, staffId, email, password, role } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { staffId }] });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or staff ID already exists.' });
    }

    const user = new User({
      fullName,
      staffId,
      email,
      passwordHash: password,
      role: role || 'technician',
    });

    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return res.status(423).json({ error: `Account is locked. Try again in ${minutesLeft} minutes.` });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.loginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date();

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);

    user.refreshTokens = [...(user.refreshTokens || []).slice(-5), {
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }];
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required.' });
    }

    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const storedToken = user.refreshTokens?.find((t) => t.token === refreshToken);
    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id, user.role);

    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);
    user.refreshTokens.push({ token: newRefreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    await user.save();

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid refresh token.' });
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && req.user) {
      req.user.refreshTokens = req.user.refreshTokens.filter((t) => t.token !== refreshToken);
      await req.user.save();
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res) => {
  res.json({ user: req.user.toJSON() });
};