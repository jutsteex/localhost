// Карусель
document.addEventListener('DOMContentLoaded', function() {
    const slides = document.querySelector('.carousel-slides');
    const dots = document.querySelectorAll('.carousel-dot');
    const prevBtn = document.querySelector('.carousel-control.prev');
    const nextBtn = document.querySelector('.carousel-control.next');
    let currentSlide = 0;
    let slideInterval;
    
    // Функция перехода к слайду
    function goToSlide(index) {
        currentSlide = index;
        slides.style.transform = `translateX(-${currentSlide * 33.333}%)`;
        
        // Обновляем активную точку
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentSlide);
        });
    }
    
    // Переход к следующему слайду
    function nextSlide() {
        goToSlide((currentSlide + 1) % 3);
    }
    
    // Переход к предыдущему слайду
    function prevSlide() {
        goToSlide((currentSlide - 1 + 3) % 3);
    }
    
    // Обработчики событий для кнопок
    prevBtn.addEventListener('click', () => {
        prevSlide();
        resetInterval();
    });
    
    nextBtn.addEventListener('click', () => {
        nextSlide();
        resetInterval();
    });
    
    // Обработчики событий для точек
    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            goToSlide(i);
            resetInterval();
        });
    });
    
    // Автопереключение слайдов
    function startInterval() {
        slideInterval = setInterval(nextSlide, 5000);
    }
    
    function resetInterval() {
        clearInterval(slideInterval);
        startInterval();
    }
    
    startInterval();
    
    // Остановка автопереключения при наведении
    const carousel = document.querySelector('.hero-carousel');
    carousel.addEventListener('mouseenter', () => clearInterval(slideInterval));
    carousel.addEventListener('mouseleave', startInterval);
    
    // Выпадающие меню для мобильных устройств
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const dropdown = this.nextElementSibling;
                const isOpen = dropdown.style.display === 'block';
                
                // Закрываем все открытые dropdown
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
                
                // Открываем/закрываем текущий dropdown
                dropdown.style.display = isOpen ? 'none' : 'block';
            }
        });
    });
    
    // Закрытие dropdown при клике вне его
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!e.target.matches('.dropdown-toggle') && !e.target.closest('.dropdown-menu')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
        }
    });
});