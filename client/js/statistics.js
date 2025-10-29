// 스마일링 널스 - 통계 로직

let userId = null;
let allRecords = [];

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', async () => {
  userId = checkAuth();
  if (!userId) return;

  await loadStatistics();
});

// 통계 데이터 로드
async function loadStatistics() {
  try {
    const response = await fetch(`${API_URL}/records/${userId}`);
    const data = await response.json();

    if (data.success) {
      // 기록을 날짜순으로 정렬
      allRecords = data.records.sort((a, b) => new Date(a.date) - new Date(b.date));

      if (allRecords.length === 0) {
        document.getElementById('no-data').style.display = 'block';
        document.getElementById('summary-stats').style.display = 'none';
        // 그래프 컨테이너 숨기기 (자잘한 오류 수정)
        document.querySelectorAll('.grid-2, .card[style*="margin-bottom: 32px;"]').forEach(el => el.style.display = 'none');
        return;
      }
      
      document.getElementById('no-data').style.display = 'none';
      document.getElementById('summary-stats').style.display = 'grid';
      // 그래프 컨테이너 다시 표시 (자잘한 오류 수정)
      document.querySelectorAll('.grid-2, .card[style*="margin-bottom: 32px;"]').forEach(el => el.style.display = 'grid');


      updateSummaryStats();
      createCharts();
    }
  } catch (error) {
    console.error('통계 로드 오류:', error);
    showAlert('통계 데이터를 불러오는데 실패했습니다.', 'error');
  }
}

// 요약 통계 업데이트
function updateSummaryStats() {
  document.getElementById('total-records').textContent = allRecords.length;

  // 평균 스트레스 수준
  const stressLevels = allRecords.filter(r => r.stressLevel).map(r => r.stressLevel);
  if (stressLevels.length > 0) {
    const avgStress = (stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length).toFixed(1);
    document.getElementById('avg-stress-all').textContent = avgStress;
  } else {
    document.getElementById('avg-stress-all').textContent = '-';
  }

  // 평균 PSS-10 점수
  const pssScores = allRecords.filter(r => r.pssTotal).map(r => r.pssTotal);
  if (pssScores.length > 0) {
    const avgPss = (pssScores.reduce((a, b) => a + b, 0) / pssScores.length).toFixed(1);
    document.getElementById('avg-pss').textContent = avgPss;
  } else {
    document.getElementById('avg-pss').textContent = '-';
  }
}

