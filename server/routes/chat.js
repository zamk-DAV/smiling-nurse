const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ChatSession = require('../models/ChatSession');
const Record = require('../models/Record');

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// 메모리에 Gemini 채팅 인스턴스만 저장 (대화 기록은 DB에 저장)
const geminiSessions = new Map();

// 1. 채팅 시작
router.post('/start', async (req, res) => {
  try {
    const { recordData, profileData, userId, recordId, conversationMode } = req.body;

    if (!genAI) {
      return res.status(500).json({
        success: false,
        message: 'AI API가 설정되지 않았습니다.'
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

    // 시스템 프롬프트 생성 (대화 모드에 따라 다름)
    let systemPrompt;

    if (conversationMode) {
      // 대화 모드: 심층 대화 위주
      systemPrompt = `
당신은 전문 간호사 건강 관리 AI 어시스턴트입니다.

**사용자 프로필:**
- 연령: ${profileData?.age || '정보 없음'}세
- 성별: ${profileData?.gender || '정보 없음'}
- 경력: ${profileData?.yearsOfExperience || '정보 없음'}년차
- 직책: ${profileData?.position || '정보 없음'}
- 진료과: ${profileData?.department || '정보 없음'}

**현재까지 작성한 정보:**
- 근무 형태: ${recordData.workType || '아직 작성 안 함'}
${recordData.shiftType ? `- 근무 시간: ${recordData.shiftType}` : ''}
- 스트레스 수준: ${recordData.stressLevel ? `${recordData.stressLevel}/10` : '아직 작성 안 함'}
- 수면: ${recordData.sleepHours ? `${recordData.sleepHours}시간 ${recordData.sleepMinutes || 0}분` : '아직 작성 안 함'}
- 업무 강도: ${recordData.workIntensity ? `${recordData.workIntensity}/10` : '아직 작성 안 함'}
${recordData.notes ? `- 메모: "${recordData.notes}"` : ''}

**대화 목적:**
사용자는 폼 작성 중에 대화를 요청했습니다. 폼에서 다루지 않는 심층적인 내용을 대화로 다뤄야 합니다:
1. 구체적인 스트레스 원인 (인간관계, 환자 대응, 업무 과부하 등)
2. 감정 상태 (불안, 우울, 분노, 좌절감 등)
3. 최근 특별히 힘들었던 사건이나 상황
4. 대처 방법이나 해소 방법
5. 일상 생활에서의 어려움
6. 개인적 고민이나 걱정

**대화 가이드:**
1. 짧고 명확한 질문 (한 번에 1-2개 질문만)
2. 공감적이고 친근한 톤 유지
3. 음성 대화이므로 자연스럽고 대화체로 응답
4. 3-5번의 간단한 대화로 핵심 파악
5. 종료 시 짧은 조언만 제공 (상세한 조언은 폼 저장 후 제공됨)

첫 질문으로 오늘 가장 힘들었던 점이나 마음 속 이야기를 편하게 물어보세요.
`;
    } else {
      // 기존 모드: 전체 데이터 기반 대화
      systemPrompt = `
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
1. 가장 우려되는 지표에 대해 먼저 질문
2. 짧고 명확한 질문 (한 번에 1-2개 질문만)
3. 공감적이고 친근한 톤 유지
4. 구체적인 상황을 파악하기 위한 후속 질문
5. 근무 형태와 진료과 특성을 고려한 맞춤 질문
6. 5-7번의 대화 후 종합 조언 제공
7. **음성으로 대화하므로 자연스럽고 대화체로 응답**

이제 사용자와 음성 대화를 시작하세요. 첫 질문을 해주세요.
`;
    }

    // Gemini 채팅 세션 시작
    const geminiChat = model.startChat({
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
    const result = await geminiChat.sendMessage('사용자에게 첫 질문을 해주세요.');
    const firstQuestion = result.response.text();

    console.log('Gemini 첫 질문 응답:', firstQuestion);

    // 응답 검증
    if (!firstQuestion || firstQuestion.trim().length === 0) {
      throw new Error('Gemini API가 빈 응답을 반환했습니다.');
    }

    // MongoDB에 채팅 세션 생성
    const chatSession = new ChatSession({
      userId,
      recordId: recordId || null,
      messages: [
        {
          role: 'ai',
          content: firstQuestion.trim()
        }
      ],
      status: 'active',
      conversationMode: conversationMode || false
    });

    await chatSession.save();

    // Gemini 세션 메모리에 저장
    geminiSessions.set(chatSession._id.toString(), {
      geminiChat,
      messageCount: 1,
      conversationMode: conversationMode || false
    });

    res.json({
      success: true,
      sessionId: chatSession._id.toString(),
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

    // DB에서 세션 가져오기
    const chatSession = await ChatSession.findById(sessionId);
    if (!chatSession) {
      return res.status(404).json({
        success: false,
        message: '세션을 찾을 수 없습니다.'
      });
    }

    // Gemini 세션 가져오기
    const geminiSession = geminiSessions.get(sessionId);
    if (!geminiSession) {
      return res.status(404).json({
        success: false,
        message: 'AI 세션이 만료되었습니다.'
      });
    }

    // 사용자 메시지 저장
    chatSession.messages.push({
      role: 'user',
      content: message
    });

    // Gemini에 메시지 전송
    const result = await geminiSession.geminiChat.sendMessage(message);
    const response = result.response.text();

    // AI 응답 저장
    chatSession.messages.push({
      role: 'ai',
      content: response
    });

    await chatSession.save();

    // 메시지 카운트 증가
    geminiSession.messageCount++;

    // 5-7번 대화 후 종료 제안
    const shouldEnd = geminiSession.messageCount >= 6;

    res.json({
      success: true,
      message: response,
      messageCount: geminiSession.messageCount,
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
    const { sessionId, conversationMode } = req.body;

    // DB에서 세션 가져오기
    const chatSession = await ChatSession.findById(sessionId);
    if (!chatSession) {
      return res.status(404).json({
        success: false,
        message: '세션을 찾을 수 없습니다.'
      });
    }

    // Gemini 세션 가져오기
    const geminiSession = geminiSessions.get(sessionId);
    if (!geminiSession) {
      return res.status(404).json({
        success: false,
        message: 'AI 세션이 만료되었습니다.'
      });
    }

    let finalAdvice;

    // 대화 모드에 따라 다른 종료 메시지
    if (conversationMode || geminiSession.conversationMode) {
      // 대화 모드: 짧은 종료 메시지
      const result = await geminiSession.geminiChat.sendMessage(
        '대화를 마무리하며, 사용자에게 위로와 격려의 말을 짧게 전해주세요. 그리고 기록 저장 후 상세한 조언을 받을 수 있다고 안내해주세요.'
      );
      finalAdvice = result.response.text();
    } else {
      // 기존 모드: 상세한 종합 조언
      const result = await geminiSession.geminiChat.sendMessage(
        '대화 내용을 바탕으로 종합적인 건강 조언을 3-5가지 제공해주세요. 구체적이고 실천 가능한 조언이어야 합니다.'
      );
      finalAdvice = result.response.text();
    }

    // 최종 조언 저장
    chatSession.finalAdvice = finalAdvice;
    chatSession.status = 'ended';
    chatSession.endedAt = new Date();

    await chatSession.save();

    // 메모리에서 Gemini 세션 삭제
    geminiSessions.delete(sessionId);

    res.json({
      success: true,
      advice: finalAdvice,
      totalMessages: chatSession.messages.length,
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

    const chatSession = await ChatSession.findById(sessionId);
    if (!chatSession) {
      return res.status(404).json({
        success: false,
        message: '세션을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      session: chatSession
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '세션 정보 조회 실패',
      error: error.message
    });
  }
});

// 5. 사용자의 최근 대화 기록 조회 (AI 분석 시 사용)
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 5 } = req.query;

    const sessions = await ChatSession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('messages finalAdvice createdAt status');

    res.json({
      success: true,
      sessions
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '대화 기록 조회 실패',
      error: error.message
    });
  }
});

module.exports = router;
