// 스마일링 널스 - 질병 선택 컴포넌트

// 질병 데이터 (카테고리별 분류)
const diseaseData = {
  cardiovascular: [
    { id: 'hypertension', name: '고혈압', icon: '💔' },
    { id: 'hyperlipidemia', name: '고지혈증', icon: '🩸' },
    { id: 'heart_disease', name: '심장병', icon: '❤️' },
    { id: 'stroke', name: '뇌졸중', icon: '🧠' },
    { id: 'heart_failure', name: '심부전', icon: '💗' }
  ],
  metabolic: [
    { id: 'diabetes', name: '당뇨병', icon: '🍬' },
    { id: 'obesity', name: '비만', icon: '⚖️' },
    { id: 'metabolic_syndrome', name: '대사증후군', icon: '📊' }
  ],
  respiratory: [
    { id: 'asthma', name: '천식', icon: '🫁' },
    { id: 'copd', name: '만성폐쇄성폐질환(COPD)', icon: '😮‍💨' },
    { id: 'tuberculosis', name: '결핵', icon: '🦠' }
  ],
  cancer: [
    { id: 'cancer', name: '암 혹은 종양', icon: '🎗️' }
  ],
  neurological: [
    { id: 'parkinsons', name: '파킨슨병', icon: '🧠' },
    { id: 'alzheimers', name: '알츠하이머', icon: '🧩' },
    { id: 'epilepsy', name: '뇌전증', icon: '⚡' }
  ],
  musculoskeletal: [
    { id: 'arthritis', name: '관절염', icon: '🦴' },
    { id: 'osteoporosis', name: '골다공증', icon: '🦴' }
  ],
  mental: [
    { id: 'mental_illness', name: '정신 질환', icon: '🧠' }
  ]
};

const categoryNames = {
  cardiovascular: '심혈관계',
  metabolic: '대사/내분비',
  respiratory: '호흡기',
  cancer: '종양',
  neurological: '신경계',
  musculoskeletal: '근골격계',
  mental: '정신건강'
};

// 선택된 질환 저장
let selectedDiseases = new Map();

