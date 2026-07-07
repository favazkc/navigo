const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    cognitoSub: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    password: {
      type: String,
      default: null, // null for Cognito-only users
    },
    systemRole: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user', // new registrations are plain users by default
    },
  },
  { timestamps: true }
);

// Hash password before saving if it has been set/modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare plain password against stored hash
userSchema.methods.comparePassword = function (plain) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
