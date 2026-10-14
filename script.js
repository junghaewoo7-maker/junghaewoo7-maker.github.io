// ===== localStorage 안전하게 사용하기 =====
const store = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 저장할 수 없는 환경이면 무시 */
    }
  },
};

// ===== 테마 전환 =====
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');

function applyTheme(theme) {
  if (theme) root.setAttribute('data-theme', theme);
  const isDark = theme
    ? theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  themeToggle.textContent = isDark ? '☀️' : '🌙';
}
applyTheme(store.get('theme', null));

themeToggle.addEventListener('click', () => {
  const current = root.getAttribute('data-theme')
    || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  store.set('theme', next);
  applyTheme(next);
});

// ===== 모바일 메뉴 =====
const navLinks = document.getElementById('navLinks');
document.getElementById('menuToggle').addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => navLinks.classList.remove('open'))
);

// ===== 타이핑 효과 =====
const phrases = [
  '폴리텍대학에서 AX 과정을 배우고 있어요.',
  '자격증 합격을 향해 공부 중입니다.',
  'AI로 더 똑똑하게 일하는 법을 익히는 중!',
  '어제보다 1% 나은 오늘을 만듭니다.',
];
const typingEl = document.getElementById('typing');
let phraseIndex = 0;
let charIndex = 0;
let deleting = false;

function typeLoop() {
  const phrase = phrases[phraseIndex];
  typingEl.textContent = phrase.slice(0, charIndex);

  if (!deleting && charIndex < phrase.length) {
    charIndex++;
    setTimeout(typeLoop, 90);
  } else if (!deleting) {
    deleting = true;
    setTimeout(typeLoop, 1800);
  } else if (charIndex > 0) {
    charIndex--;
    setTimeout(typeLoop, 40);
  } else {
    deleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    setTimeout(typeLoop, 300);
  }
}
typeLoop();

// ===== 과정 진행률 (평일 수업일 기준 자동 계산) =====
const COURSE_START = new Date(2026, 9, 12); // 2026년 10월 12일(월) 1일차
const TOTAL_HOURS = 240;
const HOURS_PER_DAY = 8;
const TOTAL_DAYS = TOTAL_HOURS / HOURS_PER_DAY; // 30일

function countClassDays(start, end) {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++; // 주말 제외
    d.setDate(d.getDate() + 1);
  }
  return count;
}

const classDay = Math.min(countClassDays(COURSE_START, new Date()), TOTAL_DAYS);
const coursePercent = Math.round((classDay / TOTAL_DAYS) * 100);

document.getElementById('courseFill').style.width = coursePercent + '%';
document.getElementById('courseValue').textContent = coursePercent + '%';
document.getElementById('courseDay').textContent =
  classDay >= TOTAL_DAYS ? '🎓 과정 수료!' : `${classDay}일차 / ${TOTAL_DAYS}일`;
document.getElementById('courseHours').textContent =
  `${classDay * HOURS_PER_DAY}시간 / ${TOTAL_HOURS}시간`;

// ===== 자격증 D-day 관리 =====
const certForm = document.getElementById('certForm');
const certList = document.getElementById('certList');
const certEmpty = document.getElementById('certEmpty');
let certs = store.get('certs', []);

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target - today) / 86400000);
}

function formatDday(days) {
  if (days > 0) return 'D-' + days;
  if (days === 0) return 'D-DAY';
  return '시험 종료';
}

function saveCerts() {
  store.set('certs', certs);
}

function renderCerts() {
  certList.innerHTML = '';
  certEmpty.style.display = certs.length ? 'none' : 'block';

  // 시험일이 가까운 순으로 정렬
  const sorted = [...certs].sort((a, b) => a.date.localeCompare(b.date));

  sorted.forEach((cert) => {
    const days = daysUntil(cert.date);
    const card = document.createElement('article');
    card.className = 'cert-card' + (cert.passed ? ' done' : '');

    card.innerHTML = `
      <div class="cert-top">
        <h3></h3>
        <span class="dday ${days < 0 ? 'past' : ''}">${cert.passed ? '🎉 합격' : formatDday(days)}</span>
      </div>
      <p class="cert-date">시험일 · ${cert.date.replace(/-/g, '.')}</p>
      <div class="progress-label"><span>준비도</span><span>${cert.progress}%</span></div>
      <div class="progress"><div class="progress-fill" style="width:${cert.progress}%"></div></div>
      <input type="range" min="0" max="100" step="5" value="${cert.progress}" aria-label="준비도 조절">
      <div class="cert-actions">
        <label><input type="checkbox" ${cert.passed ? 'checked' : ''}> 합격!</label>
        <button class="delete-btn" type="button">삭제</button>
      </div>
    `;
    // 사용자 입력은 textContent로 넣어 HTML 주입을 막습니다
    card.querySelector('h3').textContent = cert.name;

    const range = card.querySelector('input[type="range"]');
    const fill = card.querySelector('.progress-fill');
    const label = card.querySelector('.progress-label span:last-child');
    range.addEventListener('input', () => {
      cert.progress = Number(range.value);
      fill.style.width = cert.progress + '%';
      label.textContent = cert.progress + '%';
      saveCerts();
    });

    card.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      cert.passed = e.target.checked;
      if (cert.passed) cert.progress = 100;
      saveCerts();
      renderCerts();
    });

    card.querySelector('.delete-btn').addEventListener('click', () => {
      if (!confirm(`'${cert.name}'을(를) 삭제할까요?`)) return;
      certs = certs.filter((c) => c.id !== cert.id);
      saveCerts();
      renderCerts();
    });

    certList.appendChild(card);
  });
}

certForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('certName').value.trim();
  const date = document.getElementById('certDate').value;
  if (!name || !date) return;

  certs.push({ id: Date.now(), name, date, progress: 0, passed: false });
  saveCerts();
  renderCerts();
  certForm.reset();
});
renderCerts();

// ===== 이번 주 공부 습관 =====
const weekEl = document.getElementById('week');
const streakText = document.getElementById('streakText');
const dayNames = ['월', '화', '수', '목', '금', '토', '일'];

function getMonday(date) {
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7; // 월요일 = 0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const weekKey = 'habits-' + getMonday(new Date()).toISOString().slice(0, 10);
let checkedDays = store.get(weekKey, []);
const todayIndex = (new Date().getDay() + 6) % 7;

function renderWeek() {
  weekEl.innerHTML = '';
  dayNames.forEach((name, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day';
    if (i === todayIndex) btn.classList.add('today');
    if (checkedDays.includes(i)) btn.classList.add('checked');
    btn.innerHTML = `${name}<small>${checkedDays.includes(i) ? '✔' : ''}</small>`;
    btn.setAttribute('aria-pressed', checkedDays.includes(i));

    btn.addEventListener('click', () => {
      checkedDays = checkedDays.includes(i)
        ? checkedDays.filter((d) => d !== i)
        : [...checkedDays, i];
      store.set(weekKey, checkedDays);
      renderWeek();
    });
    weekEl.appendChild(btn);
  });

  const n = checkedDays.length;
  streakText.textContent =
    n === 0 ? '이번 주 첫 공부를 기록해 보세요!'
    : n === 7 ? '🔥 일주일 내내 공부했어요! 대단해요!'
    : `이번 주 ${n}일 공부했어요. 계속 가 봅시다! 💪`;
}
renderWeek();

// ===== 오늘의 한 마디 =====
const quotes = [
  '“천 리 길도 한 걸음부터.”',
  '“성공은 매일 반복한 작은 노력들의 합이다.” — 로버트 콜리어',
  '“배움에는 끝이 없다.”',
  '“오늘 걷지 않으면 내일은 뛰어야 한다.”',
  '“시작이 반이다.”',
  '“꾸준함은 재능을 이긴다.”',
  '“늦었다고 생각할 때가 가장 빠를 때다.”',
];
const quoteEl = document.getElementById('quote');
let quoteIndex = new Date().getDate() % quotes.length; // 날짜마다 다른 문장
quoteEl.textContent = quotes[quoteIndex];

document.getElementById('newQuote').addEventListener('click', () => {
  quoteEl.style.opacity = 0;
  setTimeout(() => {
    quoteIndex = (quoteIndex + 1) % quotes.length;
    quoteEl.textContent = quotes[quoteIndex];
    quoteEl.style.opacity = 1;
  }, 250);
});

// ===== 스크롤 등장 애니메이션 & 현재 메뉴 강조 =====
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      const id = entry.target.id;
      if (id) {
        navLinks.querySelectorAll('a').forEach((a) =>
          a.classList.toggle('active', a.getAttribute('href') === '#' + id)
        );
      }
    });
  },
  { threshold: 0.2 }
);
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// ===== 맨 위로 버튼 =====
const toTop = document.getElementById('toTop');
window.addEventListener('scroll', () => {
  toTop.classList.toggle('show', window.scrollY > 400);
});
toTop.addEventListener('click', () => window.scrollTo({ top: 0 }));

// ===== 푸터 연도 =====
document.getElementById('year').textContent = new Date().getFullYear();
