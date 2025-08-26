let currentSelector = null;
let selectedItems = { selector1: null, selector2: null };
let currentType = 'artifacts';
let allItems = [];
let customArmorPiercing = { selector1: null, selector2: null };
let dpsChart = null;
let ttkChart = null;
let detailedChart = null;
let currentHitType = 'headshot';
let currentMetric = 'ttk'; // 'ttk' или 'dps'



// === ДОБАВЛЕНО: Заточка оружия ===
const enhancementBonuses = {
    "assault": { damage: 0.10, farDamage: 0.10, rateOfFire: 0.10 },
    "sniper": { damage: 0.20, farDamage: 0.20 },
    "pulemety": { damage: 0.05, farDamage: 0.05, rateOfFire: 0.15 },
    "pistols": { damage: 0.20, farDamage: 0.20 }, // Пистолеты - как снайперки
    "droboviki": { damage: 0.20, farDamage: 0.20 },  // Дробовики - как снайперки
    "pp": { damage: 0.15, farDamage: 0.15, rateOfFire: 0.05 }  // ПП
};

function applyEnhancement(weapon, selector) {
    // Проверяем, является ли предмет оружием
    if (currentType !== 'weapon') {
        return weapon; // Для артефактов и брони не применяем заточку
    }
    
    const enhanceSelect = document.getElementById(`${selector}-enhance`);
    if (!enhanceSelect || enhanceSelect.value === 'none') return weapon;

    const bonus = enhancementBonuses[weapon.categories[0]] || {};
    const modified = JSON.parse(JSON.stringify(weapon)); // глубокая копия

    const stats = extractDamageStats(modified.xaract);
    const rof = extractRateOfFire(modified.xaract);

    const newClose = stats.closeDamage + (stats.closeDamage * (bonus.damage || 0));
    const newFar = stats.farDamage + (stats.farDamage * (bonus.farDamage || 0));
    const newROF = rof + (rof * (bonus.rateOfFire || 0));

    modified.xaract = modified.xaract
        .replace(/Урон:\s*([\d,.]+)\s*\|.*?\|.*?(?=\n)/i, `Урон: ${newClose.toFixed(1)} | ${stats.maxDistance}м - ${newFar.toFixed(1)} | ${stats.maxDistance}м`)
        .replace(/Скорострельность:\s*[\d,.]+/, `Скорострельность: ${Math.round(newROF)} выстрелов/мин.`);

    return modified;
}



// Утилита: debounce для снижения частоты перерисовок
function debounce(fn, delay = 200) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(null, args), delay);
    };
}

// DOM элементы
const modal = document.getElementById('artifact-modal');
const artifactGrid = document.querySelector('.artifact-grid');
const compareBtn = document.getElementById('compare-btn');
const resultContainer = document.querySelector('.result-container');
const comparisonResult = document.getElementById('comparison-result');
const itemTypeSelect = document.getElementById('item-type-select');
const advancedModal = document.getElementById('advanced-modal');
const calculateBtn = document.getElementById('calculate-btn');
const artifactSearch = document.getElementById('artifact-search');



// Статистики, где меньше значение - лучше
const inverseStats = [
    "Вес", "Разброс", "Вертикальная отдача", "Горизонтальная отдача",
    "Перезарядка", "Время доставания", "Радиация", "Пси-воздействие"
];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadItems();
    
    // Тестируем расчеты (можно убрать в продакшене)
    testCalculations();
});