// 그래프 생성 (11번 요구사항)
function createCharts() {
  // 모든 차트 인스턴스 파괴 후 재생성 (자잘한 오류 수정: 차트 중복 생성 방지)
  if (window.stressChart) window.stressChart.destroy();
  if (window.sleepChart) window.sleepChart.destroy();
  if (window.pssChart) window.pssChart.destroy();
  if (window.workChart) window.workChart.destroy();
  if (window.mealsChart) window.mealsChart.destroy();

  // 날짜 레이블 생성 (최근 30일치만 표시하여 가독성 확보)
  const recentRecords = allRecords.slice(-30); 
  const labels = recentRecords.map(r => {
    return new Date(r.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  });

  // 스트레스 수준 차트
  const stressData = recentRecords.map(r => r.stressLevel || null);
  window.stressChart = createLineChart('stress-chart', labels, stressData, '스트레스 수준', '#FF6B6B', { beginAtZero: true, max: 10, stepSize: 1 });

  // 수면 시간 차트
  const sleepData = recentRecords.map(r => r.sleepHours || null);
  window.sleepChart = createLineChart('sleep-chart', labels, sleepData, '수면 시간 (시간)', '#4ECDC4', { beginAtZero: true });

  // PSS-10 차트
  const pssData = recentRecords.map(r => r.pssTotal || null);
  window.pssChart = createLineChart('pss-chart', labels, pssData, 'PSS-10 점수', '#95E1D3', { beginAtZero: true, max: 40, stepSize: 5 });

  // 업무 강도 차트
  const workData = recentRecords.map(r => r.workIntensity || null);
  window.workChart = createLineChart('work-chart', labels, workData, '업무 강도', '#F38181', { beginAtZero: true, max: 10, stepSize: 1 });

  // 식사 규칙성 차트 (막대 그래프)
  window.mealsChart = createMealsChart('meals-chart', labels, recentRecords);
}

// 선형 차트 생성
function createLineChart(canvasId, labels, data, label, color, yAxisConfig = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        borderColor: color,
        backgroundColor: color + '33',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        spanGaps: true // null 값 건너뛰기
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          ...yAxisConfig,
          grid: {
            color: '#E8F5E9'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// 식사 규칙성 차트
function createMealsChart(canvasId, labels, records) {
  // 식사 데이터를 0/1로 변환
  const breakfastData = records.map(r => r.meals && r.meals.includes('breakfast') ? 1 : null); // null로 처리하여 결측치 처리
  const lunchData = records.map(r => r.meals && r.meals.includes('lunch') ? 1 : null);
  const dinnerData = records.map(r => r.meals && r.meals.includes('dinner') ? 1 : null);

  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '아침',
          data: breakfastData,
          backgroundColor: '#FFE66D'
        },
        {
          label: '점심',
          data: lunchData,
          backgroundColor: '#FF6B6B'
        },
        {
          label: '저녁',
          data: dinnerData,
          backgroundColor: '#4ECDC4'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          ticks: {
            stepSize: 1,
            callback: function(value) {
              return value === 1 ? '식사함' : '식사 안 함';
            }
          },
          grid: {
            color: '#E8F5E9'
          }
        },
        x: {
          stacked: false,
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// CSV 다운로드
async function downloadCSV() {
  if (!userId) {
    showAlert('로그인이 필요합니다.', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/records/${userId}/download`);

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smiling-nurse-data-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showAlert('CSV 파일이 다운로드되었습니다!', 'success');
    } else {
      showAlert('CSV 다운로드에 실패했습니다.', 'error');
    }
  } catch (error) {
    console.error('CSV 다운로드 오류:', error);
    showAlert('CSV 다운로드 중 오류가 발생했습니다.', 'error');
  }
}

// AI 종합 분석
async function getAIStatisticsAnalysis() {
  if (allRecords.length === 0) {
    showAlert('분석할 기록이 없습니다. 먼저 일일 기록을 작성해주세요!', 'warning');
    return;
  }

  const btn = document.getElementById('ai-analysis-btn');
  btn.disabled = true;
  btn.textContent = '🤖 AI 분석 중...';

  // 로딩 모달 표시
  const loadingModal = showLoadingModal('AI 종합 분석을 준비 중입니다.');

  try {
    // 프로필 데이터 가져오기
    const profileResponse = await fetch(`${API_URL}/user/profile/${userId}`);
    const profileData = await profileResponse.json();

    // AI 분석 요청
    const response = await fetch(`${API_URL}/ai/analyze-statistics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: allRecords,
        profileData: profileData.profile
      })
    });

    const data = await response.json();

    if (data.success) {
      showAIStatisticsModal(data.analysis);
    } else {
      showAlert('AI 분석에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  } catch (error) {
    console.error('AI 분석 오류:', error);
    showAlert('AI 분석 중 오류가 발생했습니다.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🤖 AI 종합 분석';
    loadingModal.remove();
  }
}

// 로딩 모달 생성 함수 (10번 요구사항 보조)
function showLoadingModal(message) {
    const modal = document.createElement('div');
    modal.id = 'loading-modal';
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
      z-index: 1001;
      animation: fadeIn 0.3s ease-out;
    `;
    modal.innerHTML = `
      <div class="card" style="padding: 40px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 20px;" class="spinner">⏳</div>
        <h2 style="color: var(--primary-green);">분석 중...</h2>
        <p style="color: var(--text-gray);">${message}</p>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

// AI 통계 분석 모달 표시
function showAIStatisticsModal(analysis) {
  const modal = document.createElement('div');
  modal.id = 'ai-stats-modal';
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
    overflow-y: auto;
    padding: 20px;
  `;

  modal.innerHTML = `
    <div class="card" style="max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; margin: auto;">
      <button onclick="closeAIStatsModal()" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-gray); transition: var(--transition); z-index: 10;">×</button>

      <div class="header">
        <div class="logo">🤖📊</div>
        <h1>AI 건강 종합 분석</h1>
        <p>${allRecords.length}일간의 데이터 기반 분석 결과</p>
      </div>

      <div class="card" style="background: linear-gradient(135deg, var(--light-green), rgba(255, 255, 255, 0.8)); margin-bottom: 24px; padding: 24px;">
        <h3 style="color: var(--primary-green); margin-bottom: 16px;">📈 분석 기간</h3>
        <div style="text-align: center; font-size: 20px; font-weight: 600;">
          총 ${allRecords.length}일간의 건강 기록
        </div>
      </div>

      <div class="card" style="padding: 28px; margin-bottom: 24px; white-space: pre-wrap; line-height: 1.9; font-size: 16px;">
        ${formatAnalysis(analysis)}
      </div>

      <button onclick="closeAIStatsModal()" class="btn btn-primary btn-full">
        ✅ 확인
      </button>
    </div>
  `;

  document.body.appendChild(modal);
}

// AI 통계 모달 닫기
function closeAIStatsModal() {
  const modal = document.getElementById('ai-stats-modal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => modal.remove(), 300);
  }
}

// 모든 기록 보기 (10번 요구사항)
function viewAllRecords() {
  if (allRecords.length === 0) {
    showAlert('아직 기록이 없습니다.', 'warning');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'records-list-modal';
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
    overflow-y: auto;
    padding: 20px;
  `;

  // 기록을 날짜 역순으로 정렬
  const sortedRecords = [...allRecords].reverse();

  modal.innerHTML = `
    <div class="card" style="max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; margin: auto;">
      <button onclick="closeRecordsListModal()" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-gray); transition: var(--transition); z-index: 10;">×</button>

      <div class="header">
        <div class="logo">📋</div>
        <h1>나의 모든 기록</h1>
        <p>총 ${allRecords.length}일간의 건강 기록</p>
      </div>

      <div style="margin-top: 24px;">
        ${sortedRecords.map((record, index) => {
          const date = new Date(record.date);
          const dateStr = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

          let stressLevel = '보통';
          let stressColor = '#FFF9C4';
          if (record.pssTotal <= 13) {
            stressLevel = '낮음';
            stressColor = '#C8E6C9';
          } else if (record.pssTotal >= 27) {
            stressLevel = '높음';
            stressColor = '#FFCDD2';
          }

          // 원본 allRecords에서의 인덱스 계산 (클릭 시 사용)
          const originalIndex = allRecords.length - 1 - index;
          const sleepDisplay = formatSleepTime(record.sleepHours);

          return `
            <div class="card" style="margin-bottom: 16px; padding: 20px; cursor: pointer; transition: var(--transition); border: 2px solid transparent;"
                 onmouseover="this.style.borderColor='var(--primary-green)'; this.style.transform='translateY(-4px)'"
                 onmouseout="this.style.borderColor='transparent'; this.style.transform='translateY(0)'"
                 onclick="viewRecordDetail(${originalIndex})">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="color: var(--primary-green); margin: 0;">${dateStr}</h3>
                <div style="padding: 6px 16px; background: ${stressColor}; border-radius: 20px; font-weight: 600;">
                  PSS-10: ${record.pssTotal}점 (${stressLevel})
                </div>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; color: var(--text-gray);">
                <div>😰 스트레스: ${record.stressLevel}/10</div>
                <div>😴 수면: ${sleepDisplay}</div>
                <div>💪 업무 강도: ${record.workIntensity}/10</div>
              </div>
              <div style="text-align: right; margin-top: 12px; color: var(--primary-green); font-size: 14px;">
                클릭하여 상세 보기 →
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <button onclick="closeRecordsListModal()" class="btn btn-secondary btn-full" style="margin-top: 24px;">
        닫기
      </button>
    </div>
  `;

  document.body.appendChild(modal);
}

// 소수점 수면 시간을 'H시간 M분'으로 변환
function formatSleepTime(totalHours) {
    if (totalHours === null || totalHours === 0) return '기록 없음';
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    if (hours === 0 && minutes === 0) return '기록 없음';
    
    let result = '';
    if (hours > 0) result += `${hours}시간 `;
    if (minutes > 0) result += `${minutes}분`;
    return result.trim();
}

// 기록 리스트 모달 닫기
function closeRecordsListModal() {
  const modal = document.getElementById('records-list-modal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => modal.remove(), 300);
  }
}

// 개별 기록 상세 보기 (10번 요구사항)
async function viewRecordDetail(recordIndex) {
  const record = allRecords[recordIndex];

  // 기존 모달 닫기
  closeRecordsListModal();

  // 로딩 모달 표시
  const loadingModal = showLoadingModal(`${new Date(record.date).toLocaleDateString()} 기록을 분석 중입니다.`);
  
  try {
    // 프로필 데이터 가져오기
    const profileResponse = await fetch(`${API_URL}/user/profile/${userId}`);
    const profileData = await profileResponse.json();

    // AI 분석 요청
    const response = await fetch(`${API_URL}/ai/analyze-daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordData: record,
        profileData: profileData.profile
      })
    });

    const data = await response.json();

    // 로딩 모달 닫기
    loadingModal.remove();

    // 상세 정보 모달 표시
    if (data.success) {
      showRecordDetailModal(record, data.analysis);
    } else {
      showRecordDetailModal(record, 'AI 분석을 불러올 수 없었습니다.');
    }
  } catch (error) {
    console.error('기록 상세 보기 오류:', error);
    loadingModal.remove();
    showRecordDetailModal(record, 'AI 분석을 불러오는 중 오류가 발생했습니다.');
  }
}

