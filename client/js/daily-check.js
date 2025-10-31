// 스마일링 널스 - 일일 체크 로직

// showAlert 함수는 auth.js에서 정의되어 있으므로 여기서는 사용만 함.

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
  const userId = checkAuth();
  if (!userId) return;

  // 근무 형태 선택 시 근무 시간 필드 표시/숨김
  const workTypeSelect = document.getElementById('work-type');
  const shiftTypeGroup = document.getElementById('shift-type-group');
  const shiftTypeSelect = document.getElementById('shift-type');

  workTypeSelect?.addEventListener('change', (e) => {
    if (e.target.value === '3교대') {
      shiftTypeGroup.style.display = 'block';
      shiftTypeSelect.required = true;
    } else {
      shiftTypeGroup.style.display = 'none';
      shiftTypeSelect.required = false;
      shiftTypeSelect.value = '';
    }
  });

  // 폼 제출 처리 (9번 요구사항: 저장 후 AI 분석)
  document.getElementById('daily-check-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 버튼 비활성화 및 로딩 표시
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '💾 저장하는 중... <span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span>';

    const formData = new FormData(e.target);

    // PSS-10 항목 선택 여부 검증 (자잘한 오류 수정)
    for (let i = 1; i <= 10; i++) {
        if (!formData.get(`pss${i}`)) {
            showAlert(`PSS-10의 ${i}번 질문에 답해주세요.`, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }
    }

    // PHQ-9 항목 선택 여부 검증
    for (let i = 1; i <= 9; i++) {
        if (!formData.get(`phq9${i}`)) {
            showAlert(`PHQ-9의 ${i}번 질문에 답해주세요.`, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }
    }

    // 식사 체크박스 수집
    const meals = [];
    document.querySelectorAll('input[name="meals"]:checked').forEach(input => {
        meals.push(input.value);
    });

    // PSS-10 점수 계산 (역채점 문항: 4, 5, 7, 8)
    const pssScores = [];
    for (let i = 1; i <= 10; i++) {
      const value = parseInt(formData.get(`pss${i}`));
      // 4, 5, 7, 8번 문항은 역채점 (4 - 값)
      if ([4, 5, 7, 8].includes(i)) {
        pssScores.push(4 - value);
      } else {
        pssScores.push(value);
      }
    }
    const pssTotal = pssScores.reduce((a, b) => a + b, 0);

    // PHQ-9 점수 계산 (0-27점)
    const phq9Scores = [];
    for (let i = 1; i <= 9; i++) {
      const value = parseInt(formData.get(`phq9${i}`));
      phq9Scores.push(value);
    }
    const phq9Total = phq9Scores.reduce((a, b) => a + b, 0);

    // 수면 시간 계산 (시간 + 분/60) (6번 요구사항)
    const sleepHoursInput = parseInt(formData.get('sleepHours')) || 0;
    const sleepMinutesInput = parseInt(formData.get('sleepMinutes')) || 0;
    const totalSleepHours = sleepHoursInput + (sleepMinutesInput / 60);

    // 데이터 객체 생성
    const recordData = {
      workType: formData.get('workType') || null,
      shiftType: formData.get('shiftType') || null,
      stressLevel: parseInt(formData.get('stressLevel')),
      sleepHours: totalSleepHours > 0 ? parseFloat(totalSleepHours.toFixed(2)) : null,
      sleepQuality: parseInt(formData.get('sleepQuality')) || null,
      meals: meals,
      workIntensity: parseInt(formData.get('workIntensity')),
      bloodSugar: parseFloat(formData.get('bloodSugar')) || null,
      steps: parseInt(formData.get('steps')) || null,
      bloodPressureSystolic: parseInt(formData.get('bloodPressureSystolic')) || null,
      bloodPressureDiastolic: parseInt(formData.get('bloodPressureDiastolic')) || null,
      pssScores: pssScores,
      pssTotal: pssTotal,
      phq9Total: phq9Total,
      notes: formData.get('notes') || '',
      date: new Date().toISOString() // 기록 날짜 추가
    };

    try {
      const response = await fetch(`${API_URL}/records/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData)
      });

      const data = await response.json();

      if (data.success) {
        // Record ID 저장 (대화 시 사용)
        const recordId = data.record?._id || data.recordId;

        // 저장 완료 메시지
        showAlert('✅ 기록이 성공적으로 저장되었습니다. AI 분석을 시작합니다.', 'success');
        submitBtn.innerHTML = '🤖 AI 분석 중... <span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span>';

        // PSS-10 결과 표시
        let stressLevel = '보통';
        if (pssTotal <= 13) stressLevel = '낮음';
        else if (pssTotal >= 27) stressLevel = '높음';

        // PHQ-9 결과 해석
        let phq9Level = '';
        if (phq9Total <= 4) phq9Level = '우울증상 최소화';
        else if (phq9Total <= 9) phq9Level = '가벼운 우울증상';
        else if (phq9Total <= 14) phq9Level = '중간정도 우울증상';
        else if (phq9Total <= 19) phq9Level = '중간정도-심한 우울증상';
        else phq9Level = '심한 우울증상';

        // AI 분석 요청 (9번 요구사항)
        getAIAnalysis(recordData, pssTotal, stressLevel, phq9Total, phq9Level, recordId, submitBtn, originalText);
      } else {
        // 오류 시 버튼 복원
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        showAlert(data.message, 'error');
      }
    } catch (error) {
      console.error('기록 저장 오류:', error);
      // 오류 시 버튼 복원
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      showAlert('서버와의 연결에 실패했습니다.', 'error');
    }
  });
});

// AI 분석 요청 함수
async function getAIAnalysis(recordData, pssTotal, stressLevel, phq9Total, phq9Level, recordId, submitBtn, originalText) {
  try {
    const userId = localStorage.getItem('userId');

    // 프로필 데이터 가져오기
    const profileResponse = await fetch(`${API_URL}/user/profile/${userId}`);
    const profileData = await profileResponse.json();

    // AI 분석 요청
    const response = await fetch(`${API_URL}/ai/analyze-daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordData: recordData,
        profileData: profileData.profile,
        userId: userId
      })
    });

    const data = await response.json();

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;

    if (data.success) {
      // AI 분석 결과 모달 표시
      showAIAnalysisModal(data.analysis, pssTotal, stressLevel, phq9Total, phq9Level, recordData, profileData.profile, recordId);
    } else {
      // AI 분석 실패 시에도 기본 결과 표시
      showAlert(`✨ AI 분석에 실패했습니다. PSS-10: ${pssTotal}점, PHQ-9: ${phq9Total}점`, 'warning');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    }
  } catch (error) {
    console.error('AI 분석 오류:', error);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    // 오류 시에도 기본 결과 표시
    showAlert(`✨ AI 분석 중 오류가 발생했습니다. PSS-10 점수: ${pssTotal}점 (수준: ${stressLevel})`, 'error');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
  }
}

