const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },

  // 프로필 정보 (profile.html, signup.html 참고)
  profile: {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    height: { type: Number },
    weight: { type: Number },
    occupation: { type: String },
    chronicDiseases: [{
      disease: String,
      detail: String
    }]
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // createdAt과 updatedAt을 자동으로 관리
});

module.exports = mongoose.model('User', UserSchema);
