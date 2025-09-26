// ===============================
// DOM элементы
// ===============================
const modal = document.getElementById('artifact-modal');
const advancedModal = document.getElementById('advanced-modal');
const artifactGrid = document.querySelector('.artifact-grid');
const compareBtn = document.getElementById('compare-btn');
const resultContainer = document.querySelector('.result-container');
const comparisonResult = document.getElementById('comparison-result');
const itemTypeSelect = document.getElementById('item-type-select');
const calculateBtn = document.getElementById('calculate-btn');
const artifactSearch = document.getElementById('artifact-search');

// ===============================
// Глобальные переменные
// ===============================
let currentSelector = null;
let selectedItems = { selector1: null, selector2: null };
let currentType = 'artifacts';
let ammoData = [];
let allItems = [];
let customArmorPiercing = { selector1: null, selector2: null };
let detailedChart = null;
let currentHitType = 'headshot'; // headshot | bodyshot | limbshot
let currentMetric = 'ttk';       // 'ttk' | 'dps'
let selectedAmmo = { selector1: null, selector2: null };

// Инвертированное сравнение
const invertedStats = new Set([
  "Вес", "Разброс в прицеле","Разброс от бедра", "Вертикальная отдача", "Горизонтальная отдача",
    "Перезарядка", "Время доставания", "Радиация", "Пси-воздействие"
]);

// ===============================
// Бонусы заточки оружия 
// ===============================
const enhancementBonuses = {
  assault: { damage: 0.10, farDamage: 0.10, rateOfFire: 0.10 },
  sniper: { damage: 0.20, farDamage: 0.20 },
  pulemety: { damage: 0.05, farDamage: 0.05, rateOfFire: 0.15 },
  pistols: { damage: 0.20, farDamage: 0.20 },
  droboviki: { damage: 0.20, farDamage: 0.20 },
  pp: { damage: 0.15, farDamage: 0.15, rateOfFire: 0.05 },
};

// ===============================
// Таблица уровней заточки (0–15)
// ===============================
const level_table = [
    0,
    0.0634,
    0.1109,
    0.1422,
    0.1673,
    0.1969,
    0.2316,
    0.2725,
    0.3206,
    0.3771,
    0.4737,
    0.5220,
    0.6141,
    0.7225,
    0.8124,
    1
];

const MAX_ARTIFACT_PERCENT = 135;

// ===============================
// Утилиты
// ===============================
const debounce = (fn, delay = 200) => {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
};

function toggleModal(m, show = true) {
  if (!m) return; if (show) { m.classList.add('active'); m.classList.remove('hidden'); }
  else { m.classList.remove('active'); setTimeout(() => m.classList.add('hidden'), 300); }
}

function addInputListener(el, callback, delay = 300) { if (el) el.addEventListener('input', debounce(callback, delay)); }

function createChart(ctx, type, data, options, oldChart) {
  if (!ctx) return null;
  oldChart?.destroy();
  return new Chart(ctx.getContext('2d'), { type, data, options });
}
function loadAmmo() {
  return fetch('../data/ammo.json')
    .then(r => r.json())
    .then(data => { ammoData = data.ammo; });
}

// ===============================
// Инициализация
// ===============================

document.querySelectorAll("[id$='-ammo']").forEach(select => {
  select.addEventListener("change", (e) => {
    const selectorId = e.target.id.replace("-ammo", "");
    const weapon = selectedItems[selectorId];
    if (!weapon) return;

    const chosenAmmo = weapon.ammoTypes.find(ammo => ammo.id === e.target.value);
    if (chosenAmmo) {
      selectedAmmo[selectorId] = chosenAmmo;
    }

    updateDetailedChart();
  });
});

document.addEventListener('DOMContentLoaded', () => {
  loadAmmo().then(() => {
    initEventListeners();
    loadItems();
    initDetailedChartControls();
  });
});

function initEventListeners() {
  // Событие по кнопке выбора
  document.querySelectorAll('.select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSelector = btn.dataset.target;
      toggleModal(modal, true);
      displayItems();
    });
  });

  // Событие по всей области выбора
  document.querySelectorAll('.selector-box').forEach(box => {
    box.addEventListener('click', (e) => {
      // если превью уже показано (предмет выбран) — не открываем модалку
      const preview = box.querySelector('.artifact-preview');
      if (preview && !preview.classList.contains('hidden')) return;
      currentSelector = box.id; // "selector1" или "selector2"
      toggleModal(modal, true);
      displayItems();
    });
  });

  // Закрытие модалок
  [modal, advancedModal].forEach(m => {
    if (!m) return;
    m.addEventListener('click', e => { if (e.target === m) toggleModal(m, false); });
    m.querySelector('.modal-content')?.addEventListener('click', e => e.stopPropagation());
    m.querySelector('.close-btn')?.addEventListener('click', () => toggleModal(m, false));
  });

  // Поиск по предметам
  addInputListener(artifactSearch, e => {
    const cat = document.querySelector('.tab-btn.active')?.dataset.category || 'all';
    displayItems(e.target.value, cat);
  }, 200);

  // Переключение вкладок категорий
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    displayItems(artifactSearch?.value || '', btn.dataset.category);
  }));

  // Кнопка сравнения
  compareBtn?.addEventListener('click', () => {
    compareItems();
    if (currentType === 'weapon') { 
      toggleModal(advancedModal, true); 
      showAdvancedComparison(); 
    }
  });

  // Пересчёт в расширенном сравнении
  calculateBtn?.addEventListener('click', () => { 
    showAdvancedComparison(); 
    toggleModal(advancedModal, true); 
  });

  // Смена типа предметов
  itemTypeSelect?.addEventListener('change', e => { 
    currentType = e.target.value; 
    resetComparison(); 
    loadItems(); 
  });

  // Обновление графиков при изменении входных параметров
  addInputListener(document.getElementById('bullet-resist'), () => {
    if (currentType === 'weapon' && selectedItems.selector1 && selectedItems.selector2) updateDetailedChart();
  });
  addInputListener(document.getElementById('target-hp'), () => {
    if (currentType === 'weapon' && selectedItems.selector1 && selectedItems.selector2) updateDetailedChart();
  });

  // Переключение на вкладки в расширенном сравнении
  document.getElementById('info-tab')?.addEventListener('click', showInfoView);
  document.getElementById('metrics-tab')?.addEventListener('click', showDamageTableView);
}