// AI 분석 결과 모달 표시 (9번 요구사항)
function showAIAnalysisModal(analysis, pssTotal, stressLevel, phq9Total, phq9Level, recordData, profileData, recordId) {
  // 모달 HTML 생성
  const modal = document.createElement('div');
  modal.id = 'ai-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease-out;
  `;

  // PHQ-9 색상 결정
  let phq9Color = '#C8E6C9'; // 최소화 (초록)
  if (phq9Total > 14) phq9Color = '#FFCDD2'; // 중간-심함 (빨강)
  else if (phq9Total > 9) phq9Color = '#FFE0B2'; // 중간 (주황)
  else if (phq9Total > 4) phq9Color = '#FFF9C4'; // 가벼움 (노랑)

  modal.innerHTML = `
    <div class="card" style="max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto; position: relative;">
      <button onclick="closeAIModal()" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-gray); transition: var(--transition);">×</button>

      <div class="header">
        <div class="logo">🤖</div>
        <h1>AI 건강 분석 결과</h1>
        <p>오늘의 기록을 기반으로 한 맞춤형 조언</p>
      </div>

      <div class="card" style="background: linear-gradient(135deg, var(--light-green), rgba(255, 255, 255, 0.8)); margin-bottom: 20px; padding: 20px;">
        <h3 style="color: var(--primary-green); margin-bottom: 12px;">📊 오늘의 정신건강 수준</h3>

        <div style="margin-bottom: 20px;">
          <div style="font-size: 18px; font-weight: 600; color: var(--text-gray); margin-bottom: 8px;">스트레스 척도 (PSS-10)</div>
          <div style="font-size: 28px; font-weight: 700; color: var(--primary-green); text-align: center; margin: 12px 0;">
            ${pssTotal}점 / 40점
          </div>
          <div style="text-align: center; padding: 8px 16px; background: ${stressLevel === '낮음' ? '#C8E6C9' : stressLevel === '높음' ? '#FFCDD2' : '#FFF9C4'}; border-radius: 20px; display: inline-block; margin: 0 auto; width: 100%;">
            <strong>${stressLevel}</strong>
          </div>
        </div>

        <div>
          <div style="font-size: 18px; font-weight: 600; color: var(--text-gray); margin-bottom: 8px;">우울증 척도 (PHQ-9)</div>
          <div style="font-size: 28px; font-weight: 700; color: var(--primary-green); text-align: center; margin: 12px 0;">
            ${phq9Total}점 / 27점
          </div>
          <div style="text-align: center; padding: 8px 16px; background: ${phq9Color}; border-radius: 20px; display: inline-block; margin: 0 auto; width: 100%;">
            <strong>${phq9Level}</strong>
          </div>
        </div>
      </div>

      <div class="card" style="padding: 24px; margin-bottom: 20px; white-space: pre-wrap; line-height: 1.8;">
        ${formatAnalysis(analysis)}
      </div>

      <button onclick="closeAIModal()" class="btn btn-primary" style="width: 100%;">
        ✅ 확인
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  // 채팅 데이터 저장 (채팅 시작 시 사용)
  window.currentRecordData = recordData;
  window.currentProfileData = profileData;
  window.currentRecordId = recordId;
}

