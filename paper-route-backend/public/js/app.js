document.addEventListener('DOMContentLoaded', () => {
  fetchArticles();
});

async function fetchArticles() {
  try {
    const response = await fetch('/api/articles');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // articles is now an array of clean objects, e.g., [{ id: 1, title: '...', slug: '...' }]
    const articles = await response.json();
    renderArticles(articles);
  } catch (error) {
    console.error('Failed to fetch articles:', error);
  }
}

function renderArticles(articles) {
  const newsGridContainer = document.getElementById('news-grid-container');
  if (!newsGridContainer) return;

  newsGridContainer.innerHTML = '';

  const articlesByCategory = {};
  articles.forEach((article) => {
    // --- THIS IS THE FIX ---
    // We now access properties by their names (e.g., article.CATEGORY), not by index.
    const category = article.CATEGORY;
    if (!articlesByCategory[category]) {
      articlesByCategory[category] = [];
    }
    articlesByCategory[category].push(article);
  });

  for (const categoryName in articlesByCategory) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'news-section';

    const titleHtml = `<h3 class="news-section-title">${categoryName.toUpperCase()} NEWS <span class="material-icons text-pr-primary text-base">chevron_right</span></h3>`;
    sectionDiv.innerHTML = titleHtml;

    const categoryArticles = articlesByCategory[categoryName];

    categoryArticles.forEach((article) => {
      // --- THIS IS THE FIX ---
      // We now use the clean property names from the sanitized object.
      const title = article.TITLE;
      const slug = article.SLUG;
      const content = article.CONTENT;
      // Handle image URL - add proper path prefix and fallback
      let imageUrl = 'assets/news logo.png'; // Default fallback
      if (article.IMAGE_URL) {
        // If IMAGE_URL exists, check if it already has a path prefix
        if (
          article.IMAGE_URL.startsWith('http') ||
          article.IMAGE_URL.startsWith('/')
        ) {
          imageUrl = article.IMAGE_URL;
        } else {
          // Add assets/ prefix for local files
          imageUrl = `assets/${article.IMAGE_URL}`;
        }
      }

      // Skip articles without valid slugs
      if (!slug || slug === 'undefined' || slug === 'null') {
        console.warn('Skipping article with invalid slug:', { title, slug });
        return;
      }

      const articleHtml = `
                <div class="news-article">
                    <a href="/article-page.html?slug=${slug}">
                        <img src="${imageUrl}" alt="${title}" class="w-full h-32 object-cover rounded-md mb-2" onerror="this.src='assets/news logo.png'">
                        <h4>${title}</h4>
                    </a>
                    <p>${
                      content
                        ? String(content).substring(0, 100) + '...'
                        : 'No summary.'
                    }</p>
                </div>
            `;
      sectionDiv.innerHTML += articleHtml;
    });
    newsGridContainer.appendChild(sectionDiv);
  }
}
