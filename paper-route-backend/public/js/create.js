// public/js/create.js
document.addEventListener('DOMContentLoaded', () => {
  const passwordGate = document.getElementById('password-gate');
  const createFormContainer = document.getElementById('create-form-container');
  const passwordInput = document.getElementById('password');
  const submitPasswordBtn = document.getElementById('submit-password');
  const createArticleForm = document.getElementById('create-article-form');
  const feedbackMessage = document.getElementById('feedback-message');

  // A simple, insecure password. For a real site, you'd use a proper login system.
  const ADMIN_PASSWORD = 'password123';

  submitPasswordBtn.addEventListener('click', () => {
    if (passwordInput.value === ADMIN_PASSWORD) {
      passwordGate.classList.add('hidden');
      createFormContainer.classList.remove('hidden');
    } else {
      alert('Incorrect password.');
    }
  });

  createArticleForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent the default form submission

    const articleData = {
      title: document.getElementById('title').value,
      slug: document.getElementById('slug').value,
      image_url: document.getElementById('image_url').value,
      category: document.getElementById('category').value,
      content: document.getElementById('content').value,
      sources: document.getElementById('sources').value,
      verification_details: document.getElementById('verification_details')
        .value,
      verification_pdf_url: document.getElementById('verification_pdf_url')
        .value, // Add this
      youtube_embed_url: document.getElementById('youtube_embed_url').value, // Add this
    };
    // ... at the end of public/js/create.js ...
    const deleteBtn = document.getElementById('delete-btn');

    deleteBtn.addEventListener('click', async () => {
      const slugToDelete = document.getElementById('slug').value;

      if (!slugToDelete) {
        alert('Please enter the slug of the article you wish to delete.');
        return;
      }

      // Safety confirmation prompt
      const isConfirmed = confirm(
        `Are you sure you want to permanently delete the article with slug "${slugToDelete}"?`
      );

      if (isConfirmed) {
        try {
          const response = await fetch(`/api/articles/${slugToDelete}`, {
            method: 'DELETE',
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message);
          }

          feedbackMessage.textContent = result.message;
          feedbackMessage.style.color = 'green';
          createArticleForm.reset();
        } catch (error) {
          feedbackMessage.textContent = `Error: ${error.message}`;
          feedbackMessage.style.color = 'red';
        }
      }
    });
    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create article');
      }

      feedbackMessage.textContent = 'Article published successfully!';
      feedbackMessage.style.color = 'green';
      createArticleForm.reset(); // Clear the form
    } catch (error) {
      feedbackMessage.textContent = `Error: ${error.message}`;
      feedbackMessage.style.color = 'red';
    }
  });
});
