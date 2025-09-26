document.addEventListener('DOMContentLoaded', () => {
  fetchArticles();
});

function clearSections() {
  const sections = document.querySelectorAll('.news-section');
  sections.forEach(section => {
    const articles = section.querySelectorAll('.news-article');
    articles.forEach(article => article.remove());
  });
}

async function fetchArticles() {
  try {
    const response = await fetch('/api/articles');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const articles = await response.json();
    clearSections();
    renderArticles(articles);
  } catch (error) {
    console.error('Failed to fetch articles:', error);
  }
}

function renderArticles(articles) {
  const articlesByCategory = {};
  articles.forEach((article) => {
    const category = article.CATEGORY.toLowerCase();
    if (!articlesByCategory[category]) {
      articlesByCategory[category] = [];
    }
    articlesByCategory[category].push(article);
  });

  for (const categoryName in articlesByCategory) {
    const sectionDiv = document.getElementById(`${categoryName}-news-section`);
    if (sectionDiv) {
      const categoryArticles = articlesByCategory[categoryName];

      categoryArticles.forEach((article) => {
        const title = article.TITLE;
        const slug = article.SLUG;
        const content = article.CONTENT;
        let imageUrl = 'assets/news logo.png';
        if (article.IMAGE_URL) {
          if (
            article.IMAGE_URL.startsWith('http') ||
            article.IMAGE_URL.startsWith('/')
          ) {
            imageUrl = article.IMAGE_URL;
          } else {
            imageUrl = `assets/${article.IMAGE_URL}`;
          }
        }

        if (!slug || slug === 'undefined' || slug === 'null') {
          console.warn('Skipping article with invalid slug:', { title, slug });
          return;
        }

        const articleDiv = document.createElement('div');
        articleDiv.className = 'news-article';
        articleDiv.innerHTML = `
            <a href="/article-page.html?slug=${slug}">
                <img src="${imageUrl}" alt="${title}" class="w-full h-32 object-cover rounded-md mb-2" onerror="this.src='assets/news logo.png'">
                <h4>${title}</h4>
            </a>
            <p>${ 
              content
                ? String(content).substring(0, 100) + '...'
                : 'No summary.'
            }</p>
        `;
        sectionDiv.appendChild(articleDiv);
      });
    }
  }
}