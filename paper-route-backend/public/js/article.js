document.addEventListener('DOMContentLoaded', () => {
  loadArticle();
});

async function loadArticle() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (!slug) {
    document.body.innerHTML = '<h1>Article not found. No slug provided.</h1>';
    return;
  }

  try {
    const response = await fetch(`/api/articles/${slug}`);
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    const article = await response.json();
    renderArticle(article);
  } catch (error) {
    console.error('A critical error occurred in loadArticle:', error);
    document.getElementById('article-content').innerHTML =
      '<h2>Failed to load article content.</h2>';
  }
}

function renderArticle(article) {
  document.getElementById('article-title').textContent = article.TITLE;
  document.getElementById('article-body').innerHTML = `<p>${
    article.CONTENT || 'Content not available.'
  }</p>`;
  document.getElementById('author-name').textContent =
    article.AUTHOR_ID || 'The Paper Route News';
  document.title = `${article.TITLE} - The Paper Route News`;

  if (article.IMAGE_URL) {
    document.getElementById(
      'article-image'
    ).style.backgroundImage = `url('${article.IMAGE_URL}')`;
  }

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

  if (article.VERIFICATION_PDF_URL) {
    const pdfContainer = document.getElementById(
      'verification-pdf-link-container'
    );
    pdfContainer.innerHTML = `<a href="${article.VERIFICATION_PDF_URL}" target="_blank" rel="noopener noreferrer" class="inline-block bg-pr-primary text-white font-bold py-2 px-4 rounded-md hover:bg-opacity-90">Download Verification PDF</a>`;
  }
}
