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

    // 간호사 스트레스 측정도구 (19문항) 항목 선택 여부 검증
    for (let i = 1; i <= 19; i++) {
        if (!formData.get(`stress${i}`)) {
            showAlert(`간호사 스트레스 측정도구 ${i}번 질문에 답해주세요.`, 'error');
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

    // 간호사 스트레스 측정도구 점수 계산 (19문항, 4점 척도: 19-76점)
    const stressScores = [];
    for (let i = 1; i <= 19; i++) {
      const value = parseInt(formData.get(`stress${i}`));
      stressScores.push(value);
    }
    const stressTotal = stressScores.reduce((a, b) => a + b, 0);

    // 요인별 점수 계산
    const workOverloadScore = stressScores.slice(0, 9).reduce((a, b) => a + b, 0); // 1-9번 (업무과중)
    const emotionalLaborScore = stressScores.slice(9, 12).reduce((a, b) => a + b, 0); // 10-12번 (감정노동)
    const personalCharacteristicsScore = stressScores.slice(12, 15).reduce((a, b) => a + b, 0); // 13-15번 (개인적 특성)
    const organizationalCharacteristicsScore = stressScores.slice(15, 19).reduce((a, b) => a + b, 0); // 16-19번 (조직적 특성)

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
      stressScores: stressScores,
      stressTotal: stressTotal,
      workOverloadScore: workOverloadScore,
      emotionalLaborScore: emotionalLaborScore,
      personalCharacteristicsScore: personalCharacteristicsScore,
      organizationalCharacteristicsScore: organizationalCharacteristicsScore,
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

        // 스트레스 총점 결과 해석 (19-76점)
        let stressLevelText = '';
        if (stressTotal <= 38) stressLevelText = '낮은 스트레스';
        else if (stressTotal <= 57) stressLevelText = '보통 스트레스';
        else stressLevelText = '높은 스트레스';

        // 요인별 해석
        let workOverloadLevel = '';
        if (workOverloadScore <= 18) workOverloadLevel = '낮음';
        else if (workOverloadScore <= 27) workOverloadLevel = '보통';
        else workOverloadLevel = '높음';

        let emotionalLaborLevel = '';
        if (emotionalLaborScore <= 6) emotionalLaborLevel = '낮음';
        else if (emotionalLaborScore <= 9) emotionalLaborLevel = '보통';
        else emotionalLaborLevel = '높음';

        let personalLevel = '';
        if (personalCharacteristicsScore <= 6) personalLevel = '낮음';
        else if (personalCharacteristicsScore <= 9) personalLevel = '보통';
        else personalLevel = '높음';

        let organizationalLevel = '';
        if (organizationalCharacteristicsScore <= 8) organizationalLevel = '낮음';
        else if (organizationalCharacteristicsScore <= 12) organizationalLevel = '보통';
        else organizationalLevel = '높음';

        // AI 분석 요청
        getAIAnalysis(recordData, stressTotal, stressLevelText, workOverloadScore, emotionalLaborScore, personalCharacteristicsScore, organizationalCharacteristicsScore, recordId, submitBtn, originalText);
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
async function getAIAnalysis(recordData, stressTotal, stressLevelText, workOverloadScore, emotionalLaborScore, personalCharacteristicsScore, organizationalCharacteristicsScore, recordId, submitBtn, originalText) {
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
        userId: userId,
        recordId: recordId // AI 분석 결과를 DB에 저장하기 위해 전달
      })
    });

    const data = await response.json();

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;

    if (data.success) {
      // AI 분석 결과 모달 표시
      showAIAnalysisModal(data.analysis, stressTotal, stressLevelText, workOverloadScore, emotionalLaborScore, personalCharacteristicsScore, organizationalCharacteristicsScore, recordData, profileData.profile, recordId);
    } else {
      // AI 분석 실패 시에도 기본 결과 표시
      showAlert(`✨ AI 분석에 실패했습니다. 총 스트레스 점수: ${stressTotal}점 (${stressLevelText})`, 'warning');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    }
  } catch (error) {
    console.error('AI 분석 오류:', error);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    // 오류 시에도 기본 결과 표시
    showAlert(`✨ AI 분석 중 오류가 발생했습니다. 스트레스 점수: ${stressTotal}점 (${stressLevelText})`, 'error');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
  }
}

