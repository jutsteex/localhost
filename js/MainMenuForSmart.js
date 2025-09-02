// Мобильное меню - улучшенная версия
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');
    const navOverlay = document.getElementById('navOverlay');
    const dropdowns = document.querySelectorAll('.dropdown');
    const html = document.documentElement;

    // Функция открытия/закрытия меню
    function toggleMenu() {
        const isOpening = !mobileMenuToggle.classList.contains('active');
        
        mobileMenuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        navOverlay.classList.toggle('active');
        
        if (isOpening) {
            html.style.overflow = 'hidden';
            html.style.touchAction = 'none';
        } else {
            html.style.overflow = '';
            html.style.touchAction = '';
        }
    }

    // Функция закрытия меню
    function closeMenu() {
        mobileMenuToggle.classList.remove('active');
        navLinks.classList.remove('active');
        navOverlay.classList.remove('active');
        html.style.overflow = '';
        html.style.touchAction = '';
        
        // Закрываем все выпадающие меню
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }

    // Переключение мобильного меню
    mobileMenuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleMenu();
    });

    // Закрытие меню по клику на overlay
    navOverlay.addEventListener('click', closeMenu);

    // Обработка выпадающих меню на мобильных устройствах
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        
        toggle.addEventListener('click', function(e) {
            if (window.innerWidth <= 968) {
                e.preventDefault();
                e.stopPropagation();
                
                // Закрываем другие открытые dropdown
                dropdowns.forEach(otherDropdown => {
                    if (otherDropdown !== dropdown && otherDropdown.classList.contains('active')) {
                        otherDropdown.classList.remove('active');
                    }
                });
                
                dropdown.classList.toggle('active');
            }
        });
    });

    // Закрытие меню при клике на ссылку (кроме dropdown-toggle)
    const navLinksAll = navLinks.querySelectorAll('a:not(.dropdown-toggle)');
    navLinksAll.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 968) {
                // Небольшая задержка для плавности анимации
                setTimeout(closeMenu, 100);
            }
        });
    });

    // Закрытие меню при клике вне его области
    document.addEventListener('click', function(e) {
        if (navLinks.classList.contains('active') && 
            !navLinks.contains(e.target) && 
            !mobileMenuToggle.contains(e.target)) {
            closeMenu();
        }
    });

    // Закрытие меню при нажатии Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            closeMenu();
        }
    });

    // Адаптивное поведение при изменении размера окна
    window.addEventListener('resize', function() {
        if (window.innerWidth > 968) {
            closeMenu();
        }
    });

    // Предотвращение скролла тела при скролле меню
    navLinks.addEventListener('touchstart', function(e) {
        this.addEventListener('touchmove', function(e) {
            if (this.scrollHeight > this.clientHeight) {
                e.stopPropagation();
            }
        }, { passive: false });
    }, { passive: true });
});