function initDetailedChartControls() {
  document.querySelectorAll('[data-hit-type]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-hit-type]').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentHitType = e.target.dataset.hitType; // headshot|bodyshot|limbshot
      updateDetailedChart();
    });
  });

  document.querySelectorAll('[data-metric]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-metric]').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentMetric = e.target.dataset.metric; // dps|ttk
      updateDetailedChart();
    });
  });
}

// ===============================
// UI переключатели
// ===============================
function showInfoView() {
  document.getElementById('info-tab')?.classList.add('active');
  document.getElementById('metrics-tab')?.classList.remove('active');
  document.getElementById('info-view')?.classList.remove('hidden');
  document.getElementById('metrics-view')?.classList.add('hidden');
  
  // При переключении на вкладку информации показываем сравнение характеристик
  if (selectedItems.selector1 && selectedItems.selector2) {
    showAdvancedComparison();
  }
}

function showDamageTableView() {
  document.getElementById('metrics-tab')?.classList.add('active');
  document.getElementById('info-tab')?.classList.remove('active');
  document.getElementById('metrics-view')?.classList.remove('hidden');
  document.getElementById('info-view')?.classList.add('hidden');
  updateDetailedChart();
}

// ===============================
// Работа с предметами
// ===============================
function resetComparison() {
  selectedItems = { selector1: null, selector2: null };
  customArmorPiercing = { selector1: null, selector2: null };
  document.querySelectorAll('.selector-box').forEach(box => {
    box.querySelector('.selector-placeholder')?.style.removeProperty('display');
    box.querySelector('.artifact-preview')?.classList.add('hidden');
  });
  if (compareBtn) compareBtn.disabled = true;
  if (resultContainer) resultContainer.innerHTML = '';
  comparisonResult?.classList.add('hidden');
}

function loadItems() {
  fetch(`../data/${currentType}.json`)
    .then(r => r.json())
    .then(data => { allItems = data[Object.keys(data)[0]]; displayItems(); })
    .catch(err => console.error('Ошибка загрузки:', err));
}

function displayItems(filter = '', category = 'all') {
  if (!artifactGrid) return;
  artifactGrid.innerHTML = '';
  const filtered = allItems.filter(i =>
    i.name.toLowerCase().includes(filter.toLowerCase()) &&
    (category === 'all' || i.categories?.some(c => c.toLowerCase().includes(category)))
  );
  if (!filtered.length) { artifactGrid.innerHTML = '<div class="no-items">Ничего не найдено</div>'; return; }
  filtered.forEach(item => {
    const el = document.createElement('div');
    el.className = 'artifact-item';
    el.innerHTML = `<img src="${item.image}" alt="${item.name}"><h4>${item.name}</h4>${item.categories ? `<div class="item-category">${item.categories[0]}</div>` : ''}`;
    el.addEventListener('click', () => selectItem(item));
    artifactGrid.appendChild(el);
  });
}

function selectItem(item) {
  if (!currentSelector) return;

  const selectorId = currentSelector;
  selectedItems[selectorId] = item;
  selectedAmmo[selectorId] = null;

  const box = document.getElementById(selectorId);
  const placeholder = box?.querySelector('.selector-placeholder');
  const preview = box?.querySelector('.artifact-preview');
  if (placeholder) placeholder.style.display = 'none';
  if (!preview) return;

  // патроны только для оружия
  const ammoOptions = currentType === 'weapon'
    ? (Array.isArray(ammoData) ? ammoData.filter(a => a.type === item.ammoType) : [])
    : [];

  // заточка — для оружия и брони (кнопки +/- и поле ввода, плюс скрытый input для логики)
  const enhanceHTML = (currentType === 'weapon' || currentType === 'armor')
    ? `
      <div class="enhancement">
        <label for="${selectorId}-enhance">Заточка:</label>
        <div class="enhance-controls" style="display:flex;align-items:center;gap:8px;">
          <button type="button" class="enhance-btn" id="${selectorId}-enhance-minus">−</button>
          <input type="number" min="0" max="15" value="0" id="${selectorId}-enhance-input" class="enhance-input" />
          <button type="button" class="enhance-btn" id="${selectorId}-enhance-plus">+</button>
          <input type="hidden" id="${selectorId}-enhance" value="0" />
        </div>
      </div>
    ` : '';

  // патроны — только оружие
  const ammoHTML = (currentType === 'weapon')
    ? `
      <div class="enhancement">
        <label for="${selectorId}-ammo">Патроны:</label>
        <select id="${selectorId}-ammo" class="ap-input">
          ${ammoOptions.map((a, i) => `<option value="${a.name}" ${i===0?'selected':''}>${a.name}</option>`).join('')}
        </select>
      </div>
    ` : '';

  // процент — только артефакты
  const percentHTML = (currentType === 'artifacts')
    ? `
      <div class="enhancement">
        <label for="${selectorId}-percent">Процент:</label>
        <input type="number" id="${selectorId}-percent" class="ap-input" min="0" max="135" value="100" />
      </div>
    ` : '';

  preview.classList.remove('hidden');
  preview.innerHTML = `
    <img class="item-image" src="${item.image}" alt="${item.name}">
    <h4 class="item-title">${item.name}</h4>
    <div class="artifact-category">${item.categories?.[0] || ''}</div>
    <div class="controls">
      ${enhanceHTML}
      ${ammoHTML}
      ${percentHTML}
    </div>
  `;

  // обработчики заточки (кнопки +/- меняют скрытый инпут)
  const enhanceInput = document.getElementById(`${selectorId}-enhance`);
  const enhanceVisible = document.getElementById(`${selectorId}-enhance-input`);
  const minusBtn = document.getElementById(`${selectorId}-enhance-minus`);
  const plusBtn = document.getElementById(`${selectorId}-enhance-plus`);
  const updateDisabled = () => {
    const v = parseInt(enhanceInput?.value || '0', 10) || 0;
    if (minusBtn) minusBtn.disabled = v <= 0;
    if (plusBtn) plusBtn.disabled = v >= 15;
  };
  const notifyChange = () => {
    if (enhanceVisible && enhanceInput) enhanceVisible.value = String(enhanceInput.value);
    updateDisabled();
    if (selectedItems.selector1 && selectedItems.selector2) updateDetailedChart();
  };
  const clampLevel = (v) => Math.max(0, Math.min(15, v));
  if (minusBtn && enhanceInput) {
    minusBtn.addEventListener('click', () => {
      const v = clampLevel((parseInt(enhanceInput.value, 10) || 0) - 1);
      enhanceInput.value = String(v);
      notifyChange();
    });
  }
  if (plusBtn && enhanceInput) {
    plusBtn.addEventListener('click', () => {
      const v = clampLevel((parseInt(enhanceInput.value, 10) || 0) + 1);
      enhanceInput.value = String(v);
      notifyChange();
    });
  }
  // Ввод вручную значения заточки (0..15)
  if (enhanceVisible && enhanceInput) {
    enhanceVisible.addEventListener('input', () => {
      let v = parseInt(enhanceVisible.value, 10);
      if (isNaN(v)) v = 0;
      v = clampLevel(v);
      enhanceInput.value = String(v);
      notifyChange();
    });
    enhanceVisible.addEventListener('blur', () => {
      let v = parseInt(enhanceVisible.value, 10);
      if (isNaN(v)) v = 0;
      v = clampLevel(v);
      enhanceVisible.value = String(v);
      enhanceInput.value = String(v);
      notifyChange();
    });
  }
  // начальная инициализация состояния
  notifyChange();

  // обработчики патронов
  const ammoSelect = document.getElementById(`${selectorId}-ammo`);
  if (ammoSelect) {
    const chosenAmmo = ammoOptions.find(a => a.name === ammoSelect.value);
    selectedAmmo[selectorId] = chosenAmmo || null;
    ammoSelect.addEventListener('change', (e) => {
      const a = ammoOptions.find(x => x.name === e.target.value);
      selectedAmmo[selectorId] = a || null;
      if (selectedItems.selector1 && selectedItems.selector2) updateDetailedChart();
    });
  } else {
    selectedAmmo[selectorId] = null;
  }

  // обработчики процентов артефакта
  const percentInput = document.getElementById(`${selectorId}-percent`);
  if (percentInput) {
    const clamp = () => {
      let v = parseInt(percentInput.value, 10);
      if (isNaN(v) || v < 0) v = 0;
      if (v > 135) v = 135;
      percentInput.value = v;
    };
    clamp();
    percentInput.addEventListener('input', () => {
      clamp();
      if (selectedItems.selector1 && selectedItems.selector2) updateDetailedChart();
    });
  }

  toggleModal(modal, false);
  if (compareBtn) compareBtn.disabled = !(selectedItems.selector1 && selectedItems.selector2);
  if (selectedItems.selector1 && selectedItems.selector2) updateDetailedChart();
}

