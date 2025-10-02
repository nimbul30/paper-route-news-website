document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/modals/transparency-modal.html');
        if (!response.ok) {
            throw new Error('Failed to load transparency modal HTML');
        }
        const modalHtml = await response.text();
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.innerHTML = modalHtml;
        }
        initializeModal();
    } catch (error) {
        console.error(error);
    }

    function initializeModal() {
        const modal = document.getElementById('transparency-modal');
        const closeModalBtn = document.getElementById('close-modal-btn');

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

    function openModalWithData(article) {
        if (!article) return;

        const {
            TITLE,
            SOURCES,
            VERIFICATION_DETAILS,
            CONTENT
        } = article;

        const verificationDetails = VERIFICATION_DETAILS ? JSON.parse(VERIFICATION_DETAILS) : {};
        const editorId = verificationDetails.editorId || 'E. Thorne';
        const verifiedAt = verificationDetails.verifiedAt || 'Sep 5, 2025, 3:30 AM';


        document.getElementById('modal-article-title').textContent = TITLE || 'N/A';

        const primarySource = SOURCES ? SOURCES.split(',')[0].trim() : 'N/A';
        document.getElementById('modal-primary-source').textContent = primarySource;

        const sourceLink = document.getElementById('modal-source-link');
        if (primarySource !== 'N/A') {
            sourceLink.href = primarySource;
            sourceLink.textContent = primarySource;
        } else {
            sourceLink.href = '#';
            sourceLink.textContent = '';
        }

        document.getElementById('modal-summary').textContent = CONTENT ? `"${String(CONTENT).substring(0, 150)}..."` : '""';
        document.getElementById('modal-editor-id').textContent = editorId;
        document.getElementById('modal-verified-at').textContent = verifiedAt;

        const modal = document.getElementById('transparency-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    async function fetchAndShowModal(slug) {
        if (slug) {
            try {
                const response = await fetch(`/api/articles/${slug}`);
                if (!response.ok) {
                    throw new Error(`API responded with status: ${response.status}`);
                }
                const article = await response.json();
                openModalWithData(article);
            } catch (error) {
                console.error('Failed to fetch article data for modal:', error);
            }
        }
    }

    // Use event delegation to handle clicks on the transparency button
    document.body.addEventListener('click', (event) => {
        if (event.target.matches('.transparency-btn-trigger')) {
            const slug = event.target.dataset.slug;
            fetchAndShowModal(slug);
        }
    });
});