function initEventListeners() {
    // Кнопки выбора предметов
    document.querySelectorAll('.select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentSelector = btn.dataset.target;
            showModal();
        });
    });
    
    // Обработчик клика по модальному окну
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal();
            }
        });
        
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    // Обработчик клика по расширенному модальному окну
    if (advancedModal) {
        advancedModal.addEventListener('click', (e) => {
            if (e.target === advancedModal) {
                hideAdvancedModal();
            }
        });
        
        const advancedModalContent = advancedModal.querySelector('.modal-content');
        if (advancedModalContent) {
            advancedModalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    // Закрытие модальных окон
    const cancelBtn = document.querySelector('.cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideModal);
    }
    
    const closeAdvancedBtn = document.querySelector('.close-advanced-modal');
    if (closeAdvancedBtn) {
        closeAdvancedBtn.addEventListener('click', hideAdvancedModal);
    }

    // Поиск предметов (с дебаунсом)
    if (artifactSearch) {
        artifactSearch.addEventListener('input', debounce((e) => {
            const activeTab = document.querySelector('.tab-btn.active')?.dataset.category || 'all';
            displayItems(e.target.value, activeTab);
        }, 200));
    }

    // Вкладки категорий
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const category = btn.dataset.category;
            displayItems(artifactSearch?.value || '', category);
        });
    });

    // Кнопка сравнения
    if (compareBtn) {
        compareBtn.addEventListener('click', () => {
            compareItems();
            if (currentType === 'weapon') {
                showAdvancedComparison();
            }
        });
    }

    // Кнопка пересчета
    if (calculateBtn) {
        calculateBtn.addEventListener('click', () => {
            showAdvancedComparison();
            // Если открыта вкладка с графиками, обновляем их
            if (document.getElementById('metrics-tab').classList.contains('active')) {
                updateDetailedChart();
            }
        });
    }

    // Выбор типа предметов
    if (itemTypeSelect) {
        itemTypeSelect.addEventListener('change', (e) => {
            currentType = e.target.value;
            resetComparison();
            loadItems();
        });
    }

    // Вкладки расширенного сравнения
    const infoTab = document.getElementById('info-tab');
    const metricsTab = document.getElementById('metrics-tab');
    
    if (infoTab && metricsTab) {
        infoTab.addEventListener('click', showInfoView);
        metricsTab.addEventListener('click', showDamageTableView);
    }
    
    // Обработчики для полей ввода параметров
    const bulletResistInput = document.getElementById('bullet-resist');
    const targetHPInput = document.getElementById('target-hp');
    
    if (bulletResistInput) {
        bulletResistInput.addEventListener('input', debounce(() => {
            if (document.getElementById('metrics-tab').classList.contains('active')) {
                updateDetailedChart();
            }
        }, 300));
    }
    
    if (targetHPInput) {
        targetHPInput.addEventListener('input', debounce(() => {
            if (document.getElementById('metrics-tab').classList.contains('active')) {
                updateDetailedChart();
            }
        }, 300));
    }
}

function showInfoView() {
    document.getElementById('info-tab').classList.add('active');
    document.getElementById('metrics-tab').classList.remove('active');
    document.getElementById('info-view').classList.remove('hidden');
    document.getElementById('metrics-view').classList.add('hidden');
}

function showDamageTableView() {
    document.getElementById('metrics-tab').classList.add('active');
    document.getElementById('info-tab').classList.remove('active');
    document.getElementById('metrics-view').classList.remove('hidden');
    document.getElementById('info-view').classList.add('hidden');
    
    // Обновляем таблицу и графики при каждом открытии
    const enhanced1 = applyEnhancement(selectedItems.selector1, 'selector1');
    const enhanced2 = applyEnhancement(selectedItems.selector2, 'selector2');
    
    // Обновляем детальный график
    if (currentType === 'weapon') {
        updateDetailedChart();
    }
}

function showModal() {
    if (modal) {
        modal.classList.add('active');
        modal.classList.remove('hidden');
        displayItems();
    }
}

