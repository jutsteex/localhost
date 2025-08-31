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

  // Фиксируем селектор локально
  const selectorId = currentSelector;

  // Привязываем предмет к селектору
  selectedItems[selectorId] = item;

  // Сбрасываем выбранный патрон только для этого оружия
  selectedAmmo[selectorId] = null;

  // Найти контейнер селектора
  const box = document.getElementById(selectorId);
  const placeholder = box?.querySelector('.selector-placeholder');
  const preview = box?.querySelector('.artifact-preview');

  if (placeholder) placeholder.style.display = 'none';

  if (preview) {
    // Доступные патроны строго по типу оружия
    const ammoOptions = currentType === 'weapon'
      ? ammoData.filter(a => a.type === item.ammoType)
      : [];

    // Рендер превью
    preview.classList.remove('hidden');
    preview.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <h4>${item.name}</h4>
      <div class="artifact-category">${item.categories?.[0] || ''}</div>
      ${currentType === 'weapon' ? `
      <div class="enhancement">
        <label>Заточка:</label>
        <select id="${selectorId}-enhance">
          <option value="none">+0</option>
          <option value="basic">+15</option>
        </select>
      </div>
      <div class="enhancement">
        <label>Патроны:</label>
        <select id="${selectorId}-ammo">
          ${ammoOptions.map((a, i) =>
            `<option value="${a.name}" ${i === 0 ? 'selected' : ''}>${a.name}</option>`
          ).join('')}
        </select>
      </div>
      ` : ''}
    `;

    // Обработчик заточки
    const enhanceSelect = document.getElementById(`${selectorId}-enhance`);
    if (enhanceSelect) {
      enhanceSelect.addEventListener('change', () => {
        if (selectedItems.selector1 && selectedItems.selector2) updateDetailedChart();
      });
    }

    // Обработчик патронов
    const ammoSelect = document.getElementById(`${selectorId}-ammo`);
    if (ammoSelect) {
      // Автовыбор первого патрона
      if (ammoOptions.length > 0) {
        const chosenAmmo = ammoOptions.find(a => a.name === ammoSelect.value);
        selectedAmmo[selectorId] = chosenAmmo || null;
      } else {
        selectedAmmo[selectorId] = null;
      }

      ammoSelect.addEventListener('change', (e) => {
        const chosenAmmo = ammoOptions.find(a => a.name === e.target.value);
        selectedAmmo[selectorId] = chosenAmmo || null;

        if (selectedItems.selector1 && selectedItems.selector2) updateDetailedChart();
      });
    } else {
      selectedAmmo[selectorId] = null;
    }
  }

  // Закрыть модалку выбора
  toggleModal(modal, false);

  // Кнопка сравнения активна только если выбраны оба
  if (compareBtn) {
    compareBtn.disabled = !(selectedItems.selector1 && selectedItems.selector2);
  }

  // Если оба выбраны — обновим графики и таблицу
  if (selectedItems.selector1 && selectedItems.selector2) {
    updateDetailedChart();
  }
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

function applyEnhancement(weapon, selector) {
  const enhanceSelect = document.getElementById(`${selector}-enhance`);
  if (!enhanceSelect || enhanceSelect.value === 'none') return weapon;

  const weaponType = weapon.categories?.[0]?.toLowerCase() || 'assault';
  const bonuses = enhancementBonuses[weaponType] || enhancementBonuses.assault;

  // Копия, чтобы не портить оригинал
  const enhanced = JSON.parse(JSON.stringify(weapon));
  const dmgStats = extractDamageStats(enhanced.xaract);
  const rof = extractRateOfFire(enhanced.xaract);

  // Урон
  dmgStats.closeDamage *= (1 + (bonuses.damage || 0));
  dmgStats.farDamage   *= (1 + (bonuses.farDamage || 0));
  enhanced._enhancedDamage = dmgStats;

  // Скорострельность
  enhanced._enhancedRof = rof * (1 + (bonuses.rateOfFire || 0));

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
    closeDamage: close.damage.toFixed(1),
    farDamage: far.damage.toFixed(1),
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

  // применяем заточку
  const w1 = applyEnhancement(selectedItems.selector1, 'selector1');
  const w2 = applyEnhancement(selectedItems.selector2, 'selector2');

  // функция для модификации xaract, не ломая остальные параметры
  function getEnhancedXaract(w, origXaract) {
  if (!w._enhancedDamage && !w._enhancedRof) return origXaract;
  const lines = origXaract.split('\n').map(l => l.trim());

  return lines.map(line => {
    if (line.startsWith("Урон")) {
      const dmg = w._enhancedDamage || extractDamageStats(origXaract);
      const close = dmg.closeDamage.toFixed(1);
      const far   = dmg.farDamage.toFixed(1);
      const start = dmg.startDistance ? dmg.startDistance.toFixed(1) : null;
      const max   = dmg.maxDistance   ? dmg.maxDistance.toFixed(1)   : null;

      const startPart = start ? `${start}м - ` : '';
      const maxPart   = max   ? `${max}м`      : '';

      return `Урон: ${close} | ${startPart}${far} | ${maxPart}`;
    }
    if (line.startsWith("Скорострельность") && w._enhancedRof) {
      return `Скорострельность: ${w._enhancedRof.toFixed(1)} выстрелов/мин`;
    }
    return line;
  }).join('\n');
}

  const w1Xaract = getEnhancedXaract(w1, w1.xaract);
  const w2Xaract = getEnhancedXaract(w2, w2.xaract);

  const s1 = { 
    ...parseStats(w1Xaract), 
    ...parseStats(w1.blueStat) 
  };
  const s2 = { 
    ...parseStats(w2Xaract), 
    ...parseStats(w2.blueStat) 
  };

  const allKeys = [...new Set([...Object.keys(s1), ...Object.keys(s2)])];
  
  allKeys.forEach(key => {
    const v1 = getComparableValue(s1[key]);
    const v2 = getComparableValue(s2[key]);
    let class1 = 'equal', class2 = 'equal';
    
    if (v1 !== null && v2 !== null) {
      const isInverted = invertedStats.has(key);
      
      if ((!isInverted && v1 > v2) || (isInverted && v1 < v2)) {
        class1 = 'better';
        class2 = 'worse';
      } else if ((!isInverted && v1 < v2) || (isInverted && v1 > v2)) {
        class1 = 'worse';
        class2 = 'better';
      }
    }
    
    const row = document.createElement('div');
    row.className = 'comparison-row';
    row.innerHTML = `
      <div class="comparison-header">${key}</div>
      <div class="comparison-value ${class1}">${s1[key] || '-'}</div>
      <div class="comparison-value ${class2}">${s2[key] || '-'}</div>
    `;
    resultContainer.appendChild(row);
  });
  
  comparisonResult?.classList.remove('hidden');
}