// ===============================
// Парсинг и математика
// ===============================
function extractDamageStats(txt) {
  if (!txt) return { closeDamage: 0, farDamage: 0, maxDistance: 0, startDistance: 0, armorPiercing: 0 };

  const dmg = /Урон:\s*([\d,.]+)(?:\s*\|\s*([\d,.]+)м\s*-\s*([\d,.]+)\s*\|\s*([\d,.]+)м)?/i.exec(txt);

  let close = 0, start = 0, far = 0, max = 0;
  if (dmg) {
    close = parseFloat(dmg[1].replace(',', '.'));
    start = dmg[2] ? parseFloat(dmg[2].replace(',', '.')) : 0;
    far   = dmg[3] ? parseFloat(dmg[3].replace(',', '.')) : close;
    max   = dmg[4] ? parseFloat(dmg[4].replace(',', '.')) : 0;
  }

  const dist = /(?:Макс.*дистанция|Дальность):\s*([\d,.]+)м/i.exec(txt);
  if (dist) max = parseFloat(dist[1].replace(',', '.'));

  const ap = /Броне.*?:\s*\+?([\d,.]+)%/i.exec(txt);

  return {
    closeDamage: close,
    farDamage: far,
    maxDistance: max,
    startDistance: start,
    armorPiercing: ap ? parseFloat(ap[1].replace(',', '.')) / 100 : 0
  };
}

const extractRateOfFire = txt => /Скорострельность:\s*([\d,.]+)/i.exec(txt)?.[1] ? parseFloat(/Скорострельность:\s*([\d,.]+)/i.exec(txt)[1].replace(',', '.') ) : 0;
const extractHeadshotMultiplier = txt => /Множитель в голову:\s*([\d,.]+)/i.exec(txt)?.[1] ? parseFloat(/Множитель в голову:\s*([\d,.]+)/i.exec(txt)[1].replace(',', '.') ) : 1.5;

function calculateDamageAtDistance(weapon, distance, selectorId) {
  const stats = weapon._enhancedDamage || extractDamageStats(weapon.xaract);
  let { closeDamage, farDamage, startDistance, maxDistance } = stats;

  // Базовый урон по дистанции (линейная интерполяция между closeDamage и farDamage)
  let damage;
  if (distance <= (startDistance || 0)) damage = closeDamage;
  else if (distance >= (maxDistance || 0)) damage = farDamage;
  else {
    const t = (distance - startDistance) / Math.max(1e-6, (maxDistance - startDistance));
    damage = closeDamage - (closeDamage - farDamage) * t;
  }

  // Модификатор патрона
  const extra = getAmmoExtraDamage(selectorId) || 0;
  if (Math.abs(extra) < 1) damage *= (1 + extra); // относительный %
  else damage += extra;                              // абсолютная прибавка

  return damage;
}
function parseNumberWithUnit(s) {
  if (!s) return { num: 0, unit: '' };

  // аккуратно парсим: число + всё остальное (включая %, кг и т.д.)
  const m = s.trim().match(/([+\-]?\d+(?:[.,]\d+)?)(.*)$/);
  if (!m) return { num: 0, unit: '' };

  const num = parseFloat(m[1].replace(',', '.'));
  const unit = (m[2] || '').trim(); // <-- сохраняем ровно так, как в JSON (с % или без)

  return { num: isFinite(num) ? num : 0, unit };
}

function formatNumberWithUnit(val, unit) {
  if (Math.abs(val) < 1e-3) {
    return '0' + (unit || '');
  }

  const sign = val > 0 ? '+' : '';
  const numStr = Math.abs(val).toFixed(2).replace('.', ',');

  // всегда добавляем unit так, как он пришёл из JSON (%, кг и т.п.)
  return (val < 0 ? '-' : sign) + numStr + (unit ? unit : '');
}

  // округление до 3 знаков мосле запятой у урона оружия, если нужно уменьшить или увеличить количество знаков после зяптой, МЕНЯЙ ТУТ
function formatDamageValue(val) {
  return parseFloat(val.toFixed(3)).toString().replace('.', ',');
}

