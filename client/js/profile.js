// 스마일링 널스 - 프로필 로직

// showAlert 함수는 auth.js에서 정의되어 있으므로 여기서는 사용만 함.

// 페이지 로드 시 실행 (2, 3번 요구사항)
document.addEventListener('DOMContentLoaded', async () => {
  const userId = checkAuth();
  if (!userId) return;

  // 질병 선택기 초기화
  initDiseaseSelector('disease-selector-container');

  // 질병 선택기가 DOM에 삽입될 시간을 잠시 기다림 (비동기 로드 안정화)
  await new Promise(resolve => setTimeout(resolve, 200));

  // 프로필 데이터 로드 및 폼 채우기
  await loadProfile(userId);

  // 폼 제출 처리
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    // 프로필 정보 수집
    const profile = {
      name: formData.get('name'),
      age: parseInt(formData.get('age')),
      gender: formData.get('gender'),
      height: parseFloat(formData.get('height')),
      weight: parseFloat(formData.get('weight')),
      occupation: formData.get('occupation'),
      yearsOfExperience: formData.get('yearsOfExperience') ? parseInt(formData.get('yearsOfExperience')) : null,
      position: formData.get('position') || null,
      department: formData.get('department') || null,
      chronicDiseases: getSelectedDiseases() // 질병 선택기에서 데이터 가져오기
    };
    
    // 필수 필드 검증 (자잘한 오류 수정)
    if (!profile.name || !profile.age || !profile.gender || !profile.height || !profile.weight || !profile.occupation) {
        showAlert('모든 필수 기본 정보를 입력해주세요.', 'error');
        return;
    }


    try {
      const response = await fetch(`${API_URL}/user/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });

      const data = await response.json();

      if (data.success) {
        // 이름이 변경되었다면 localStorage도 업데이트
        localStorage.setItem('username', profile.name); 
        showAlert('프로필이 성공적으로 수정되었습니다!', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1500);
      } else {
        showAlert(data.message, 'error');
      }
    } catch (error) {
      console.error('프로필 수정 오류:', error);
      showAlert('서버와의 연결에 실패했습니다.', 'error');
    }
  });
});

// 프로필 데이터 로드 및 필드 채우기 (2번 요구사항)
async function loadProfile(userId) {
  try {
    const response = await fetch(`${API_URL}/user/profile/${userId}`);
    const data = await response.json();

    if (data.success) {
      const profile = data.profile;

      // 기본 정보 채우기
      document.getElementById('name').value = profile.name || '';
      document.getElementById('age').value = profile.age || '';
      document.getElementById('gender').value = profile.gender || '';
      document.getElementById('height').value = profile.height || '';
      document.getElementById('weight').value = profile.weight || '';
      document.getElementById('occupation').value = profile.occupation || '';

      // 간호사 정보 채우기
      if (profile.yearsOfExperience !== undefined && profile.yearsOfExperience !== null) {
        document.getElementById('years-of-experience').value = profile.yearsOfExperience;
      }
      if (profile.position) {
        document.getElementById('position').value = profile.position;
      }
      if (profile.department) {
        document.getElementById('department').value = profile.department;
      }

      // 만성질환 설정 (3번 요구사항)
      if (profile.chronicDiseases && profile.chronicDiseases.length > 0) {
        // initDiseaseSelector가 호출된 후이므로 바로 데이터 설정
        setSelectedDiseases(profile.chronicDiseases);
      }
    }
  } catch (error) {
    console.error('프로필 로드 오류:', error);
    showAlert('프로필을 불러오는데 실패했습니다.', 'error');
  }
}