// AI 분석 텍스트 포맷팅
function formatAnalysis(text) {
  // 마크다운 스타일 포맷팅
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--primary-green); font-size: 18px;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color: var(--dark-green);">$1</em>')
    .replace(/(\d+)\./g, '<br><strong style="color: var(--primary-green);">$1.</strong>')
    .replace(/\n\n/g, '</p><p style="margin: 20px 0;">')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/gm, '<p style="margin: 16px 0;">$1</p>');
}

// AI 모달 닫기
function closeAIModal() {
  const modal = document.getElementById('ai-modal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      modal.remove();
      window.location.href = 'dashboard.html';
    }, 300);
  }
}

// === 음성 대화 기능 ===

// 음성 인식 및 합성 초기화
let recognition = null;
let synthesis = window.speechSynthesis;
let isListening = false;
let isSpeaking = false;
let conversationMode = false; // 대화 모드 (저장 없이 대화만)

// 음성 인식 초기화
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    showAlert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.', 'error');
    return null;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'ko-KR';
  recognition.continuous = false;
  recognition.interimResults = false;

  return recognition;
}

// 텍스트를 음성으로 변환 (TTS)
function speak(text) {
  return new Promise((resolve) => {
    if (isSpeaking) {
      synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.1; // 약간 빠르게
    utterance.pitch = 1.1; // 약간 높게, 더 생동감
    utterance.volume = 1.0;

    // 한국어 음성 선택 (브라우저가 로드될 때까지 대기)
    const setVoiceAndSpeak = () => {
      const voices = synthesis.getVoices();

      // 더 자연스러운 음성 우선 선택 (Google 한국어 음성 선호)
      const koreanVoice =
        voices.find(voice => voice.name.includes('Google') && voice.lang.startsWith('ko')) ||
        voices.find(voice => voice.name.includes('Female') && voice.lang.startsWith('ko')) ||
        voices.find(voice => voice.lang.startsWith('ko'));

      if (koreanVoice) {
        utterance.voice = koreanVoice;
        console.log('선택된 음성:', koreanVoice.name);
      }

      utterance.onstart = () => {
        isSpeaking = true;
        updateSpeakingStatus(true);
      };

      utterance.onend = () => {
        isSpeaking = false;
        updateSpeakingStatus(false);
        resolve();
      };

      utterance.onerror = (e) => {
        console.error('TTS 오류:', e);
        isSpeaking = false;
        updateSpeakingStatus(false);
        resolve();
      };

      synthesis.speak(utterance);
    };

    // 음성 목록이 로드되어 있지 않으면 대기
    if (synthesis.getVoices().length === 0) {
      synthesis.addEventListener('voiceschanged', setVoiceAndSpeak, { once: true });
    } else {
      setVoiceAndSpeak();
    }
  });
}

// 음성 상태 UI 업데이트
function updateSpeakingStatus(speaking) {
  const statusDiv = document.getElementById('voice-status');
  const micButton = document.getElementById('mic-button');

  if (statusDiv) {
    if (speaking) {
      statusDiv.innerHTML = '🔊 AI가 말하는 중...';
      statusDiv.style.color = 'var(--primary-green)';
      if (micButton) micButton.disabled = true;
    } else if (isListening) {
      statusDiv.innerHTML = '🎤 듣고 있습니다...';
      statusDiv.style.color = '#FF6B6B';
    } else {
      statusDiv.innerHTML = '💬 마이크 버튼을 눌러 말씀해주세요';
      statusDiv.style.color = 'var(--text-gray)';
      if (micButton) micButton.disabled = false;
    }
  }
}

// 대화 모드 시작 함수 (폼 작성 중 대화)
async function startConversationMode() {
  const userId = localStorage.getItem('userId');

  if (!userId) {
    showAlert('로그인이 필요합니다.', 'error');
    return;
  }

  const form = document.getElementById('daily-check-form');
  const formData = new FormData(form);

  // 음성 인식 초기화
  const recognitionInstance = initSpeechRecognition();
  if (!recognitionInstance) {
    return;
  }

  // 대화 모드 활성화
  conversationMode = true;

  // 현재 작성 중인 폼 데이터 수집 (검증 없이)
  const meals = [];
  document.querySelectorAll('input[name="meals"]:checked').forEach(input => {
    meals.push(input.value);
  });

  const partialRecordData = {
    workType: formData.get('workType') || null,
    shiftType: formData.get('shiftType') || null,
    stressLevel: formData.get('stressLevel') ? parseInt(formData.get('stressLevel')) : null,
    sleepHours: formData.get('sleepHours') ? parseInt(formData.get('sleepHours')) : null,
    sleepMinutes: formData.get('sleepMinutes') ? parseInt(formData.get('sleepMinutes')) : null,
    sleepQuality: formData.get('sleepQuality') ? parseInt(formData.get('sleepQuality')) : null,
    meals: meals,
    workIntensity: formData.get('workIntensity') ? parseInt(formData.get('workIntensity')) : null,
    notes: formData.get('notes') || ''
  };

  console.log('대화 모드 시작 - userId:', userId);
  console.log('부분 폼 데이터:', partialRecordData);

  try {
    // 프로필 데이터 가져오기
    console.log('프로필 데이터 요청 중...');
    const profileResponse = await fetch(`${API_URL}/user/profile/${userId}`);

    if (!profileResponse.ok) {
      throw new Error(`프로필 조회 실패: ${profileResponse.status}`);
    }

    const profileData = await profileResponse.json();
    console.log('프로필 데이터:', profileData);

    if (!profileData.success) {
      throw new Error('프로필 데이터를 가져올 수 없습니다.');
    }

    // 음성 대화 UI 표시
    showVoiceUI();

    // 채팅 세션 시작 (recordId 없이, 대화 모드)
    console.log('채팅 세션 시작 요청 중...');
    const response = await fetch(`${API_URL}/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordData: partialRecordData,
        profileData: profileData.profile,
        userId,
        recordId: null, // 저장 전이므로 recordId 없음
        conversationMode: true // 대화 모드 플래그
      })
    });

    console.log('채팅 세션 응답 상태:', response.status);

    if (!response.ok) {
      throw new Error(`채팅 세션 시작 실패: ${response.status}`);
    }

    const data = await response.json();
    console.log('채팅 세션 응답:', data);

    if (data.success) {
      // 세션 ID 저장
      window.chatSessionId = data.sessionId;
      window.chatMessageCount = 0;

      // 첫 AI 메시지 표시 및 음성 출력
      addVoiceMessage('ai', data.message);
      await speak(data.message);

      // 음성 인식 설정
      setupVoiceRecognition();
    } else {
      showAlert(`음성 대화 시작에 실패했습니다: ${data.message}`, 'error');
      closeVoiceUI();
      conversationMode = false;
    }
  } catch (error) {
    console.error('음성 대화 시작 오류 상세:', error);
    showAlert(`음성 대화 시작 중 오류가 발생했습니다: ${error.message}`, 'error');
    closeVoiceUI();
    conversationMode = false;
  }
}

// 음성 대화 시작 함수 (AI 분석 후 대화)
async function startHealthChat() {
  const userId = localStorage.getItem('userId');
  const recordData = window.currentRecordData;
  const profileData = window.currentProfileData;
  const recordId = window.currentRecordId;

  if (!recordData || !profileData || !recordId) {
    showAlert('대화를 시작할 수 없습니다. 데이터를 다시 확인해주세요.', 'error');
    return;
  }

  // 음성 인식 초기화
  const recognitionInstance = initSpeechRecognition();
  if (!recognitionInstance) {
    return;
  }

  // AI 모달 닫기
  const aiModal = document.getElementById('ai-modal');
  if (aiModal) aiModal.remove();

  // 음성 대화 UI 표시
  showVoiceUI();

  try {
    // 채팅 세션 시작
    const response = await fetch(`${API_URL}/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordData,
        profileData,
        userId,
        recordId
      })
    });

    const data = await response.json();

    if (data.success) {
      // 세션 ID 저장
      window.chatSessionId = data.sessionId;
      window.chatMessageCount = 0;

      // 첫 AI 메시지 표시 및 음성 출력
      addVoiceMessage('ai', data.message);
      await speak(data.message);

      // 음성 인식 설정
      setupVoiceRecognition();
    } else {
      showAlert('음성 상담 시작에 실패했습니다.', 'error');
      closeVoiceUI();
    }
  } catch (error) {
    console.error('음성 상담 시작 오류:', error);
    showAlert('음성 상담 시작 중 오류가 발생했습니다.', 'error');
    closeVoiceUI();
  }
}

