let allArticles = [];

document.addEventListener('DOMContentLoaded', () => {
  console.log('app.js DOMContentLoaded');
  fetchArticles();

  const searchBtn = document.getElementById('search-btn');
  searchBtn.addEventListener('click', () => {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.toLowerCase();
    const filteredArticles = allArticles.filter(article => {
      if (article.TAGS) {
        const tags = article.TAGS.toLowerCase().split(',');
        return tags.includes(query);
      }
      return false;
    });
    renderArticles(filteredArticles);
  });
});

async function fetchArticles() {
  try {
    const response = await fetch('/api/articles');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    allArticles = await response.json();
    renderArticles(allArticles);
  } catch (error) {
    console.error('Failed to fetch articles:', error);
  }
}

function renderArticles(articles) {
  console.log(`Rendering ${articles.length} articles.`);
  const allSpots = document.querySelectorAll('.spot');
  allSpots.forEach(spot => {
    const spotNumber = spot.dataset.spotNumber;
    spot.innerHTML = `<span class="spot-number">${spotNumber}</span>`;
    spot.querySelector('.spot-number').style.display = 'block';
  });

  articles.forEach((article) => {
    try {
      const spotNumber = parseInt(article.SPOT_NUMBER, 10);
      if (spotNumber) {
        const spotDiv = document.querySelector(`[data-spot-number="${spotNumber}"]`);
        if (spotDiv) {
          const spotNumberSpan = spotDiv.querySelector('.spot-number');
          if(spotNumberSpan) {
              spotNumberSpan.style.display = 'none';
          }

          switch (spotNumber) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 21:
            case 22:
            case 23:
            case 24:
              renderSpotType3(spotDiv, article);
              break;
            case 5:
            case 6:
            case 7:
              renderSpotType3(spotDiv, article);
              break;
            default:
              renderSpotType4(spotDiv, article);
              break;
          }
        }
      }
    } catch (error) {
      console.error('Error rendering article:', article, error);
    }
  });
}

function getImageUrl(article) {
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
  return imageUrl;
}

function renderSpotType1(spotDiv, article) {
  const { TITLE, SLUG, CONTENT } = article;
  const imageUrl = getImageUrl(article);

  if (!SLUG || SLUG === 'undefined' || SLUG === 'null') {
    console.warn('Skipping article with invalid slug:', { TITLE, SLUG });
    return;
  }

  const items = CONTENT ? CONTENT.split('\n').map(item => `<li>${item}</li>`).join('') : '';

  spotDiv.innerHTML = `
    <a href="/article-page.html?slug=${SLUG}">
      <h3 class="font-bold text-lg mb-4 text-pr-primary">${TITLE}</h3>
      <ul class="list-disc list-inside space-y-2 text-sm text-pr-secondary">
        ${items}
      </ul>
    </a>
  `;
}

function renderSpotType2(spotDiv, article) {
  const { TITLE, SLUG, CONTENT } = article;
  const imageUrl = getImageUrl(article);

  if (!SLUG || SLUG === 'undefined' || SLUG === 'null') {
    console.warn('Skipping article with invalid slug:', { TITLE, SLUG });
    return;
  }

  spotDiv.innerHTML = `
    <a href="/article-page.html?slug=${SLUG}">
      <img src="${imageUrl}" alt="${TITLE}" class="w-full h-auto object-cover mb-4 rounded-md" onerror="this.src='assets/news logo.png'">
      <h3 class="font-bold text-xl mb-2 text-pr-primary">${TITLE}</h3>
      <p class="text-sm text-pr-secondary mb-4">${CONTENT ? String(CONTENT).substring(0, 150) + '...' : ''}</p>
    </a>
  `;
}

function renderSpotType3(spotDiv, article) {
  const { TITLE, SLUG } = article;
  const imageUrl = getImageUrl(article);

  if (!SLUG || SLUG === 'undefined' || SLUG === 'null') {
    console.warn('Skipping article with invalid slug:', { TITLE, SLUG });
    return;
  }

  spotDiv.innerHTML = `
    <a href="/article-page.html?slug=${SLUG}" class="flex items-start">
      <img src="${imageUrl}" alt="${TITLE}" class="w-16 h-16 object-cover rounded-md mr-3">
      <div>
        <h4 class="font-semibold text-pr-primary text-sm">${TITLE}</h4>
      </div>
    </a>
  `;
}

function renderSpotType4(spotDiv, article) {
  const { TITLE, SLUG, CONTENT } = article;
  const imageUrl = getImageUrl(article);

  if (!SLUG || SLUG === 'undefined' || SLUG === 'null') {
    console.warn('Skipping article with invalid slug:', { TITLE, SLUG });
    return;
  }

  spotDiv.innerHTML = `
    <a href="/article-page.html?slug=${SLUG}">
        <img src="${imageUrl}" alt="${TITLE}" class="w-full h-32 object-cover rounded-md mb-2" onerror="this.src='assets/news logo.png'">
        <h4>${TITLE}</h4>
    </a>
    <p>${ 
      CONTENT
        ? String(CONTENT).substring(0, 100) + '...'
        : 'No summary.'
    }</p>
  `;
}
