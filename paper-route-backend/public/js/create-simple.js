document.addEventListener('DOMContentLoaded', () => {
  const passwordGate = document.getElementById('password-gate');
  const createFormContainer = document.getElementById('create-form-container');
  const passwordInput = document.getElementById('password');
  const submitPasswordBtn = document.getElementById('submit-password');
  const createArticleForm = document.getElementById('create-article-form');
  const feedbackMessage = document.getElementById('feedback-message');
  const deleteBtn = document.getElementById('delete-btn');
  const editBtn = document.getElementById('edit-btn');

  const ADMIN_PASSWORD = 'password123';
  let isEditMode = false;
  let originalSlug = null;

  submitPasswordBtn.addEventListener('click', () => {
    if (passwordInput.value === ADMIN_PASSWORD) {
      passwordGate.classList.add('hidden');
      createFormContainer.classList.remove('hidden');
    } else {
      alert('Incorrect password.');
    }
  });

  createArticleForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const articleData = {
      title: document.getElementById('title').value,
      slug: document.getElementById('slug').value,
      image_url: document.getElementById('image_url').value,
      category: document.getElementById('category').value,
      content: document.getElementById('content').value,
      sources: document.getElementById('sources').value,
      verification_pdf_url: document.getElementById('verification_pdf_url')
        .value,
      youtube_embed_url: document.getElementById('youtube_embed_url').value,
    };

    try {
      let response;
      if (isEditMode) {
        // Update existing article using POST to /api/articles/update
        articleData.new_slug = articleData.slug;
        articleData._originalSlug = originalSlug;
        console.log('Sending POST request to: /api/articles/update');
        response = await fetch(`/api/articles/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData),
        });
      } else {
        // Create new article
        console.log('Sending POST request to: /api/articles');
        response = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            `Failed to ${isEditMode ? 'update' : 'create'} article`
        );
      }

      const result = await response.json();
      feedbackMessage.textContent = isEditMode
        ? 'Article updated successfully!'
        : 'Article published successfully!';
      feedbackMessage.style.color = 'green';

      if (isEditMode) {
        // Reset edit mode
        isEditMode = false;
        originalSlug = null;
        document.querySelector('button[type="submit"]').textContent =
          'Publish Article';
        document.querySelector('h1').textContent = 'Create or Delete Article';
      } else {
        createArticleForm.reset();
      }
    } catch (error) {
      feedbackMessage.textContent = `Error: ${error.message}`;
      feedbackMessage.style.color = 'red';
    }
  });

  editBtn.addEventListener('click', async () => {
    const slugToEdit = document.getElementById('slug').value;
    if (!slugToEdit) {
      alert('Please enter the slug of the article you wish to edit.');
      return;
    }

    try {
      await loadArticleForEdit(slugToEdit);
    } catch (error) {
      feedbackMessage.textContent = `Error: ${error.message}`;
      feedbackMessage.style.color = 'red';
    }
  });

  deleteBtn.addEventListener('click', async () => {
    const slugToDelete = document.getElementById('slug').value;
    if (!slugToDelete) {
      alert('Please enter the slug of the article you wish to delete.');
      return;
    }

    const isConfirmed = confirm(
      `Are you sure you want to permanently delete the article with slug "${slugToDelete}"?`
    );
    if (isConfirmed) {
      try {
        const response = await fetch(`/api/articles/${slugToDelete}`, {
          method: 'DELETE',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        feedbackMessage.textContent = result.message;
        feedbackMessage.style.color = 'green';
        createArticleForm.reset();
      } catch (error) {
        feedbackMessage.textContent = `Error: ${error.message}`;
        feedbackMessage.style.color = 'red';
      }
    }
  });

  async function loadArticleForEdit(slug) {
    try {
      console.log('loadArticleForEdit called with slug:', slug);
      const response = await fetch(`/api/articles/${slug}`);
      if (!response.ok) {
        throw new Error('Failed to load article for editing');
      }

      const article = await response.json();

      // Store original slug and set edit mode
      originalSlug = slug;
      isEditMode = true;
      console.log(
        'Edit mode set - isEditMode:',
        isEditMode,
        'originalSlug:',
        originalSlug
      );

      // Update UI for edit mode
      document.querySelector('h1').textContent = 'Edit Article';
      document.querySelector('button[type="submit"]').textContent =
        'Update Article';

      // Populate the form fields with existing data
      document.getElementById('title').value = article.TITLE || '';
      document.getElementById('slug').value = article.SLUG || '';
      document.getElementById('image_url').value = article.IMAGE_URL || '';
      document.getElementById('category').value = article.CATEGORY || '';
      document.getElementById('content').value = article.CONTENT || '';
      document.getElementById('sources').value = article.SOURCES || '';
      document.getElementById('verification_pdf_url').value =
        article.VERIFICATION_PDF_URL || '';
      document.getElementById('youtube_embed_url').value =
        article.YOUTUBE_EMBED_URL || '';

      // Show success message
      feedbackMessage.textContent = 'Article loaded for editing';
      feedbackMessage.style.color = 'blue';
    } catch (error) {
      feedbackMessage.textContent = `Error loading article: ${error.message}`;
      feedbackMessage.style.color = 'red';
    }
  }
});