// 음성 대화 UI 표시
function showVoiceUI() {
  const voiceUI = document.createElement('div');
  voiceUI.id = 'voice-modal';
  voiceUI.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    animation: fadeIn 0.3s ease-out;
  `;

  voiceUI.innerHTML = `
    <div class="card" style="max-width: 600px; width: 90%; height: 80vh; display: flex; flex-direction: column; position: relative;">
      <button onclick="closeVoiceUI()" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-gray); z-index: 10;">×</button>

      <div style="padding: 24px; border-bottom: 2px solid var(--light-green);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="logo" style="font-size: 32px;">🎤</div>
          <div>
            <h2 style="color: var(--primary-green); margin: 0;">AI 음성 상담</h2>
            <p style="color: var(--text-gray); margin: 4px 0 0 0; font-size: 14px;">편안하게 이야기 나눠보세요</p>
          </div>
        </div>
      </div>

      <div id="voice-messages" style="flex: 1; overflow-y: auto; padding: 20px; background: #f9f9f9;">
        <!-- 메시지가 여기에 추가됩니다 -->
      </div>

      <div style="padding: 20px; border-top: 2px solid var(--light-green); background: white;">
        <div id="voice-status" style="text-align: center; margin-bottom: 16px; font-size: 16px; font-weight: 500; color: var(--text-gray);">
          💬 마이크 버튼을 눌러 말씀해주세요
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button id="mic-button" onclick="startListening()" class="btn btn-primary" style="flex: 1; padding: 16px; font-size: 18px;">
            🎤 말하기
          </button>
          <button onclick="endVoiceSession()" class="btn btn-secondary" style="padding: 16px 24px; white-space: nowrap;">
            💾 종료
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(voiceUI);
}

