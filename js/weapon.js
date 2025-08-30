async function loadWeapon() {
    try {
        const response = await fetch('../data/weapon.json');
        if (!response.ok) throw new Error('Ошибка загрузки оружия');
        const data = await response.json();
        return data.weapon || [];
    } catch (error) {
        console.error('Ошибка загрузки оружия:', error);
        return [];
    }
}

async function displayWeapon() {
    let weaponList = await loadWeapon();

    // Парсим уровень снаряжения из поля xaract
    weaponList.forEach(w => {
        const match = w.xaract.match(/Уровень снаряжения:\s*(\d+)/);
        w.equipLevel = match ? parseInt(match[1], 10) : 0;
    });

    // Сортировка по уровню (от большего к меньшему)
    weaponList.sort((a, b) => b.equipLevel - a.equipLevel);

    const grid = document.getElementById('weaponGrid');
    if (!grid) return;

    grid.innerHTML = weaponList.map(weapon => `
      <div class="weapon-card" 
          data-categories="${weapon.categories.join(',')}" 
          data-name="${weapon.name}"
          data-image="${weapon.image}"
          data-description="${weapon.description}"
          data-xaract="${weapon.xaract || 'Не указан'}"
          data-blue-stat="${weapon.blueStat || ''}">
          <img src="${weapon.image}" alt="${weapon.name}" class="weapon-image">
          <div class="weapon-name">${weapon.name}</div>
      </div>
    `).join('');

    initEventHandlers();
}

// Поиск по названию
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase();
        const allCards = document.querySelectorAll('.artifact-card, .armor-card, .weapon-card');
        allCards.forEach(card => {
            const name = card.dataset.name.toLowerCase();
            if (name.includes(query)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
}


function initEventHandlers() {
    // Фильтрация по категориям
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const category = this.dataset.category;
            const allCards = document.querySelectorAll('.weapon-card');

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
    const modal = document.getElementById('weaponModal');
    const modalImage = document.getElementById('modalWeaponImage');
    const modalTitle = document.getElementById('modalWeaponTitle');
    const modalDesc = document.getElementById('modalWeaponDescription');
    const modalProperties = document.getElementById('modalWeaponProperties');

    document.querySelectorAll('.weapon-card').forEach(card => {
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
                    case 'sniper': return 'Снайперские винтовки';
                    case 'assault': return 'Штурмовые винтовки';
                    case 'pistols': return 'Пистолеты';
                    case 'droboviki': return 'Дробовики';
                    case 'pulemety': return 'Пулеметы';
                    case 'pp': return 'Пистолеты-пулеметы';
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

document.addEventListener('DOMContentLoaded', displayWeapon);