// Возвращает { ключ: {min, max, unit} } — если нет диапазона, min==max
function parseArtifactStatsRange(xaract) {
  const res = {};
  if (!xaract) return res;

  xaract.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    // Replace ';' with ':' to handle typos
    line = line.replace(/;/g, ':');
    const [rawKey, rawVal] = line.split(':');
    if (!rawKey || !rawVal) return;
    const key = rawKey.trim();
    const val = rawVal.trim();

    if (val.includes('<->')) {
      const [a, b] = val.split('<->').map(s => s.trim());
      const A = parseNumberWithUnit(a);
      const B = parseNumberWithUnit(b);

      // Берём unit из того, где он явно указан
      const unit = (A.unit && A.unit.length > 0) ? A.unit : (B.unit || '');

      res[key] = { min: A.num, max: B.num, unit };
    } else {
      const A = parseNumberWithUnit(val);
      res[key] = { min: A.num, max: A.num, unit: A.unit };
    }
  });

  return res;
}

// Масштабирование артефакта по проценту (0..135); blueStat добавляем при >=100%
function buildArtifactScaledMap(item, percent) {
  const p = Math.max(0, Math.min(MAX_ARTIFACT_PERCENT, Number(percent) || 0));

  // 0) База (xaract) — парсим диапазоны
  const base = parseArtifactStatsRange(item.xaract);

  // 1) Нормализация ключей, чтобы база и блю совпадали
  const normalizeKey = (k) => (k || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9а-яё]/gi, '');

  // 2) Аккумулятор по нормализованному ключу
  const acc = new Map(); // normKey -> { label, value, unit }

  // 3) Интерполяция базы по проценту p (0..135)
  Object.keys(base).forEach((label) => {
    const { min, max, unit } = base[label];
    const value = min + (max - min) * (p / 100);
    const normKey = normalizeKey(label);
    acc.set(normKey, { label, value, unit: unit || '' });
  });

  // 4) Блю-статы — добавляем ТОЛЬКО при p >= 100
  const blueRaw = item.bluestats || item.blueStat || item.blueStats;
  if (p >= 100 && blueRaw && blueRaw.trim() !== '-' && blueRaw.trim() !== '—') {
    blueRaw.split('\n').map(s => s.trim()).filter(Boolean).forEach((line) => {
      // Replace ';' with ':' to handle typos
      line = line.replace(/;/g, ':');
      const [rawKey, rawVal] = line.split(':');
      if (!rawKey || !rawVal) return;

      const label = rawKey.trim();
      const { num, unit } = parseNumberWithUnit(rawVal.trim());
      const normKey = normalizeKey(label);

      const existed = acc.get(normKey);
      if (existed) {
        existed.value += num;
        if (!existed.unit) existed.unit = unit || '';
      } else {
        acc.set(normKey, { label, value: num, unit: unit || '' });
      }
    });
  }

  // 5) Формируем результат (НЕ фильтруем нули)
  const result = {};
  for (const { label, value, unit } of acc.values()) {
    result[label] = { value, unit: unit || '' };
  }
  return result;
}

// ===============================
// Артефакты: пересчёт по проценту
// ===============================
function applyArtifactPercent(item, selector) {
  const percentInput = document.getElementById(`${selector}-percent`);
  if (!percentInput) return item;

  const percent = parseInt(percentInput.value, 10) || 0;
  const artifact = JSON.parse(JSON.stringify(item));

  artifact._scaledStats = buildArtifactScaledMap(item, percent);
  artifact._percent = percent;

  return artifact;
}



// ===============================
// Универсальная функция заточки
// ===============================

function applyEnhancement(item, selectorId) {
  const enhanceSelect = document.getElementById(`${selectorId}-enhance`);
  const level = enhanceSelect ? (parseInt(enhanceSelect.value, 10) || 0) : 0;
  if (!level) return item;

  const enhanced = JSON.parse(JSON.stringify(item));
  const mult = level_table[level] || 0;

  // Оружие: масштабируем close/far damage и RoF по таблице бонусов
  if (currentType === 'weapon') {
    const wType = (item.categories?.[0] || '').toLowerCase();
    const bonuses = enhancementBonuses[wType] || enhancementBonuses.assault;

    const dmgStats = extractDamageStats(enhanced.xaract);
    const rof = extractRateOfFire(enhanced.xaract);

    dmgStats.closeDamage *= (1 + (bonuses.damage    || 0) * mult);
    dmgStats.farDamage   *= (1 + (bonuses.farDamage || 0) * mult);
    enhanced._enhancedDamage = dmgStats;

    if (!isNaN(rof)) {
      enhanced._enhancedRof = rof * (1 + (bonuses.rateOfFire || 0) * mult);
    }
  }

  // Броня: увеличиваем Пулестойкость на долю от maxbonus
  if (currentType === 'armor') {
    const maxBonus = Number(enhanced.maxbonus) || 0;
    const m = /Пулестойкость:\s*([+\-]?\d+(?:[.,]\d+)?)/i.exec(enhanced.xaract || '');
    if (m) {
      const base = parseFloat(m[1].replace(',', '.')) || 0;
      const val  = base + maxBonus * mult;
      enhanced._enhancedArmorValue = val;

      // Обновим строку: округление до 1 знака после запятой
      enhanced.xaract = enhanced.xaract.replace(
        /Пулестойкость:\s*([+\-]?\d+(?:[.,]\d+)?)/i,
        `Пулестойкость: ${val.toFixed(1)}`
      );
    }
  }

  return enhanced;
}

// Универсальный расчёт урона/TTK/DPS

function calcWeaponAtDistance(weapon, distance, bulletResist, targetHP, hitType = 'bodyshot', selectorId) {
  const enhanced = applyEnhancement(weapon, selectorId);

  const rof    = enhanced._enhancedRof || extractRateOfFire(enhanced.xaract);
  const hsMult = extractHeadshotMultiplier(enhanced.xaract);

  let hitMult = 1.0;
  if (hitType === 'headshot') hitMult = hsMult;
  else if (hitType === 'limbshot') hitMult = 0.8;

  const baseDamage = calculateDamageAtDistance(enhanced, distance, selectorId);
  const ap = getTotalArmorPiercing(selectorId);

  // Эффективное ХП цели с учётом брони и бронебойности
  const effHP = ((bulletResist - bulletResist * ap) + 100) * (targetHP / 100);

  const damage = baseDamage * hitMult;

  // shotsToKill и TTK
  const shotsToKill = effHP / damage;
  const timeToKill = shotsToKill * (60 / rof);

  
  const dps = targetHP / damage;

  return {
    dps,
    ttk: timeToKill,
    damage,
    rof,
    ap,
    hsMult
  };
}

//
// ===== Ammo helpers =====
//

