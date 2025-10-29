const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini API 키 (환경변수로 관리하는 것이 이상적이지만, 간단한 프로젝트를 위해 직접 사용)
const API_KEY = 'AIzaSyDs2hAmw2xgzMhbrazpQK4OkWeL-zf7g-0';
const genAI = new GoogleGenerativeAI(API_KEY);

// 일일 기록 분석
router.post('/analyze-daily', async (req, res) => {
  try {
    const { recordData, profileData } = req.body;

    if (!recordData) {
      return res.status(400).json({ success: false, message: '기록 데이터가 필요합니다.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // 프롬프트 생성
    const prompt = `
당신은 전문 간호사 건강 관리 AI 어시스턴트입니다. 아래의 일일 건강 기록을 분석하고 맞춤형 조언을 제공해주세요.

**사용자 프로필:**
- 연령: ${profileData?.age || '정보 없음'}세
- 성별: ${profileData?.gender || '정보 없음'}
- 직업: ${profileData?.occupation || '정보 없음'}
- 만성질환: ${profileData?.chronicDiseases?.length > 0 ? profileData.chronicDiseases.map(d => d.disease).join(', ') : '없음'}

**오늘의 기록:**
- 스트레스 수준: ${recordData.stressLevel}/10
- 수면 시간: ${recordData.sleepHours || '기록 안 함'}시간
- 수면의 질: ${recordData.sleepQuality ? recordData.sleepQuality + '/5' : '기록 안 함'}
- 업무 강도: ${recordData.workIntensity}/10
- 식사: ${recordData.meals?.join(', ') || '기록 안 함'}
- PSS-10 점수: ${recordData.pssTotal}/40 (${recordData.pssTotal <= 13 ? '낮음' : recordData.pssTotal <= 26 ? '보통' : '높음'})
${recordData.bloodSugar ? `- 혈당: ${recordData.bloodSugar}mg/dL` : ''}
${recordData.bloodPressureSystolic ? `- 혈압: ${recordData.bloodPressureSystolic}/${recordData.bloodPressureDiastolic}mmHg` : ''}
${recordData.steps ? `- 걸음 수: ${recordData.steps}보` : ''}
${recordData.notes ? `- 메모: "${recordData.notes}"` : ''}

다음 형식으로 분석 결과를 제공해주세요:

1. **전체 평가** (2-3문장): 오늘의 전반적인 건강 상태 평가
2. **주요 우려사항** (2-3개): 특히 주의가 필요한 부분
3. **맞춤 조언** (3-4개): 구체적이고 실천 가능한 조언
4. **긍정적 피드백** (1-2문장): 잘하고 있는 부분에 대한 격려

한국어로 작성하고, 친근하면서도 전문적인 톤으로 작성해주세요.
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

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
최근 7일 데이터를 기반으로 건강 상태의 변화 추이를 확인했습니다.

다음 형식으로 종합 분석 결과를 제공해주세요:

1. **전반적 건강 상태** (3-4문장): ${records.length}일간의 데이터로 본 전체적인 건강 상태
2. **긍정적 패턴** (2-3개): 잘 유지하고 있는 건강 습관
3. **개선이 필요한 영역** (2-3개): 주의가 필요한 부분과 그 이유
4. **장기 건강 관리 전략** (3-4개): 구체적이고 실천 가능한 장기 목표
5. **전문가 상담 권고** (필요시): 병원 방문이나 전문가 상담이 필요한지 여부

한국어로 작성하고, 데이터 기반의 객관적이면서도 따뜻한 톤으로 작성해주세요.
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

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
