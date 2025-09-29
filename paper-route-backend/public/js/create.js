document.addEventListener('DOMContentLoaded', () => {
  const passwordGate = document.getElementById('password-gate');
  const createFormContainer = document.getElementById('create-form-container');
  const passwordInput = document.getElementById('password');
  const submitPasswordBtn = document.getElementById('submit-password');
  const createArticleForm = document.getElementById('create-article-form');
  const feedbackMessage = document.getElementById('feedback-message');
  const deleteBtn = document.getElementById('delete-btn');
  const editBtn = document.getElementById('edit-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  const ADMIN_PASSWORD = 'password123';
  let isEditMode = false;
  let originalSlug = null;

  // Initialize SimpleMDE editors
  const contentEditor = new SimpleMDE({ element: document.getElementById('content') });
  const sourcesEditor = new SimpleMDE({ element: document.getElementById('sources') });

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
    console.log('Create article form submitted.');

    const articleData = {
      title: document.getElementById('title').value,
      slug: document.getElementById('slug').value,
      image_url: document.getElementById('image_url').value,
      widescreen_image_url: document.getElementById('widescreen_image_url').value, // Add this line
      tags: document.getElementById('tags').value,
      spot_number: document.getElementById('spot_number').value,
      layout: document.getElementById('layout').value, // Add this line
      content: contentEditor.value(), // Get value from SimpleMDE
      sources: sourcesEditor.value(), // Get value from SimpleMDE
      verification_pdf_url: document.getElementById('verification_pdf_url')
        .value,
      youtube_embed_url: document.getElementById('youtube_embed_url').value,
    };

    try {
      console.log('Submitting article data:', articleData);
      let response;
      if (isEditMode) {
        articleData.new_slug = articleData.slug;
        articleData._method = 'PUT';
        articleData._originalSlug = originalSlug;
        response = await fetch(`/api/articles/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData),
        });
      } else {
        response = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData),
        });
      }

      console.log('Received response:', response);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: await response.text() };
        }
        console.error('Server returned an error:', errorData);
        if (response.status === 409) {
          throw new Error(errorData.message || 'A post with this slug or spot number already exists.');
        } else if (response.status === 404 && isEditMode) {
          throw new Error(errorData.message || 'The article you are trying to edit could not be found. It may have been deleted.');
        } else {
          throw new Error(
            errorData.message ||
              `Failed to ${isEditMode ? 'update' : 'create'} article`
          );
        }
      }

      const result = await response.json();
      console.log('Article submission successful:', result);
      feedbackMessage.textContent = isEditMode
        ? 'Article updated successfully!'
        : 'Article published successfully!';
      feedbackMessage.style.color = 'green';

      if (isEditMode) {
        isEditMode = false;
        originalSlug = null;
        document.querySelector('button[type="submit"]').textContent =
          'Publish Article';
        document.querySelector('h1').textContent = 'Create or Delete Article';
        cancelEditBtn.classList.add('hidden');
      } else {
        createArticleForm.reset();
        contentEditor.value(''); // Clear SimpleMDE editor
        sourcesEditor.value(''); // Clear SimpleMDE editor
      }
    } catch (error) {
      console.error('An error occurred during article submission:', error);
      feedbackMessage.textContent = `Error: ${error.message}`;
      feedbackMessage.style.color = 'red';
    }
  });



  editBtn.addEventListener('click', async () => {
    const slugToEdit = document.getElementById('slug').value;
    if (!isValidSlug(slugToEdit)) {
      alert('Please enter a valid slug (no spaces).');
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
        contentEditor.value(''); // Clear SimpleMDE editor
        sourcesEditor.value(''); // Clear SimpleMDE editor
      } catch (error) {
        feedbackMessage.textContent = `Error: ${error.message}`;
        feedbackMessage.style.color = 'red';
      }
    }
  });

  const archiveBtn = document.getElementById('archive-btn');

  archiveBtn.addEventListener('click', async () => {
    const slugToArchive = document.getElementById('slug').value;
    if (!slugToArchive) {
      alert('Please enter the slug of the article you wish to archive.');
      return;
    }

    const isConfirmed = confirm(
      `Are you sure you want to archive the article with slug "${slugToArchive}"? This will remove it from its spot on the home page.`
    );
    if (isConfirmed) {
      try {
        const response = await fetch(`/api/articles/${slugToArchive}/archive`, {
          method: 'PUT',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        feedbackMessage.textContent = result.message;
        feedbackMessage.style.color = 'green';
        createArticleForm.reset();
        contentEditor.value(''); // Clear SimpleMDE editor
        sourcesEditor.value(''); // Clear SimpleMDE editor
      } catch (error) {
        feedbackMessage.textContent = `Error: ${error.message}`;
        feedbackMessage.style.color = 'red';
      }
    }
  });

  cancelEditBtn.addEventListener('click', () => {
    isEditMode = false;
    originalSlug = null;
    createArticleForm.reset();
    contentEditor.value(''); // Clear SimpleMDE editor
    sourcesEditor.value(''); // Clear SimpleMDE editor
    document.querySelector('h1').textContent = 'Create or Delete Article';
    document.querySelector('button[type="submit"]').textContent = 'Publish Article';
    cancelEditBtn.classList.add('hidden');
    feedbackMessage.textContent = '';
  });

  function isValidSlug(slug) {
    if (!slug || slug.trim() === '') {
      return false;
    }
    // Check for spaces
    if (/\s/.test(slug)) {
      return false;
    }
    return true;
  }

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
      cancelEditBtn.classList.remove('hidden');

      // Populate the form fields with existing data
      document.getElementById('title').value = article.TITLE || '';
      document.getElementById('slug').value = article.SLUG || '';
      document.getElementById('image_url').value = article.IMAGE_URL || '';
      document.getElementById('widescreen_image_url').value = article.WIDESCREEN_IMAGE_URL || ''; // Add this line
      document.getElementById('tags').value = article.TAGS || '';
      document.getElementById('spot_number').value = article.SPOT_NUMBER || '';
      document.getElementById('layout').value = article.LAYOUT || 'default'; // Add this line
      contentEditor.value(article.CONTENT || ''); // Set value using SimpleMDE API
      sourcesEditor.value(article.SOURCES || ''); // Set value using SimpleMDE API
      document.getElementById('verification_pdf_url').value =
        article.VERIFICATION_PDF_URL || '';
      document.getElementById('youtube_embed_url').value =
        article.YOUTUBE_EMBED_URL || '';

      // Show success message
      const feedbackMessage = document.getElementById('feedback-message');
      feedbackMessage.textContent = 'Article loaded for editing';
      feedbackMessage.style.color = 'blue';
    } catch (error) {
      const feedbackMessage = document.getElementById('feedback-message');
      feedbackMessage.textContent = `Error loading article: ${error.message}`;
      feedbackMessage.style.color = 'red';
    }
  }
});
