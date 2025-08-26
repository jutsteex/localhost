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
            articleCard.innerHTML = `
                <div class="card-image-container">
                    <img src="${article.image}" alt="${article.title}" class="card-image" loading="lazy">
                </div>
                <div class="card-content">
                    <div class="card-date">${article.date}</div>
                    <h3 class="card-title">${article.title}</h3>
                    <p class="card-description">${article.shortDescription}</p>
                </div>
            `;

            articleCard.addEventListener('click', () => openModal(article));
            newsGrid.appendChild(articleCard);
        });
    }

    // Настройка кнопок фильтра
    function setupFilterButtons() {
        const filterButtons = document.querySelectorAll('.filter-btn');

        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Удаляем активный класс у всех кнопок
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // Добавляем активный класс текущей кнопке
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

    // Открытие модального окна
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

        // Прокрутка в начало модального окна
        modalContainer.scrollTo(0, 0);
    }

    // Закрытие модального окна по клику вне контейнера
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Закрытие модального окна по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });

    function closeModal() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    // Обработка ошибок загрузки изображений
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG') {
            e.target.style.display = 'none';
            const container = e.target.closest('.modal-image-container, .card-image-container');
            if (container) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'image-error';
                errorDiv.textContent = 'Изображение не загружено';
                container.appendChild(errorDiv);
            }
        }
    }, true);
});