// AI 분석 결과 모달 표시
function showAIAnalysisModal(analysis, stressTotal, stressLevelText, workOverloadScore, emotionalLaborScore, personalCharacteristicsScore, organizationalCharacteristicsScore, recordData, profileData, recordId) {
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

  // 색상 결정
  let totalStressColor = stressTotal <= 38 ? '#C8E6C9' : stressTotal <= 57 ? '#FFF9C4' : '#FFCDD2';
  let workOverloadColor = workOverloadScore <= 18 ? '#C8E6C9' : workOverloadScore <= 27 ? '#FFF9C4' : '#FFCDD2';
  let emotionalLaborColor = emotionalLaborScore <= 6 ? '#C8E6C9' : emotionalLaborScore <= 9 ? '#FFF9C4' : '#FFCDD2';
  let personalColor = personalCharacteristicsScore <= 6 ? '#C8E6C9' : personalCharacteristicsScore <= 9 ? '#FFF9C4' : '#FFCDD2';
  let organizationalColor = organizationalCharacteristicsScore <= 8 ? '#C8E6C9' : organizationalCharacteristicsScore <= 12 ? '#FFF9C4' : '#FFCDD2';

  modal.innerHTML = `
    <div class="card" style="max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto; position: relative;">
      <button onclick="closeAIModal()" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-gray); transition: var(--transition);">×</button>

      <div class="header">
        <div class="logo">🩺</div>
        <h1>간호사 건강 AI 분석</h1>
        <p>간호사 스트레스 측정도구 기반 맞춤형 조언</p>
      </div>

      <div class="card" style="background: linear-gradient(135deg, var(--light-green), rgba(255, 255, 255, 0.8)); margin-bottom: 20px; padding: 20px;">
        <h3 style="color: var(--primary-green); margin-bottom: 16px;">🏥 간호사 스트레스 지표</h3>

        <div style="margin-bottom: 20px; border-bottom: 2px solid var(--primary-green); padding-bottom: 16px;">
          <div style="font-size: 16px; font-weight: 600; color: var(--text-gray); margin-bottom: 8px;">📊 총 스트레스 점수</div>
          <div style="font-size: 28px; font-weight: 700; color: var(--primary-green); text-align: center; margin: 8px 0;">
            ${stressTotal}점 / 76점
          </div>
          <div style="text-align: center; padding: 8px 16px; background: ${totalStressColor}; border-radius: 20px; display: inline-block; margin: 0 auto; width: 100%;">
            <strong>${stressLevelText}</strong>
          </div>
        </div>

        <h4 style="color: var(--primary-green); font-size: 14px; margin-bottom: 12px;">요인별 점수</h4>

        <div style="display: grid; gap: 12px;">
          <div style="background: white; padding: 10px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; font-weight: 600;">💼 업무과중</span>
              <span style="font-size: 16px; font-weight: 700; color: var(--primary-green);">${workOverloadScore}/36점</span>
            </div>
          </div>

          <div style="background: white; padding: 10px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; font-weight: 600;">😔 감정노동</span>
              <span style="font-size: 16px; font-weight: 700; color: var(--primary-green);">${emotionalLaborScore}/12점</span>
            </div>
          </div>

          <div style="background: white; padding: 10px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; font-weight: 600;">👤 개인적 특성</span>
              <span style="font-size: 16px; font-weight: 700; color: var(--primary-green);">${personalCharacteristicsScore}/12점</span>
            </div>
          </div>

          <div style="background: white; padding: 10px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; font-weight: 600;">🏢 조직적 특성</span>
              <span style="font-size: 16px; font-weight: 700; color: var(--primary-green);">${organizationalCharacteristicsScore}/16점</span>
            </div>
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

// 로딩 오버레이 표시
function showLoadingOverlay(message = '처리 중...') {
  const overlay = document.createElement('div');
  overlay.id = 'voice-loading-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease-out;
  `;

  overlay.innerHTML = `
    <div style="text-align: center; color: white;">
      <div style="font-size: 48px; margin-bottom: 20px; animation: spin 1s linear infinite;">⏳</div>
      <div style="font-size: 24px; font-weight: 600; margin-bottom: 12px;">${message}</div>
      <div style="font-size: 16px; color: rgba(255, 255, 255, 0.7);">잠시만 기다려주세요...</div>
    </div>
  `;

  document.body.appendChild(overlay);
  return overlay;
}

