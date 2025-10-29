const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  date: {
    type: Date,
    default: Date.now
  },

  // 기록 데이터 (daily-check.html 참고)
  stressLevel: {
    type: Number,
    min: 1,
    max: 10
  },

  sleepHours: {
    type: Number,
    min: 0,
    max: 24
  },

  sleepQuality: {
    type: Number,
    min: 1,
    max: 10
  },

  meals: [String], // 아침, 점심, 저녁 식사 내용

  workIntensity: {
    type: Number,
    min: 1,
    max: 10
  },

  bloodSugar: Number,

  steps: Number,

  bloodPressureSystolic: Number, // 수축기 혈압

  bloodPressureDiastolic: Number, // 이완기 혈압

  pssTotal: Number, // PSS 검사 총점

  notes: String // 메모

}, {
  timestamps: true // createdAt과 updatedAt을 자동으로 관리
});

// 날짜별로 정렬하기 위한 인덱스
RecordSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Record', RecordSchema);
