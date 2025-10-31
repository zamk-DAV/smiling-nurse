const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ChatSession = require('../models/ChatSession');

// Gemini API 키를 환경변수에서 가져옴
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY가 설정되지 않았습니다. AI 분석 기능이 작동하지 않을 수 있습니다.');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// 일일 기록 분석
router.post('/analyze-daily', async (req, res) => {
  try {
    const { recordData, profileData, userId } = req.body;

    if (!recordData) {
      return res.status(400).json({ success: false, message: '기록 데이터가 필요합니다.' });
    }

    if (!genAI) {
      return res.status(500).json({
        success: false,
        message: 'AI API가 설정되지 않았습니다.'
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // 과거 대화 기록 조회 (최근 3개)
    let conversationContext = '';
    if (userId) {
      try {
        const recentSessions = await ChatSession.find({ userId })
          .sort({ createdAt: -1 })
          .limit(3)
          .select('messages finalAdvice createdAt');

        if (recentSessions.length > 0) {
          conversationContext = '\n**과거 AI 상담 인사이트:**\n';
          recentSessions.forEach((session, index) => {
            const date = new Date(session.createdAt).toLocaleDateString('ko-KR');
            conversationContext += `\n[${date} 상담]\n`;

            // 주요 대화 내용 요약 (마지막 몇 개 메시지)
            const lastMessages = session.messages.slice(-4); // 마지막 4개 메시지
            const userMessages = lastMessages.filter(m => m.role === 'user').map(m => m.content);
            if (userMessages.length > 0) {
              conversationContext += `- 사용자 주요 언급: ${userMessages.join(', ')}\n`;
            }

            // 최종 조언
            if (session.finalAdvice) {
              conversationContext += `- AI 조언: ${session.finalAdvice.substring(0, 200)}...\n`;
            }
          });
          conversationContext += '\n위 과거 상담 내용을 참고하여, 지속적이고 일관된 건강 관리 조언을 제공해주세요.\n';
        }
      } catch (error) {
        console.error('대화 기록 조회 오류:', error);
        // 대화 기록 조회 실패해도 분석은 계속 진행
      }
    }

    // 프롬프트 생성
    const prompt = `
당신은 전문 간호사 건강 관리 AI 어시스턴트입니다. 아래의 일일 건강 기록을 분석하고 맞춤형 조언을 제공해주세요.

**사용자 프로필:**
- 연령: ${profileData?.age || '정보 없음'}세
- 성별: ${profileData?.gender || '정보 없음'}
- 경력: ${profileData?.yearsOfExperience || '정보 없음'}년차
- 직책: ${profileData?.position || '정보 없음'}
- 진료과: ${profileData?.department || '정보 없음'}
- 만성질환: ${profileData?.chronicDiseases?.length > 0 ? profileData.chronicDiseases.map(d => d.disease).join(', ') : '없음'}

**오늘의 근무 정보:**
- 근무 형태: ${recordData.workType || '정보 없음'}
${recordData.shiftType ? `- 근무 시간: ${recordData.shiftType}` : ''}

**오늘의 기록:**
- 스트레스 수준: ${recordData.stressLevel}/10
- 수면 시간: ${recordData.sleepHours || '기록 안 함'}시간
- 수면의 질: ${recordData.sleepQuality ? recordData.sleepQuality + '/5' : '기록 안 함'}
- 업무 강도: ${recordData.workIntensity}/10
- 식사: ${recordData.meals?.join(', ') || '기록 안 함'}
- PSS-10 점수: ${recordData.pssTotal}/40 (${recordData.pssTotal <= 13 ? '낮음' : recordData.pssTotal <= 26 ? '보통' : '높음'})
- PHQ-9 점수: ${recordData.phq9Total}/27 (${recordData.phq9Total <= 4 ? '최소화' : recordData.phq9Total <= 9 ? '가벼움' : recordData.phq9Total <= 14 ? '중간' : recordData.phq9Total <= 19 ? '중간-심함' : '심함'})
${recordData.bloodSugar ? `- 혈당: ${recordData.bloodSugar}mg/dL` : ''}
${recordData.bloodPressureSystolic ? `- 혈압: ${recordData.bloodPressureSystolic}/${recordData.bloodPressureDiastolic}mmHg` : ''}
${recordData.steps ? `- 걸음 수: ${recordData.steps}보` : ''}
${recordData.notes ? `- 메모: "${recordData.notes}"` : ''}
${conversationContext}

다음 형식으로 **간결하고 긍정적으로** 분석 결과를 제공해주세요:

## 🌟 오늘의 한 줄 평가
오늘 하루 수고를 격려하는 긍정적인 한 줄 (1문장)

## 💡 핵심 피드백
가장 중요한 2가지만 간단히 (각 1-2문장, 긍정적 표현 사용)

## 🎯 실천 조언
오늘 바로 시도할 수 있는 구체적인 조언 2가지 (각 1문장)

**중요:**
- 힘들어하는 간호사를 대상으로 하므로 무조건 긍정적이고 격려하는 톤으로 작성
- 부정적 표현 대신 긍정적 대안 제시
- 전체 길이를 짧고 간결하게 (최대 200자 이내)

한국어로 작성하고, 친근하면서도 전문적인 톤으로 작성해주세요. 각 섹션은 반드시 ## 제목으로 시작해주세요.
${conversationContext ? '과거 상담 내용을 고려하여 일관되고 지속적인 조언을 제공해주세요.' : ''}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    res.json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    console.error('AI 분석 오류:', error);
    res.status(500).json({
      success: false,
      message: 'AI 분석 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 전체 통계 분석
router.post('/analyze-statistics', async (req, res) => {
  try {
    const { records, profileData } = req.body;

    if (!records || records.length === 0) {
      return res.status(400).json({ success: false, message: '분석할 기록이 없습니다.' });
    }

    if (!genAI) {
      return res.status(500).json({
        success: false,
        message: 'AI API가 설정되지 않았습니다.'
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // 통계 계산
    const avgStress = (records.reduce((sum, r) => sum + (r.stressLevel || 0), 0) / records.length).toFixed(1);
    const avgSleep = records.filter(r => r.sleepHours).length > 0
      ? (records.filter(r => r.sleepHours).reduce((sum, r) => sum + r.sleepHours, 0) / records.filter(r => r.sleepHours).length).toFixed(1)
      : '기록 없음';
    const avgPSS = records.filter(r => r.pssTotal).length > 0
      ? (records.filter(r => r.pssTotal).reduce((sum, r) => sum + r.pssTotal, 0) / records.filter(r => r.pssTotal).length).toFixed(1)
      : '기록 없음';
    const avgWorkIntensity = (records.reduce((sum, r) => sum + (r.workIntensity || 0), 0) / records.length).toFixed(1);

    // 프롬프트 생성
    const prompt = `
당신은 전문 간호사 건강 관리 AI 어시스턴트입니다. 아래의 ${records.length}일간의 건강 기록을 종합 분석하고 장기적인 건강 관리 조언을 제공해주세요.

**사용자 프로필:**
- 연령: ${profileData?.age || '정보 없음'}세
- 성별: ${profileData?.gender || '정보 없음'}
- 직업: ${profileData?.occupation || '정보 없음'}
- 만성질환: ${profileData?.chronicDiseases?.length > 0 ? profileData.chronicDiseases.map(d => d.disease).join(', ') : '없음'}

**${records.length}일간 평균 지표:**
- 평균 스트레스 수준: ${avgStress}/10
- 평균 수면 시간: ${avgSleep}시간
- 평균 PSS-10 점수: ${avgPSS}/40
- 평균 업무 강도: ${avgWorkIntensity}/10

**추세 분석:**
최근 데이터를 기반으로 건강 상태의 변화 추이를 확인했습니다.

다음 형식으로 종합 분석 결과를 제공해주세요:

## 📊 전반적 건강 상태 (${records.length}일 기록)
${records.length}일간의 데이터로 본 전체적인 건강 상태 (3-4문장)

## ✅ 긍정적 패턴
잘 유지하고 있는 건강 습관 (2-3개 항목으로)

## 🎯 개선이 필요한 영역
주의가 필요한 부분과 그 이유 (2-3개 항목으로)

## 🎯 장기 건강 관리 전략
구체적이고 실천 가능한 장기 목표 (3-4개 항목으로)

## 🏥 전문가 상담 권고
병원 방문이나 전문가 상담이 필요한지 여부 (1-2문장)

한국어로 작성하고, 데이터 기반의 객관적이면서도 따뜻한 톤으로 작성해주세요. 각 섹션은 반드시 ## 제목으로 시작해주세요.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    res.json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    console.error('AI 통계 분석 오류:', error);
    res.status(500).json({
      success: false,
      message: 'AI 분석 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 맞춤형 조언 생성
router.post('/get-advice', async (req, res) => {
  try {
    const { topic, profileData, recentRecords } = req.body;

    if (!genAI) {
      return res.status(500).json({
        success: false,
        message: 'AI API가 설정되지 않았습니다.'
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
당신은 전문 간호사 건강 관리 AI 어시스턴트입니다.
사용자가 "${topic}"에 대한 조언을 요청했습니다.

**사용자 정보:**
- 연령: ${profileData?.age || '정보 없음'}세
- 성별: ${profileData?.gender || '정보 없음'}
- 직업: ${profileData?.occupation || '정보 없음'}
- 만성질환: ${profileData?.chronicDiseases?.length > 0 ? profileData.chronicDiseases.map(d => d.disease).join(', ') : '없음'}

간호사에게 특화된, 실천 가능한 조언을 3-5개 제공해주세요.
각 조언은 구체적이고 실행 가능해야 하며, 과학적 근거가 있어야 합니다.

한국어로 작성하고, 친근하면서도 전문적인 톤으로 작성해주세요.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const advice = response.text();

    res.json({
      success: true,
      advice: advice
    });
  } catch (error) {
    console.error('AI 조언 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: 'AI 조언 생성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