// 로딩 오버레이 닫기
function closeLoadingOverlay() {
  const overlay = document.getElementById('voice-loading-overlay');
  if (overlay) {
    overlay.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => overlay.remove(), 300);
  }
}

// === 음성 대화 기능 ===

// 음성 인식 및 합성 초기화
let recognition = null;
let synthesis = window.speechSynthesis;
let isListening = false;
let isSpeaking = false;
let isProcessing = false; // AI 응답 대기 중

// Web Audio API for volume detection
let audioContext = null;
let analyser = null;
let microphone = null;
let volumeCheckInterval = null;
const VOLUME_THRESHOLD = -50; // 데시벨 임계값 (조정 가능)
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

// Web Audio API 초기화 (볼륨 측정용)
async function initAudioContext() {
  try {
    // AudioContext 생성
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();

    // 마이크 접근
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphone = audioContext.createMediaStreamSource(stream);

    // Analyser 노드 생성
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;

    microphone.connect(analyser);

    console.log('✅ Web Audio API 초기화 완료');
  } catch (error) {
    console.error('Web Audio API 초기화 실패:', error);
    showAlert('마이크 접근 권한이 필요합니다.', 'error');
  }
}

// 현재 볼륨 레벨 측정 (데시벨)
function getVolumeLevel() {
  if (!analyser) return -100;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  // 평균 볼륨 계산
  const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

  // 데시벨로 변환 (0-255 범위를 -100 ~ 0 dB로 변환)
  const decibels = average > 0 ? 20 * Math.log10(average / 255) : -100;

  return decibels;
}

// 볼륨 체크하여 음성 인식 시작 여부 결정
function checkAndStartRecognition() {
  if (!analyser || !recognition) return;

  const volume = getVolumeLevel();
  console.log('현재 볼륨:', volume.toFixed(2), 'dB');

  // 임계값 이상일 때만 음성 인식 시작
  if (volume > VOLUME_THRESHOLD) {
    // 볼륨 체크 중지
    if (volumeCheckInterval) {
      clearInterval(volumeCheckInterval);
      volumeCheckInterval = null;
    }

    // 음성 인식 시작
    try {
      recognition.start();
      console.log('✅ 볼륨 임계값 초과, 음성 인식 시작');
    } catch (error) {
      console.error('음성 인식 시작 오류:', error);
      isListening = false;
      updateSpeakingStatus(false);
    }
  }
}

