document.addEventListener('DOMContentLoaded', function () {
  const newsGrid = document.getElementById('newsGrid');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalContainer = document.getElementById('modalContainer');

  let allArticles = [];
  let filteredArticles = [];

  // === Фильтры (создаём как на главной) ===
  const filterControls = document.createElement('div');
  filterControls.className = 'filter-controls';
  filterControls.innerHTML = `
    <button class="filter-btn active" data-filter="all">Все</button>
    <button class="filter-btn" data-filter="guide">Гайды</button>
    <button class="filter-btn" data-filter="article">Статьи</button>
  `;
  newsGrid.parentNode.insertBefore(filterControls, newsGrid);

  // ====== Парсер дат (DD.MM.YYYY / DD.MM.YY / YYYY-MM-DD) ======
  function parseDate(input) {
    if (!input) return 0;
    const str = String(input).trim();

    // ISO YYYY-MM-DD (с опциональным временем)
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const t = new Date(str).getTime();
      return Number.isFinite(t) ? t : 0;
    }

    // Берём только дату до пробела/запятой/'T'
    const datePart = str.split(/[ ,T]/)[0];

    // DD.MM.YYYY
    let m = datePart.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) {
      const t = new Date(`${m[3]}-${m[2]}-${m[1]}`).getTime();
      return Number.isFinite(t) ? t : 0;
    }

    // DD.MM.YY
    m = datePart.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (m) {
      const y = parseInt(m[3], 10);
      const year = y < 50 ? 2000 + y : 1900 + y;
      const t = new Date(`${year}-${m[2]}-${m[1]}`).getTime();
      return Number.isFinite(t) ? t : 0;
    }

    // fallback
    const t = new Date(str).getTime();
    return Number.isFinite(t) ? t : 0;
  }

  const sortArticlesByDateDesc = (arr) =>
    arr.slice().sort((a, b) => parseDate(b.date) - parseDate(a.date));

  // ====== Рендер карточек ======
  function renderArticles(articles) {
    if (!articles || articles.length === 0) {
      newsGrid.innerHTML = '<p class="no-articles">Статьи не найдены</p>';
      return;
    }

    newsGrid.innerHTML = '';

    articles.forEach((article) => {
      const isGuide = article.title?.toLowerCase().includes('гайд');
      const articleType = isGuide ? 'guide' : 'article';

      const card = document.createElement('div');
      card.className = `news-card ${articleType}`;
      // превью из backimage (если нет — fallback на image)
      const bg = article.backimage || article.image;
      card.style.backgroundImage = bg ? `url(${bg})` : 'none';

      card.innerHTML = `
        <div class="card-content">
          <div class="card-date">${article.date || ''}</div>
          <h3 class="card-title">${article.title || ''}</h3>
          <button class="card-btn" type="button">Подробнее</button>
        </div>
      `;

      // открыть модалку по клику на саму карточку
      card.addEventListener('click', () => openModal(article));
      // и по кнопке (не всплываем)
      card.querySelector('.card-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(article);
      });

      newsGrid.appendChild(card);
    });
  }

  // ====== Фильтры ======
  function setupFilterButtons() {
    const filterButtons = filterControls.querySelectorAll('.filter-btn');

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        if (filter === 'all') {
          filteredArticles = allArticles.slice(); // уже отсортированы
        } else {
          filteredArticles = allArticles.filter((article) => {
            const isGuide = article.title?.toLowerCase().includes('гайд');
            return filter === 'guide' ? isGuide : !isGuide;
          });
        }

        // на всякий случай сортируем выборку перед выводом
        filteredArticles = sortArticlesByDateDesc(filteredArticles);
        renderArticles(filteredArticles);
      });
    });
  }

  const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
      filteredArticles = allArticles.slice();
    } else {
      filteredArticles = allArticles.filter(article =>
        (article.title || '').toLowerCase().includes(query)
      );
    }

    filteredArticles = sortArticlesByDateDesc(filteredArticles);
    renderArticles(filteredArticles);
  });
}

  // ====== Лайтбокс (зум картинок) ======
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
    currentImages = images || [];
    currentIndex = startIndex || 0;
    showZoomImage();
    imageZoomOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function showZoomImage() {
    if (!currentImages.length) return;

    const { src, alt } = currentImages[currentIndex];
    // навешиваем обработчики ПЕРЕД установкой src
    zoomImg.onerror = () => {
      zoomImg.style.visibility = 'hidden';
      if (!zoomImg.parentNode.querySelector('.image-error')) {
        const msg = document.createElement('div');
        msg.className = 'image-error';
        msg.textContent = 'Изображение не загружено';
        zoomImg.parentNode.appendChild(msg);
      }
    };
    zoomImg.onload = () => {
      zoomImg.style.visibility = 'visible';
      const err = zoomImg.parentNode.querySelector('.image-error');
      if (err) err.remove();
    };

    zoomImg.alt = alt || '';
    zoomImg.src = src;

    const many = currentImages.length > 1;
    zoomPrev.style.display = many ? 'block' : 'none';
    zoomNext.style.display = many ? 'block' : 'none';
  }

  function closeImageZoom() {
    imageZoomOverlay.classList.remove('active');
    document.body.style.overflow = '';
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

  zoomPrev.addEventListener('click', showPrevImage);
  zoomNext.addEventListener('click', showNextImage);
  imageZoomOverlay.addEventListener('click', (e) => {
    if (!e.target.closest('.image-zoom-container')) closeImageZoom();
  });

  // ====== Модалка статьи ======
  function openModal(article) {
    // наполняем модалку
    modalContainer.innerHTML = `
      <div class="modal-image-container">
        ${article.image ? `<img src="${article.image}" alt="${article.title || ''}" class="modal-image">` : ''}
      </div>
      <div class="modal-date">${article.date || ''}</div>
      <h2 class="modal-title">${article.title || ''}</h2>
      <div class="modal-content">${article.fullContent || article.shortDescription || ''}</div>
    `;

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    modalContainer.scrollTo(0, 0);

    // собираем все картинки в модалке для зума
    const imgs = Array.from(modalContainer.querySelectorAll('img'));
    const images = imgs.map((img) => ({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || article.title || ''
    }));

    // клики по картинкам → открыть зум
    imgs.forEach((img, idx) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => openImageZoom(images, idx));

      // локальные onerror/onload, чтобы не мигало
      img.onerror = () => {
        img.style.visibility = 'hidden';
        if (!img.parentNode.querySelector('.image-error')) {
          const msg = document.createElement('div');
          msg.className = 'image-error';
          msg.textContent = 'Изображение не загружено';
          img.parentNode.appendChild(msg);
        }
      };
      img.onload = () => {
        img.style.visibility = 'visible';
        const err = img.parentNode.querySelector('.image-error');
        if (err) err.remove();
      };
    });
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    // контент можно очистить, чтобы не держать DOM
    // modalContainer.innerHTML = '';
  }

  // клик по фону закрывает модалку
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // клавиатура: Esc/стрелки
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

  // ====== Загрузка и первичный рендер ======
  fetch('../data/articles.json')
    .then((r) => {
      if (!r.ok) throw new Error('Network response was not ok');
      return r.json();
    })
    .then((articles) => {
      allArticles = sortArticlesByDateDesc(articles);
      filteredArticles = allArticles.slice();
      renderArticles(filteredArticles);
      setupFilterButtons();
    })
    .catch((err) => {
      console.error('Ошибка загрузки статей:', err);
      newsGrid.innerHTML =
        '<p class="error-message">Не удалось загрузить статьи. Пожалуйста, попробуйте позже.</p>';
    });
});