function getAmmoExtraDamage(selectorId) {
  const sel = selectedAmmo[selectorId];
  if (!sel) return 0;

  if (typeof sel.extraDamage !== 'undefined') {
    const v = Number(sel.extraDamage);
    return isFinite(v) ? v : 0;
  }

  const ammo = ammoData.find(a =>
    (!sel.type || a.type === sel.type) &&
    a.name?.toLowerCase() === sel.name?.toLowerCase()
  );
  const v = ammo ? Number(ammo.extraDamage) : 0;
  return isFinite(v) ? v : 0;
}

function getWeaponBaseArmorPiercing(selectorId) {
  const weapon = selectedItems[selectorId];
  if (!weapon) return 0;
  const dmg = extractDamageStats(weapon.xaract);
  const v = Number(dmg.armorPiercing);
  return isFinite(v) ? v : 0;
}

function getAmmoArmorPiercing(selectorId) {
  const sel = selectedAmmo[selectorId];
  if (!sel) return 0;

  if (typeof sel.armorPiercing !== 'undefined') {
    const v = Number(sel.armorPiercing);
    return isFinite(v) ? v : 0;
  }

  const ammo = ammoData.find(a =>
    (!sel.type || a.type === sel.type) &&
    a.name?.toLowerCase() === sel.name?.toLowerCase()
  );
  const v = ammo ? Number(ammo.armorPiercing) : 0;
  return isFinite(v) ? v : 0;
}

function getTotalArmorPiercing(selectorId) {
  const total = getWeaponBaseArmorPiercing(selectorId) + getAmmoArmorPiercing(selectorId);
  // допускаем отрицательные значения, но не больше 95%
  return Math.min(0.95, total);
}

//
// ===== Damage calc =====
//

function calculateDamageAtDistance(weapon, distance, selectorId) {
  const stats = weapon._enhancedDamage || extractDamageStats(weapon.xaract);
  let { closeDamage, farDamage, startDistance, maxDistance } = stats;

  let damage;
  if (distance <= (startDistance || 0)) damage = closeDamage;
  else if (distance >= (maxDistance || 0)) damage = farDamage;
  else {
    const t = (distance - startDistance) / Math.max(1e-6, (maxDistance - startDistance));
    damage = closeDamage - (closeDamage - farDamage) * t;
  }

  const extra = getAmmoExtraDamage(selectorId) || 0;
  if (Math.abs(extra) < 1) damage *= (1 + extra);
  else damage += extra;

  return damage;
}

//
// ===== Main DPS/TTK calc =====
//

function calcWeaponAtDistance(weapon, distance, bulletResist, targetHP, hitType = 'bodyshot', selectorId) {
  const enhanced = applyEnhancement(weapon, selectorId);

  const rof    = enhanced._enhancedRof || extractRateOfFire(enhanced.xaract);
  const hsMult = extractHeadshotMultiplier(enhanced.xaract);

  let hitMult = 1.0;
  if (hitType === 'headshot') hitMult = hsMult;
  else if (hitType === 'limbshot') hitMult = 0.8;

  const baseDamage = calculateDamageAtDistance(enhanced, distance, selectorId);
  const ap = getTotalArmorPiercing(selectorId);

  const effHP = ((bulletResist - bulletResist * ap) + 100) * (targetHP / 100);

  const damage = baseDamage * hitMult;

  return {
    dps: (damage * rof) / 60,
    ttk: (effHP / damage) * (60 / rof),
    damage,
    rof,
    ap,
    hsMult
  };
}

//
// ===== Metrics for tables/charts =====
//

function calculateMetrics(weapon, bulletResist, targetHP, selectorId) {
  const base = weapon._enhancedDamage || extractDamageStats(weapon.xaract);
  const farDist = +(base.maxDistance || 50).toFixed(1);

  const close   = calcWeaponAtDistance(weapon, 0,       bulletResist, targetHP, 'bodyshot', selectorId);
  const far     = calcWeaponAtDistance(weapon, farDist, bulletResist, targetHP, 'bodyshot', selectorId);
  const closeHS = calcWeaponAtDistance(weapon, 0,       bulletResist, targetHP, 'headshot', selectorId);
  const farHS   = calcWeaponAtDistance(weapon, farDist, bulletResist, targetHP, 'headshot', selectorId);

  return {
    effectiveHP: ((targetHP * (bulletResist / 100))).toFixed(1),

    closeDPS: close.dps.toFixed(1),
    farDPS: far.dps.toFixed(1),
    closeHeadshotDPS: closeHS.dps.toFixed(1),
    farHeadshotDPS: farHS.dps.toFixed(1),

    closeTTK: close.ttk.toFixed(3),
    farTTK: far.ttk.toFixed(3),
    closeHeadshotTTK: closeHS.ttk.toFixed(3),
    farHeadshotTTK: farHS.ttk.toFixed(3),

    armorPiercing: (close.ap * 100).toFixed(1) + '%',
    closeDamage: formatDamageValue(close.damage),
    farDamage: formatDamageValue(far.damage),
    maxDistance: farDist,
    rateOfFire: close.rof.toFixed(1),
    damageDrop: ((1 - far.damage / close.damage) * 100).toFixed(1) + '%',
    headshotMultiplier: close.hsMult.toFixed(2),
  };
}

function getAmmoExtraDamage(selectorId) {
  const sel = selectedAmmo[selectorId];
  if (!sel) return 0;

  // Если это целый объект из ammoData
  if (typeof sel.extraDamage !== 'undefined') {
    const v = Number(sel.extraDamage);
    return isFinite(v) ? v : 0;
  }

  // Если сохранились только type/name → ищем в ammoData
  const ammo = ammoData.find(a =>
    (!sel.type || a.type === sel.type) &&
    a.name?.toLowerCase() === sel.name?.toLowerCase()
  );
  const v = ammo ? Number(ammo.extraDamage) : 0;
  return isFinite(v) ? v : 0;
}

function getWeaponBaseArmorPiercing(selectorId) {
  const weapon = selectedItems[selectorId];
  if (!weapon) return 0;
  const dmg = extractDamageStats(weapon.xaract); // armorPiercing в долях (0..1)
  const v = Number(dmg.armorPiercing);
  return isFinite(v) ? v : 0;
}

function getAmmoArmorPiercing(selectorId) {
  const sel = selectedAmmo[selectorId];
  if (!sel) return 0;

  if (typeof sel.armorPiercing !== 'undefined') {
    const v = Number(sel.armorPiercing);
    return isFinite(v) ? v : 0;
  }

  const ammo = ammoData.find(a =>
    (!sel.type || a.type === sel.type) &&
    a.name?.toLowerCase() === sel.name?.toLowerCase()
  );
  const v = ammo ? Number(ammo.armorPiercing) : 0;
  return isFinite(v) ? v : 0;
}

