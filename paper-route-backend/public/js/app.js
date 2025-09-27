let allArticles = [];

document.addEventListener('DOMContentLoaded', () => {
  console.log('app.js DOMContentLoaded');
  
  const params = new URLSearchParams(window.location.search);
  const tagQuery = params.get('tag');

  fetchArticles(tagQuery);

  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const searchInput = document.getElementById('search-input');
      const query = searchInput.value.toLowerCase();
      filterArticlesByTag(query);
    });
  }
});

async function fetchArticles(tagQuery = null) {
  try {
    const response = await fetch('/api/articles');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    allArticles = await response.json();

    if (tagQuery) {
      filterArticlesByTag(tagQuery);
    } else {
      renderArticles(allArticles);
    }
  } catch (error) {
    console.error('Failed to fetch articles:', error);
  }
}

function filterArticlesByTag(tag) {
    const normalizedTag = tag.toLowerCase().trim();
    const filtered = allArticles.filter(article => {
        if (article.TAGS) {
            const articleTags = article.TAGS.toLowerCase().split(',').map(t => t.trim());
            return articleTags.includes(normalizedTag);
        }
        return false;
    });
    renderArticles(filtered);
}


function getImageUrl(article) {
  let imageUrl = 'https://via.placeholder.com/400x225';
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
  return imageUrl;
}

function renderArticles(articles) {
  console.log(`Rendering ${articles.length} articles.`);
  const featuredArticlesContainer = document.getElementById('featured-articles');
  const articleListContainer = document.getElementById('article-list');

  if (!featuredArticlesContainer || !articleListContainer) {
    console.error('Required containers not found in the DOM.');
    return;
  }

  featuredArticlesContainer.innerHTML = '';
  articleListContainer.innerHTML = '';

  const featuredArticles = [];
  const regularArticles = [];
  const unsortedArticles = [];

  articles.forEach(article => {
    const spot = article.SPOT_NUMBER;
    if (spot >= 1 && spot <= 4) {
      featuredArticles.push(article);
    } else if (spot >= 5 && spot <= 24) {
      regularArticles.push(article);
    } else {
      unsortedArticles.push(article);
    }
  });

  featuredArticles.sort((a, b) => a.SPOT_NUMBER - b.SPOT_NUMBER);
  regularArticles.sort((a, b) => a.SPOT_NUMBER - b.SPOT_NUMBER);

  const allRegularArticles = regularArticles.concat(unsortedArticles);

  featuredArticles.forEach(article => {
    featuredArticlesContainer.appendChild(renderFeaturedArticle(article));
  });

  allRegularArticles.forEach(article => {
    articleListContainer.appendChild(renderArticleItem(article));
  });
}

function renderFeaturedArticle(article) {
  const { TITLE, SLUG, CONTENT, TAGS } = article;
  const imageUrl = getImageUrl(article);

  const articleElement = document.createElement('div');
  articleElement.className = 'featured-article relative'; 

  if (!SLUG || SLUG === 'undefined' || SLUG === 'null') {
    console.warn('Skipping article with invalid slug:', { TITLE, SLUG });
    return articleElement;
  }

  let tagsHtml = '';
  if (TAGS) {
    const tagsArray = TAGS.split(',').map(tag => tag.trim()).slice(0, 3);
    tagsHtml = `
      <div class="tags-container">
        ${tagsArray.map(tag => `<a href="home.html?tag=${encodeURIComponent(tag)}" class="tag-badge">${tag}</a>`).join('')}
      </div>
    `;
  }

  articleElement.innerHTML = `
    <a href="/article-page.html?slug=${SLUG}">
      <img src="${imageUrl}" alt="${TITLE}" onerror="this.src='https://via.placeholder.com/400x225'">
      ${tagsHtml} 
      <div class="featured-article-content">
        <h3 class="featured-article-title">${TITLE}</h3>
        <p class="featured-article-summary">${CONTENT ? String(CONTENT).substring(0, 80) + '...' : ''}</p>
      </div>
    </a>
  `;
  return articleElement;
}

function renderArticleItem(article) {
  const { TITLE, SLUG, CONTENT, TAGS } = article;
  const imageUrl = getImageUrl(article);

  const articleElement = document.createElement('div');
  articleElement.className = 'article-item relative';

  if (!SLUG || SLUG === 'undefined' || SLUG === 'null') {
    console.warn('Skipping article with invalid slug:', { TITLE, SLUG });
    return articleElement;
  }

  let tagsHtml = '';
  if (TAGS) {
    const tagsArray = TAGS.split(',').map(tag => tag.trim()).slice(0, 3);
    tagsHtml = `
      <div class="tags-container">
        ${tagsArray.map(tag => `<a href="home.html?tag=${encodeURIComponent(tag)}" class="tag-badge">${tag}</a>`).join('')}
      </div>
    `;
  }

  articleElement.innerHTML = `
    <a href="/article-page.html?slug=${SLUG}">
      <img src="${imageUrl}" alt="${TITLE}" onerror="this.src='https://via.placeholder.com/250x150'">
      ${tagsHtml}
      <div class="article-item-content">
        <h4 class="article-item-title">${TITLE}</h4>
        <p class="article-item-summary">${CONTENT ? String(CONTENT).substring(0, 100) + '...' : ''}</p>
      </div>
    </a>
  `;
  return articleElement;
}
