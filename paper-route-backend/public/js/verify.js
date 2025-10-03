document.addEventListener('DOMContentLoaded', () => {
  const verifyButton = document.getElementById('verify-button');
  const articleInput = document.getElementById('article-input');
  const sourcesInput = document.getElementById('sources-input');
  const loader = document.getElementById('loader');
  const statusText = document.getElementById('status-text');
  const reportOutput = document.getElementById('report-output');
  const reportContent = document.getElementById('report-content');

  // Load article data from localStorage
  const articleText = localStorage.getItem('articleForVerification_content');
  const articleSources = localStorage.getItem('articleForVerification_sources');

  if (articleText) {
    articleInput.value = articleText;
  }
  if (articleSources) {
    sourcesInput.value = articleSources;
  }

  verifyButton.addEventListener('click', async () => {
    const articleText = articleInput.value.trim();
    const sourceUrls = sourcesInput.value.trim().split('\n').filter(url => url);

    if (!articleText || sourceUrls.length === 0) {
      alert('Please provide both an article and at least one source URL.');
      return;
    }

    // Reset UI
    reportOutput.classList.add('hidden');
    loader.classList.remove('hidden');
    statusText.textContent = 'Verification in progress...';
    verifyButton.disabled = true;
    verifyButton.classList.add('opacity-50', 'cursor-not-allowed');

    try {
      const response = await fetch('/api/verify-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articleText, sourceUrls }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Verification failed.');
      }

      const report = await response.json();

      // Render and Display report
      renderHtmlReport(report);
      reportOutput.classList.remove('hidden');
      statusText.textContent = 'Verification Complete!';
    } catch (error) {
      statusText.textContent = `Error: ${error.message}`;
    } finally {
      loader.classList.add('hidden');
      verifyButton.disabled = false;
      verifyButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  });

  function renderHtmlReport(report) {
    reportContent.innerHTML = ''; // Clear previous report

    // A simplified renderer, you can expand this based on the report structure
    for (const [phase, data] of Object.entries(report)) {
        let phaseHtml = `<div class="report-section">
                         <h3 class="text-xl font-semibold mb-3 text-pr-primary">${phase}</h3>`;
        phaseHtml += `<pre class="whitespace-pre-wrap text-sm">${JSON.stringify(data, null, 2)}</pre>`;
        phaseHtml += `</div>`;
        reportContent.innerHTML += phaseHtml;
    }
  }
});
