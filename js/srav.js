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
let allItems = [];
let customArmorPiercing = { selector1: null, selector2: null };
let detailedChart = null;
let currentHitType = 'headshot'; // headshot | bodyshot | limbshot
let currentMetric = 'ttk';       // 'ttk' | 'dps'

// Параметры, где меньше значение = лучше (инвертированное сравнение)
const invertedStats = new Set([
  "Вес", "Разброс в прицеле","Разброс от бедра", "Вертикальная отдача", "Горизонтальная отдача",
    "Перезарядка", "Время доставания", "Радиация", "Пси-воздействие"
]);

// ===============================
// Бонусы заточки оружия (заготовка)
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

// ===============================
// Инициализация
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadItems();
  initDetailedChartControls();
});

function initEventListeners() {
  document.querySelectorAll('.select-btn').forEach(btn => {
    btn.addEventListener('click', () => { currentSelector = btn.dataset.target; toggleModal(modal, true); displayItems(); });
  });

  [modal, advancedModal].forEach(m => {
    if (!m) return;
    m.addEventListener('click', e => { if (e.target === m) toggleModal(m, false); });
    m.querySelector('.modal-content')?.addEventListener('click', e => e.stopPropagation());
    m.querySelector('.close-btn')?.addEventListener('click', () => toggleModal(m, false));
  });

  addInputListener(artifactSearch, e => {
    const cat = document.querySelector('.tab-btn.active')?.dataset.category || 'all';
    displayItems(e.target.value, cat);
  }, 200);

  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    displayItems(artifactSearch?.value || '', btn.dataset.category);
  }));

  compareBtn?.addEventListener('click', () => {
    compareItems();
    if (currentType === 'weapon') { toggleModal(advancedModal, true); showAdvancedComparison(); }
  });

  calculateBtn?.addEventListener('click', () => { showAdvancedComparison(); toggleModal(advancedModal, true); });

  itemTypeSelect?.addEventListener('change', e => { currentType = e.target.value; resetComparison(); loadItems(); });

  addInputListener(document.getElementById('bullet-resist'), () => {
    if (currentType === 'weapon' && selectedItems.selector1 && selectedItems.selector2) updateDetailedChart();
  });
  addInputListener(document.getElementById('target-hp'), () => {
    if (currentType === 'weapon' && selectedItems.selector1 && selectedItems.selector2) updateDetailedChart();
  });

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
  selectedItems[currentSelector] = item;
  customArmorPiercing[currentSelector] = null;

  const box = document.getElementById(currentSelector);
  const placeholder = box?.querySelector('.selector-placeholder');
  const preview = box?.querySelector('.artifact-preview');
  if (placeholder) placeholder.style.display = 'none';
  if (preview) {
    preview.classList.remove('hidden');
    preview.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <h4>${item.name}</h4>
      <div class="artifact-category">${item.categories?.[0] || ''}</div>
      ${currentType === 'weapon' ? `
        <div class="enhancement">
          <label>Заточка:</label>
          <select id="${currentSelector}-enhance">
            <option value="none">+0</option>
            <option value="basic">+15</option>
          </select>
        </div>
        <div class="custom-ap-input">
          <label>Бронебойность (%):</label>
          <input type="number" id="${currentSelector}-ap" min="0" max="100" placeholder="Авто">
        </div>` : ''}
    `;

    document.getElementById(`${currentSelector}-ap`)?.addEventListener('change', e => {
      const v = parseFloat(e.target.value);
      customArmorPiercing[currentSelector] = isNaN(v) ? null : v / 100;
      if (selectedItems.selector1 && selectedItems.selector2) updateDetailedChart();
    });
  }

  toggleModal(modal, false);
  if (compareBtn) compareBtn.disabled = !(selectedItems.selector1 && selectedItems.selector2);
}

// ===============================
// Парсинг и математика
// ===============================
function extractDamageStats(txt) {
  if (!txt) return { closeDamage: 0, farDamage: 0, maxDistance: 0, armorPiercing: 0 };
  const dmg = /Урон:\s*([\d,.]+)(?:\s*\|\s*([\d,.]+)м\s*-\s*([\d,.]+)\s*\|\s*([\d,.]+)м)?/i.exec(txt);
  let close = 0, far = 0, max = 0;
  if (dmg) {
    close = parseFloat(dmg[1].replace(',', '.'));
    far = dmg[3] ? parseFloat(dmg[3].replace(',', '.')) : close;
    max = dmg[4] ? parseFloat(dmg[4].replace(',', '.')) : 0;
  }
  const dist = /(?:Макс.*дистанция|Дальность):\s*([\d,.]+)м/i.exec(txt);
  if (dist) max = parseFloat(dist[1].replace(',', '.'));
  const ap = /Броне.*?:\s*\+?([\d,.]+)%/i.exec(txt);
  return { closeDamage: close, farDamage: far, maxDistance: max, armorPiercing: ap ? parseFloat(ap[1].replace(',', '.')) / 100 : 0 };
}

const extractRateOfFire = txt => /Скорострельность:\s*([\d,.]+)/i.exec(txt)?.[1] ? parseFloat(/Скорострельность:\s*([\d,.]+)/i.exec(txt)[1].replace(',', '.') ) : 0;
const extractHeadshotMultiplier = txt => /Множитель в голову:\s*([\d,.]+)/i.exec(txt)?.[1] ? parseFloat(/Множитель в голову:\s*([\d,.]+)/i.exec(txt)[1].replace(',', '.') ) : 1.5;

function calculateDamageAtDistance(weapon, distance) {
  const damageStats = extractDamageStats(weapon.xaract);
  const maxDistance = damageStats.maxDistance || 50;
  if (distance <= 15) return damageStats.closeDamage;
  if (distance >= maxDistance) return damageStats.farDamage;
  const progress = (distance - 15) / (maxDistance - 15);
  return damageStats.closeDamage + (damageStats.farDamage - damageStats.closeDamage) * progress;
}

function applyEnhancement(weapon, selector) {
  const enhanceSelect = document.getElementById(`${selector}-enhance`);
  if (!enhanceSelect || enhanceSelect.value === 'none') return weapon;
  // Заготовка под применение бонусов (при необходимости модифицируйте weapon.xaract до рендера)
  const weaponType = weapon.categories?.[0]?.toLowerCase() || 'assault';
  const bonuses = enhancementBonuses[weaponType] || enhancementBonuses.assault;
  // Применение бонусов может потребовать хранить числовые поля отдельно от текста xaract
  return weapon;
}

function calculateMetrics(weapon, bulletResist, targetHP, selectorOverride) {
  const dmg = extractDamageStats(weapon.xaract);
  const rof = extractRateOfFire(weapon.xaract);
  const hsMult = extractHeadshotMultiplier(weapon.xaract);
  const selector = selectorOverride || (selectedItems.selector1 === weapon ? 'selector1' : 'selector2');
  const ap = customArmorPiercing[selector] ?? dmg.armorPiercing;
  const effHP = ((bulletResist - (bulletResist * ap)) + 100) * (targetHP / 100);
  const calc = (damage, mult = 1) => ({ dps: (damage * rof / 60) * mult, ttk: (effHP / (damage * mult)) * (60 / rof) });
  const close = calc(dmg.closeDamage), far = calc(dmg.farDamage);
  const closeHS = calc(dmg.closeDamage, hsMult), farHS = calc(dmg.farDamage, hsMult);
  return {
    effectiveHP: effHP.toFixed(1),
    closeDPS: close.dps.toFixed(1), farDPS: far.dps.toFixed(1),
    closeHeadshotDPS: closeHS.dps.toFixed(1), farHeadshotDPS: farHS.dps.toFixed(1),
    closeTTK: close.ttk.toFixed(3), farTTK: far.ttk.toFixed(3),
    closeHeadshotTTK: closeHS.ttk.toFixed(3), farHeadshotTTK: farHS.ttk.toFixed(3),
    armorPiercing: (ap * 100).toFixed(1) + '%',
    closeDamage: dmg.closeDamage, farDamage: dmg.farDamage,
    maxDistance: dmg.maxDistance, rateOfFire: rof,
    damageDrop: dmg.maxDistance ? ((1 - dmg.farDamage / dmg.closeDamage) * 100).toFixed(1) + '%' : '0%',
    headshotMultiplier: hsMult,
  };
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
    if (!stats1El || !stats2El) {
        console.error('Не найдены элементы для отображения статистик');
        return;
    }

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
    
    try {
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
    } catch (e) {
        console.error('Ошибка при отображении модального окна:', e);
    }
}

function updateComparisonTable(metrics1, metrics2) {
    const weapon1Stats = document.getElementById('weapon1-stats');
    const weapon2Stats = document.getElementById('weapon2-stats');
    if (!weapon1Stats || !weapon2Stats) return;

    weapon1Stats.innerHTML = '';
    weapon2Stats.innerHTML = '';

    const distances = [0, 50]; // Примерные точки для "близко" и "далеко"
    const data1 = calculateWeaponData(selectedItems.selector1, distances);
    const data2 = calculateWeaponData(selectedItems.selector2, distances);

    const stats = [
        { name: 'TTK HS (близко)', value: data1[0] },
        { name: 'TTK (далеко)', value: data2[Math.floor(distances.length / 2)] },
        { name: 'TTK HS (далеко)', value: data1[distances.length - 1] },
    ];

    stats.forEach(stat => {
        const el1 = createStatElement({ name: stat.name, key: stat.name, suffix: ' сек' }, stat.value, 'equal');
        const el2 = createStatElement({ name: stat.name, key: stat.name, suffix: ' сек' }, stat.value, 'equal'); // Для простоты используем одинаковые значения, можно адаптировать
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

function calculateWeaponData(weapon, distances) {
  const damageStats = extractDamageStats(weapon.xaract);
  const rof = extractRateOfFire(weapon.xaract);
  const headshotMultiplier = extractHeadshotMultiplier(weapon.xaract);
  
  let hitMultiplier = 1.0;
  if (currentHitType === 'headshot') hitMultiplier = headshotMultiplier;
  else if (currentHitType === 'limbshot') hitMultiplier = 0.8;

  const targetHP = parseFloat(document.getElementById('target-hp')?.value) || 132;
  const bulletResist = parseFloat(document.getElementById('bullet-resist')?.value) || 250;

  const selector = selectedItems.selector1 === weapon ? 'selector1' : 'selector2';
  const armorPiercing = customArmorPiercing[selector] !== null
    ? customArmorPiercing[selector]
    : (damageStats.armorPiercing || 0);

  return distances.map(distance => {
    const damage = calculateDamageAtDistance(weapon, distance) * hitMultiplier;
    
    if (currentMetric === 'dps') {
      return Math.round((damage * rof / 60) * 100) / 100;
    } else {
      const effectiveHP = ((bulletResist - (bulletResist * armorPiercing)) + 100) * (targetHP / 100);
      return Math.round((effectiveHP / damage) * (60 / rof) * 1000) / 1000;
    }
  });
}

function createDetailedWeaponChart() {
  const ctx = document.getElementById('detailed-chart');
  if (!ctx) return;
  
  if (detailedChart) detailedChart.destroy();

  const weapon1 = applyEnhancement(selectedItems.selector1, 'selector1');
  const weapon2 = applyEnhancement(selectedItems.selector2, 'selector2');
  
  const distances = Array.from({ length: 46 }, (_, i) => i * 2); // 0-90 метров с шагом 2
  const data1 = calculateWeaponData(weapon1, distances);
  const data2 = calculateWeaponData(weapon2, distances);

  detailedChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: distances.map(d => `${d}м`),
      datasets: [
        {
          label: selectedItems.selector1.name,
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
          label: selectedItems.selector2.name,
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
      hover: {
        mode: 'index',
        intersect: false,
        animationDuration: 200,
        onHover(event, active) {
          event.native.target.style.cursor = active.length ? 'pointer' : 'default';
        }
      },
      onClick(event, active) {
        if (active.length > 0) { /* точка клика — зарезервировано*/ }
      },
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
          displayColors: true,
          padding: 12,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 12 },
          footerFont: { size: 11 },
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
        legend: { display: false }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Дистанция (м)',
            color: '#FFF19B',
            font: { size: 14, weight: 'bold' }
          },
          grid: {
            color: 'rgba(255,241,155,0.1)',
            drawBorder: false,
            lineWidth: 1
          },
          ticks: {
            color: '#FFF19B',
            callback(value, index) {
              return index % 10 === 0 ? this.getLabelForValue(value) : '';
            },
            font: { size: 11 },
            maxTicksLimit: 15
          }
        },
        y: {
          title: {
            display: true,
            text: currentMetric === 'dps' ? 'Урон в секунду' : 'Время до убийства (сек)',
            color: '#FFF19B',
            font: { size: 14, weight: 'bold' }
          },
          grid: {
            color: 'rgba(255,241,155,0.1)',
            drawBorder: false,
            lineWidth: 1
          },
          ticks: {
            color: '#FFF19B',
            stepSize: currentMetric === 'dps' ? 50 : 0.2,
            callback(v) {
              return currentMetric === 'dps' ? Math.round(v) : (v % 1 === 0 ? v : v.toFixed(1));
            },
            font: { size: 11 },
            maxTicksLimit: 10
          },
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
// Сравнение предметов (интегрировано из sravold)
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
  const s1 = { 
    ...parseStats(selectedItems.selector1.xaract), 
    ...parseStats(selectedItems.selector1.blueStat) 
  };
  const s2 = { 
    ...parseStats(selectedItems.selector2.xaract), 
    ...parseStats(selectedItems.selector2.blueStat) 
  };
  
  const allKeys = [...new Set([...Object.keys(s1), ...Object.keys(s2)])];
  
  allKeys.forEach(key => {
    const v1 = getComparableValue(s1[key]);
    const v2 = getComparableValue(s2[key]);
    let class1 = 'equal', class2 = 'equal';
    
    if (v1 !== null && v2 !== null) {
      // Инвертированное сравнение для определенных параметров
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