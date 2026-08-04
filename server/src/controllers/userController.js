const { User } = require('../models');

exports.getAll = async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash -refreshTokens').sort({ fullName: 1 });
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash -refreshTokens');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { password, ...updateData } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    Object.assign(user, updateData);
    if (password) user.passwordHash = password;
    await user.save();

    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
};