function getTotalArmorPiercing(selectorId) {
  const total = getWeaponBaseArmorPiercing(selectorId) + getAmmoArmorPiercing(selectorId);
  return Math.min(0.95, total); // допускаем < 0, но не даём > 95%
}

// ===============================
// Расширенное сравнение 
// ===============================
function showAdvancedComparison() {
  if (!selectedItems.selector1 || !selectedItems.selector2) {
    console.error('Не выбраны оба предмета для сравнения');
    return;
  }

  initDetailedChartControls();

  const bulletResist = parseInt(document.getElementById('bullet-resist').value) || 250;
  const targetHP = parseFloat(document.getElementById('target-hp').value) || 100;
  
  const enhanced1 = applyEnhancement(selectedItems.selector1, 'selector1');
  const enhanced2 = applyEnhancement(selectedItems.selector2, 'selector2');
  const metrics1 = calculateMetrics(enhanced1, bulletResist, targetHP, 'selector1');
  const metrics2 = calculateMetrics(enhanced2, bulletResist, targetHP, 'selector2');

  // Обновляем таблицу и графики
  updateDetailedChart();
  updateComparisonTable(metrics1, metrics2);

  try {
    const weapon1Img = document.getElementById('weapon1-img');
    const weapon1Name = document.getElementById('weapon1-name');
    const weapon2Img = document.getElementById('weapon2-img');
    const weapon2Name = document.getElementById('weapon2-name');
    
    if (weapon1Img) weapon1Img.src = selectedItems.selector1.image;
    if (weapon1Name) weapon1Name.textContent = selectedItems.selector1.name;
    if (weapon2Img) weapon2Img.src = selectedItems.selector2.image;
    if (weapon2Name) weapon2Name.textContent = selectedItems.selector2.name;
  } catch (e) {
    console.error('Ошибка при обновлении информации о предметах:', e);
  }

  const stats1El = document.getElementById('weapon1-stats');
  const stats2El = document.getElementById('weapon2-stats');
  if (!stats1El || !stats2El) return;

  stats1El.innerHTML = '';
  stats2El.innerHTML = '';

  const stats = [
    { name: 'Урон (близко)', key: 'closeDamage', suffix: '' },
    { name: 'Урон (далеко)', key: 'farDamage', suffix: '' },
    { name: 'Падение урона', key: 'damageDrop', suffix: '' },
    { name: 'Эффективная дистанция', key: 'maxDistance', suffix: 'м' },
    { name: 'Скорострельность', key: 'rateOfFire', suffix: 'выстр/мин' },
    { name: 'Бронепробитие', key: 'armorPiercing', suffix: '' },
    { name: 'Приведёнка', key: 'effectiveHP', suffix: '' },
    { name: 'DPS (близко)', key: 'closeDPS', suffix: '' },
    { name: 'DPS (далеко)', key: 'farDPS', suffix: '' },
    { name: 'DPS HS (близко)', key: 'closeHeadshotDPS', suffix: '' },
    { name: 'DPS HS (далеко)', key: 'farHeadshotDPS', suffix: '' },
    { name: 'TTK (близко)', key: 'closeTTK', suffix: 'сек' },
    { name: 'TTK (далеко)', key: 'farTTK', suffix: 'сек' },
    { name: 'TTK HS (близко)', key: 'closeHeadshotTTK', suffix: 'сек' },
    { name: 'TTK HS (далеко)', key: 'farHeadshotTTK', suffix: 'сек' },
    { name: 'Множитель в голову', key: 'headshotMultiplier', suffix: 'x' },
  ];
  
  stats.forEach(stat => {
    const value1 = metrics1[stat.key];
    const value2 = metrics2[stat.key];
    
    let class1 = 'equal';
    let class2 = 'equal';
    
    if (value1 !== undefined && value2 !== undefined) {
      const num1 = parseFloat(value1);
      const num2 = parseFloat(value2);
      
      if (stat.key.includes('TTK')) {
        class1 = num1 < num2 ? 'better' : num1 > num2 ? 'worse' : 'equal';
      } else {
        class1 = num1 > num2 ? 'better' : num1 < num2 ? 'worse' : 'equal';
      }
      
      class2 = class1 === 'better' ? 'worse' : class1 === 'worse' ? 'better' : 'equal';
    }
    
    if (stats1El) stats1El.appendChild(createStatElement(stat, value1, class1));
    if (stats2El) stats2El.appendChild(createStatElement(stat, value2, class2));
  });

  // Создаем графики
  createDPSChart(metrics1, metrics2);
  createTTKChart(metrics1, metrics2);

  // Показываем DPS по умолчанию
  showDPSChart();

  if (advancedModal) {
    advancedModal.classList.add('active');
    advancedModal.classList.remove('hidden');
    
    const infoTab = document.getElementById('info-tab');
    const metricsTab = document.getElementById('metrics-tab');
    const infoView = document.getElementById('info-view');
    const metricsView = document.getElementById('metrics-view');
    
    if (infoTab && metricsTab && infoView && metricsView) {
      infoTab.classList.add('active');
      metricsTab.classList.remove('active');
      infoView.classList.remove('hidden');
      metricsView.classList.add('hidden');
    }
    
    if (infoView) {
      infoView.scrollTop = 0;
    }
  }
}

function updateComparisonTable(metrics1, metrics2) {
  const weapon1Stats = document.getElementById('weapon1-stats');
  const weapon2Stats = document.getElementById('weapon2-stats');
  if (!weapon1Stats || !weapon2Stats) return;

  weapon1Stats.innerHTML = '';
  weapon2Stats.innerHTML = '';

  const distances = [0, 50]; // Примерные точки для "близко" и "далеко"
  const data1 = calculateWeaponData(selectedItems.selector1, distances, 'selector1');
  const data2 = calculateWeaponData(selectedItems.selector2, distances, 'selector2');

  const stats = [
    { name: 'TTK HS (близко)', value1: data1[0], value2: data2[0] },
    { name: 'TTK (далеко)', value1: data1[Math.floor(distances.length / 2)], value2: data2[Math.floor(distances.length / 2)] },
    { name: 'TTK HS (далеко)', value1: data1[distances.length - 1], value2: data2[distances.length - 1] },
  ];

  stats.forEach(stat => {
    const el1 = createStatElement({ name: stat.name, key: stat.name, suffix: ' сек' }, stat.value1, 'equal');
    const el2 = createStatElement({ name: stat.name, key: stat.name, suffix: ' сек' }, stat.value2, 'equal');
    weapon1Stats.appendChild(el1);
    weapon2Stats.appendChild(el2);
  });
}

