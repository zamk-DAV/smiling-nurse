// 스마일링 널스 - 인증 로직

// 알림 표시 함수 (토스트/스낵바 형태로 재정의 - 12번 요구사항)
function showAlert(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `alert-notification ${type}`;
  notification.textContent = message;

  // 기존 컨테이너가 아닌 body에 직접 추가
  document.body.appendChild(notification);
  
  // 애니메이션을 위해 잠시 대기
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);

  // 3초 후 사라지도록 설정
  setTimeout(() => {
    notification.classList.add('fade-out');
    // 완전히 사라진 후 DOM에서 제거
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// 로그인 처리
if (document.getElementById('login-form')) {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('username', data.username);
        showAlert('로그인 성공! 대시보드로 이동합니다...', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      } else {
        showAlert(data.message, 'error');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      showAlert('서버와의 연결에 실패했습니다.', 'error');
    }
  });
}

// 회원가입 처리 (signup.html에서 사용)
if (document.getElementById('signup-form')) {
  let currentStep = 1;
  const totalSteps = 2;

  // 단계 업데이트
  function updateSteps() {
    document.querySelectorAll('.step').forEach((step, index) => {
      if (index + 1 < currentStep) {
        step.classList.add('completed');
        step.classList.remove('active');
      } else if (index + 1 === currentStep) {
        step.classList.add('active');
        step.classList.remove('completed');
      } else {
        step.classList.remove('active', 'completed');
      }
    });

    // 진행률 바 업데이트
    const progress = (currentStep / totalSteps) * 100;
    document.querySelector('.progress-fill').style.width = `${progress}%`;

    // 단계별 폼 표시
    document.querySelectorAll('.step-content').forEach((content, index) => {
      content.style.display = index + 1 === currentStep ? 'block' : 'none';
    });

    // 버튼 표시 제어
    document.getElementById('prev-btn').style.display = currentStep === 1 ? 'none' : 'inline-block';
    document.getElementById('next-btn').style.display = currentStep === totalSteps ? 'none' : 'inline-block';
    document.getElementById('submit-btn').style.display = currentStep === totalSteps ? 'inline-block' : 'none';
  }

  // 다음 단계
  document.getElementById('next-btn')?.addEventListener('click', () => {
    // 1단계 유효성 검사
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!username || !password || !confirmPassword) {
      showAlert('모든 필수 계정 정보를 입력해주세요.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    if (password.length < 6) {
      showAlert('비밀번호는 6자 이상이어야 합니다.', 'error');
      return;
    }

    currentStep++;
    updateSteps();

    // 2단계로 이동 시 질병 선택기 초기화 (4번 요구사항)
    if (currentStep === 2) {
      setTimeout(() => {
        const selectorContainer = document.querySelector('#disease-selector-container');
        if (selectorContainer && !selectorContainer.querySelector('.disease-selector')) {
          initDiseaseSelector('disease-selector-container');
        }
      }, 100);
    }
  });

  // 이전 단계
  document.getElementById('prev-btn')?.addEventListener('click', () => {
    currentStep--;
    updateSteps();
  });

  // 회원가입 제출
  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    // 프로필 정보 수집
    const profile = {
      name: document.getElementById('name').value,
      age: parseInt(document.getElementById('age').value),
      gender: document.getElementById('gender').value,
      height: parseFloat(document.getElementById('height').value),
      weight: parseFloat(document.getElementById('weight').value),
      occupation: document.getElementById('occupation').value,
      chronicDiseases: getSelectedDiseases() // 질병 선택기에서 데이터 가져오기
    };
    
    // 2단계 유효성 검사 (필수 필드)
    if (!profile.name || !profile.age || !profile.gender || !profile.height || !profile.weight || !profile.occupation) {
        showAlert('모든 필수 프로필 정보를 입력해주세요.', 'error');
        return;
    }


    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, profile })
      });

      const data = await response.json();

      if (data.success) {
        showAlert('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다...', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      } else {
        showAlert(data.message, 'error');
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      showAlert('서버와의 연결에 실패했습니다.', 'error');
    }
  });

  // 초기화
  updateSteps();
}

// 로그인 확인 (대시보드 및 기타 페이지에서 사용)
function checkAuth() {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    window.location.href = 'index.html';
    return null;
  }
  return userId;
}

// 로그아웃
function logout() {
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  window.location.href = 'index.html';
}