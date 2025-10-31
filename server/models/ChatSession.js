const mongoose = require('mongoose');

const ChatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  recordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Record',
    required: false // 대화 모드에서는 recordId가 없을 수 있음
  },

  // 대화 모드 (저장 전 대화)
  conversationMode: {
    type: Boolean,
    default: false
  },

  // 대화 메시지 기록
  messages: [{
    role: {
      type: String,
      enum: ['user', 'ai'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // 최종 AI 조언
  finalAdvice: String,

  // 세션 상태
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active'
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  endedAt: Date
}, {
  timestamps: true
});

// 사용자별 세션 조회를 위한 인덱스
ChatSessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
