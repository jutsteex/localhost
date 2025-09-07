// weapon.js — исправленная версия: поиск + видео в модальном (hover -> 240x120)
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

    // Парсим уровень снаряжения безопасно (на случай, если xaract отсутствует)
    weaponList.forEach(w => {
        const text = w.xaract || '';
        const match = text.match(/Уровень снаряжения:\s*(\d+)/);
        w.equipLevel = match ? parseInt(match[1], 10) : 0;
    });

    // Сортировка по уровню (от большего к меньшему)
    weaponList.sort((a, b) => b.equipLevel - a.equipLevel);

    const grid = document.getElementById('weaponGrid');
    if (!grid) return;

    grid.innerHTML = weaponList.map(weapon => {
        const cats = Array.isArray(weapon.categories) ? weapon.categories.join(',') : '';
        const name = weapon.name || '';
        const image = weapon.image || '';
        const video = weapon.video || '';
        const description = weapon.description || '';
        const xaract = weapon.xaract || 'Не указан';
        const blueStat = weapon.blueStat || '';
        return `
      <div class="weapon-card" 
          data-categories="${cats}" 
          data-name="${escapeHtml(name)}"
          data-image="${escapeHtml(image)}"
          data-video="${escapeHtml(video)}"
          data-description="${escapeHtml(description)}"
          data-xaract="${escapeHtml(xaract)}"
          data-blue-stat="${escapeHtml(blueStat)}">
          <img src="${image}" alt="${name}" class="weapon-image">
          <div class="weapon-name">${escapeHtml(name)}</div>
      </div>
    `;
    }).join('');

    initEventHandlers();
}

// простая защита от вставки небезопасного HTML в атрибуты/текст
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
}

// Конвертация общего Google Drive share-link в прямую ссылку (если возможно)
function convertDriveLink(url) {
    if (!url) return '';
    if (url.includes('googleusercontent') || url.includes('uc?export')) return url;

    // формат /d/FILEID/
    let m = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
    // или ?id=FILEID
    m = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;

    return url;
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
                    if ((card.dataset.categories || '').includes(category)) {
                        card.style.display = 'block';
                    }
                });
            }
        });
    });

    // Поиск — теперь привязывается после рендера карточек
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const query = this.value.toLowerCase();
            const allCards = document.querySelectorAll('.weapon-card, .artifact-card, .armor-card');
            allCards.forEach(card => {
                const name = (card.dataset.name || '').toLowerCase();
                if (name.includes(query)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // --- МОДАЛЬНОЕ ОКНО + VIDEO HOVER В МОДАЛЕ ---
    const modal = document.getElementById('weaponModal');
    const modalImage = document.getElementById('modalWeaponImage');
    const modalTitle = document.getElementById('modalWeaponTitle');
    const modalDesc = document.getElementById('modalWeaponDescription');
    const modalProperties = document.getElementById('modalWeaponProperties');

    // единый video элемент для модального окна
    let modalVideo = null;
    if (modalImage) {
        modalVideo = document.getElementById('modalWeaponVideo');
        if (!modalVideo) {
            modalVideo = document.createElement('video');
            modalVideo.id = 'modalWeaponVideo';
            modalVideo.muted = true;          // нужно для автоплея в браузерах
            modalVideo.loop = true;
            modalVideo.playsInline = true;
            modalVideo.preload = 'metadata';
            modalVideo.className = 'modal-video';

            // инлайн стили для плавной анимации (не требует правки CSS)
            Object.assign(modalVideo.style, {
                position: 'absolute',
                top: '0px',
                left: '0px',
                width: '0px',
                height: '0px',
                objectFit: 'cover',
                opacity: '0',
                pointerEvents: 'none',
                transition: 'width 0.35s ease, height 0.35s ease, opacity 0.35s ease',
                borderRadius: '6px',
                zIndex: '20'
            });

            // вставляем рядом с картинкой модального окна
            const imgContainer = modalImage.parentElement || modal;
            if (imgContainer) {
                // гарантируем position: relative чтобы абсолютное позиционирование работало от левого-верхнего края
                const computedPos = window.getComputedStyle(imgContainer).position;
                if (computedPos === 'static' || !computedPos) imgContainer.style.position = 'relative';
                imgContainer.appendChild(modalVideo);
            } else {
                modal.appendChild(modalVideo);
            }
        }

        // Наведение на картинку внутри модального — запускаем и увеличиваем видео
        modalImage.addEventListener('mouseenter', () => {
            const videoUrl = modalImage.dataset.video || '';
            if (!videoUrl) return;

            const direct = convertDriveLink(videoUrl);
            if (modalVideo.src !== direct) modalVideo.src = direct;

            // анимированно расширяем от левого-верхнего угла до 240x120
            modalVideo.style.width = '788px';
            modalVideo.style.height = '478px';
            modalVideo.style.opacity = '1';
            try { modalVideo.currentTime = 0; } catch (e) {}
            const p = modalVideo.play();
            if (p && p.catch) p.catch(err => console.warn('Autoplay prevented:', err));
        });

        modalImage.addEventListener('mouseleave', () => {
            if (!modalVideo) return;
            modalVideo.pause();
            modalVideo.style.opacity = '0';
            modalVideo.style.width = '0px';
            modalVideo.style.height = '0px';
        });
    }

    // Открытие модального окна при клике на карточку
    document.querySelectorAll('.weapon-card').forEach(card => {
        card.addEventListener('click', function() {
            const img = this.dataset.image || '';
            const name = this.dataset.name || '';
            const desc = this.dataset.description || '';

            if (modalImage) {
                modalImage.src = img;
                modalImage.alt = name;
                modalImage.dataset.video = this.dataset.video || ''; // важно — передаём ссылку в модальное изображение
            }
            if (modalTitle) modalTitle.textContent = name;
            if (modalDesc) modalDesc.textContent = desc;

            const propertiesHTML = `
              <div class="property-item">
                  <div class="property-title">Тип:</div>
                  <div class="property-value">${(this.dataset.categories || '').split(',').map(cat => {
                switch (cat.trim()) {
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
                  <div class="property-value">${(this.dataset.xaract || '').split('\\n').map(line =>
                `<div>${line}</div>`
            ).join('')}</div>
              </div>
              ${this.dataset.blueStat ? `
              <div class="property-item">
                  <div class="property-title">Дополнительно:</div>
                  <div class="property-value">${(this.dataset.blueStat || '').split('\\n').map(line =>
                `<div>${line}</div>`
            ).join('')}</div>
              </div>` : ''}
          `;

            if (modalProperties) modalProperties.innerHTML = propertiesHTML;

            // сбрасываем старое видео, если было
            if (modalVideo) {
                modalVideo.pause();
                modalVideo.src = '';
                modalVideo.style.opacity = '0';
                modalVideo.style.width = '0px';
                modalVideo.style.height = '0px';
            }

            if (modal) modal.style.display = 'block';
        });
    });

    // Закрытие модального окна при клике вне области — и остановка видео
    window.addEventListener('click', function(event) {
        if (modal && event.target === modal) {
            modal.style.display = 'none';
            if (modalVideo) {
                modalVideo.pause();
                modalVideo.src = '';
                modalVideo.style.opacity = '0';
                modalVideo.style.width = '0px';
                modalVideo.style.height = '0px';
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', displayWeapon);
