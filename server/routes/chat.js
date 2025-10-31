const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// 메모리에 채팅 세션 저장 (임시)
// 실제 운영에서는 MongoDB에 저장 권장
const chatSessions = new Map();

// 1. 채팅 시작
router.post('/start', async (req, res) => {
  try {
    const { recordData, profileData, userId } = req.body;

    if (!genAI) {
      return res.status(500).json({
        success: false,
        message: 'AI API가 설정되지 않았습니다.'
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // PHQ-9 해석
    let phq9Level = '정보 없음';
    if (recordData.phq9Total !== undefined) {
      if (recordData.phq9Total <= 4) phq9Level = '우울증상 최소화';
      else if (recordData.phq9Total <= 9) phq9Level = '가벼운 우울증상';
      else if (recordData.phq9Total <= 14) phq9Level = '중간정도 우울증상';
      else if (recordData.phq9Total <= 19) phq9Level = '중간정도-심한 우울증상';
      else phq9Level = '심한 우울증상';
    }

    // PSS-10 해석
    let pssLevel = '정보 없음';
    if (recordData.pssTotal !== undefined) {
      if (recordData.pssTotal <= 13) pssLevel = '낮음';
      else if (recordData.pssTotal <= 26) pssLevel = '보통';
      else pssLevel = '높음';
    }

    // 시스템 프롬프트 생성
    const systemPrompt = `
당신은 전문 간호사 건강 관리 AI 어시스턴트입니다.

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
- 수면 시간: ${recordData.sleepHours || 0}시간
- 수면의 질: ${recordData.sleepQuality || '기록 안 함'}/5
- 업무 강도: ${recordData.workIntensity}/10
- 식사: ${recordData.meals?.join(', ') || '기록 안 함'}
- PSS-10 점수: ${recordData.pssTotal}/40 (${pssLevel})
- PHQ-9 점수: ${recordData.phq9Total}/27 (${phq9Level})
${recordData.bloodSugar ? `- 혈당: ${recordData.bloodSugar}mg/dL` : ''}
${recordData.bloodPressureSystolic ? `- 혈압: ${recordData.bloodPressureSystolic}/${recordData.bloodPressureDiastolic}mmHg` : ''}
${recordData.steps ? `- 걸음 수: ${recordData.steps}보` : ''}
${recordData.notes ? `- 메모: "${recordData.notes}"` : ''}

**대화 가이드:**
1. 가장 우려되는 지표(PHQ-9, PSS-10, 스트레스, 수면 등)에 대해 먼저 질문
2. 짧고 명확한 질문 (한 번에 1-2개 질문만)
3. 공감적이고 친근한 톤 유지
4. 구체적인 상황을 파악하기 위한 후속 질문
5. 근무 형태(3교대/상근직)와 진료과 특성을 고려한 맞춤 질문
6. 5-7번의 대화 후 종합 조언 제공

이제 사용자와 대화를 시작하세요. 첫 질문을 해주세요.
`;

    // 채팅 세션 시작
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        {
          role: 'model',
          parts: [{ text: '네, 이해했습니다. 사용자의 건강 상태를 파악하기 위해 대화를 시작하겠습니다.' }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.7,
      },
    });

    // 첫 질문 생성
    const result = await chat.sendMessage('사용자에게 첫 질문을 해주세요.');
    const firstQuestion = result.response.text();

    // 세션 ID 생성 및 저장
    const sessionId = `chat_${userId}_${Date.now()}`;
    chatSessions.set(sessionId, {
      chat,
      userId,
      recordData,
      messageCount: 1,
      startTime: new Date(),
    });

    res.json({
      success: true,
      sessionId,
      message: firstQuestion,
    });

  } catch (error) {
    console.error('채팅 시작 오류:', error);
    res.status(500).json({
      success: false,
      message: '채팅 시작 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 2. 대화 계속하기
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        message: '세션 ID와 메시지가 필요합니다.'
      });
    }

    // 세션 가져오기
    const session = chatSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: '세션을 찾을 수 없습니다.'
      });
    }

    // 메시지 전송 및 응답 받기
    const result = await session.chat.sendMessage(message);
    const response = result.response.text();

    // 메시지 카운트 증가
    session.messageCount++;

    // 5-7번 대화 후 종료 제안
    const shouldEnd = session.messageCount >= 6;

    res.json({
      success: true,
      message: response,
      messageCount: session.messageCount,
      shouldEnd,
    });

  } catch (error) {
    console.error('메시지 전송 오류:', error);
    res.status(500).json({
      success: false,
      message: '메시지 전송 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 3. 대화 종료 및 최종 분석
router.post('/end', async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = chatSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: '세션을 찾을 수 없습니다.'
      });
    }

    // 최종 종합 조언 요청
    const result = await session.chat.sendMessage(
      '대화 내용을 바탕으로 종합적인 건강 조언을 3-5가지 제공해주세요. 구체적이고 실천 가능한 조언이어야 합니다.'
    );
    const finalAdvice = result.response.text();

    // 세션 삭제
    chatSessions.delete(sessionId);

    res.json({
      success: true,
      advice: finalAdvice,
      totalMessages: session.messageCount,
    });

  } catch (error) {
    console.error('대화 종료 오류:', error);
    res.status(500).json({
      success: false,
      message: '대화 종료 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 4. 세션 정보 조회
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = chatSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '세션을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      messageCount: session.messageCount,
      startTime: session.startTime,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '세션 정보 조회 실패',
      error: error.message
    });
  }
});

module.exports = router;
