document.addEventListener('DOMContentLoaded', function () {
  const newsContainer = document.getElementById('synthesized-news-container');
  const apiKey = 'YOUR_API_KEY'; // <-- IMPORTANT: Replace with your actual NewsAPI key
  const newsApiUrl = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;

  function renderLoading() {
    newsContainer.innerHTML =
      '<p class="text-gray-400">Fetching live news...</p>';
  }

  function renderError() {
    newsContainer.innerHTML = `
      <div class="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
        <h3 class="font-bold">Failed to Fetch News</h3>
        <p>Could not retrieve live articles. Please ensure your API key is correct or try again later.</p>
      </div>
    `;
  }

  function renderNewsArticles(articles) {
    if (!newsContainer) return;

    // Clear the loading message
    newsContainer.innerHTML = '';

    if (!articles || articles.length === 0) {
      newsContainer.innerHTML =
        '<p class="text-gray-400">No news articles found.</p>';
      return;
    }

    // Generate and append HTML for each news article
    articles.forEach((article) => {
      // For the MVP, we'll use the source name and a default spectrum
      const sourceName = article.source.name || 'Unknown Source';
      const summary = article.description || 'No summary available.';
      const spectrum = 'from-blue-500 via-purple-500 to-red-500'; // Placeholder spectrum

      const articleElement = document.createElement('article');
      articleElement.className =
        'bg-[#1a1a1a] p-6 rounded-2xl border border-[#262626] hover:border-[var(--primary-color)] transition-colors duration-300';

      articleElement.innerHTML = `
        <a href="${article.url}" target="_blank" rel="noopener noreferrer">
          <h3 class="text-white text-xl font-bold leading-tight hover:text-[var(--primary-color)] transition-colors">
            ${article.title}
          </h3>
        </a>
        <div class="text-sm text-gray-400 mt-2 mb-4">
          Source: ${sourceName}
        </div>
        <p class="text-gray-300 text-sm font-normal leading-normal">
          ${summary}
        </p>
        <div class="mt-4">
          <h4 class="text-base font-semibold text-gray-300">Perspective Spectrum:</h4>
          <div class="w-full h-2 mt-2 bg-gradient-to-r ${spectrum} rounded-full"></div>
        </div>
      `;
      newsContainer.appendChild(articleElement);
    });
  }

  async function fetchLiveNews() {
    renderLoading();
    try {
      if (apiKey === '5b10bec072524f16bbc3968078feb9e9') {
        console.error('API Key for NewsAPI is not set.');
        renderError();
        return;
      }
      const response = await fetch(newsApiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      renderNewsArticles(data.articles);
    } catch (error) {
      console.error('Error fetching live news:', error);
      renderError();
    }
  }

  // Fetch the news when the page loads
  fetchLiveNews();
});
