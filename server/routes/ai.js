const express = require('express');
const router = express.Router();

// AI 분석 기능을 Mock 응답으로 제공
// 실제 AI API 대신 미리 정의된 분석 결과를 반환합니다

// 일일 기록 분석
router.post('/analyze-daily', async (req, res) => {
  try {
    const { recordData, profileData } = req.body;

    if (!recordData) {
      return res.status(400).json({ success: false, message: '기록 데이터가 필요합니다.' });
    }

    // 스트레스 수준에 따른 분석
    const stressLevel = recordData.stressLevel || 5;
    const sleepHours = recordData.sleepHours || 0;
    const pssTotal = recordData.pssTotal || 0;

    let analysis = '';

    // 1. 전체 평가
    analysis += '## 📊 전체 평가\n\n';
    if (stressLevel >= 7) {
      analysis += `오늘의 스트레스 수준(${stressLevel}/10)이 다소 높은 편입니다. `;
    } else if (stressLevel >= 4) {
      analysis += `오늘의 스트레스 수준(${stressLevel}/10)은 적정 범위에 있습니다. `;
    } else {
      analysis += `오늘의 스트레스 수준(${stressLevel}/10)이 낮아 좋은 상태입니다. `;
    }

    if (sleepHours > 0) {
      if (sleepHours < 6) {
        analysis += `수면 시간(${sleepHours}시간)이 부족한 편이니 충분한 휴식이 필요합니다. `;
      } else if (sleepHours >= 7 && sleepHours <= 9) {
        analysis += `수면 시간(${sleepHours}시간)이 적절하여 좋습니다. `;
      } else {
        analysis += `수면 시간이 ${sleepHours}시간으로 기록되었습니다. `;
      }
    }

    if (pssTotal > 0) {
      if (pssTotal <= 13) {
        analysis += `PSS-10 점수(${pssTotal}/40)는 낮은 스트레스 상태를 나타냅니다.\n\n`;
      } else if (pssTotal <= 26) {
        analysis += `PSS-10 점수(${pssTotal}/40)는 보통 수준의 스트레스를 나타냅니다.\n\n`;
      } else {
        analysis += `PSS-10 점수(${pssTotal}/40)는 높은 스트레스 상태를 나타내어 주의가 필요합니다.\n\n`;
      }
    } else {
      analysis += '\n\n';
    }

    // 2. 주요 우려사항
    analysis += '## ⚠️ 주요 우려사항\n\n';
    let concerns = [];

    if (stressLevel >= 7) {
      concerns.push('- **높은 스트레스 수준**: 지속적인 고강도 스트레스는 신체적, 정신적 건강에 부정적 영향을 줄 수 있습니다.');
    }

    if (sleepHours > 0 && sleepHours < 6) {
      concerns.push('- **수면 부족**: 만성적인 수면 부족은 면역력 저하, 집중력 감소, 번아웃 위험을 증가시킵니다.');
    }

    if (recordData.workIntensity && recordData.workIntensity >= 8) {
      concerns.push('- **높은 업무 강도**: 과도한 업무 부담은 장기적으로 건강 문제를 야기할 수 있습니다.');
    }

    if (pssTotal > 26) {
      concerns.push('- **높은 스트레스 인지 수준**: 전문가 상담이나 스트레스 관리 프로그램 참여를 고려해보세요.');
    }

    if (concerns.length === 0) {
      concerns.push('- 현재 특별히 우려되는 사항은 없습니다. 현재 상태를 잘 유지하시기 바랍니다.');
    }

    analysis += concerns.join('\n') + '\n\n';

    // 3. 맞춤 조언
    analysis += '## 💡 맞춤 조언\n\n';
    let advice = [];

    if (stressLevel >= 7 || pssTotal > 20) {
      advice.push('- **스트레스 관리**: 업무 중간에 5-10분 휴식을 취하고, 심호흡이나 스트레칭으로 긴장을 풀어보세요.');
      advice.push('- **마음챙김 실천**: 하루 10분 명상이나 요가로 정신 건강을 관리하세요.');
    }

    if (sleepHours < 7) {
      advice.push('- **수면 개선**: 취침 1시간 전 스마트폰 사용을 줄이고, 규칙적인 수면 스케줄을 만들어보세요.');
    }

    if (recordData.meals && recordData.meals.length < 3) {
      advice.push('- **규칙적인 식사**: 세 끼를 규칙적으로 섭취하여 에너지 수준을 유지하세요.');
    }

    advice.push('- **신체 활동**: 하루 30분 이상 걷기나 가벼운 운동으로 스트레스를 해소하세요.');
    advice.push('- **수분 섭취**: 충분한 물 섭취(하루 1.5~2L)로 피로를 예방하세요.');

    analysis += advice.slice(0, 4).join('\n') + '\n\n';

    // 4. 긍정적 피드백
    analysis += '## 🌟 긍정적 피드백\n\n';

    let positives = [];

    if (sleepHours >= 7) {
      positives.push('충분한 수면 시간을 확보하고 계십니다');
    }

    if (stressLevel <= 5) {
      positives.push('스트레스를 잘 관리하고 계십니다');
    }

    if (recordData.meals && recordData.meals.length >= 2) {
      positives.push('규칙적인 식사 습관을 유지하고 계십니다');
    }

    if (recordData.steps && recordData.steps >= 8000) {
      positives.push('충분한 신체 활동을 하고 계십니다');
    }

    if (positives.length > 0) {
      analysis += `${positives.join(', ')}. 이대로 계속 유지하신다면 건강한 라이프스타일을 만들어가실 수 있습니다! 💪`;
    } else {
      analysis += '건강 기록을 꾸준히 작성하시는 것만으로도 자신의 건강을 잘 돌보고 계신 것입니다. 작은 변화부터 시작해보세요! 💪';
    }

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

    // 통계 계산
    const avgStress = (records.reduce((sum, r) => sum + (r.stressLevel || 0), 0) / records.length).toFixed(1);
    const avgSleep = records.filter(r => r.sleepHours).length > 0
      ? (records.filter(r => r.sleepHours).reduce((sum, r) => sum + r.sleepHours, 0) / records.filter(r => r.sleepHours).length).toFixed(1)
      : 0;
    const avgPSS = records.filter(r => r.pssTotal).length > 0
      ? (records.filter(r => r.pssTotal).reduce((sum, r) => sum + r.pssTotal, 0) / records.filter(r => r.pssTotal).length).toFixed(1)
      : 0;
    const avgWorkIntensity = (records.reduce((sum, r) => sum + (r.workIntensity || 0), 0) / records.length).toFixed(1);

    let analysis = '';

    // 1. 전반적 건강 상태
    analysis += `## 📊 전반적 건강 상태 (${records.length}일 기록)\n\n`;
    analysis += `지난 ${records.length}일간의 데이터를 분석한 결과, `;

    if (avgStress >= 7) {
      analysis += '스트레스 수준이 전반적으로 높은 편입니다. ';
    } else if (avgStress >= 4) {
      analysis += '스트레스 수준은 적정 범위를 유지하고 있습니다. ';
    } else {
      analysis += '스트레스가 잘 관리되고 있습니다. ';
    }

    if (avgSleep > 0) {
      if (avgSleep < 6) {
        analysis += `평균 수면 시간(${avgSleep}시간)이 권장량보다 부족한 상태입니다. `;
      } else if (avgSleep >= 7) {
        analysis += `평균 수면 시간(${avgSleep}시간)이 적절하게 유지되고 있습니다. `;
      }
    }

    analysis += `평균 업무 강도는 ${avgWorkIntensity}/10으로 `;
    if (avgWorkIntensity >= 7) {
      analysis += '다소 높은 편이니 적절한 휴식이 필요합니다.\n\n';
    } else {
      analysis += '적정 수준을 유지하고 있습니다.\n\n';
    }

    // 2. 긍정적 패턴
    analysis += '## ✅ 긍정적 패턴\n\n';
    let positivePatterns = [];

    if (avgSleep >= 7) {
      positivePatterns.push('- **충분한 수면**: 평균 수면 시간이 권장량을 충족하고 있습니다.');
    }

    if (avgStress <= 5) {
      positivePatterns.push('- **안정적인 스트레스 관리**: 스트레스 수준을 낮게 유지하고 계십니다.');
    }

    const mealsCount = records.filter(r => r.meals && r.meals.length >= 2).length;
    if (mealsCount / records.length >= 0.7) {
      positivePatterns.push('- **규칙적인 식사 습관**: 대부분의 날에 규칙적으로 식사하고 계십니다.');
    }

    if (positivePatterns.length === 0) {
      positivePatterns.push('- **꾸준한 기록**: 건강 상태를 꾸준히 기록하시는 습관 자체가 건강 관리의 첫걸음입니다.');
    }

    analysis += positivePatterns.join('\n') + '\n\n';

    // 3. 개선이 필요한 영역
    analysis += '## 🎯 개선이 필요한 영역\n\n';
    let improvements = [];

    if (avgStress >= 7) {
      improvements.push('- **스트레스 관리**: 지속적으로 높은 스트레스는 번아웃과 건강 문제를 야기할 수 있습니다.');
    }

    if (avgSleep > 0 && avgSleep < 6) {
      improvements.push('- **수면 시간 확보**: 만성적인 수면 부족은 면역력과 인지 능력을 저하시킵니다.');
    }

    if (avgWorkIntensity >= 8) {
      improvements.push('- **업무 강도 조절**: 높은 업무 강도가 지속되면 신체적, 정신적 피로가 누적됩니다.');
    }

    if (improvements.length === 0) {
      improvements.push('- 현재 큰 개선이 필요한 부분은 보이지 않습니다. 현 상태를 유지하면서 작은 목표들을 추가해보세요.');
    }

    analysis += improvements.join('\n') + '\n\n';

    // 4. 장기 건강 관리 전략
    analysis += '## 🎯 장기 건강 관리 전략\n\n';
    analysis += '- **스트레스 관리 루틴**: 매일 10분씩 명상이나 심호흡 연습을 습관화하세요.\n';
    analysis += '- **수면 위생 개선**: 규칙적인 취침 시간을 정하고, 취침 전 1시간은 디지털 기기 사용을 자제하세요.\n';
    analysis += '- **규칙적인 운동**: 주 3회 이상, 회당 30분 이상의 유산소 운동을 목표로 하세요.\n';
    analysis += '- **사회적 지지**: 동료들과의 긍정적인 관계를 유지하고, 필요시 전문가 상담을 받으세요.\n\n';

    // 5. 전문가 상담 권고
    analysis += '## 🏥 전문가 상담 권고\n\n';

    if (avgStress >= 8 || avgPSS > 27) {
      analysis += '현재 스트레스 수준이 매우 높은 상태입니다. 정신건강의학과 전문의나 상담 전문가와의 상담을 권장드립니다.';
    } else if (avgSleep < 5) {
      analysis += '수면 시간이 지속적으로 부족한 상태입니다. 수면 장애가 의심되니 전문의 상담을 고려해보세요.';
    } else {
      analysis += '현재로서는 전문가 상담이 시급한 상황은 아닙니다. 하지만 증상이 악화되거나 2주 이상 지속되면 전문가와 상담하시기 바랍니다.';
    }

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
    const { topic } = req.body;

    const adviceTemplates = {
      '스트레스 관리': `
## 💆 스트레스 관리 조언

1. **호흡 기법**: 4-7-8 호흡법을 실천하세요 (4초 들이마시기, 7초 숨 참기, 8초 내쉬기)
2. **휴식 시간 확보**: 업무 시간 중 2시간마다 5-10분씩 휴식을 취하세요
3. **취미 활동**: 업무 외 시간에 즐길 수 있는 취미를 만들어보세요
4. **사회적 지지**: 동료나 친구들과 정기적으로 소통하세요
5. **전문가 도움**: 필요시 심리상담이나 직원 지원 프로그램을 활용하세요
      `,
      '수면 개선': `
## 😴 수면 개선 조언

1. **규칙적인 수면 시간**: 매일 같은 시간에 자고 일어나세요
2. **수면 환경**: 어둡고 시원한 환경을 만드세요 (18-22도)
3. **디지털 디톡스**: 취침 1시간 전 스마트폰, TV 사용을 중단하세요
4. **카페인 제한**: 오후 2시 이후 카페인 섭취를 피하세요
5. **이완 루틴**: 취침 전 따뜻한 샤워나 가벼운 스트레칭을 하세요
      `,
      '운동': `
## 🏃 운동 조언

1. **걷기**: 하루 30분 이상 빠르게 걷기를 실천하세요
2. **스트레칭**: 업무 중 1시간마다 목, 어깨, 허리 스트레칭을 하세요
3. **근력 운동**: 주 2-3회 가벼운 근력 운동으로 체력을 키우세요
4. **요가**: 스트레스 해소와 유연성 향상을 위해 요가를 시작해보세요
5. **계단 이용**: 엘리베이터 대신 계단을 이용하세요
      `
    };

    const advice = adviceTemplates[topic] || adviceTemplates['스트레스 관리'];

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
