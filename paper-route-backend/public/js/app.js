// public/js/app.js

document.addEventListener('DOMContentLoaded', () => {
  fetchArticles();
});

async function fetchArticles() {
  try {
    const response = await fetch('/api/articles');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const articles = await response.json();
    renderArticles(articles);
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    // Optionally, display an error message to the user on the page
  }
}

function renderArticles(articles) {
    const newsGridContainer = document.getElementById('news-grid-container');
    if (!newsGridContainer) return;

    // Clear any existing content
    newsGridContainer.innerHTML = '';

    // First, group articles by category
    const articlesByCategory = {};
    articles.forEach(article => {
        const category = article.CATEGORY;
        if (!articlesByCategory[category]) {
            articlesByCategory[category] = []; // Create a new array for this category if it doesn't exist
        }
        articlesByCategory[category].push(article);
    });

    // Now, create a section for each category that has articles
    for (const categoryName in articlesByCategory) {
        // 1. Create the main container for the section
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'news-section';

        // 2. Create the title for the section
        const titleHtml = `
            <h3 class="news-section-title">${categoryName.toUpperCase()} NEWS <span class="material-icons text-pr-primary text-base">chevron_right</span></h3>
        `;
        sectionDiv.innerHTML = titleHtml;

        // 3. Get the articles for this category
        const categoryArticles = articlesByCategory[categoryName];

        // 4. Create and add the HTML for each article in this section
        categoryArticles.forEach(article => {
            const imageUrl = article.IMAGE_URL || 'assets/news logo.png'; // Default image
            const articleHtml = `
                <div class="news-article">
                    <a href="/article-page.html?slug=${article.SLUG}">
                        <img src="${imageUrl}" alt="${article.TITLE}" class="w-full h-32 object-cover rounded-md mb-2">
                        <h4>${article.TITLE}</h4>
                    </a>
                    <p>${article.CONTENT ? article.CONTENT.substring(0, 100) + '...' : 'No summary.'}</p>
                </div>
            `;
            sectionDiv.innerHTML += articleHtml;
        });

        // 5. Add the completed section to the main grid on the page
        newsGridContainer.appendChild(sectionDiv);
    }
}

  // Clear any static content
  usNewsContainer.innerHTML =
    '<h3>US NEWS <span class="material-icons text-pr-primary text-base">chevron_right</span></h3>';
  worldNewsContainer.innerHTML =
    '<h3>WORLD NEWS <span class="material-icons text-pr-primary text-base">chevron_right</span></h3>';
  politicsNewsContainer.innerHTML =
    '<h3>POLITICS <span class="material-icons text-pr-primary text-base">chevron_right</span></h3>';

  articles.forEach((article) => {
    const articleHtml = `
            <div class="news-article">
                <a href="/article-page.html?slug=${article.SLUG}">
                    <h4>${article.TITLE}</h4>
                </a>
                <p>${
                  article.CONTENT
                    ? article.CONTENT.substring(0, 100) + '...'
                    : 'No summary available.'
                }</p>
            </div>
        `;

    // Append the article to the correct category section
    // Note: Oracle DB often returns column names in uppercase
    switch (article.CATEGORY) {
      case 'US':
        usNewsContainer.innerHTML += articleHtml;
        break;
      case 'World':
        worldNewsContainer.innerHTML += articleHtml;
        break;
      case 'Politics':
        politicsNewsContainer.innerHTML += articleHtml;
        break;
      default:
        // Fallback for other categories if needed
        break;
    }
  });
}
