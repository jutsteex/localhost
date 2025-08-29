document.addEventListener('DOMContentLoaded', function() {
    const newsGrid = document.getElementById('newsGrid');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalContainer = document.getElementById('modalContainer');
    let allArticles = [];
    let filteredArticles = [];

    // Создаем элементы фильтра
    const filterControls = document.createElement('div');
    filterControls.className = 'filter-controls';
    filterControls.innerHTML = `
        <button class="filter-btn active" data-filter="all">Все</button>
        <button class="filter-btn" data-filter="guide">Гайды</button>
        <button class="filter-btn" data-filter="article">Статьи</button>
    `;
    newsGrid.parentNode.insertBefore(filterControls, newsGrid);

    // Загрузка статей из JSON
    fetch('../data/articles.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(articles => {
            allArticles = articles;
            filteredArticles = [...articles];
            renderArticles(filteredArticles);
            setupFilterButtons();
        })
        .catch(error => {
            console.error('Ошибка загрузки статей:', error);
            newsGrid.innerHTML = '<p class="error-message">Не удалось загрузить статьи. Пожалуйста, попробуйте позже.</p>';
        });

    // Рендер карточек статей
    function renderArticles(articles) {
        if (!articles || articles.length === 0) {
            newsGrid.innerHTML = '<p class="no-articles">Статьи не найдены</p>';
            return;
        }

        newsGrid.innerHTML = '';

        articles.forEach(article => {
            const isGuide = article.title.toLowerCase().includes('гайд');
            const articleType = isGuide ? 'guide' : 'article';

            const articleCard = document.createElement('div');
            articleCard.className = `news-card ${articleType}`;
            articleCard.style.backgroundImage = article.image ? `url(${article.image})` : 'none';

            articleCard.innerHTML = `
                <div class="card-content">
                    <div class="card-date">${article.date}</div>
                    <h3 class="card-title">${article.title}</h3>
                    <button class="card-btn">Подробнее</button>
                </div>
            `;

            // открытие по клику на карточку
            articleCard.addEventListener('click', () => openModal(article));

            // открытие по кнопке
            articleCard.querySelector('.card-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(article);
            });

            newsGrid.appendChild(articleCard);
        });
    }

    // Настройка кнопок фильтра
    function setupFilterButtons() {
        const filterButtons = document.querySelectorAll('.filter-btn');

        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                const filter = button.dataset.filter;

                if (filter === 'all') {
                    filteredArticles = [...allArticles];
                } else {
                    filteredArticles = allArticles.filter(article => {
                        const isGuide = article.title.toLowerCase().includes('гайд');
                        return filter === 'guide' ? isGuide : !isGuide;
                    });
                }

                renderArticles(filteredArticles);
            });
        });
    }

    // === Лайтбокс для полноэкранного зума ===
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

    function showZoomImage() {
        if (!currentImages.length) return;

        const { src, alt } = currentImages[currentIndex];
        zoomImg.alt = alt || '';
        zoomImg.src = src;

        zoomPrev.style.display = currentImages.length > 1 ? 'block' : 'none';
        zoomNext.style.display = currentImages.length > 1 ? 'block' : 'none';

        // локальная обработка ошибок/загрузки
        zoomImg.onerror = () => {
            zoomImg.style.visibility = 'hidden';
            if (!zoomImg.parentNode.querySelector('.image-error')) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'image-error';
                errorDiv.textContent = 'Изображение не загружено';
                zoomImg.parentNode.appendChild(errorDiv);
            }
        };
        zoomImg.onload = () => {
            zoomImg.style.visibility = 'visible';
            const err = zoomImg.parentNode.querySelector('.image-error');
            if (err) err.remove();
        };
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

    zoomPrev.addEventListener('click', showPrevImage);
    zoomNext.addEventListener('click', showNextImage);

    imageZoomOverlay.addEventListener('click', (e) => {
        if (!e.target.closest('.image-zoom-container')) {
            closeImageZoom();
        }
    });

    // === Открытие модального окна ===
    function openModal(article) {
        modalContainer.innerHTML = `
            <div class="modal-image-container">
                <img src="${article.image}" alt="${article.title}" class="modal-image">
            </div>
            <div class="modal-date">${article.date}</div>
            <h2 class="modal-title">${article.title}</h2>
            <div class="modal-content">${article.fullContent}</div>
        `;

        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        modalContainer.scrollTo(0, 0);

        const images = [...modalContainer.querySelectorAll('img')].map(img => ({
            src: img.src,
            alt: img.alt || article.title
        }));

        modalContainer.querySelectorAll('img').forEach((img, idx) => {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', () => openImageZoom(images, idx));

            // локальные обработчики ошибок / загрузки
            img.onerror = () => {
                img.style.visibility = 'hidden';
                if (!img.parentNode.querySelector('.image-error')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'image-error';
                    errorDiv.textContent = 'Изображение не загружено';
                    img.parentNode.appendChild(errorDiv);
                }
            };
            img.onload = () => {
                img.style.visibility = 'visible';
                const err = img.parentNode.querySelector('.image-error');
                if (err) err.remove();
            };
        });
    }

    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function(e) {
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

    function closeModal() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
});