// 질병 선택기 초기화 (3, 4번 요구사항)
function initDiseaseSelector(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="disease-selector">
      <div class="disease-search">
        <input type="text" id="disease-search-input" placeholder="질환명 검색..." />
      </div>

      <div class="disease-categories" id="disease-categories">
        <button class="category-tab active" data-category="all">
          전체
        </button>
        ${Object.entries(categoryNames).map(([key, name]) => `
          <button class="category-tab" data-category="${key}">
            ${name}
          </button>
        `).join('')}
      </div>

      <div class="disease-grid" id="disease-grid"></div>

      <div class="selected-diseases" id="selected-diseases-display">
        <h4>✓ 선택된 질환 (${selectedDiseases.size}개)</h4>
        <div class="disease-tags" id="disease-tags"></div>
      </div>
    </div>
  `;

  // 이벤트 리스너 설정
  setupEventListeners();

  // 초기 렌더링
  renderDiseases('all');
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 카테고리 탭 클릭
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const category = tab.dataset.category;
      renderDiseases(category);
    });
  });

  // 검색 입력
  const searchInput = document.getElementById('disease-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      filterDiseases(searchTerm);
    });
  }
}

// 질환 렌더링
function renderDiseases(category) {
  const grid = document.getElementById('disease-grid');
  if (!grid) return;

  let diseasesToShow = [];

  if (category === 'all') {
    Object.values(diseaseData).forEach(diseases => {
      diseasesToShow = diseasesToShow.concat(diseases);
    });
  } else {
    diseasesToShow = diseaseData[category] || [];
  }

  grid.innerHTML = diseasesToShow.map(disease => {
    const isSelected = selectedDiseases.has(disease.id);
    return `
      <div class="disease-item ${isSelected ? 'selected' : ''}" data-disease-id="${disease.id}">
        <input type="checkbox"
               id="disease-${disease.id}"
               name="disease-${disease.id}"
               style="display: none;"
               ${isSelected ? 'checked' : ''}>
        <label for="disease-${disease.id}">
          ${disease.icon} ${disease.name}
        </label>
        <span class="checkmark">${isSelected ? '✓' : ''}</span>
      </div>
    `;
  }).join('');

  // 클릭 이벤트 리스너
  grid.querySelectorAll('.disease-item').forEach(item => {
    const checkbox = item.querySelector('input[type="checkbox"]');
    const checkmark = item.querySelector('.checkmark');
    const diseaseId = item.dataset.diseaseId;

    item.addEventListener('click', (e) => {
      // 입력 필드나 버튼을 직접 클릭한 경우는 무시 (버블링 방지)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
        return;
      }
      
      // 상태 토글
      const newCheckedState = !checkbox.checked;
      checkbox.checked = newCheckedState;
      
      // 상태 업데이트 함수 호출
      toggleDisease(diseaseId, newCheckedState, item, checkmark);
    });
  });
}

// 질환 선택/해제 (로직 개선)
function toggleDisease(diseaseId, isSelected, itemElement, checkmarkElement) {
  // 질환 찾기
  let disease = null;
  for (const diseases of Object.values(diseaseData)) {
    disease = diseases.find(d => d.id === diseaseId);
    if (disease) break;
  }

  if (!disease) return;

  const item = itemElement || document.querySelector(`.disease-item[data-disease-id="${diseaseId}"]`);
  const checkmark = checkmarkElement || item?.querySelector('.checkmark');

  if (isSelected) {
    // 선택
    selectedDiseases.set(diseaseId, { ...disease, detail: selectedDiseases.get(diseaseId)?.detail || '' });
    if (item) item.classList.add('selected');
    if (checkmark) checkmark.textContent = '✓';
  } else {
    // 해제
    selectedDiseases.delete(diseaseId);
    if (item) item.classList.remove('selected');
    if (checkmark) checkmark.textContent = '';
  }

  updateSelectedDisplay();
}

// 선택된 질환 표시 업데이트
function updateSelectedDisplay() {
  const tagsContainer = document.getElementById('disease-tags');
  const displayHeader = document.querySelector('#selected-diseases-display h4');

  if (displayHeader) {
    displayHeader.textContent = `✓ 선택된 질환 (${selectedDiseases.size}개)`;
  }

  if (!tagsContainer) return;

  if (selectedDiseases.size === 0) {
    tagsContainer.innerHTML = '<p style="color: var(--text-gray); font-size: 14px;">선택된 질환이 없습니다</p>';
    return;
  }

  tagsContainer.innerHTML = Array.from(selectedDiseases.values()).map(disease => `
    <div class="disease-tag" data-disease-id="${disease.id}">
      <span>${disease.icon} ${disease.name}</span>
      <input type="text"
             class="disease-detail-input"
             placeholder="상세 정보 입력 (선택)"
             value="${disease.detail || ''}"
             data-disease-id="${disease.id}">
      <button type="button" onclick="removeDisease('${disease.id}')">×</button>
    </div>
  `).join('');

  // 상세 정보 입력 이벤트
  tagsContainer.querySelectorAll('.disease-detail-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const diseaseId = e.target.dataset.diseaseId;
      const disease = selectedDiseases.get(diseaseId);
      if (disease) {
        disease.detail = e.target.value;
      }
    });
  });
}

// 질환 제거
function removeDisease(diseaseId) {
  // Map에서 제거
  selectedDiseases.delete(diseaseId);

  // UI 업데이트: 체크 해제 및 클래스 제거
  const item = document.querySelector(`.disease-item[data-disease-id="${diseaseId}"]`);
  if (item) {
    item.classList.remove('selected');
    const checkbox = item.querySelector('input[type="checkbox"]');
    const checkmark = item.querySelector('.checkmark');
    if (checkbox) checkbox.checked = false;
    if (checkmark) checkmark.textContent = '';
  }

  updateSelectedDisplay();
}

// 검색 필터
function filterDiseases(searchTerm) {
  const grid = document.getElementById('disease-grid');
  if (!grid) return;

  const items = grid.querySelectorAll('.disease-item');

  items.forEach(item => {
    const label = item.querySelector('label').textContent.toLowerCase();
    if (label.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// 선택된 질환 데이터 가져오기
function getSelectedDiseases() {
  return Array.from(selectedDiseases.values()).map(disease => ({
    disease: disease.name,
    detail: disease.detail || ''
  }));
}

// 선택된 질환 설정 (프로필 수정 시 사용)
function setSelectedDiseases(diseases) {
  selectedDiseases.clear();

  if (!diseases || diseases.length === 0) {
    updateSelectedDisplay();
    return;
  }

  // 1. 선택된 질환 Map에 채우기
  diseases.forEach(item => {
    // 질환명으로 ID 찾기
    let foundDisease = null;
    for (const categoryDiseases of Object.values(diseaseData)) {
      foundDisease = categoryDiseases.find(d => d.name === item.disease);
      if (foundDisease) {
        selectedDiseases.set(foundDisease.id, {
          ...foundDisease,
          detail: item.detail || ''
        });
        break;
      }
    }
  });

  // 2. UI 업데이트: 체크박스 및 클래스 설정
  document.querySelectorAll('.disease-item').forEach(item => {
    const diseaseId = item.dataset.diseaseId;
    const isSelected = selectedDiseases.has(diseaseId);
    
    const checkbox = item.querySelector('input[type="checkbox"]');
    const checkmark = item.querySelector('.checkmark');

    if (isSelected) {
      item.classList.add('selected');
      if (checkbox) checkbox.checked = true;
      if (checkmark) checkmark.textContent = '✓';
    } else {
      item.classList.remove('selected');
      if (checkbox) checkbox.checked = false;
      if (checkmark) checkmark.textContent = '';
    }
  });

  updateSelectedDisplay();
}

// 선택 초기화
function clearSelectedDiseases() {
  selectedDiseases.clear();

  document.querySelectorAll('.disease-item').forEach(item => {
    item.classList.remove('selected');
    const checkbox = item.querySelector('input[type="checkbox"]');
    const checkmark = item.querySelector('.checkmark');
    if (checkbox) checkbox.checked = false;
    if (checkmark) checkmark.textContent = '';
  });

  updateSelectedDisplay();
}