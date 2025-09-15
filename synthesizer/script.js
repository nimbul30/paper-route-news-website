document.addEventListener('DOMContentLoaded', function () {
  const newsContainer = document.getElementById('synthesized-news-container');
  const factsToggleBtn = document.getElementById('facts-toggle-btn');
  const apiKeySection = document.getElementById('api-key-section');
  const setApiKeyBtn = document.getElementById('set-api-key-btn');
  const clearApiKeyBtn = document.getElementById('clear-api-key-btn');
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');

  let allArticles = [];
  let factsOnlyMode = false;

  const curatedKeywords = [
    'independent journalism',
    'scientific breakthrough',
    'local corruption report',
    'environmental disaster',
    'human rights report',
    'labor union action',
    'protest movement',
    'unsolved mysteries',
    'technological ethics',
  ];

  const factSources = [
    'associated-press',
    'reuters',
    'the-hill',
    'bbc-news',
    'axios',
  ];

  const sourceBiasRatings = {
    'the-washington-post': { bias: 'Left', name: 'WaPo' },
    cnn: { bias: 'Left', name: 'CNN' },
    msnbc: { bias: 'Left', name: 'MSNBC' },
    'nbc-news': { bias: 'Left', name: 'NBC' },
    'cbs-news': { bias: 'Left', name: 'CBS' },
    'abc-news': { bias: 'Left', name: 'ABC' },
    'associated-press': { bias: 'Center', name: 'AP' },
    reuters: { bias: 'Center', name: 'Reuters' },
    'the-hill': { bias: 'Center', name: 'The Hill' },
    'bbc-news': { bias: 'Center', name: 'BBC' },
    axios: { bias: 'Center', name: 'Axios' },
    'fox-news': { bias: 'Right', name: 'Fox News' },
    'the-wall-street-journal': { bias: 'Right', name: 'WSJ' },
    'breitbart-news': { bias: 'Right', name: 'Breitbart' },
    'the-washington-times': { bias: 'Right', name: 'Wash. Times' },
  };

  function getApiKey() {
    return localStorage.getItem('newsApiKey');
  }

  function clearApiKey() {
    localStorage.removeItem('newsApiKey');
    console.log('Stored API Key cleared.');
    apiKeySection.classList.remove('hidden');
    newsContainer.innerHTML = '';
  }

  function promptAndSetApiKey() {
    const apiKey = prompt('Please enter your NewsAPI.org API Key:');
    if (apiKey) {
      localStorage.setItem('newsApiKey', apiKey);
      apiKeySection.classList.add('hidden');
      fetchCuratedNews();
    }
  }

  function renderLoading(message = 'Fetching and analyzing live news...') {
    if (!newsContainer) return;
    newsContainer.innerHTML = `<p class="text-gray-400">${message}</p>`;
  }

  function renderError(
    message = 'Could not retrieve articles. Please check your API key or search term.'
  ) {
    if (!newsContainer) return;
    newsContainer.innerHTML = `<div class="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg"><h3 class="font-bold">Failed to Fetch News</h3><p>${message}</p></div>`;
  }

  function groupArticlesByTopic(articles) {
    const topics = {
      Tech: ['ai', 'apple', 'google', 'microsoft', 'tech', 'crypto'],
      Business: [
        'economy',
        'market',
        'stocks',
        'inflation',
        'business',
        'finance',
      ],
      Health: ['health', 'covid', 'fda', 'medical', 'disease'],
      Politics: ['white house', 'congress', 'senate', 'biden', 'trump'],
    };
    const grouped = {};
    articles.forEach((article) => {
      const title = article.title.toLowerCase();
      let foundTopic = 'General News';
      for (const topic in topics) {
        if (topics[topic].some((keyword) => title.includes(keyword))) {
          foundTopic = topic;
          break;
        }
      }
      if (!grouped[foundTopic]) grouped[foundTopic] = [];
      grouped[foundTopic].push(article);
    });
    return grouped;
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

  function createTopicSection(topic, articles) {
    const section = document.createElement('section');
    section.className = 'topic-group mb-8';
    const topicTitle = document.createElement('h2');
    topicTitle.className =
      'text-2xl font-bold border-b border-[#262626] pb-2 mb-4';
    topicTitle.textContent = topic;
    section.appendChild(topicTitle);
    articles.forEach((article) => {
      section.appendChild(createArticleElement(article));
    });
    return section;
  }
  // ... inside synthesizer/script.js ...

  async function fetchCuratedNews() {
    // The new URL for your scraper running on GCP
    const url = `34.26.64.23`;

    const articles = await fetchApiData(
      url,
      'Fetching news from custom scraper...'
    );

    if (articles) {
      allArticles = articles;
      renderNews(allArticles);
    } // ... rest of the function ...
  }

  function renderNews(articlesToRender) {
    if (!newsContainer) return;
    const groupedArticles = groupArticlesByTopic(articlesToRender);
    newsContainer.innerHTML = '';
    if (Object.keys(groupedArticles).length === 0) {
      newsContainer.innerHTML =
        '<p class="text-gray-400">No articles found for this topic.</p>';
      return;
    }
    const orderedTopics = [
      'Politics',
      'Business',
      'Tech',
      'Health',
      'General News',
    ];
    orderedTopics.forEach((topic) => {
      if (groupedArticles[topic]) {
        const section = createTopicSection(topic, groupedArticles[topic]);
        newsContainer.appendChild(section);
      }
    });
  }

  async function fetchApiData(url, loadingMessage) {
    const apiKey = getApiKey();
    if (!apiKey) {
      apiKeySection.classList.remove('hidden');
      return null;
    }
    renderLoading(loadingMessage);

    // *** DEBUGGING STEP ***
    console.log('Requesting URL:', url);
    // **********************

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

  async function fetchSearchNews(query) {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      query
    )}&sortBy=relevancy&apiKey=${getApiKey()}`;
    const articles = await fetchApiData(
      url,
      `Searching for articles about '${query}'...`
    );
    if (articles) {
      renderNews(articles);
    }
  }

  async function fetchFactNews() {
    const sourcesQuery = factSources.join(',');
    const url = `https://newsapi.org/v2/everything?sources=${sourcesQuery}&apiKey=${getApiKey()}`;
    const articles = await fetchApiData(url, 'Fetching fact-based articles...');
    if (articles) {
      renderNews(articles);
    }
  }

  async function fetchCuratedNews() {
    const randomKeyword =
      curatedKeywords[Math.floor(Math.random() * curatedKeywords.length)];

    // MODIFIED: Temporarily removed the excludeDomains parameter for debugging
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      randomKeyword
    )}&sortBy=publishedAt&apiKey=${getApiKey()}`;

    const articles = await fetchApiData(
      url,
      `Searching for underreported news about "${randomKeyword}"...`
    );

    if (articles) {
      allArticles = articles;
      renderNews(allArticles);
    } else if (articles === null && !getApiKey()) {
      apiKeySection.classList.remove('hidden');
      newsContainer.innerHTML = '';
    } else if (articles && articles.length === 0) {
      renderNews([]);
    }
  }

  function handleSearch(event) {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
      fetchSearchNews(query);
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
      fetchFactNews();
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
  factsToggleBtn.addEventListener('click', toggleFactsMode);
  setApiKeyBtn.addEventListener('click', promptAndSetApiKey);
  clearApiKeyBtn.addEventListener('click', clearApiKey);
  searchForm.addEventListener('submit', handleSearch);

  fetchCuratedNews();
});