function hideModal() {
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

function hideAdvancedModal() {
    if (advancedModal) {
        advancedModal.classList.remove('active');
        setTimeout(() => advancedModal.classList.add('hidden'), 300);
    }
}

function resetComparison() {
    selectedItems = { selector1: null, selector2: null };
    customArmorPiercing = { selector1: null, selector2: null };
    
    document.querySelectorAll('.selector-box').forEach(box => {
        const placeholder = box.querySelector('.selector-placeholder');
        const preview = box.querySelector('.artifact-preview');
        
        if (placeholder) placeholder.style.display = '';
        if (preview) preview.classList.add('hidden');
    });
    
    if (compareBtn) compareBtn.disabled = true;
    if (resultContainer) resultContainer.innerHTML = '';
    if (comparisonResult) comparisonResult.classList.add('hidden');
}

function loadItems() {
    fetch(`../data/${currentType}.json`)
        .then(res => res.json())
        .then(data => {
            const key = Object.keys(data)[0];
            allItems = data[key];
            displayItems();
        })
        .catch(err => console.error('Ошибка загрузки предметов:', err));
}

function displayItems(filter = '', category = 'all') {
    if (!artifactGrid) return;
    
    artifactGrid.innerHTML = '';
    
    const filtered = allItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = category === 'all' || 
                              (item.categories && item.categories.some(c => c.toLowerCase().includes(category)));
        return matchesSearch && matchesCategory;
    });
    
    if (filtered.length === 0) {
        artifactGrid.innerHTML = '<div class="no-items">Ничего не найдено</div>';
        return;
    }
    
    filtered.forEach(item => {
        const el = document.createElement('div');
        el.className = 'artifact-item';
        el.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <h4>${item.name}</h4>
            ${item.categories ? `<div class="item-category">${item.categories[0]}</div>` : ''}
        `;
        el.addEventListener('click', () => selectItem(item));
        artifactGrid.appendChild(el);
    });
}

function selectItem(item) {
    if (!currentSelector) return;
    
    selectedItems[currentSelector] = item;
    customArmorPiercing[currentSelector] = null;
    
    const box = document.getElementById(currentSelector);
    if (!box) return;
    
    const placeholder = box.querySelector('.selector-placeholder');
    const preview = box.querySelector('.artifact-preview');
    
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
                    <select id="${currentSelector}-enhance" class="enhance-select">
                        <option value="none">+0</option>
                        <option value="basic">+15</option>
                    </select>
                </div>
                <div class="custom-ap-input">
                    <label>Бронебойность (%):</label>
                    <input type="number" id="${currentSelector}-ap" min="0" max="100" 
                           placeholder="Авто" class="ap-input">
                </div>
            ` : ''}
        `;
        
        if (currentType === 'weapon') {
            const apInput = document.getElementById(`${currentSelector}-ap`);
            if (apInput) {
                apInput.addEventListener('change', (e) => {
                    const value = parseFloat(e.target.value);
                    customArmorPiercing[currentSelector] = isNaN(value) ? null : value / 100;
                    // Убираем автоматический вызов showAdvancedComparison()
                    // Модальное окно должно открываться только по кнопке "Сравнить"
                });
            }
            const enhanceSelect = document.getElementById(`${currentSelector}-enhance`);
            if (enhanceSelect) {
                enhanceSelect.addEventListener('change', () => {
                    // Убираем автоматический вызов showAdvancedComparison()
                    // Модальное окно должно открываться только по кнопке "Сравнить"
                });
            }
        }
    }
    
    hideModal();
    
    if (compareBtn) {
        compareBtn.disabled = !(selectedItems.selector1 && selectedItems.selector2);
    }
}

function extractDamageStats(statsText) {
    if (!statsText) return { closeDamage: 0, farDamage: 0, maxDistance: 0, armorPiercing: 0 };
    
    let closeDamage = 0, farDamage = 0, maxDistance = 0, armorPiercing = 0;
    
    const damageRegex = /Урон:\s*([\d,.]+)(?:\s*\|\s*([\d,.]+)(?:м|m)\s*-\s*([\d,.]+)\s*\|\s*([\d,.]+)(?:м|m))?/i;
    const damageMatch = statsText.match(damageRegex);
    
    if (damageMatch) {
        closeDamage = parseFloat(damageMatch[1].replace(',', '.'));
        if (damageMatch[2]) {
            farDamage = parseFloat(damageMatch[3].replace(',', '.'));
            maxDistance = parseFloat(damageMatch[4].replace(',', '.'));
        } else {
            farDamage = closeDamage;
        }
    }
    
    if (maxDistance === 0) {
        const distanceMatch = statsText.match(/(?:Макс(?:имальная)?\s*дистанция|Дальность|Max(?:imum)?\s*distance):\s*([\d,.]+)(?:м|m)/i);
        if (distanceMatch) {
            maxDistance = parseFloat(distanceMatch[1].replace(',', '.'));
        }
    }
    
    const armorMatch = statsText.match(/(?:Бронебойность|Бронепробитие|Пробитие|Armor\s*piercing|Penetration):\s*\+?([\d,.]+)%/i);
    if (armorMatch) {
        armorPiercing = parseFloat(armorMatch[1].replace(',', '.')) / 100;
    }
    
    return { closeDamage, farDamage, maxDistance, armorPiercing };
}

function extractRateOfFire(statsText) {
    if (!statsText) return 0;
    
    const rofMatch = statsText.match(/(?:Скорострельность|ROF):\s*([\d,.]+)(?:\s*выстр(?:ов)?)?/i);
    return rofMatch ? parseFloat(rofMatch[1].replace(',', '.')) : 0;
}

function extractHeadshotMultiplier(statsText) {
    if (!statsText) return 1.5;
    
    const headshotMatch = statsText.match(/Множитель в голову:\s*([\d,.]+)/i);
    return headshotMatch ? parseFloat(headshotMatch[1].replace(',', '.')) : 1.5;
}


function calculateMetrics(weapon, bulletResist, targetHP, selectorOverride) {
    const damageStats = extractDamageStats(weapon.xaract);
    const rof = extractRateOfFire(weapon.xaract);
    const headshotMultiplier = extractHeadshotMultiplier(weapon.xaract);

    const selector = selectorOverride || (selectedItems.selector1 === weapon ? 'selector1' : 'selector2');

    // Приводим бронепробитие к доле (0..1)
    const armorPiercing = customArmorPiercing[selector] !== null
        ? customArmorPiercing[selector]
        : (damageStats.armorPiercing || 0);

    // ИСПРАВЛЕНО: Расчет эффективного HP по формуле из игры для TTK
    // Приведёнка = ((Пулестойкость - Бронебойность) + 100) × (ХП / 100)
    // где Пулестойкость = bulletResist, Бронебойность = bulletResist × armorPiercing, ХП = targetHP (вводится как 132, но используется как 1.32)
    const effectiveHP = ((bulletResist - (bulletResist * armorPiercing)) + 100) * (targetHP / 100);

    const closeDPS = damageStats.closeDamage * rof / 60;
    const farDPS = damageStats.farDamage * rof / 60;
    const closeHeadshotDPS = closeDPS * headshotMultiplier;
    const farHeadshotDPS = farDPS * headshotMultiplier;

    // ИСПРАВЛЕНО: Расчет TTK по формуле из игры
    // TTK = Приведёнка ÷ Урон × (60 ÷ Скорострельность)
    // где Приведёнка = ((Пулестойкость - Бронебойность) + 100) × (ХП / 100)
    // Для TTK используем отдельный расчет эффективного HP
    const effectiveHPForTTK = ((bulletResist - (bulletResist * armorPiercing)) + 100) * (targetHP / 100);
    const closeTTK = (effectiveHPForTTK / damageStats.closeDamage) * (60 / rof);
    const farTTK = (effectiveHPForTTK / damageStats.farDamage) * (60 / rof);
    const closeHeadshotTTK = (effectiveHPForTTK / (damageStats.closeDamage * headshotMultiplier)) * (60 / rof);
    const farHeadshotTTK = (effectiveHPForTTK / (damageStats.farDamage * headshotMultiplier)) * (60 / rof);

    const damageDrop = damageStats.maxDistance > 0 ?
        (1 - damageStats.farDamage / damageStats.closeDamage) * 100 : 0;

    const round = (num, digits = 2) => Math.round(num * Math.pow(10, digits)) / Math.pow(10, digits);

    return {
        effectiveHP: round(effectiveHP, 1),
        closeDPS: round(closeDPS, 1),
        farDPS: round(farDPS, 1),
        closeHeadshotDPS: round(closeHeadshotDPS, 1),
        farHeadshotDPS: round(farHeadshotDPS, 1),
        closeTTK: round(closeTTK, 3),
        farTTK: round(farTTK, 3),
        closeHeadshotTTK: round(closeHeadshotTTK, 3),
        farHeadshotTTK: round(farHeadshotTTK, 3),
        armorPiercing: round(armorPiercing * 100, 1) + '%',
        closeDamage: damageStats.closeDamage,
        farDamage: damageStats.farDamage,
        maxDistance: damageStats.maxDistance,
        rateOfFire: rof,
        damageDrop: round(damageDrop, 1) + '%',
        headshotMultiplier: headshotMultiplier
    };
}

function calculateDamageAtDistance(weapon, distance) {
    const damageStats = extractDamageStats(weapon.xaract);
    
    // Если нет информации о дальности, возвращаем базовый урон
    if (damageStats.maxDistance <= 0) {
        return damageStats.closeDamage;
    }
    
    // Если дистанция меньше или равна максимальной, рассчитываем линейное падение урона
    if (distance <= damageStats.maxDistance) {
        const damageDrop = damageStats.closeDamage - damageStats.farDamage;
        const dropPerMeter = damageDrop / damageStats.maxDistance;
        return damageStats.closeDamage - (distance * dropPerMeter);
    }
    
    // Если дистанция больше максимальной, возвращаем минимальный урон
    return damageStats.farDamage;
}

function createDPSChart(metrics1, metrics2) {
    const ctx = document.getElementById('dps-chart');
    if (!ctx) return;
    
    if (dpsChart) {
        dpsChart.destroy();
    }
    
    dpsChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Ближний DPS', 'Дальний DPS', 'Ближний HS DPS', 'Дальний HS DPS'],
            datasets: [
                {
                    label: selectedItems.selector1.name,
                    data: [parseFloat(metrics1.closeDPS), parseFloat(metrics1.farDPS), parseFloat(metrics1.closeHeadshotDPS), parseFloat(metrics1.farHeadshotDPS)],
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: selectedItems.selector2.name,
                    data: [parseFloat(metrics2.closeDPS), parseFloat(metrics2.farDPS), parseFloat(metrics2.closeHeadshotDPS), parseFloat(metrics2.farHeadshotDPS)],
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Урон в секунду'
                    }
                }
            }
        }
    });
}

function createTTKChart(metrics1, metrics2) {
    const ctx = document.getElementById('ttk-chart');
    if (!ctx) return;
    
    if (ttkChart) {
        ttkChart.destroy();
    }
    
    ttkChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Ближний TTK', 'Дальний TTK', 'Ближний HS TTK', 'Дальний HS TTK'],
            datasets: [
                {
                    label: selectedItems.selector1.name,
                    data: [parseFloat(metrics1.closeTTK), parseFloat(metrics1.farTTK), parseFloat(metrics1.closeHeadshotTTK), parseFloat(metrics1.farHeadshotTTK)],
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: selectedItems.selector2.name,
                    data: [parseFloat(metrics2.closeTTK), parseFloat(metrics2.farTTK), parseFloat(metrics2.closeHeadshotTTK), parseFloat(metrics2.farHeadshotTTK)],
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Время до убийства (сек)'
                    }
                }
            }
        }
    });
}

function showDPSChart() {
    document.getElementById('dps-chart').style.display = 'block';
    document.getElementById('ttk-chart').style.display = 'none';
}

function showTTKChart() {
    document.getElementById('dps-chart').style.display = 'none';
    document.getElementById('ttk-chart').style.display = 'block';
}

function showAdvancedComparison() {
    if (!selectedItems.selector1 || !selectedItems.selector2) {
        console.error('Не выбраны оба предмета для сравнения');
        return;
    }

    // Инициализируем контролы для детальных графиков
    initDetailedChartControls();

    if (!document.getElementById('bullet-resist') || !document.getElementById('target-hp')) {
        console.error('Не найдены элементы ввода параметров');
        return;
    }

    const bulletResist = parseInt(document.getElementById('bullet-resist').value) || 250;
    const targetHP = parseFloat(document.getElementById('target-hp').value) || 132;
    
    const enhanced1 = applyEnhancement(selectedItems.selector1, 'selector1');
    const enhanced2 = applyEnhancement(selectedItems.selector2, 'selector2');
    const metrics1 = calculateMetrics(enhanced1, bulletResist, targetHP, 'selector1');
    const metrics2 = calculateMetrics(enhanced2, bulletResist, targetHP, 'selector2');

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

function getComparableValue(value, key = "") {
    if (!value) return null;
    
    if (key.toLowerCase().includes('урон')) {
        const match = value.match(/([\d,.]+)\s*\|/);
        return match ? parseFloat(match[1].replace(',', '.')) : null;
    }
    
    if (currentType === 'artifacts') {
        const rangeMatch = value.match(/(-?\d+(?:[.,]\d+)?)\s*<->\s*(-?\d+(?:[.,]\d+)?)/);
        if (rangeMatch) {
            return Math.max(
                parseFloat(rangeMatch[1].replace(',', '.')),
                parseFloat(rangeMatch[2].replace(',', '.'))
            );
        }
    }
    
    const numberMatch = value.match(/-?\d+(?:[.,]\d+)?/);
    return numberMatch ? parseFloat(numberMatch[0].replace(',', '.')) : null;
}

function compareItems() {
    if (!resultContainer) return;
    
    if (!selectedItems.selector1 || !selectedItems.selector2) return;
    
    resultContainer.innerHTML = '';
    
    const stats1 = { 
        ...parseStats(selectedItems.selector1.xaract), 
        ...parseStats(selectedItems.selector1.blueStat) 
    };
    
    const stats2 = { 
        ...parseStats(selectedItems.selector2.xaract), 
        ...parseStats(selectedItems.selector2.blueStat) 
    };
    
    const allKeys = [...new Set([...Object.keys(stats1), ...Object.keys(stats2)])];
    
    allKeys.forEach(key => {
        const raw1 = stats1[key] || '-';
        const raw2 = stats2[key] || '-';
        const val1 = getComparableValue(raw1, key);
        const val2 = getComparableValue(raw2, key);
        
        const lowerKey = key.toLowerCase();
        let class1 = 'equal';
        let class2 = 'equal';
        
        if (lowerKey.includes('скорость')) {
            [class1, class2] = compareSpeedValues(val1, val2);
        } else {
            const isInverse = inverseStats.some(stat => lowerKey.includes(stat.toLowerCase()));
            // Добавляем параметр key в вызов функции
            [class1, class2] = compareNumericValues(val1, val2, isInverse, key);
        }
        
        const row = document.createElement('div');
        row.className = 'comparison-row';
        row.innerHTML = `
            <div class="comparison-header">${key}</div>
            <div class="comparison-value ${class1}">${raw1}</div>
            <div class="comparison-value ${class2}">${raw2}</div>
        `;
        resultContainer.appendChild(row);
    });
    
    if (comparisonResult) comparisonResult.classList.remove('hidden');
}

function compareSpeedValues(val1, val2) {
    if (val1 == null || val2 == null) return ['equal', 'equal'];
    if (val1 >= 0 && val2 < 0) return ['better', 'worse'];
    if (val1 < 0 && val2 >= 0) return ['worse', 'better'];
    return val1 > val2 ? ['better', 'worse'] : val1 < val2 ? ['worse', 'better'] : ['equal', 'equal'];
}

function compareNumericValues(val1, val2, isInverse = false, key = "") {
    if (val1 == null || val2 == null) return ['equal', 'equal'];
    if (val1 === val2) return ['equal', 'equal'];
    
    // Специальная проверка для переносимого веса
    const isCarryWeight = key.toLowerCase().includes('переносимый вес') || 
                         key.toLowerCase().includes('carry weight');
    
    // Если это переносимый вес, большее значение лучше
    const better1 = (isCarryWeight && val1 > val2) || 
                   (!isCarryWeight && ((val1 > val2 && !isInverse) || (val1 < val2 && isInverse)));
    
    return better1 ? ['better', 'worse'] : ['worse', 'better'];
}

// Функция для тестирования расчетов (можно убрать в продакшене)
function testCalculations() {
    console.log('=== ТЕСТ РАСЧЕТОВ ===');
    
    // Тестовые данные: РТ +15, 278 брони, 142 HP
    const testWeapon = {
        xaract: 'Урон: 150 | 50м - 120 | 50м\nСкорострельность: 600 выстрелов/мин\nБронебойность: +15%'
    };
    
    const bulletResist = 278;
    const targetHP = 142;
    
    const damageStats = extractDamageStats(testWeapon.xaract);
    const armorPiercing = 0.15; // +15%
    
    // Расчет эффективной брони
    const effectiveArmor = Math.max(0, bulletResist * (1 - armorPiercing));
    const effectiveHP = targetHP + effectiveArmor;
    
    console.log('Базовые параметры:');
    console.log('- Урон оружия:', damageStats.closeDamage);
    console.log('- Броня цели:', bulletResist);
    console.log('- HP цели:', targetHP);
    console.log('- Бронепробитие:', armorPiercing * 100 + '%');
    
    console.log('\nРасчеты:');
    console.log('- Эффективная броня:', effectiveArmor);
    console.log('- Эффективное HP:', effectiveHP);
    
    
    // Проверяем, может ли оружие убить за один выстрел
    const canOneShot = damageStats.closeDamage >= effectiveHP;
    console.log('- Может убить за один выстрел:', canOneShot ? 'ДА' : 'НЕТ');
    
    if (canOneShot) {
        console.log('⚠️ ВНИМАНИЕ: Оружие может убить за один выстрел!');
    }
}

// Новые функции для детальных графиков
function initDetailedChartControls() {
    // Обработчики для кнопок типа попадания
    document.querySelectorAll('[data-hit-type]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-hit-type]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentHitType = e.target.dataset.hitType;
            updateDetailedChart();
        });
    });

    // Обработчики для кнопок метрик
    document.querySelectorAll('[data-metric]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-metric]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMetric = e.target.dataset.metric;
            updateDetailedChart();
        });
    });

    // Создаем начальный график
    updateDetailedChart();
}

function updateDetailedChart() {
    if (!selectedItems.selector1 || !selectedItems.selector2) return;
    
    if (currentType === 'weapon') {
        createDetailedWeaponChart();
    } else {
        createDetailedComparisonChart();
    }
}

function createDetailedWeaponChart() {
    const ctx = document.getElementById('detailed-chart');
    if (!ctx) return;
    
    if (detailedChart) {
        detailedChart.destroy();
    }

    // Получаем данные для оружия
    const weapon1 = applyEnhancement(selectedItems.selector1, 'selector1');
    const weapon2 = applyEnhancement(selectedItems.selector2, 'selector2');
    
    // Создаем массив дистанций от 0 до 90 метров (как в интерфейсе)
    const distances = [];
    for (let i = 0; i <= 90; i += 2) {
        distances.push(i);
    }

    // Рассчитываем данные для каждого оружия
    const data1 = calculateWeaponData(weapon1, distances);
    const data2 = calculateWeaponData(weapon2, distances);

    // Создаем график
    detailedChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: distances.map(d => `${d}м`),
            datasets: [
                {
                    label: `${selectedItems.selector1.name}`,
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
                    label: `${selectedItems.selector2.name}`,
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
            animation: {
                duration: 300
            },
            hover: {
                mode: 'index',
                intersect: false,
                animationDuration: 200,
                onHover: function(event, activeElements) {
                    if (activeElements.length > 0) {
                        event.native.target.style.cursor = 'pointer';
                    } else {
                        event.native.target.style.cursor = 'default';
                    }
                }
            },
            onClick: function(event, activeElements) {
                if (activeElements.length > 0) {
                    console.log('Клик по графику:', activeElements[0]);
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
                axis: 'x'
            },
            plugins: {
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    titleColor: '#FFF19B',
                    bodyColor: 'white',
                    borderColor: '#FFF19B',
                    borderWidth: 2,
                    cornerRadius: 8,
                    displayColors: true,
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 12
                    },
                    footerFont: {
                        size: 11
                    },
                    callbacks: {
                        title: function(context) {
                            return `Дистанция: ${context[0].label}`;
                        },
                        label: function(context) {
                            const weaponName = context.dataset.label;
                            const value = context.parsed.y;
                            if (currentMetric === 'dps') {
                                // Для DPS: округляем до 2 знаков после запятой
                                return `${weaponName}: ${value.toFixed(2)} урон/сек`;
                            } else {
                                // Для TTK: округляем до 3 знаков после запятой для точности
                                return `${weaponName}: ${value.toFixed(3)} сек`;
                            }
                        },
                        footer: function(context) {
                            return '';
                        },
                    },
                    animation: {
                        duration: 200
                    },
                    position: 'nearest',
                    display: true,
                    mode: 'index',
                    intersect: false,
                    enabled: true
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Дистанция (м)',
                        color: '#FFF19B',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 241, 155, 0.1)',
                        drawBorder: false,
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#FFF19B',
                        maxTicksLimit: 20,
                        callback: function(value, index, values) {
                            if (index % 10 === 0) {
                                return this.getLabelForValue(value);
                            }
                            return '';
                        },
                        font: {
                            size: 11
                        },
                        maxTicksLimit: 15
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: currentMetric === 'dps' ? 'Урон в секунду' : 'Время до убийства (сек)',
                        color: '#FFF19B',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 241, 155, 0.1)',
                        drawBorder: false,
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#FFF19B',
                        stepSize: currentMetric === 'dps' ? 50 : 0.2,
                        callback: function(value, index, values) {
                            if (currentMetric === 'dps') {
                                // Для DPS: показываем целые числа
                                return Math.round(value);
                            } else {
                                // Для TTK: убираем лишние десятичные знаки для целых чисел
                                if (value % 1 === 0) {
                                    return value;
                                }
                                // Округляем до одного знака после запятой
                                return value.toFixed(1);
                            }
                        },
                        font: {
                            size: 11
                        },
                        maxTicksLimit: 10
                    },
                    beginAtZero: true
                }
            }
        }
    });

    // Обновляем легенду
    updateChartLegend();
}

function calculateWeaponData(weapon, distances) {
    const damageStats = extractDamageStats(weapon.xaract);
    const rof = extractRateOfFire(weapon.xaract);
    const headshotMultiplier = extractHeadshotMultiplier(weapon.xaract);
    
    let hitMultiplier = 1.0;
    if (currentHitType === 'headshot') {
        hitMultiplier = headshotMultiplier;
    } else if (currentHitType === 'limbshot') {
        hitMultiplier = 0.8;
    }

    const targetHP = parseFloat(document.getElementById('target-hp')?.value || 132);
    const bulletResist = parseFloat(document.getElementById('bullet-resist')?.value || 250);

    const selector = selectedItems.selector1 === weapon ? 'selector1' : 'selector2';
    const armorPiercing = customArmorPiercing[selector] !== null
        ? customArmorPiercing[selector]
        : (damageStats.armorPiercing || 0);

    return distances.map(distance => {
        const damage = calculateDamageAtDistance(weapon, distance) * hitMultiplier;
        
        if (currentMetric === 'dps') {
            // Для DPS: урон × скорострельность / 60
            const dps = damage * rof / 60;
            return Math.round(dps * 100) / 100;
        } else {
            // Для TTK: расчет эффективного HP по формуле из игры
            // Приведёнка = ((Пулестойкость - Бронебойность) + 100) × (ХП / 100)
            // где Пулестойкость = bulletResist, Бронебойность = bulletResist × armorPiercing, ХП = targetHP (вводится как 132, но используется как 1.32)
            const effectiveHP = ((bulletResist - (bulletResist * armorPiercing)) + 100) * (targetHP / 100);

            // Расчет TTK по формуле из игры
            // TTK = Приведёнка ÷ Урон × (60 ÷ Скорострельность)
            const ttk = (effectiveHP / damage) * (60 / rof);
            // Округляем до 3 знаков после запятой для точности
            return Math.round(ttk * 1000) / 1000;
        }
    });
}

function createDetailedComparisonChart() {
    const ctx = document.getElementById('detailed-chart');
    if (!ctx) return;
    
    if (detailedChart) {
        detailedChart.destroy();
    }

    // Для артефактов и брони создаем простой график сравнения характеристик
    const stats1 = parseStats(selectedItems.selector1.xaract);
    const stats2 = parseStats(selectedItems.selector2.xaract);
    
    const allKeys = [...new Set([...Object.keys(stats1), ...Object.keys(stats2)])];
    const numericKeys = allKeys.filter(key => {
        const val1 = getComparableValue(stats1[key], key);
        const val2 = getComparableValue(stats2[key], key);
        return val1 !== null && val2 !== null;
    });

    if (numericKeys.length === 0) {
        // Если нет числовых данных, показываем сообщение
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
                    data: numericKeys.map(key => getComparableValue(stats1[key], key)),
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: selectedItems.selector2.name,
                    data: numericKeys.map(key => getComparableValue(stats2[key], key)),
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Значение',
                        color: '#FFF19B'
                    },
                    grid: {
                        color: 'rgba(255, 241, 155, 0.1)'
                    },
                    ticks: {
                        color: '#FFF19B',
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 241, 155, 0.1)'
                    },
                    ticks: {
                        color: '#FFF19B',
                        maxRotation: 45,
                        font: {
                            size: 11
                        }
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
    
    if (currentType === 'weapon') {
        const colors = ['rgba(54, 162, 235, 1)', 'rgba(75, 192, 192, 1)'];
        const names = [selectedItems.selector1.name, selectedItems.selector2.name];
        
        names.forEach((name, index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${colors[index]}"></div>
                <span>${name}</span>
            `;
            legend.appendChild(legendItem);
        });
    } else {
        const colors = ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'];
        const names = [selectedItems.selector1.name, selectedItems.selector2.name];
        
        names.forEach((name, index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${colors[index]}"></div>
                <span>${name}</span>
            `;
            legend.appendChild(legendItem);
        });
    }
}