// 음성 메시지 추가
function addVoiceMessage(sender, message) {
  const messagesContainer = document.getElementById('voice-messages');
  if (!messagesContainer) return;

  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = `
    margin-bottom: 16px;
    display: flex;
    justify-content: ${sender === 'user' ? 'flex-end' : 'flex-start'};
  `;

  const bubbleColor = sender === 'user' ? 'var(--primary-green)' : 'white';
  const textColor = sender === 'user' ? 'white' : 'var(--text-dark)';
  const bubble = document.createElement('div');
  bubble.style.cssText = `
    max-width: 70%;
    padding: 12px 16px;
    border-radius: 16px;
    background: ${bubbleColor};
    color: ${textColor};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    line-height: 1.6;
    ${sender === 'ai' ? 'border: 2px solid var(--light-green);' : ''}
  `;
  bubble.textContent = message;

  messageDiv.appendChild(bubble);
  messagesContainer.appendChild(messageDiv);

  // 스크롤을 맨 아래로
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 음성 인식 설정
function setupVoiceRecognition() {
  if (!recognition) return;

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    console.log('인식된 음성:', transcript);

    // 사용자 메시지 표시
    addVoiceMessage('user', transcript);

    // 음성 인식 종료 상태로 변경
    isListening = false;
    updateSpeakingStatus(false);

    // AI에게 메시지 전송
    await sendVoiceMessage(transcript);
  };

  recognition.onerror = (event) => {
    console.error('음성 인식 오류:', event.error);
    isListening = false;
    updateSpeakingStatus(false);

    if (event.error === 'no-speech') {
      showAlert('음성이 감지되지 않았습니다. 다시 시도해주세요.', 'warning');
    } else if (event.error === 'not-allowed') {
      showAlert('마이크 권한이 필요합니다. 브라우저 설정을 확인해주세요.', 'error');
    } else {
      showAlert('음성 인식 중 오류가 발생했습니다.', 'error');
    }
  };

  recognition.onend = () => {
    isListening = false;
    updateSpeakingStatus(false);
  };
}

