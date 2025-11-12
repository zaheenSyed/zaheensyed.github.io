(function () {
  const SCHOLAR_USER = 'IELgvgEAAAAJ';
  const FEED_SELECTOR = '#scholar-feed';
  const FEED_LIMIT = 5;
  const SCHOLAR_HTML_URL = `https://scholar.google.com/citations?user=${SCHOLAR_USER}&hl=en&view_op=list_works&sortby=pubdate`;
  const SCHOLAR_CSV_URL = `https://scholar.google.com/citations?user=${SCHOLAR_USER}&hl=en&view_op=export_csv`;
  const PROXY_TARGETS = [
    { url: `https://r.jina.ai/https://scholar.google.com/citations?hl=en&user=${SCHOLAR_USER}&view_op=export_csv`, format: 'csv' },
    { url: `https://r.jina.ai/http://scholar.google.com/citations?hl=en&user=${SCHOLAR_USER}&view_op=export_csv`, format: 'csv' },
    { url: `https://r.jina.ai/https://scholar.googleusercontent.com/citations?hl=en&user=${SCHOLAR_USER}&view_op=export_csv`, format: 'csv' },
    { url: `https://cors.isomorphic-git.org/${SCHOLAR_CSV_URL}`, format: 'csv' },
    { url: `https://cors.isomorphic-git.org/${SCHOLAR_HTML_URL}`, format: 'html' },
    { url: `https://r.jina.ai/https://scholar.google.com/citations?user=${SCHOLAR_USER}&hl=en&view_op=list_works&sortby=pubdate`, format: 'html' },
    { url: `https://r.jina.ai/http://scholar.google.com/citations?user=${SCHOLAR_USER}&hl=en&view_op=list_works&sortby=pubdate`, format: 'html' }
  ];

  const normaliseText = (text) => (text || '').replace(/\s+/g, ' ').trim();

  const buildFeedItem = (item) => {
    if (!item || !item.title) return null;

    const li = document.createElement('li');
    li.className = 'scholar-feed-item';

    const header = document.createElement('div');
    header.className = 'publication-header';

    const strong = document.createElement('strong');
    strong.textContent = item.title;
    header.appendChild(strong);

    const venueParts = [item.venue, item.year].filter(Boolean);
    if (venueParts.length) {
      const span = document.createElement('span');
      span.textContent = venueParts.join(' · ');
      header.appendChild(span);
    }

    if (item.link) {
      const anchor = document.createElement('a');
      anchor.href = item.link;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      anchor.textContent = 'Link';
      header.appendChild(anchor);
    }

    li.appendChild(header);

    if (item.authors) {
      const meta = document.createElement('p');
      meta.className = 'publication-authors';
      meta.textContent = item.authors;
      li.appendChild(meta);
    }

    return li;
  };

  const parseCsvRows = (csvText) => {
    const rows = [];
    let current = [];
    let currentValue = '';
    let inQuotes = false;

    const pushValue = () => {
      current.push(currentValue);
      currentValue = '';
    };

    const pushRow = () => {
      if (current.length || currentValue) {
        pushValue();
        rows.push(current);
      }
      current = [];
      currentValue = '';
    };

    const text = csvText.replace(/^\uFEFF/, '');

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          currentValue += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        pushValue();
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && text[i + 1] === '\n') {
          i += 1;
        }
        pushRow();
      } else {
        currentValue += char;
      }
    }

    if (currentValue || current.length) {
      pushRow();
    }

    return rows.filter((row) => row.some((cell) => cell.trim().length));
  };

  const parseScholarCsv = (csvText) => {
    const rows = parseCsvRows(csvText);
    if (!rows.length) return [];

    const headers = rows[0].map((header) => header.trim());
    const indexOf = (label) =>
      headers.findIndex((header) => header.toLowerCase() === label.toLowerCase());

    const titleIndex = indexOf('Title');
    const authorsIndex = indexOf('Authors');
    const dateIndex = indexOf('Publication date');
    const journalIndex = indexOf('Journal');
    const publisherIndex = indexOf('Publisher');

    return rows.slice(1)
      .map((cells) => {
        const title = normaliseText(cells[titleIndex]);
        if (!title) return null;

        const authors = normaliseText(cells[authorsIndex]);
        const date = normaliseText(cells[dateIndex]);
        const journal = normaliseText(cells[journalIndex]);
        const publisher = normaliseText(cells[publisherIndex]);
        const venueParts = [journal, publisher].filter(Boolean);
        const venue = normaliseText(venueParts.join(' · ')) || normaliseText(date);
        const yearMatch = date.match(/(19|20)\d{2}/);

        return {
          title,
          authors,
          venue,
          year: yearMatch ? yearMatch[0] : '',
          link: `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}`
        };
      })
      .filter(Boolean);
  };

  const parseScholarHtml = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = Array.from(doc.querySelectorAll('#gsc_a_b .gsc_a_tr'));

    return rows
      .map((row) => {
        const titleEl = row.querySelector('.gsc_a_at');
        const title = normaliseText(titleEl && titleEl.textContent);
        if (!title) return null;

        const link = titleEl ? `https://scholar.google.com${titleEl.getAttribute('href')}` : '';
        const metaEls = row.querySelectorAll('.gs_gray');
        const authors = normaliseText(metaEls[0] && metaEls[0].textContent);
        const venue = normaliseText(metaEls[1] && metaEls[1].textContent);
        const year = normaliseText(
          row.querySelector('.gsc_a_h.gsc_a_hc.gs_ibl') &&
            row.querySelector('.gsc_a_h.gsc_a_hc.gs_ibl').textContent
        );

        return {
          title,
          authors,
          venue,
          year,
          link
        };
      })
      .filter(Boolean);
  };

  const populateScholarFeed = async () => {
    const feed = document.querySelector(FEED_SELECTOR);
    if (!feed) return;

    try {
      const fetchScholarData = async () => {
        for (const target of PROXY_TARGETS) {
          try {
            const response = await fetch(target.url, {
              credentials: 'omit',
              mode: 'cors'
            });
            if (!response || !response.ok) {
              continue;
            }
            const text = await response.text();
            if (!text || !text.trim().length) {
              continue;
            }

            const items =
              target.format === 'csv' ? parseScholarCsv(text) : parseScholarHtml(text);

            if (Array.isArray(items) && items.length) {
              return items;
            }
          } catch (proxyError) {
            console.warn('Scholar proxy attempt failed', target.url, proxyError);
          }
        }
        throw new Error('All proxy endpoints failed');
      };

      const items = await fetchScholarData();

      feed.innerHTML = '';
      items.slice(0, FEED_LIMIT).forEach((item) => {
        const node = buildFeedItem(item);
        if (node) {
          feed.appendChild(node);
        }
      });
    } catch (error) {
      console.error('Failed to refresh Google Scholar feed', error);
      feed.innerHTML =
        '<li class="scholar-feed-error">Unable to load publications right now. Please visit Google Scholar directly.</li>';
    }
  };

  document.addEventListener('DOMContentLoaded', populateScholarFeed);
})();
