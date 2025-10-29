// 스마일링 널스 - 일일 체크 로직

const API_URL = 'https://smiling-nurse.onrender.com/api';

// showAlert 함수는 auth.js에서 정의되어 있으므로 여기서는 사용만 함.

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
  const userId = checkAuth();
  if (!userId) return;

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

    // 수면 시간 계산 (시간 + 분/60) (6번 요구사항)
    const sleepHoursInput = parseInt(formData.get('sleepHours')) || 0;
    const sleepMinutesInput = parseInt(formData.get('sleepMinutes')) || 0;
    const totalSleepHours = sleepHoursInput + (sleepMinutesInput / 60);

    // 데이터 객체 생성
    const recordData = {
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
        // 저장 완료 메시지
        showAlert('✅ 기록이 성공적으로 저장되었습니다. AI 분석을 시작합니다.', 'success');
        submitBtn.innerHTML = '🤖 AI 분석 중... <span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span>';

        // PSS-10 결과 표시
        let stressLevel = '보통';
        if (pssTotal <= 13) stressLevel = '낮음';
        else if (pssTotal >= 27) stressLevel = '높음';

        // AI 분석 요청 (9번 요구사항)
        getAIAnalysis(recordData, pssTotal, stressLevel, submitBtn, originalText);
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
async function getAIAnalysis(recordData, pssTotal, stressLevel, submitBtn, originalText) {
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
        profileData: profileData.profile
      })
    });

    const data = await response.json();

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;

    if (data.success) {
      // AI 분석 결과 모달 표시
      showAIAnalysisModal(data.analysis, pssTotal, stressLevel);
    } else {
      // AI 분석 실패 시에도 기본 결과 표시
      showAlert(`✨ AI 분석에 실패했습니다. PSS-10 점수: ${pssTotal}점 (수준: ${stressLevel})`, 'warning');
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
function showAIAnalysisModal(analysis, pssTotal, stressLevel) {
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

  modal.innerHTML = `
    <div class="card" style="max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto; position: relative;">
      <button onclick="closeAIModal()" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-gray); transition: var(--transition);">×</button>

      <div class="header">
        <div class="logo">🤖</div>
        <h1>AI 건강 분석 결과</h1>
        <p>오늘의 기록을 기반으로 한 맞춤형 조언</p>
      </div>

      <div class="card" style="background: linear-gradient(135deg, var(--light-green), rgba(255, 255, 255, 0.8)); margin-bottom: 20px; padding: 20px;">
        <h3 style="color: var(--primary-green); margin-bottom: 12px;">📊 오늘의 스트레스 수준</h3>
        <div style="font-size: 32px; font-weight: 700; color: var(--primary-green); text-align: center; margin: 16px 0;">
          PSS-10: ${pssTotal}점 / 40점
        </div>
        <div style="text-align: center; padding: 10px 20px; background: ${stressLevel === '낮음' ? '#C8E6C9' : stressLevel === '높음' ? '#FFCDD2' : '#FFF9C4'}; border-radius: 20px; display: inline-block; margin: 0 auto; width: 100%;">
          <strong>스트레스 수준: ${stressLevel}</strong>
        </div>
      </div>

      <div class="card" style="padding: 24px; margin-bottom: 20px; white-space: pre-wrap; line-height: 1.8;">
        ${formatAnalysis(analysis)}
      </div>

      <button onclick="closeAIModal()" class="btn btn-primary btn-full">
        ✅ 확인하고 대시보드로 이동
      </button>
    </div>
  `;

  document.body.appendChild(modal);
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