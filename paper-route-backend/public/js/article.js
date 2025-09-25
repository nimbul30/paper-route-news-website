// public/js/article.js

document.addEventListener('DOMContentLoaded', () => {
  loadArticle();
});

async function loadArticle() {
  // Get the 'slug' from the URL query parameter
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (!slug) {
    document.body.innerHTML = '<h1>Article not found.</h1>';
    return;
  }

  try {
    const response = await fetch(`/api/articles/${slug}`);
    if (!response.ok) {
      throw new Error(`Article not found or error loading: ${response.status}`);
    }
    const article = await response.json();
    renderArticle(article);
  } catch (error) {
    console.error('Failed to load article:', error);
    document.getElementById('article-content').innerHTML =
      '<h2>Failed to load article content. Please try again later.</h2>';
  }
}

function renderArticle(article) {
  // Note: Oracle DB often returns column names in uppercase
  document.getElementById('article-title').textContent = article.TITLE;
  document.getElementById('article-body').innerHTML = `<p>${
    article.CONTENT || 'Content not available.'
  }</p>`;
  document.getElementById('author-name').textContent =
    article.AUTHOR || 'The Paper Route News';
  document.title = `${article.TITLE} - The Paper Route News`;

  if (article.IMAGE_URL) {
    document.getElementById(
      'article-image'
    ).style.backgroundImage = `url('${article.IMAGE_URL}')`;
  }

  // Render YouTube video embed
  if (article.YOUTUBE_EMBED_URL) {
    const videoContainer = document.getElementById('youtube-embed-container');
    videoContainer.innerHTML = `
            <div class="aspect-w-16 aspect-h-9">
                <iframe src="${article.YOUTUBE_EMBED_URL}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full rounded-lg shadow-custom"></iframe>
            </div>
        `;
  }

  if (article.SOURCES) {
    const sourcesList = document.getElementById('sources-list');
    const sourcesHtml = article.SOURCES.split('\n')
      .map((source) => {
        const urlMatch = source.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          return `<p><a href="${urlMatch[0]}" target="_blank" rel="noopener noreferrer" class="hover:text-pr-primary underline">${source}</a></p>`;
        }
        return `<p>${source}</p>`;
      })
      .join('');
    sourcesList.innerHTML = sourcesHtml;
  }

  // Render verification details text
  if (article.VERIFICATION_DETAILS) {
    document.getElementById('verification-details-list').textContent =
      article.VERIFICATION_DETAILS;
  }

  // Render verification PDF download link
  if (article.VERIFICATION_PDF_URL) {
    const pdfContainer = document.getElementById(
      'verification-pdf-link-container'
    );
    pdfContainer.innerHTML = `<a href="${article.VERIFICATION_PDF_URL}" target="_blank" rel="noopener noreferrer" class="inline-block bg-pr-primary text-white font-bold py-2 px-4 rounded-md hover:bg-opacity-90">Download Verification PDF</a>`;
  }
}
