document.addEventListener('DOMContentLoaded', function () {
  const newsContainer = document.getElementById('synthesized-news-container');
  const factsToggleBtn = document.getElementById('facts-toggle-btn');
  const apiKeySection = document.getElementById('api-key-section');
  const setApiKeyBtn = document.getElementById('set-api-key-btn');

  let allArticles = [];
  let factsOnlyMode = false;

  const curatedKeywords = [
    'independent journalism',
    'scientific breakthrough',
    'local corruption',
    'environmental disaster',
    'human rights report',
    'labor union',
    'protest movement',
    'technological ethics',
  ];

  const excludedDomains = [
    'cnn.com',
    'foxnews.com',
    'msnbc.com',
    'nytimes.com',
    'washingtonpost.com',
    'theguardian.com',
    'wsj.com',
    'usatoday.com',
    'politico.com',
    'huffpost.com',
    'buzzfeed.com',
    'dailymail.co.uk',
  ];

  const factSources = [
    'associated-press',
    'reuters',
    'the-hill',
    'bbc-news',
    'axios',
  ];

  const sourceBiasRatings = {
    'associated-press': { bias: 'Center', name: 'AP' },
    reuters: { bias: 'Center', name: 'Reuters' },
    'the-hill': { bias: 'Center', name: 'The Hill' },
    'bbc-news': { bias: 'Center', name: 'BBC' },
    axios: { bias: 'Center', name: 'Axios' },
  };

  function getApiKey() {
    return localStorage.getItem('newsApiKey');
  }

  function promptAndSetApiKey() {
    const apiKey = prompt('Please enter your NewsAPI.org API Key:');
    if (apiKey) {
      localStorage.setItem('newsApiKey', apiKey);
      apiKeySection.classList.add('hidden');
      initializeFeed();
    }
  }

  function renderLoading(message = 'Searching for underreported news...') {
    if (!newsContainer) return;
    newsContainer.innerHTML = `<p class="text-gray-400">${message}</p>`;
  }

  function renderError(message = 'Could not retrieve articles.') {
    if (!newsContainer) return;
    newsContainer.innerHTML = `<div class="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg"><h3 class="font-bold">Failed to Fetch News</h3><p>${message}</p></div>`;
  }

  function getBiasDisplayForSource(sourceId) {
    const rating = sourceBiasRatings[sourceId];
    if (!rating) {
      return `<div class="w-24 h-4 mt-2 bg-gray-700 rounded-full flex items-center justify-center text-xs text-gray-400 mx-auto">Bias Unknown</div>`;
    }

    let pos = '50%',
      color = 'bg-purple-400',
      label = 'Center';
    if (rating.bias === 'Left') {
      pos = '10%';
      color = 'bg-blue-400';
      label = 'Left';
    } else if (rating.bias === 'Right') {
      pos = '90%';
      color = 'bg-red-400';
      label = 'Right';
    }

    return `<div class="relative w-24 h-4 mt-2 bg-gradient-to-r from-blue-700 via-purple-700 to-red-700 rounded-full mx-auto"><div class="absolute -top-0.5 transform -translate-x-1/2 w-4 h-4 rounded-full ${color} border-2 border-white flex items-center justify-center text-[8px] font-bold text-white" style="left: ${pos};">${label.substring(0, 1)}</div><div class="absolute bottom-full mb-1 text-xs text-gray-400" style="left: ${pos}; transform: translateX(-50%); white-space: nowrap;">${label}</div></div>`;
  }

  function createArticleElement(article) {
    const sourceName = article.source.name || 'Unknown Source';
    const summary = article.description || 'No summary available.';
    const articleElement = document.createElement('article');
    articleElement.className =
      'bg-[#1a1a1a] p-4 rounded-lg border border-[#262626] mb-4';
    const biasDisplay = getBiasDisplayForSource(article.source.id);
    articleElement.innerHTML = `<a href="${article.url}" target="_blank" rel="noopener noreferrer"><h3 class="text-white text-lg font-bold leading-tight hover:text-[var(--primary-color)] transition-colors">${article.title}</h3></a><div class="text-xs text-gray-400 mt-2">Source: ${sourceName}</div><p class="text-gray-400 text-sm font-normal leading-normal mt-2">${summary}</p><div class="mt-4">${biasDisplay}</div>`;
    return articleElement;
  }

  function renderNews(articlesToRender) {
    if (!newsContainer) return;
    newsContainer.innerHTML = '';
    if (!articlesToRender || articlesToRender.length === 0) {
      newsContainer.innerHTML =
        '<p class="text-gray-400">No articles found matching the criteria.</p>';
      return;
    }
    articlesToRender.forEach((article) => {
      newsContainer.appendChild(createArticleElement(article));
    });
  }

  async function fetchCuratedNews() {
    const apiKey = getApiKey();
    if (!apiKey) {
      apiKeySection.classList.remove('hidden');
      return null;
    }

    const randomKeyword =
      curatedKeywords[Math.floor(Math.random() * curatedKeywords.length)];
    const domainsToExclude = excludedDomains.join(',');
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      randomKeyword
    )}&excludeDomains=${domainsToExclude}&sortBy=publishedAt&apiKey=${apiKey}`;

    renderLoading(`Searching for news about "${randomKeyword}"...`);
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log('Raw API Response:', data);
      return data.articles;
    } catch (error) {
      console.error('API Error:', error);
      renderError(error.message);
      return null;
    }
  }

  async function initializeFeed() {
    const articles = await fetchCuratedNews();
    if (articles) {
      allArticles = articles;
      renderNews(allArticles);
    }
  }

  function toggleFactsMode() {
    factsOnlyMode = !factsOnlyMode;
    factsToggleBtn.setAttribute('aria-checked', factsOnlyMode);
    const span = factsToggleBtn.querySelector('span');
    if (factsOnlyMode) {
      factsToggleBtn.classList.replace(
        'bg-gray-600',
        'bg-[var(--primary-color)]'
      );
      span.classList.add('translate-x-5');
      const filteredArticles = allArticles.filter((a) =>
        factSources.includes(a.source.id)
      );
      renderNews(filteredArticles);
    } else {
      factsToggleBtn.classList.replace(
        'bg-[var(--primary-color)]',
        'bg-gray-600'
      );
      span.classList.remove('translate-x-5');
      renderNews(allArticles);
    }
  }

  // Initial setup
  setApiKeyBtn.addEventListener('click', promptAndSetApiKey);
  factsToggleBtn.addEventListener('click', toggleFactsMode);
  initializeFeed();
});
