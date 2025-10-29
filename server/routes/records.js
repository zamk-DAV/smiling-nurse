const express = require('express');
const router = express.Router();
const Record = require('../models/Record');
const User = require('../models/User');

// 일일 기록 저장
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const recordData = req.body;

    // 사용자 존재 확인
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 새로운 기록 생성
    const newRecord = new Record({
      userId,
      ...recordData
    });

    await newRecord.save();

    res.json({
      success: true,
      message: '오늘의 기록이 저장되었습니다!',
      record: newRecord
    });
  } catch (error) {
    console.error('기록 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 전체 기록 조회
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 사용자 존재 확인
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 사용자의 모든 기록 조회 (날짜 역순)
    const records = await Record.find({ userId }).sort({ date: -1 });

    res.json({
      success: true,
      records: records || []
    });
  } catch (error) {
    console.error('기록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// CSV 다운로드
router.get('/:userId/download', async (req, res) => {
  try {
    const { userId } = req.params;

    // 사용자 존재 확인
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 사용자의 모든 기록 조회
    const records = await Record.find({ userId }).sort({ date: 1 });

    // CSV 헤더
    let csv = '날짜,스트레스수준,수면시간,수면의질,업무강도,혈당,혈압(수축기),혈압(이완기),걸음수,메모\n';

    // CSV 데이터
    records.forEach(record => {
      const date = new Date(record.date).toLocaleDateString('ko-KR');
      csv += `${date},${record.stressLevel || ''},${record.sleepHours || ''},${record.sleepQuality || ''},${record.workIntensity || ''},${record.bloodSugar || ''},${record.bloodPressureSystolic || ''},${record.bloodPressureDiastolic || ''},${record.steps || ''},"${record.notes || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=smiling-nurse-data-${Date.now()}.csv`);
    res.send('\uFEFF' + csv); // UTF-8 BOM 추가
  } catch (error) {
    console.error('CSV 다운로드 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
