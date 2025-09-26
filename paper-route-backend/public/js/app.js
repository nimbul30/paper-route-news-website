document.addEventListener('DOMContentLoaded', () => {
  fetchArticles();
});

async function fetchArticles() {
  try {
    const response = await fetch('/api/articles');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // articles is now an array of arrays, e.g., [ [1, 'Title', 'slug', ...], [...] ]
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
  articles.forEach((articleRow) => {
    // The CATEGORY is the 5th column, so it's at index 4
    const category = articleRow[4];
    if (!articlesByCategory[category]) {
      articlesByCategory[category] = [];
    }
    articlesByCategory[category].push(articleRow);
  });

  for (const categoryName in articlesByCategory) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'news-section';

    const titleHtml = `<h3 class="news-section-title">${categoryName.toUpperCase()} NEWS <span class="material-icons text-pr-primary text-base">chevron_right</span></h3>`;
    sectionDiv.innerHTML = titleHtml;

    const categoryArticles = articlesByCategory[categoryName];

    categoryArticles.forEach((articleRow) => {
      // --- THIS IS THE CRITICAL CHANGE ---
      // We access data by its column index, which is guaranteed to be stable.
      // TITLE is at index 1
      // SLUG is at index 2
      // CONTENT is at index 3
      // IMAGE_URL is at index 8
      const title = articleRow[1];
      const slug = articleRow[2];
      const content = articleRow[3];
      const imageUrl = articleRow[8] || 'assets/news logo.png';

      const articleHtml = `
                <div class="news-article">
                    <a href="/article-page.html?slug=${slug}">
                        <img src="${imageUrl}" alt="${title}" class="w-full h-32 object-cover rounded-md mb-2">
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