// 모바일 환경 감지
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 텍스트를 음성으로 변환 (TTS)
function speak(text) {
  return new Promise((resolve) => {
    if (isSpeaking) {
      synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';

    // 모바일 환경에 따라 다른 설정 적용
    const isMobile = isMobileDevice();
    if (isMobile) {
      // 모바일: 더 느리고 안정적인 설정
      utterance.rate = 0.97; // 약간 느리게 (안정성 향상)
      utterance.pitch = 1.0; // 기본 음높이
      utterance.volume = 1.0;
      console.log('모바일 음성 설정 적용');
    } else {
      // 데스크톱: 기존 설정
      utterance.rate = 1.1; // 약간 빠르게
      utterance.pitch = 1.1; // 약간 높게
      utterance.volume = 1.0;
      console.log('데스크톱 음성 설정 적용');
    }

    // 한국어 음성 선택 (브라우저가 로드될 때까지 대기)
    const setVoiceAndSpeak = () => {
      const voices = synthesis.getVoices();

      // 더 자연스러운 음성 우선 선택
      let koreanVoice;
      if (isMobile) {
        // 모바일: 기본 시스템 음성 우선 (더 안정적)
        koreanVoice =
          voices.find(voice => voice.lang.startsWith('ko') && voice.localService) ||
          voices.find(voice => voice.lang.startsWith('ko'));
      } else {
        // 데스크톱: Google 음성 우선
        koreanVoice =
          voices.find(voice => voice.name.includes('Google') && voice.lang.startsWith('ko')) ||
          voices.find(voice => voice.name.includes('Female') && voice.lang.startsWith('ko')) ||
          voices.find(voice => voice.lang.startsWith('ko'));
      }

      if (koreanVoice) {
        utterance.voice = koreanVoice;
        console.log('선택된 음성:', koreanVoice.name, '/ 로컬:', koreanVoice.localService);
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
    } else if (isProcessing) {
      statusDiv.innerHTML = '🤔 AI가 생각하는 중...';
      statusDiv.style.color = '#FFA500';
      if (micButton) micButton.disabled = true;
    } else if (isListening) {
      statusDiv.innerHTML = '🎤 듣고 있습니다...';
      statusDiv.style.color = '#FF6B6B';
      if (micButton) micButton.disabled = true;
    } else {
      statusDiv.innerHTML = '💬 마이크 버튼을 눌러 말씀해주세요';
      statusDiv.style.color = 'var(--text-gray)';
      if (micButton) micButton.disabled = false;
    }
  }
}

// 대화 모드 시작 함수 (폼 작성 중 대화)
let isStartingConversation = false; // 중복 클릭 방지 플래그

async function startConversationMode() {
  console.log('🎤 startConversationMode() 호출됨');

  // 이미 대화 시작 중이면 무시
  if (isStartingConversation) {
    console.log('⚠️ 이미 대화 시작 중');
    return;
  }

  const userId = localStorage.getItem('userId');
  console.log('userId:', userId);

  if (!userId) {
    console.error('❌ userId가 없음');
    showAlert('로그인이 필요합니다.', 'error');
    return;
  }

  // 중복 클릭 방지 활성화
  isStartingConversation = true;

  // 로딩 오버레이 표시
  console.log('⏳ 로딩 오버레이 표시');
  const loadingOverlay = showLoadingOverlay('🎤 AI와 대화를 시작하는 중...');

  try {
    console.log('✅ try 블록 시작');
    const form = document.getElementById('daily-check-form');
    const formData = new FormData(form);
    console.log('✅ 폼 데이터 생성 완료');

    // 음성 인식 초기화
    console.log('🎙️ 음성 인식 초기화 시작');
    const recognitionInstance = initSpeechRecognition();
    if (!recognitionInstance) {
      console.error('❌ 음성 인식 초기화 실패');
      closeLoadingOverlay();
      return;
    }
    console.log('✅ 음성 인식 초기화 완료');

    // Web Audio API 초기화 (소음 제한용)
    console.log('🔊 Web Audio API 초기화 시작');
    if (!audioContext) {
      await initAudioContext();
    }
    console.log('✅ Web Audio API 초기화 완료');

    // 대화 모드 활성화
    conversationMode = true;
    console.log('✅ 대화 모드 활성화');

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

      // 로딩 오버레이 닫기
      closeLoadingOverlay();

      // 첫 AI 메시지 표시 및 음성 출력
      addVoiceMessage('ai', data.message);
      await speak(data.message);

      // 음성 인식 설정
      setupVoiceRecognition();

      // 성공 시 플래그 해제
      isStartingConversation = false;
    } else {
      closeLoadingOverlay();
      showAlert(`음성 대화 시작에 실패했습니다: ${data.message}`, 'error');
      closeVoiceUI();
      conversationMode = false;
      // 실패 시 플래그 해제
      isStartingConversation = false;
    }
  } catch (error) {
    console.error('❌ 음성 대화 시작 오류 상세:', error);
    console.error('오류 스택:', error.stack);
    console.error('오류 메시지:', error.message);
    console.error('API_URL:', API_URL);
    console.error('userId:', userId);
    closeLoadingOverlay();
    showAlert(`음성 대화 시작 중 오류가 발생했습니다: ${error.message}`, 'error');
    closeVoiceUI();
    conversationMode = false;
    // 오류 시 플래그 해제
    isStartingConversation = false;
  }
}

// 음성 대화 시작 함수 (AI 분석 후 대화)
let isStartingHealthChat = false; // 중복 클릭 방지 플래그

async function startHealthChat() {
  // 이미 대화 시작 중이면 무시
  if (isStartingHealthChat) {
    return;
  }

  const userId = localStorage.getItem('userId');
  const recordData = window.currentRecordData;
  const profileData = window.currentProfileData;
  const recordId = window.currentRecordId;

  if (!recordData || !profileData || !recordId) {
    showAlert('대화를 시작할 수 없습니다. 데이터를 다시 확인해주세요.', 'error');
    return;
  }

  // 중복 클릭 방지 활성화
  isStartingHealthChat = true;

  // 음성 인식 초기화
  const recognitionInstance = initSpeechRecognition();
  if (!recognitionInstance) {
    isStartingHealthChat = false;
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

      // 성공 시 플래그 해제
      isStartingHealthChat = false;
    } else {
      showAlert('음성 상담 시작에 실패했습니다.', 'error');
      closeVoiceUI();
      // 실패 시 플래그 해제
      isStartingHealthChat = false;
    }
  } catch (error) {
    console.error('음성 상담 시작 오류:', error);
    showAlert('음성 상담 시작 중 오류가 발생했습니다.', 'error');
    closeVoiceUI();
    // 오류 시 플래그 해제
    isStartingHealthChat = false;
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
        <div id="voice-status" style="text-align: center; margin-bottom: 12px; font-size: 16px; font-weight: 500; color: var(--text-gray);">
          💬 말하거나 입력해주세요
        </div>

        <!-- 텍스트 입력 영역 -->
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <input
            type="text"
            id="text-input"
            placeholder="텍스트로 입력하기..."
            style="flex: 1; padding: 12px; border: 2px solid var(--secondary-green); border-radius: 8px; font-size: 16px;"
            onkeypress="if(event.key === 'Enter') sendTextMessage();"
          />
          <button onclick="sendTextMessage()" class="btn btn-primary" style="padding: 12px 20px; white-space: nowrap;">
            ✉️ 전송
          </button>
        </div>

        <!-- 음성 입력 버튼 -->
        <div style="display: flex; gap: 12px; align-items: center;">
          <button id="mic-button" onclick="startListening()" class="btn btn-secondary" style="flex: 1; padding: 14px; font-size: 16px;">
            🎤 음성으로 말하기
          </button>
          <button onclick="endVoiceSession()" class="btn btn-secondary" style="padding: 14px 20px; white-space: nowrap;">
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
  if (!recognition || isListening || isSpeaking || isProcessing) return;

  isListening = true;
  updateSpeakingStatus(false);

  // Web Audio API 사용 가능한 경우: 볼륨 체크 후 시작
  if (analyser) {
    console.log('볼륨 체크 모드: 임계값', VOLUME_THRESHOLD, 'dB 이상일 때 음성 인식 시작');

    // 100ms마다 볼륨 체크
    volumeCheckInterval = setInterval(checkAndStartRecognition, 100);

    // 5초 후에도 시작 안 되면 자동 취소
    setTimeout(() => {
      if (volumeCheckInterval) {
        clearInterval(volumeCheckInterval);
        volumeCheckInterval = null;
        isListening = false;
        updateSpeakingStatus(false);
        showAlert('음성이 감지되지 않았습니다. 조용한 환경에서 더 크게 말씀해주세요.', 'warning');
      }
    }, 5000);
  } else {
    // Web Audio API 없으면 기존 방식대로
    try {
      recognition.start();
    } catch (error) {
      console.error('음성 인식 시작 오류:', error);
      isListening = false;
      updateSpeakingStatus(false);
    }
  }
}

// 텍스트 메시지 전송
async function sendTextMessage() {
  const textInput = document.getElementById('text-input');
  const message = textInput.value.trim();

  if (!message) {
    showAlert('메시지를 입력해주세요.', 'warning');
    return;
  }

  // 입력 필드 초기화
  textInput.value = '';

  // 사용자 메시지 표시
  addVoiceMessage('user', message);

  try {
    // AI 응답 대기 중 상태로 변경
    isProcessing = true;
    updateSpeakingStatus(false);

    const response = await fetch(`${API_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: window.chatSessionId,
        message
      })
    });

    const data = await response.json();

    // AI 응답 받음 - 처리 중 상태 해제
    isProcessing = false;
    updateSpeakingStatus(false);

    if (data.success) {
      // AI 응답 표시 (음성 출력은 선택적)
      addVoiceMessage('ai', data.message);

      // 음성 출력 여부를 사용자가 선택할 수 있도록 (기본은 출력하지 않음)
      // await speak(data.message);

      window.chatMessageCount = data.messageCount || 0;

      // 종료 질문인 경우
      if (data.isClosingQuestion) {
        console.log('종료 질문 모드 활성화');
      }

      // 사용자가 종료를 원하는 경우
      if (data.shouldEnd) {
        setTimeout(() => {
          endVoiceSession();
        }, 2000);
      }
    } else {
      showAlert('메시지 전송에 실패했습니다.', 'error');
    }
  } catch (error) {
    console.error('메시지 전송 오류:', error);
    isProcessing = false;
    updateSpeakingStatus(false);
    showAlert('메시지 전송 중 오류가 발생했습니다.', 'error');
  }
}

// 음성 메시지 전송
async function sendVoiceMessage(message) {
  try {
    // AI 응답 대기 중 상태로 변경
    isProcessing = true;
    updateSpeakingStatus(false);

    const response = await fetch(`${API_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: window.chatSessionId,
        message
      })
    });

    const data = await response.json();

    // AI 응답 받음 - 처리 중 상태 해제
    isProcessing = false;
    updateSpeakingStatus(false);

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
    isProcessing = false;
    updateSpeakingStatus(false);
    showAlert('메시지 전송 중 오류가 발생했습니다.', 'error');
  }
}

