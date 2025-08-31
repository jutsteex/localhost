document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('mainCardsGrid');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalContainer = document.getElementById('modalContainer');
  const nav = document.querySelector('nav');
  
  // Сохраняем оригинальные стили навигации
  let originalNavDisplay = '';
  let originalNavVisibility = '';
  let originalNavOpacity = '';
  
  if (nav) {
    const computedStyle = getComputedStyle(nav);
    originalNavDisplay = computedStyle.display;
    originalNavVisibility = computedStyle.visibility;
    originalNavOpacity = computedStyle.opacity;
  }

  function parseDate(str) {
  if (!str) return 0;

  // ISO-формат YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return new Date(str).getTime();
  }

  // Формат DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split('.');
    return new Date(`${yyyy}-${mm}-${dd}`).getTime();
  }

  // Формат DD.MM.YY (две цифры года → считаем как 20YY)
  if (/^\d{2}\.\d{2}\.\d{2}$/.test(str)) {
    const [dd, mm, yy] = str.split('.');
    const yyyy = parseInt(yy, 10) < 50 ? `20${yy}` : `19${yy}`;
    return new Date(`${yyyy}-${mm}-${dd}`).getTime();
  }

  // fallback
  return new Date(str).getTime();
}

  // === Загрузка статей из общего JSON ===
  fetch('./data/articles.json')
    .then(r => r.json())
    .then(articles => {
      // сортировка по дате (новые выше)
      articles.sort((a, b) => parseDate(b.date) - parseDate(a.date));

      // берём только 4 статьи
      const latest = articles.slice(0, 4);

      renderCards(latest);
    })
    .catch(err => {
      console.error('Ошибка загрузки статей:', err);
      grid.innerHTML = '<p class="error-message">Не удалось загрузить карточки.</p>';
    });

  // === Рендер карточек на главной ===
  function renderCards(cards) {
  grid.innerHTML = '';

  cards.forEach(article => {
    const el = document.createElement('div');
    el.className = 'promo-card';
    el.style.backgroundImage = article.backimage ? `url(${article.backimage})` : 'none';

    el.innerHTML = `
      <div class="promo-overlay"></div>
      <div class="promo-inner">
        <div class="promo-badges">
          <span class="promo-date">${article.date}</span>
        </div>
        <div class="promo-title">${article.title}</div>
        <button class="promo-btn" type="button">Подробнее</button>
      </div>
    `;

    // 🔘 открытие по клику на всю карточку
    el.addEventListener('click', () => openModal(article));

    // 🔘 кнопка тоже работает (и останавливает всплытие, чтобы не было двойного вызова)
    el.querySelector('.promo-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(article);
    });

    grid.appendChild(el);
  });
}

  // === Модалка ===
  function openModal(article) {
    // Скрываем навигацию при открытии модального окна
    
    modalContainer.innerHTML = `
      <div class="modal-image-container">
        <img src="${article.image}" alt="${article.title}" class="modal-image">
      </div>
      <div class="modal-date">${article.date}</div>
      <h2 class="modal-title">${article.title}</h2>
      <div class="modal-content">${article.fullContent || article.shortDescription || ''}</div>
    `;

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    modalContainer.scrollTo(0, 0);

    // Подключаем картинки внутри модалки для зума
    const images = [...modalContainer.querySelectorAll('img')].map(img => ({
      src: img.src,
      alt: img.alt || article.title
    }));
    modalContainer.querySelectorAll('img').forEach((img, idx) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => openImageZoom(images, idx));
    });
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
  }

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (imageZoomOverlay.classList.contains('active')) {
      if (e.key === 'Escape') closeImageZoom();
      else if (e.key === 'ArrowLeft') showPrevImage();
      else if (e.key === 'ArrowRight') showNextImage();
      return;
    }
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
      closeModal();
    }
  });

  // === Лайтбокс (zoom) ===
  const imageZoomOverlay = document.createElement('div');
  imageZoomOverlay.id = 'imageZoomOverlay';
  imageZoomOverlay.innerHTML = `
    <div class="image-zoom-container">
      <button class="image-zoom-prev" aria-label="Предыдущее">‹</button>
      <img class="image-zoom-img" alt="">
      <button class="image-zoom-next" aria-label="Следующее">›</button>
    </div>
  `;
  document.body.appendChild(imageZoomOverlay);

  const zoomImg = imageZoomOverlay.querySelector('.image-zoom-img');
  const zoomPrev = imageZoomOverlay.querySelector('.image-zoom-prev');
  const zoomNext = imageZoomOverlay.querySelector('.image-zoom-next');

  let currentImages = [];
  let currentIndex = 0;

  function openImageZoom(images, startIndex = 0) {
    
    currentImages = images;
    currentIndex = startIndex;
    showZoomImage();
    imageZoomOverlay.classList.add('active');
  }
  
  function closeImageZoom() {
    imageZoomOverlay.classList.remove('active');
    currentImages = [];
    currentIndex = 0;
  }
  
  function showPrevImage() {
    if (!currentImages.length) return;
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    showZoomImage();
  }
  
  function showNextImage() {
    if (!currentImages.length) return;
    currentIndex = (currentIndex + 1) % currentImages.length;
    showZoomImage();
  }
  
  function showZoomImage() {
    if (!currentImages.length) return;
    const { src, alt } = currentImages[currentIndex];
    zoomImg.classList.remove('fade-in');
    void zoomImg.offsetWidth;
    zoomImg.alt = alt || '';
    zoomImg.src = src;
    zoomPrev.style.display = currentImages.length > 1 ? 'block' : 'none';
    zoomNext.style.display = currentImages.length > 1 ? 'block' : 'none';
    zoomImg.onload = () => zoomImg.classList.add('fade-in');
  }

  zoomPrev.addEventListener('click', showPrevImage);
  zoomNext.addEventListener('click', showNextImage);
  imageZoomOverlay.addEventListener('click', (e) => {
    if (!e.target.closest('.image-zoom-container')) closeImageZoom();
  });

  // === Обработка ошибок картинок ===
  document.addEventListener('error', function(e) {
    if (e.target.tagName !== 'IMG') return;
    const img = e.target;
    const container = img.closest('.modal-image-container, .image-zoom-container');
    if (!container) return;
    if (!container.querySelector('.image-error')) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'image-error';
      errorDiv.textContent = 'Изображение не загружено';
      container.appendChild(errorDiv);
    }
    img.style.display = 'none';
  }, true);

  document.addEventListener('load', function(e) {
    if (e.target.tagName !== 'IMG') return;
    const img = e.target;
    img.style.display = '';
    const container = img.closest('.modal-image-container, .image-zoom-container');
    if (container) {
      const err = container.querySelector('.image-error');
      if (err) err.remove();
    }
  }, true);
});