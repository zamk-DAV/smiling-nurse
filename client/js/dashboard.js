// 스마일링 널스 - 대시보드 로직

const API_URL = 'http://localhost:3000/api';

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', async () => {
  const userId = checkAuth();
  if (!userId) return;

  // 사용자 이름 표시
  const username = localStorage.getItem('username');
  document.getElementById('user-name').textContent = username;

  // 데이터 로드
  await loadDashboardData(userId);
});

// 대시보드 데이터 로드
async function loadDashboardData(userId) {
  try {
    const response = await fetch(`${API_URL}/records/${userId}`);
    const data = await response.json();

    if (data.success) {
      // 기록을 날짜순으로 정렬
      const sortedRecords = data.records.sort((a, b) => new Date(a.date) - new Date(b.date));
      updateStatsSummary(sortedRecords);
      displayRecentRecords(sortedRecords);
    }
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    showAlert('대시보드 데이터를 불러오는데 실패했습니다.', 'error');
  }
}

// 소수점 수면 시간을 'H시간 M분'으로 변환 (6번, 12번 요구사항)
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

// 통계 요약 업데이트
function updateStatsSummary(records) {
  if (records.length === 0) {
    document.getElementById('record-count').textContent = '0일';
    return;
  }

  // 최근 7일 데이터 필터링
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentRecords = records.filter(record => {
    return new Date(record.date) >= sevenDaysAgo;
  });

  // 평균 스트레스 수준
  const stressLevels = recentRecords
    .filter(r => r.stressLevel)
    .map(r => r.stressLevel);

  if (stressLevels.length > 0) {
    const avgStress = (stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length).toFixed(1);
    document.getElementById('avg-stress').textContent = avgStress;
  } else {
    document.getElementById('avg-stress').textContent = '-';
  }

  // 평균 수면 시간
  const sleepHours = recentRecords
    .filter(r => r.sleepHours && r.sleepHours > 0)
    .map(r => r.sleepHours);

  if (sleepHours.length > 0) {
    const avgSleepTotal = sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length;
    document.getElementById('avg-sleep').textContent = formatSleepTime(avgSleepTotal);
  } else {
    document.getElementById('avg-sleep').textContent = '-';
  }

  // 총 기록 일수
  document.getElementById('record-count').textContent = `${records.length}일`;
}

// 최근 기록 표시
function displayRecentRecords(records) {
  const container = document.getElementById('recent-records');

  if (records.length === 0) return;

  // 최근 5개만 표시
  const recentRecords = [...records].reverse().slice(0, 5);

  container.innerHTML = recentRecords.map(record => {
    const date = new Date(record.date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const sleepDisplay = formatSleepTime(record.sleepHours);

    return `
      <div class="card" style="margin-bottom: 16px; padding: 20px; background: var(--light-green);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <h3 style="color: var(--text-dark); margin-bottom: 8px;">${date}</h3>
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              ${record.stressLevel ? `<span>😰 스트레스: ${record.stressLevel}/10</span>` : ''}
              <span>😴 수면: ${sleepDisplay}</span>
              ${record.workIntensity ? `<span>💪 업무강도: ${record.workIntensity}/10</span>` : ''}
            </div>
          </div>
          ${record.notes ? `
            <div style="flex: 1; min-width: 200px;">
              <p style="color: var(--text-gray); font-size: 14px; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">"${record.notes}"</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}