// 기록 상세 정보 모달 표시
function showRecordDetailModal(record, aiAnalysis) {
  const date = new Date(record.date);
  const dateStr = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  const sleepDisplay = formatSleepTime(record.sleepHours);

  let stressLevel = '보통';
  let stressColor = '#FFF9C4';
  if (record.pssTotal <= 13) {
    stressLevel = '낮음';
    stressColor = '#C8E6C9';
  } else if (record.pssTotal >= 27) {
    stressLevel = '높음';
    stressColor = '#FFCDD2';
  }

  const modal = document.createElement('div');
  modal.id = 'record-detail-modal';
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
    overflow-y: auto;
    padding: 20px;
  `;

  modal.innerHTML = `
    <div class="card" style="max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; margin: auto;">
      <button onclick="closeRecordDetailModal()" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-gray); transition: var(--transition); z-index: 10;">×</button>

      <div class="header">
        <div class="logo">📅</div>
        <h1>${dateStr}</h1>
        <p>상세 기록 및 AI 분석</p>
      </div>

      <div class="card" style="background: linear-gradient(135deg, var(--light-green), rgba(255, 255, 255, 0.8)); margin-bottom: 20px; padding: 20px;">
        <h3 style="color: var(--primary-green); margin-bottom: 12px;">📊 스트레스 수준</h3>
        <div style="font-size: 32px; font-weight: 700; color: var(--primary-green); text-align: center; margin: 16px 0;">
          PSS-10: ${record.pssTotal}점 / 40점
        </div>
        <div style="text-align: center; padding: 10px 20px; background: ${stressColor}; border-radius: 20px; display: inline-block; margin: 0 auto; width: 100%;">
          <strong>스트레스 수준: ${stressLevel}</strong>
        </div>
      </div>

      <div class="card" style="margin-bottom: 20px; padding: 24px;">
        <h3 style="color: var(--primary-green); margin-bottom: 16px;">📋 입력한 정보</h3>
        <div style="display: grid; gap: 12px;">
          <div><strong>😰 스트레스 수준:</strong> ${record.stressLevel}/10</div>
          <div><strong>😴 수면 시간:</strong> ${sleepDisplay}</div>
          <div><strong>😴 수면의 질:</strong> ${record.sleepQuality ? record.sleepQuality + '/5' : '기록 없음'}</div>
          <div><strong>💪 업무 강도:</strong> ${record.workIntensity}/10</div>
          <div><strong>🍽️ 식사:</strong> ${record.meals && record.meals.length > 0 ? record.meals.map(m => m === 'breakfast' ? '아침' : m === 'lunch' ? '점심' : '저녁').join(', ') : '기록 없음'}</div>
          ${record.bloodSugar ? `<div><strong>🍬 혈당:</strong> ${record.bloodSugar} mg/dL</div>` : ''}
          ${record.bloodPressureSystolic && record.bloodPressureDiastolic ? `<div><strong>💗 혈압:</strong> ${record.bloodPressureSystolic}/${record.bloodPressureDiastolic} mmHg</div>` : ''}
          ${record.steps ? `<div><strong>🚶 걸음 수:</strong> ${record.steps}보</div>` : ''}
          ${record.notes ? `<div style="margin-top: 12px;"><strong>💬 메모:</strong><br><div style="background: var(--light-green); padding: 12px; border-radius: 8px; margin-top: 8px;">${record.notes}</div></div>` : ''}
        </div>
      </div>

      <div class="card" style="padding: 24px; margin-bottom: 20px; white-space: pre-wrap; line-height: 1.8;">
        <h3 style="color: var(--primary-green); margin-bottom: 16px;">🤖 AI 건강 분석</h3>
        ${formatAnalysis(aiAnalysis)}
      </div>

      <button onclick="closeRecordDetailModal()" class="btn btn-primary btn-full">
        ✅ 확인
      </button>
    </div>
  `;

  document.body.appendChild(modal);
}

// 기록 상세 모달 닫기
function closeRecordDetailModal() {
  const modal = document.getElementById('record-detail-modal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => modal.remove(), 300);
  }
}

// AI 분석 텍스트 포맷팅
function formatAnalysis(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--primary-green); font-size: 18px;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color: var(--dark-green);">$1</em>')
    .replace(/(\d+)\./g, '<br><strong style="color: var(--primary-green);">$1.</strong>')
    .replace(/\n\n/g, '</p><p style="margin: 20px 0;">')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/gm, '<p style="margin: 16px 0;">$1</p>');
}