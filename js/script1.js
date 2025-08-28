document.addEventListener('DOMContentLoaded', function() {
    const video = document.querySelector('.hero-video');
    const heroSection = document.querySelector('.hero');

    if (!video) {
        console.error('Видео элемент не найден');
        if (heroSection) heroSection.classList.add('no-video');
        return;
    }

    // Функция для скрытия видео и показа фолбэка
    function showFallback() {
        console.log('Активирован фолбэк (изображение вместо видео)');
        if (heroSection) heroSection.classList.add('no-video');
    }

    // Проверяем поддержку видео
    const canPlay = video.canPlayType('video/mp4');
    if (!canPlay) {
        console.log('Браузер не поддерживает видео MP4');
        showFallback();
        return;
    }

    // Обработчики событий для видео
    video.addEventListener('loadeddata', function() {
        console.log('Видео загружено');
        video.classList.add('loaded');
        
        // Пытаемся воспроизвести видео
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('Ошибка воспроизведения видео:', error);
                showFallback();
            });
        }
    });

    video.addEventListener('error', function(e) {
        console.error('Ошибка загрузки видео:', e);
        showFallback();
    });

    video.addEventListener('canplay', function() {
        console.log('Видео готово к воспроизведению');
        video.classList.add('loaded');
    });

    // Начинаем загрузку видео
    video.load();
    
    // Таймаут на случай, если видео не загрузится
    setTimeout(() => {
        if (!video.classList.contains('loaded')) {
            console.log('Таймаут загрузки видео');
            showFallback();
        }
    }, 5000);
});