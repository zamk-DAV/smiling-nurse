const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config(); // .env 파일 로드

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client')));

// MongoDB 연결
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB 연결 성공'))
  .catch(err => {
    console.error('❌ MongoDB 연결 오류:', err);
    process.exit(1); // 연결 실패 시 서버 종료
  });

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const recordsRoutes = require('./routes/records');
const aiRoutes = require('./routes/ai');
const chatRoutes = require('./routes/chat');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint (Render용)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 기본 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🌟 스마일링 널스 서버가 http://localhost:${PORT} 에서 실행 중입니다!`);
});
