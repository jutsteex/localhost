async function loadArmor() {
    try {
        const response = await fetch('../data/armor.json');
        if (!response.ok) throw new Error('Ошибка загрузки брони');
        const data = await response.json();
        return data.armor || [];
    } catch (error) {
        console.error('Ошибка загрузки брони:', error);
        return [];
    }
}

async function displayArmor() {
    let armorList = await loadArmor();

    // Извлекаем уровень снаряжения из xaract
    armorList.forEach(a => {
        const match = a.xaract.match(/Уровень снаряжения:\s*(\d+)/);
        a.equipLevel = match ? parseInt(match[1], 10) : 0;
    });

    // Сортировка по уровню (от большего к меньшему)
    armorList.sort((a, b) => b.equipLevel - a.equipLevel);

    const grid = document.getElementById('armorGrid');
    if (!grid) return;

    grid.innerHTML = armorList.map(armor => `
        <div class="armor-card" 
            data-categories="${armor.categories.join(',')}" 
            data-name="${armor.name}"
            data-image="${armor.image}"
            data-description="${armor.description}"
            data-xaract="${armor.xaract || 'Не указан'}"
            data-blue-stat="${armor.blueStat || ''}">
            <img src="${armor.image}" alt="${armor.name}" class="armor-image">
            <div class="armor-name">${armor.name}</div>
        </div>
    `).join('');

    initEventHandlers();
}

function initEventHandlers() {
    // Фильтрация по категориям
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const category = this.dataset.category;
            const allCards = document.querySelectorAll('.armor-card');

            if (category === 'all') {
                allCards.forEach(card => card.style.display = 'block');
            } else {
                allCards.forEach(card => card.style.display = 'none');
                allCards.forEach(card => {
                    if (card.dataset.categories.includes(category)) {
                        card.style.display = 'block';
                    }
                });
            }
        });
    });

    // Модальное окно
    const modal = document.getElementById('armorModal');
    const modalImage = document.getElementById('modalArmorImage');
    const modalTitle = document.getElementById('modalArmorTitle');
    const modalDesc = document.getElementById('modalArmorDescription');
    const modalProperties = document.getElementById('modalArmorProperties');

    document.querySelectorAll('.armor-card').forEach(card => {
        card.addEventListener('click', function() {
            modalImage.src = this.dataset.image;
            modalImage.alt = this.dataset.name;
            modalTitle.textContent = this.dataset.name;
            modalDesc.textContent = this.dataset.description;

            const propertiesHTML = `
                <div class="property-item">
                    <div class="property-title">Тип:</div>
                    <div class="property-value">${this.dataset.categories.split(',').map(cat => {
                switch (cat) {
                    case 'Armor1': return 'Боевая броня';
                    case 'Armor2': return 'Научная броня';
                    case 'Armor3': return 'Комбинированная броня';
                    default: return cat;
                }
            }).join(', ')}</div>
                </div>
                <div class="property-item">
                    <div class="property-title">Характеристики:</div>
                    <div class="property-value">${this.dataset.xaract.split('\n').map(line =>
                `<div>${line}</div>`
            ).join('')}</div>
                </div>
                ${this.dataset.blueStat ? `
                <div class="property-item">
                    <div class="property-title">Дополнительно:</div>
                    <div class="property-value">${this.dataset.blueStat.split('\n').map(line =>
                `<div>${line}</div>`
            ).join('')}</div>
                </div>` : ''}
            `;

            modalProperties.innerHTML = propertiesHTML;
            modal.style.display = 'block';
        });
    });

    // Закрытие модального окна при клике вне области
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

document.addEventListener('DOMContentLoaded', displayArmor);