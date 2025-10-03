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
  // Hide all layouts by default
  document.getElementById('layout-default').classList.add('hidden');
  document.getElementById('layout-two-column').classList.add('hidden');
  document.getElementById('layout-full-width-image').classList.add('hidden');

  switch (article.LAYOUT) {
    case 'two-column':
      renderLayoutTwoColumn(article);
      break;
    case 'full-width-image':
      renderLayoutFullWidthImage(article);
      break;
    default:
      renderLayoutDefault(article);
      break;
  }
}

function renderLayoutDefault(article) {
  document.getElementById('layout-default').classList.remove('hidden');

  const button = document.querySelector('#layout-default .transparency-btn-trigger');
  if (button) {
    button.dataset.slug = article.SLUG;
  }

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

    const imageButton = document.querySelector('#layout-default .image-modal-trigger');
    if (imageButton) {
        imageButton.dataset.imageUrl = imageUrl;
    }
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

function renderLayoutTwoColumn(article) {
  document.getElementById('layout-two-column').classList.remove('hidden');
  const twoColumnLayout = `
    <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
      <div class="md:col-span-1">
        <div class="bg-card-bg rounded-lg shadow-custom overflow-hidden">
          <div class="p-8">
            <div
              id="article-image-two-column"
              class="bg-center bg-no-repeat aspect-square bg-cover rounded-lg mb-6"
              style="background-image: url('assets/news logo.png')"
            ></div>
            <div id="youtube-embed-container-two-column" class="mb-6"></div>
            <div class="flex items-center gap-6 text-pr-secondary text-sm mb-6 border-b border-pr-nav pb-6">
              <div class="flex items-center gap-3">
                <span id="author-name-two-column" class="font-semibold text-pr-primary">Loading...</span>
              </div>
            </div>
            <div id="verification-pdf-link-container-two-column" class="mb-4"></div>
          </div>
        </div>
      </div>
      <div class="md:col-span-2">
        <div class="bg-card-bg rounded-lg shadow-custom overflow-hidden p-8 relative">
          <div class="absolute top-4 right-4 z-10 flex gap-2">
            <button data-image-url="" class="image-modal-trigger bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">View Image</button>
            <button data-slug="${article.SLUG}" class="transparency-btn-trigger transparency-button">Transparency Report</button>
          </div>
          <h1 id="article-title-two-column" class="text-pr-primary font-display text-4xl font-bold mb-4">Loading Article...</h1>
          <div id="article-body-two-column" class="prose prose-lg max-w-none text-pr-primary mt-6 leading-relaxed">
            <p>Please wait while the content is being loaded.</p>
          </div>
          <div id="article-sources-two-column" class="border-t border-pr-nav mt-8 pt-6">
            <h3 class="text-xl font-display font-bold text-pr-primary mb-4">Sources</h3>
            <div id="sources-list-two-column" class="text-black space-y-2"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('layout-two-column').innerHTML = twoColumnLayout;

  document.getElementById('article-title-two-column').textContent = article.TITLE;
  const content = article.CONTENT || 'Content not available.';
  const formattedContent = formatArticleContent(content);
  document.getElementById('article-body-two-column').innerHTML = formattedContent;
  document.getElementById('author-name-two-column').textContent = article.AUTHOR_ID || 'The Paper Route News';
  document.title = `${article.TITLE} - The Paper Route News`;

  if (article.IMAGE_URL) {
    let imageUrl = article.IMAGE_URL;
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      imageUrl = `assets/${imageUrl}`;
    }
    document.getElementById('article-image-two-column').style.backgroundImage = `url('${imageUrl}')`;
    const imageButton = document.querySelector('#layout-two-column .image-modal-trigger');
    if (imageButton) {
        imageButton.dataset.imageUrl = imageUrl;
    }
  }

  if (article.YOUTUBE_EMBED_URL) {
    const videoContainer = document.getElementById('youtube-embed-container-two-column');
    videoContainer.innerHTML = `
      <div class="aspect-w-16 aspect-h-9">
        <iframe src="${article.YOUTUBE_EMBED_URL}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full rounded-lg shadow-custom"></iframe>
      </div>
    `;
  }

  if (article.SOURCES) {
    const sourcesList = document.getElementById('sources-list-two-column');
    const formattedSources = formatArticleContent(article.SOURCES);
    sourcesList.innerHTML = formattedSources;
  }

  if (article.VERIFICATION_PDF_URL) {
    const pdfContainer = document.getElementById('verification-pdf-link-container-two-column');
    pdfContainer.innerHTML = `<a href="${article.VERIFICATION_PDF_URL}" target="_blank" rel="noopener noreferrer" class="inline-block bg-pr-primary text-white font-bold py-2 px-4 rounded-md hover:bg-opacity-90">Download Verification PDF</a>`;
  }
}

function renderLayoutFullWidthImage(article) {
  document.getElementById('layout-full-width-image').classList.remove('hidden');
  const fullWidthImageLayout = `
    <div>
      <div
        id="article-image-full-width"
        class="bg-center bg-no-repeat h-96 bg-cover mb-6"
        style="background-image: url('assets/news logo.png')"
      ></div>
      <div class="max-w-4xl mx-auto bg-card-bg rounded-lg shadow-custom overflow-hidden p-8 relative">
        <div class="absolute top-4 right-4 z-10 flex gap-2">
          <button data-image-url="" class="image-modal-trigger bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">View Image</button>
          <button data-slug="${article.SLUG}" class="transparency-btn-trigger transparency-button">Transparency Report</button>
        </div>
        <h1 id="article-title-full-width" class="text-pr-primary font-display text-4xl font-bold mb-4">Loading Article...</h1>
        <div class="flex items-center gap-6 text-pr-secondary text-sm mb-6 border-b border-pr-nav pb-6">
          <div class="flex items-center gap-3">
            <span id="author-name-full-width" class="font-semibold text-pr-primary">Loading...</span>
          </div>
        </div>
        <div id="article-body-full-width" class="prose prose-lg max-w-none text-pr-primary mt-6 leading-relaxed">
          <p>Please wait while the content is being loaded.</p>
        </div>
        <div id="article-sources-full-width" class="border-t border-pr-nav mt-8 pt-6">
          <h3 class="text-xl font-display font-bold text-pr-primary mb-4">Sources</h3>
          <div id="sources-list-full-width" class="text-black space-y-2"></div>
        </div>
        <div class="bg-pr-nav px-8 py-6 mt-8">
          <h3 class="text-xl font-display font-bold text-pr-primary mb-4">Article Verification</h3>
          <div id="verification-pdf-link-container-full-width" class="mb-4"></div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('layout-full-width-image').innerHTML = fullWidthImageLayout;

  document.getElementById('article-title-full-width').textContent = article.TITLE;
  const content = article.CONTENT || 'Content not available.';
  const formattedContent = formatArticleContent(content);
  document.getElementById('article-body-full-width').innerHTML = formattedContent;
  document.getElementById('author-name-full-width').textContent = article.AUTHOR_ID || 'The Paper Route News';
  document.title = `${article.TITLE} - The Paper Route News`;

  if (article.WIDESCREEN_IMAGE_URL) {
    let imageUrl = article.WIDESCREEN_IMAGE_URL;
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      imageUrl = `assets/${imageUrl}`;
    }
    document.getElementById('article-image-full-width').style.backgroundImage = `url('${imageUrl}')`;
    const imageButton = document.querySelector('#layout-full-width-image .image-modal-trigger');
    if (imageButton) {
        imageButton.dataset.imageUrl = imageUrl;
    }
  } else if (article.IMAGE_URL) {
    let imageUrl = article.IMAGE_URL;
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      imageUrl = `assets/${imageUrl}`;
    }
    document.getElementById('article-image-full-width').style.backgroundImage = `url('${imageUrl}')`;
    const imageButton = document.querySelector('#layout-full-width-image .image-modal-trigger');
    if (imageButton) {
        imageButton.dataset.imageUrl = imageUrl;
    }
  }

  if (article.SOURCES) {
    const sourcesList = document.getElementById('sources-list-full-width');
    const formattedSources = formatArticleContent(article.SOURCES);
    sourcesList.innerHTML = formattedSources;
  }

  if (article.VERIFICATION_PDF_URL) {
    const pdfContainer = document.getElementById('verification-pdf-link-container-full-width');
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