// 음성 세션 종료
let isEndingVoiceSession = false; // 중복 클릭 방지 플래그

async function endVoiceSession() {
  // 이미 종료 중이면 무시
  if (isEndingVoiceSession) {
    return;
  }

  // 중복 클릭 방지 활성화
  isEndingVoiceSession = true;

  // 로딩 오버레이 표시
  const loadingOverlay = showLoadingOverlay('💬 대화를 마무리하는 중...');

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

    // 로딩 오버레이 닫기
    closeLoadingOverlay();

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
          // 종료 완료 후 플래그 해제
          isEndingVoiceSession = false;
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
          // 페이지 이동 전 플래그 해제
          isEndingVoiceSession = false;
        }, 5000);
      }
    } else {
      showAlert('세션 종료에 실패했습니다.', 'error');
      // 실패 시 플래그 해제
      isEndingVoiceSession = false;
    }
  } catch (error) {
    console.error('세션 종료 오류:', error);
    closeLoadingOverlay();
    showAlert('세션 종료 중 오류가 발생했습니다.', 'error');
    // 오류 시 플래그 해제
    isEndingVoiceSession = false;
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

  // 볼륨 체크 인터벌 중지
  if (volumeCheckInterval) {
    clearInterval(volumeCheckInterval);
    volumeCheckInterval = null;
  }

  // Web Audio API 리소스 정리
  if (microphone) {
    microphone.disconnect();
    microphone = null;
  }
  if (analyser) {
    analyser.disconnect();
    analyser = null;
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
    audioContext = null;
  }

  // 상태 초기화
  isSpeaking = false;
  isListening = false;
  isProcessing = false;

  const voiceModal = document.getElementById('voice-modal');
  if (voiceModal) {
    voiceModal.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      voiceModal.remove();
    }, 300);
  }
}
