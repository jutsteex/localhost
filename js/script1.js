document.addEventListener('DOMContentLoaded', function() {
    const video = document.querySelector('.hero-video');
    const heroSection = document.querySelector('.hero');

    if (video) {
        // Проверяем, может ли браузер воспроизводить видео
        const canPlay = video.canPlayType('video/mp4');

        if (canPlay === 'probably' || canPlay === 'maybe') {
            video.addEventListener('loadeddata', function() {
                video.classList.add('loaded');
            });

            video.addEventListener('error', function() {
                heroSection.classList.add('no-video');
            });

            // Начинаем загрузку видео
            video.load();
        } else {
            heroSection.classList.add('no-video');
        }
    } else {
        heroSection.classList.add('no-video');
    }
});