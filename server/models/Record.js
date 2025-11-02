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

  // 근무 정보
  workType: {
    type: String,
    enum: ['3교대', '상근직']
  },
  shiftType: {
    type: String,
    enum: ['데이(Day)', '이브닝(Evening)', '나이트(Night)', null]
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

  sleepMinutes: {
    type: Number,
    min: 0,
    max: 59,
    default: 0
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

  // 간호사 스트레스 측정도구 (19문항, 4점 척도)
  stressScores: [Number], // 각 문항 점수 배열 (1-4점)
  stressTotal: Number, // 총점 (19-76점)

  // 요인별 점수
  workOverloadScore: Number, // 업무과중 (1-9번, 9-36점)
  emotionalLaborScore: Number, // 감정노동 (10-12번, 3-12점)
  personalCharacteristicsScore: Number, // 개인적 특성 (13-15번, 3-12점)
  organizationalCharacteristicsScore: Number, // 조직적 특성 (16-19번, 4-16점)

  notes: String, // 메모

  // AI 분석 결과 (한 번만 생성되고 저장됨)
  aiAnalysis: {
    type: String,
    default: null
  }

}, {
  timestamps: true // createdAt과 updatedAt을 자동으로 관리
});

// 날짜별로 정렬하기 위한 인덱스
RecordSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Record', RecordSchema);
