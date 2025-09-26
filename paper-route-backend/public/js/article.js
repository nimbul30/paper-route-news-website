document.addEventListener('DOMContentLoaded', () => {
  loadArticle();
});

async function loadArticle() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (!slug || slug === 'undefined' || slug === 'null') {
    document.body.innerHTML =
      '<h1>Article not found. No valid slug provided.</h1>';
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
  // Format article content with proper paragraphs
  const content = article.CONTENT || 'Content not available.';
  const formattedContent = formatArticleContent(content);
  document.getElementById('article-body').innerHTML = formattedContent;
  document.getElementById('author-name').textContent =
    article.AUTHOR_ID || 'The Paper Route News';
  document.title = `${article.TITLE} - The Paper Route News`;

  if (article.IMAGE_URL) {
    // Handle image URL - add proper path prefix for local files
    let imageUrl = article.IMAGE_URL;
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      imageUrl = `assets/${imageUrl}`;
    }
    document.getElementById(
      'article-image'
    ).style.backgroundImage = `url('${imageUrl}')`;
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
    const formattedSources = formatArticleContent(article.SOURCES);
    sourcesList.innerHTML = formattedSources;
  }

  if (article.VERIFICATION_PDF_URL) {
    const pdfContainer = document.getElementById(
      'verification-pdf-link-container'
    );
    pdfContainer.innerHTML = `<a href="${article.VERIFICATION_PDF_URL}" target="_blank" rel="noopener noreferrer" class="inline-block bg-pr-primary text-white font-bold py-2 px-4 rounded-md hover:bg-opacity-90">Download Verification PDF</a>`;
  }
}

function formatArticleContent(content) {
  if (!content || content === 'Content not available.') {
    return '<p>Content not available.</p>';
  }

  // Simple markdown-style formatting
  let formatted = content;

  // Convert headings
  formatted = formatted.replace(
    /^###\s+(.*$)/gm,
    '<h3 class="text-lg font-semibold text-pr-primary mt-6 mb-3">$1</h3>'
  );
  formatted = formatted.replace(
    /^##\s+(.*$)/gm,
    '<h2 class="text-xl font-bold text-pr-primary mt-8 mb-4 border-b-2 border-pr-nav pb-2">$1</h2>'
  );
  formatted = formatted.replace(
    /^#\s+(.*$)/gm,
    '<h1 class="text-2xl font-bold text-pr-primary mt-8 mb-6">$1</h1>'
  );

  // Convert bold and italic
  formatted = formatted.replace(
    /\*\*(.*)\*\*/g,
    '<strong class="font-bold">$1</strong>'
  );
  formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // Convert section breaks
  formatted = formatted.replace(/^---$/gm, '<hr class="my-8 border-pr-nav">');

  // Split into paragraphs on double line breaks
  const paragraphs = formatted
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Wrap non-heading paragraphs in <p> tags
  const formattedParagraphs = paragraphs.map((paragraph) => {
    // Skip if already formatted as heading or HR
    if (paragraph.startsWith('<h') || paragraph.startsWith('<hr')) {
      return paragraph;
    }

    // Replace single line breaks with <br> within paragraphs
    const withBreaks = paragraph.replace(/\n/g, '<br>');
    return `<p class="mb-4 leading-relaxed text-justify">${withBreaks}</p>`;
  });

  return formattedParagraphs.join('\n');
}
function editArticle() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (slug) {
    // Redirect to create page with edit parameter
    window.location.href = `/create.html?edit=${slug}`;
  }
}
