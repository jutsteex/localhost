document.addEventListener('DOMContentLoaded', function() {
    // Убрали код с hamburger, так как его нет в разметке
    
    // Закрытие меню при клике на ссылку (если нужно для мобильного меню)
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            // Если у вас будет мобильное меню, можно добавить логику здесь
        });
    });

    // Плавная прокрутка для всех ссылок с хэшем
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href') === '#') return;

            const targetId = this.getAttribute('href');
            // Исключаем внешние ссылки
            if (targetId.startsWith('http') || targetId.startsWith('//')) return;
            
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Обновление URL без перезагрузки страницы
                if (history.pushState) {
                    history.pushState(null, null, targetId);
                } else {
                    window.location.hash = targetId;
                }
            }
        });
    });

    // Анимация при скролле
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.feature-card, .news-card, .section-header, .news-article');

        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.2; 

            if (elementPosition < screenPosition) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };

    // Установка начального состояния для анимации
    const animateElements = document.querySelectorAll('.feature-card, .news-card, .section-header, .news-article');
    animateElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    // Запуск анимации при загрузке и скролле
    animateOnScroll();
    window.addEventListener('scroll', animateOnScroll);

    // Подсветка активного раздела в навигации
    const highlightCurrentPage = () => {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-links > li > a');

        navLinks.forEach(link => {
            const linkPage = link.getAttribute('href');
            if (linkPage && currentPage.includes(linkPage.split('/').pop())) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    };

    highlightCurrentPage();
});