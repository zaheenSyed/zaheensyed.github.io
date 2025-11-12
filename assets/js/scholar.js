(function () {
  const SCHOLAR_USER = 'IELgvgEAAAAJ';
  const FEED_SELECTOR = '#scholar-feed';
  const FEED_LIMIT = 5;
  
  // Multiple proxy targets for fallback reliability
  const PROXY_ENDPOINTS = [
    `https://r.jina.ai/https://scholar.google.com/citations?user=${SCHOLAR_USER}&hl=en&view_op=list_works&sortby=pubdate`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://scholar.google.com/citations?user=${SCHOLAR_USER}&hl=en&view_op=list_works&sortby=pubdate`)}`,
    `https://scholar.google.com/citations?user=${SCHOLAR_USER}&hl=en&view_op=list_works&sortby=pubdate&cstart=0&pagesize=${FEED_LIMIT}`
  ];

  const normaliseText = (text) => (text || '').replace(/\s+/g, ' ').trim();

  // Parse CSV format response (if available)
  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const publications = [];
    
    for (let i = 1; i < Math.min(lines.length, FEED_LIMIT + 1); i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const pub = {};
      headers.forEach((header, idx) => {
        pub[header.toLowerCase()] = values[idx] || '';
      });
      if (pub.title) {
        publications.push(pub);
      }
    }
    
    return publications.length > 0 ? publications : null;
  };

  const buildFeedItem = (row) => {
    const li = document.createElement('li');
    li.className = 'scholar-feed-item';

    const titleEl = row.querySelector('.gsc_a_at');
    const title = normaliseText(titleEl && titleEl.textContent);
    const link = titleEl ? `https://scholar.google.com${titleEl.getAttribute('href')}` : '';

    const metaEls = row.querySelectorAll('.gs_gray');
    const authors = normaliseText(metaEls[0] && metaEls[0].textContent);
    const venue = normaliseText(metaEls[1] && metaEls[1].textContent);
    const year = normaliseText(row.querySelector('.gsc_a_h.gsc_a_hc.gs_ibl') && row.querySelector('.gsc_a_h.gsc_a_hc.gs_ibl').textContent);

    if (title) {
      const header = document.createElement('div');
      header.className = 'publication-header';

      const strong = document.createElement('strong');
      strong.textContent = title;
      header.appendChild(strong);

      if (venue || year) {
        const span = document.createElement('span');
        span.textContent = [venue, year].filter(Boolean).join(' · ');
        header.appendChild(span);
      }

      if (link) {
        const anchor = document.createElement('a');
        anchor.href = link;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        anchor.textContent = 'Link';
        header.appendChild(anchor);
      }

      li.appendChild(header);
    }

    if (authors) {
      const meta = document.createElement('p');
      meta.className = 'publication-authors';
      meta.textContent = authors;
      li.appendChild(meta);
    }

    return li;
  };

  // Build feed item from CSV data
  const buildFeedItemFromCSV = (pubData) => {
    const li = document.createElement('li');
    li.className = 'scholar-feed-item';

    const title = normaliseText(pubData.title || pubData.Title);
    const authors = normaliseText(pubData.authors || pubData.Authors);
    const venue = normaliseText(pubData.venue || pubData.Venue || pubData.publication);
    const year = normaliseText(pubData.year || pubData.Year);
    const link = pubData.url || pubData.URL || '';

    if (title) {
      const header = document.createElement('div');
      header.className = 'publication-header';

      const strong = document.createElement('strong');
      strong.textContent = title;
      header.appendChild(strong);

      if (venue || year) {
        const span = document.createElement('span');
        span.textContent = [venue, year].filter(Boolean).join(' · ');
        header.appendChild(span);
      }

      if (link) {
        const anchor = document.createElement('a');
        anchor.href = link;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        anchor.textContent = 'Link';
        header.appendChild(anchor);
      }

      li.appendChild(header);
    }

    if (authors) {
      const meta = document.createElement('p');
      meta.className = 'publication-authors';
      meta.textContent = authors;
      li.appendChild(meta);
    }

    return li;
  };

  const populateScholarFeed = async () => {
    const feed = document.querySelector(FEED_SELECTOR);
    if (!feed) return;

    let lastError = null;

    // Try each proxy endpoint in sequence
    for (const endpoint of PROXY_ENDPOINTS) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        // Try parsing as CSV first
        if (contentType.includes('csv') || contentType.includes('text/plain')) {
          const publications = parseCSV(text);
          if (publications) {
            feed.innerHTML = '';
            publications.forEach((pub) => {
              const item = buildFeedItemFromCSV(pub);
              if (item) {
                feed.appendChild(item);
              }
            });
            return; // Success
          }
        }

        // Fallback to HTML parsing
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const rows = Array.from(doc.querySelectorAll('#gsc_a_b .gsc_a_tr'));

        if (rows.length > 0) {
          feed.innerHTML = '';
          rows.slice(0, FEED_LIMIT).forEach((row) => {
            const item = buildFeedItem(row);
            if (item) {
              feed.appendChild(item);
            }
          });
          return; // Success
        }

        throw new Error('No publications found in response');
      } catch (error) {
        lastError = error;
        console.warn(`Failed to fetch from ${endpoint}:`, error.message);
        // Continue to next proxy
      }
    }

    // All proxies failed
    console.error('Failed to refresh Google Scholar feed from all sources', lastError);
    feed.innerHTML = '<li class="scholar-feed-error">Unable to load publications right now. Please visit Google Scholar directly.</li>';
  };

  document.addEventListener('DOMContentLoaded', populateScholarFeed);
})();