function createStatElement(stat, value, className) {
    const el = document.createElement('div');
    el.className = 'stat-item';
    el.innerHTML = `
        <div class="stat-name">${stat.name}</div>
        <div class="stat-value ${className}">${value || '-'} ${stat.suffix}</div>
    `;
    return el;
}

function parseStats(statsText) {
    const stats = {};
    if (!statsText) return stats;
    
    statsText.split('\n').forEach(line => {
        const [key, value] = line.split(':').map(part => part.trim());
        if (key && value) stats[key] = value;
    });
    
    return stats;
}

function updateDetailedChart() {
  if (!selectedItems.selector1 || !selectedItems.selector2) return;
  
  if (currentType === 'weapon') {
    createDetailedWeaponChart();
  } else {
    createDetailedComparisonChart();
  }
}

// ===============================
// Данные для графика
// ===============================
function calculateWeaponData(weapon, distances, selectorId) {
  const targetHP = parseFloat(document.getElementById('target-hp')?.value) || 132;
  const bulletResist = parseFloat(document.getElementById('bullet-resist')?.value) || 250;

  const enhanced = applyEnhancement(weapon, selectorId);

  return distances.map(distance => {
    const data = calcWeaponAtDistance(enhanced, distance, bulletResist, targetHP, currentHitType, selectorId);
    return currentMetric === 'dps'
      ? Math.round(data.dps * 100) / 100
      : Math.round(data.ttk * 1000) / 1000;
  });
}

function createDetailedWeaponChart() {
  const ctx = document.getElementById('detailed-chart');
  if (!ctx) return;

  if (detailedChart) detailedChart.destroy();

  // Формируем подписи (название + заточка + патрон)
  const enhanceMap = { none: '+0', basic: '+15' };
  const enh1Val = document.getElementById('selector1-enhance')?.value || 'none';
  const enh2Val = document.getElementById('selector2-enhance')?.value || 'none';
  const enh1 = enhanceMap[enh1Val] || enh1Val;
  const enh2 = enhanceMap[enh2Val] || enh2Val;

  const ammo1 = (selectedAmmo.selector1 && selectedAmmo.selector1.name) ? selectedAmmo.selector1.name : '—';
  const ammo2 = (selectedAmmo.selector2 && selectedAmmo.selector2.name) ? selectedAmmo.selector2.name : '—';

  const label1 = `${selectedItems.selector1.name} (${enh1}, ${ammo1})`;
  const label2 = `${selectedItems.selector2.name} (${enh2}, ${ammo2})`;

  // Применяем заточку к оружию
  const enhanced1 = applyEnhancement(selectedItems.selector1, 'selector1');
  const enhanced2 = applyEnhancement(selectedItems.selector2, 'selector2');

  // Дистанции и данные
  const distances = Array.from({ length: 46 }, (_, i) => i * 2); // 0–90 м шагом 2
  const data1 = calculateWeaponData(enhanced1, distances, 'selector1');
  const data2 = calculateWeaponData(enhanced2, distances, 'selector2');

  // Чарт
  detailedChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: distances.map(d => `${d}м`),
      datasets: [
        {
          label: label1,
          data: data1,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: 'rgba(54, 162, 235, 1)',
          pointHoverBorderColor: 'rgba(255, 255, 255, 1)',
          pointHoverBorderWidth: 3
        },
        {
          label: label2,
          data: data2,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: 'rgba(75, 192, 192, 1)',
          pointHoverBorderColor: 'rgba(255, 255, 255, 1)',
          pointHoverBorderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      interaction: { intersect: false, mode: 'index', axis: 'x' },
      plugins: {
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0,0,0,0.95)',
          titleColor: '#FFF19B',
          bodyColor: 'white',
          borderColor: '#FFF19B',
          borderWidth: 2,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            title(context) { return `Дистанция: ${context[0].label}`; },
            label(context) {
              const name = context.dataset.label;
              const v = context.parsed.y;
              return currentMetric === 'dps'
                ? `${name}: ${v.toFixed(2)} урон/сек`
                : `${name}: ${v.toFixed(3)} сек`;
            }
          }
        },
        legend: { display: false } // у вас используется кастомная легенда ниже
      },
      scales: {
        x: {
          title: { display: true, text: 'Дистанция (м)', color: '#FFF19B' },
          ticks: { color: '#FFF19B', maxTicksLimit: 15 }
        },
        y: {
          title: { 
            display: true, 
            text: currentMetric === 'dps' ? 'Урон в секунду' : 'Время до убийства (сек)', 
            color: '#FFF19B' 
          },
          ticks: { color: '#FFF19B', maxTicksLimit: 10 },
          beginAtZero: true
        }
      }
    }
  });

  updateChartLegend();
}

function createDetailedComparisonChart() {
  const ctx = document.getElementById('detailed-chart');
  if (!ctx) return;
  
  if (detailedChart) detailedChart.destroy();

  const stats1 = parseStats(selectedItems.selector1.xaract);
  const stats2 = parseStats(selectedItems.selector2.xaract);
  
  const allKeys = [...new Set([...Object.keys(stats1), ...Object.keys(stats2)])];
  const numericKeys = allKeys.filter(key => {
    const val1 = getComparableValue(stats1[key]);
    const val2 = getComparableValue(stats2[key]);
    return val1 !== null && val2 !== null;
  });

  if (numericKeys.length === 0) {
    ctx.style.display = 'none';
    return;
  }

  ctx.style.display = 'block';

  detailedChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: numericKeys,
      datasets: [
        {
          label: selectedItems.selector1.name,
          data: numericKeys.map(key => getComparableValue(stats1[key])),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        },
        {
          label: selectedItems.selector2.name,
          data: numericKeys.map(key => getComparableValue(stats2[key])),
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Значение',
            color: '#FFF19B'
          },
          grid: {
            color: 'rgba(255,241,155,0.1)'
          },
          ticks: {
            color: '#FFF19B',
            font: { size: 11 }
          }
        },
        x: {
          grid: {
            color: 'rgba(255,241,155,0.1)'
          },
          ticks: {
            color: '#FFF19B',
            maxRotation: 45,
            font: { size: 11 }
          }
        }
      }
    }
  });
  
  updateChartLegend();
}

