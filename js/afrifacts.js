async function loadArtifacts() {
    try {
        const response = await fetch('../data/artifacts.json');
        if (!response.ok) throw new Error('Ошибка загрузки');
        const data = await response.json();
        return data.artifacts || [];
    } catch (error) {
        console.error('Ошибка загрузки артефактов:', error);
        return [];
    }
}

async function displayArtifacts() {
    const artifacts = await loadArtifacts();
    const grid = document.getElementById('artifactsGrid');

    if (!grid) return;

    grid.innerHTML = artifacts.map(artifact => `
        <div class="artifact-card" 
            data-categories="${artifact.categories.join(',')}" 
            data-name="${artifact.name}"
            data-image="${artifact.image}"
            data-description="${artifact.description}"
            data-xaract="${artifact.xaract || 'Не указан'}"
            data-blue-stat="${artifact.blueStat || ''}">
            <img src="${artifact.image}" alt="${artifact.name}" class="artifact-image">
            <div class="artifact-name">${artifact.name}</div>
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
            const allCards = document.querySelectorAll('.artifact-card');

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
    const modal = document.getElementById('artifactModal');
    const modalContent = document.querySelector('.modal-content');
    const modalImage = document.getElementById('modalArtifactImage');
    const modalTitle = document.getElementById('modalArtifactTitle');
    const modalDesc = document.getElementById('modalArtifactDescription');
    const modalProperties = document.getElementById('modalArtifactProperties');

    document.querySelectorAll('.artifact-card').forEach(card => {
        card.addEventListener('click', function() {
            // Получаем первую категорию артефакта
            const primaryCategory = this.dataset.categories.split(',')[0];

            // Устанавливаем атрибут data-category для модального окна
            modalContent.setAttribute('data-category', primaryCategory);

            modalImage.src = this.dataset.image;
            modalImage.alt = this.dataset.name;
            modalTitle.textContent = this.dataset.name;
            modalDesc.textContent = this.dataset.description;

            const propertiesHTML = `
                <div class="property-item">
                    <div class="property-title">Тип:</div>
                    <div class="property-value">${this.dataset.categories.split(',').map(cat => {
                switch (cat) {
                    case 'bio': return 'Биохимический';
                    case 'electro': return 'Электрофизический';
                    case 'grav': return 'Гравитационный';
                    case 'term': return 'Термический';
                    case 'other': return 'Другой';
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

document.addEventListener('DOMContentLoaded', displayArtifacts);