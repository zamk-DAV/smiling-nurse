const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 회원가입
router.post('/signup', async (req, res) => {
  try {
    const { username, password, profile } = req.body;

    if (!username || !password || !profile) {
      return res.status(400).json({
        success: false,
        message: '필수 정보를 모두 입력해주세요.'
      });
    }

    // 중복 아이디 체크
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '이미 존재하는 아이디입니다.'
      });
    }

    // 새 사용자 생성
    const newUser = new User({
      username,
      password, // 실제로는 암호화해야 하지만 간단한 프로젝트이므로 생략
      profile
    });

    await newUser.save();

    res.json({
      success: true,
      message: '회원가입이 완료되었습니다!',
      userId: newUser._id
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '아이디와 비밀번호를 입력해주세요.'
      });
    }

    // 사용자 검색
    const user = await User.findOne({ username, password });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '아이디 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    res.json({
      success: true,
      message: '로그인 성공!',
      userId: user._id,
      username: user.username
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
