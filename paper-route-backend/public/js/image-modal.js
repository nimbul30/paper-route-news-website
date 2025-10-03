document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/modals/image-modal.html');
        if (!response.ok) {
            throw new Error('Failed to load image modal HTML');
        }
        const modalHtml = await response.text();
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.insertAdjacentHTML('beforeend', modalHtml);
        }
        initializeImageModal();
    } catch (error) {
        console.error(error);
    }

    function initializeImageModal() {
        const modal = document.getElementById('image-modal');
        const closeModalBtn = document.getElementById('close-image-modal-btn');

        if (modal && closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });

            window.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }
            });
        }
    }

    function openImageModal(imageUrl) {
        const modal = document.getElementById('image-modal');
        const modalImage = document.getElementById('modal-image');
        if (modal && modalImage) {
            modalImage.src = imageUrl;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    document.body.addEventListener('click', (event) => {
        if (event.target.matches('.image-modal-trigger')) {
            const imageUrl = event.target.dataset.imageUrl;
            if (imageUrl) {
                openImageModal(imageUrl);
            }
        }
    });
});