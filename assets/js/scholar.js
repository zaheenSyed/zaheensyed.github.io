(function () {
  const SCHOLAR_USER = 'IELgvgEAAAAJ';
  const FEED_SELECTOR = '#scholar-feed';
  const FEED_LIMIT = 5;
  const PROXY_ENDPOINT = `https://r.jina.ai/https://scholar.google.com/citations?user=${SCHOLAR_USER}&hl=en&view_op=list_works&sortby=pubdate`;

  const normaliseText = (text) => (text || '').replace(/\s+/g, ' ').trim();

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

  const populateScholarFeed = async () => {
    const feed = document.querySelector(FEED_SELECTOR);
    if (!feed) return;

    try {
      const response = await fetch(PROXY_ENDPOINT);
      if (!response.ok) {
        throw new Error(`Scholar request failed with status ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const rows = Array.from(doc.querySelectorAll('#gsc_a_b .gsc_a_tr'));

      if (!rows.length) {
        throw new Error('No publications returned');
      }

      feed.innerHTML = '';
      rows.slice(0, FEED_LIMIT).forEach((row) => {
        const item = buildFeedItem(row);
        if (item) {
          feed.appendChild(item);
        }
      });
    } catch (error) {
      console.error('Failed to refresh Google Scholar feed', error);
      feed.innerHTML = '<li class="scholar-feed-error">Unable to load publications right now. Please visit Google Scholar directly.</li>';
    }
  };

  document.addEventListener('DOMContentLoaded', populateScholarFeed);
})();