// 음성 인식 시작
function startListening() {
  if (!recognition || isListening || isSpeaking) return;

  isListening = true;
  updateSpeakingStatus(false);

  try {
    recognition.start();
  } catch (error) {
    console.error('음성 인식 시작 오류:', error);
    isListening = false;
    updateSpeakingStatus(false);
  }
}

// 음성 메시지 전송
async function sendVoiceMessage(message) {
  try {
    const response = await fetch(`${API_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: window.chatSessionId,
        message
      })
    });

    const data = await response.json();

    if (data.success) {
      // AI 응답 표시 및 음성 출력
      addVoiceMessage('ai', data.message);
      await speak(data.message);

      window.chatMessageCount = data.messageCount || 0;

      // 종료 질문인 경우: 사용자가 계속 대화할지 물어본 상태
      if (data.isClosingQuestion) {
        // 다음 사용자 응답을 기다림 (계속할지 종료할지 결정)
        console.log('종료 질문 모드 활성화');
      }

      // 사용자가 종료를 원하는 경우
      if (data.shouldEnd) {
        // 마무리 인사 후 자동으로 종료 프로세스 시작
        setTimeout(() => {
          endVoiceSession();
        }, 2000);
      }
    } else {
      showAlert('메시지 전송에 실패했습니다.', 'error');
    }
  } catch (error) {
    console.error('메시지 전송 오류:', error);
    showAlert('메시지 전송 중 오류가 발생했습니다.', 'error');
  }
}

// 음성 세션 종료
async function endVoiceSession() {
  try {
    const response = await fetch(`${API_URL}/chat/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: window.chatSessionId,
        conversationMode: conversationMode
      })
    });

    const data = await response.json();

    if (data.success) {
      // 대화 모드일 때는 간단한 종료 메시지만
      if (conversationMode) {
        const endMessage = data.advice || '대화를 마칩니다. 저장하기 버튼을 눌러 기록을 저장해주세요.';
        addVoiceMessage('ai', endMessage);
        await speak(endMessage);

        // 음성 UI 닫고 폼으로 돌아가기
        setTimeout(() => {
          closeVoiceUI();
          conversationMode = false;
          showAlert('대화가 종료되었습니다. 저장하기를 눌러 기록을 저장하세요.', 'success');
        }, 3000);
      } else {
        // 기존 로직: 최종 조언 표시 및 대시보드 이동
        const finalMessage = '최종 건강 조언입니다. ' + data.advice;
        addVoiceMessage('ai', data.advice);
        await speak(finalMessage);

        // 몇 초 후 대시보드로 이동
        setTimeout(() => {
          closeVoiceUI();
          window.location.href = 'dashboard.html';
        }, 5000);
      }
    } else {
      showAlert('세션 종료에 실패했습니다.', 'error');
    }
  } catch (error) {
    console.error('세션 종료 오류:', error);
    showAlert('세션 종료 중 오류가 발생했습니다.', 'error');
  }
}

// 음성 UI 닫기
function closeVoiceUI() {
  // 음성 합성 중지
  if (synthesis.speaking) {
    synthesis.cancel();
  }

  // 음성 인식 중지
  if (recognition && isListening) {
    recognition.stop();
  }

  // 상태 초기화
  isSpeaking = false;
  isListening = false;

  const voiceModal = document.getElementById('voice-modal');
  if (voiceModal) {
    voiceModal.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      voiceModal.remove();
    }, 300);
  }
}