function updateChartLegend() {
  const legend = document.getElementById('chart-legend');
  if (!legend) return;

  legend.innerHTML = '';
  
  const colors = currentType === 'weapon'
    ? ['rgba(54, 162, 235, 1)', 'rgba(75, 192, 192, 1)']
    : ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'];
  
  [selectedItems.selector1.name, selectedItems.selector2.name].forEach((name, index) => {
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <div class="legend-color" style="background-color: ${colors[index]}"></div>
      <span>${name}</span>
    `;
    legend.appendChild(legendItem);
  });
}

// ===============================
// Сравнение предметов 
// ===============================
function parseStats(txt) {
  const stats = {};
  if (!txt) return stats;
  
  txt.split('\n').forEach(line => {
    const [key, value] = line.split(':').map(part => part && part.trim());
    if (key && value) stats[key] = value;
  });
  
  return stats;
}

function getComparableValue(value) {
  if (!value) return null;
  const num = value.match(/-?\d+(?:[.,]\d+)?/);
  return num ? parseFloat(num[0].replace(',', '.')) : null;
}

function compareItems() {
  if (!selectedItems.selector1 || !selectedItems.selector2 || !resultContainer) return;

  resultContainer.innerHTML = '';

  // Заголовок
  const headerRow = document.createElement('div');
  headerRow.className = 'comparison-row';
  headerRow.innerHTML = `
    <div class="comparison-header">Характеристика</div>
    <div class="comparison-value">${selectedItems.selector1.name}</div>
    <div class="comparison-value">${selectedItems.selector2.name}</div>
  `;
  resultContainer.appendChild(headerRow);

  // ===== ВЕТКИ ПО ТИПУ =====
  if (currentType === 'weapon') {
    const w1 = applyEnhancement(selectedItems.selector1, 'selector1');
    const w2 = applyEnhancement(selectedItems.selector2, 'selector2');

    // обновляем только строки Урон/Скорострельность, остальные — как есть
    const patchX = (w, orig) => {
      if (!w._enhancedDamage && !w._enhancedRof) return orig;
      return orig.split('\n').map(line => {
        if (line.startsWith('Урон') && w._enhancedDamage) {
          const d = w._enhancedDamage;
          const start = d.startDistance ? `${d.startDistance.toFixed(1)}м - ` : '';
          const max   = d.maxDistance   ? `${d.maxDistance.toFixed(1)}м`   : '';
          return `Урон: ${formatDamageValue(d.closeDamage)} | ${start}${formatDamageValue(d.farDamage)} | ${max}`;
        }
        if (line.startsWith('Скорострельность') && w._enhancedRof) {
          return `Скорострельность: ${w._enhancedRof.toFixed(1)} выстрелов/мин`;
        }
        return line;
      }).join('\n');
    };

    const s1 = { ...parseStats(patchX(w1, w1.xaract)), ...parseStats(w1.blueStat) };
    const s2 = { ...parseStats(patchX(w2, w2.xaract)), ...parseStats(w2.blueStat) };

    renderStatsTable(s1, s2);
  }

  else if (currentType === 'armor') {
  const a1 = applyEnhancement(selectedItems.selector1, 'selector1');
  const a2 = applyEnhancement(selectedItems.selector2, 'selector2');

  // Сначала Пулестойкость (улучшенная), затем прочие строки
  const getArmorVal = a => {
    if (typeof a._enhancedArmorValue === 'number') return a._enhancedArmorValue;
    const m = /Пулестойкость:\s*([+\-]?\d+(?:[.,]\d+)?)/i.exec(a.xaract || '');
    return m ? parseFloat(m[1].replace(',', '.')) : 0;
  };

  // теперь выводим с одним знаком после запятой
  addRow('Пулестойкость', getArmorVal(a1).toFixed(1), getArmorVal(a2).toFixed(1));

  // Остальные строки, кроме повторной «Пулестойкости»
  const s1 = parseStats(a1.xaract + (a1.blueStat ? `\n${a1.blueStat}` : ''));
  const s2 = parseStats(a2.xaract + (a2.blueStat ? `\n${a2.blueStat}` : ''));
  delete s1['Пулестойкость'];
  delete s2['Пулестойкость'];

  renderStatsTable(s1, s2);
}

  else if (currentType === 'artifacts') {
    const p1El = document.getElementById('selector1-percent');
    const p2El = document.getElementById('selector2-percent');
    const p1 = p1El ? (parseInt(p1El.value, 10) || 0) : 0;
    const p2 = p2El ? (parseInt(p2El.value, 10) || 0) : 0;

    const m1 = buildArtifactScaledMap(selectedItems.selector1, p1);
    const m2 = buildArtifactScaledMap(selectedItems.selector2, p2);

    const allKeys = new Set([...Object.keys(m1), ...Object.keys(m2)]);

    allKeys.forEach((k) => {
      const s1 = m1[k] ? (m1[k].value === 0 ? "-" : formatNumberWithUnit(m1[k].value, m1[k].unit)) : "-";
      const s2 = m2[k] ? (m2[k].value === 0 ? "-" : formatNumberWithUnit(m2[k].value, m2[k].unit)) : "-";

      // Пропускаем строку, если значения для обоих артефактов равны 0
      if (m1[k]?.value === 0 && m2[k]?.value === 0) {
        return;
      }

      addRow(k, s1, s2);
    });
  }

  comparisonResult?.classList.remove('hidden');

  // ===== РЕНДЕР СТРОК И ФУНКЦИИ-ПОМОЩНИКИ =====
  function addRow(stat, val1, val2) {
    const row = document.createElement('div');
    row.className = 'comparison-row';

    const n1 = getComparableValue(val1);
    const n2 = getComparableValue(val2);
    let class1 = 'equal', class2 = 'equal';
    
    const isInverted = invertedStats?.has(stat);

    if (n1 !== null && n2 !== null) {
      if ((!isInverted && n1 > n2) || (isInverted && n1 < n2)) {
        class1 = 'better'; class2 = 'worse';
      } else if ((!isInverted && n1 < n2) || (isInverted && n1 > n2)) {
        class1 = 'worse'; class2 = 'better';
      }
    }

    row.innerHTML = `
      <div class="comparison-header">${stat}</div>
      <div class="comparison-value ${class1}">${val1 ?? '-'}</div>
      <div class="comparison-value ${class2}">${val2 ?? '-'}</div>
    `;
    resultContainer.appendChild(row);
  }

  function renderStatsTable(s1, s2) {
    const keys = [...new Set([...Object.keys(s1 || {}), ...Object.keys(s2 || {})])];
    keys.forEach(k => addRow(k, s1[k], s2[k]));
  }
}
