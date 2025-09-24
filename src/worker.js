const UPSTREAM = 'https://query-art-06696058.figma.site';
const HOSTNAME = 'ddma.the-clutch.fun';

// Твои тексты/картинка для превью
const CUSTOM_TITLE = 'DDMA: Реєстрація на турнір';
const CUSTOM_DESC  = 'Формуємо пари 2×2. Швидкий відбір, фінал того ж дня.';
const CUSTOM_IMAGE = 'https://ddma.the-clutch.fun/og.jpg'; // загрузи картинку куда-нибудь доступно

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upstreamUrl = new URL(UPSTREAM + url.pathname + url.search);

    const headers = new Headers(request.headers);
    headers.set('host', new URL(UPSTREAM).hostname);

    const resp = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: ['GET','HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: 'follow',
    });

    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('text/html')) {
      return new Response(await resp.arrayBuffer(), { status: resp.status, headers: resp.headers });
    }

    // Переписываем ссылки и мета-теги
    const rewriter = new HTMLRewriter()
      // <title>
      .on('title', { element(e){ e.setInnerContent(CUSTOM_TITLE); }})
      // description
      .on('meta[name="description"]', { element(e){ e.setAttribute('content', CUSTOM_DESC); }})
      // OG
      .on('meta[property="og:title"]',        { element(e){ e.setAttribute('content', CUSTOM_TITLE); }})
      .on('meta[property="og:description"]',  { element(e){ e.setAttribute('content', CUSTOM_DESC); }})
      .on('meta[property="og:image"]',        { element(e){ e.setAttribute('content', CUSTOM_IMAGE); }})
      .on('meta[property="og:url"]',          { element(e){ e.setAttribute('content', `https://${HOSTNAME}${url.pathname}`); }})
      .on('meta[property="og:site_name"]',    { element(e){ e.setAttribute('content', 'The Clutch'); }})
      // Twitter
      .on('meta[name="twitter:title"]',       { element(e){ e.setAttribute('content', CUSTOM_TITLE); }})
      .on('meta[name="twitter:description"]', { element(e){ e.setAttribute('content', CUSTOM_DESC); }})
      .on('meta[name="twitter:image"]',       { element(e){ e.setAttribute('content', CUSTOM_IMAGE); }})
      // Если каких-то тегов нет — добавим их в <head>
      .on('head', {
        element(e){
          e.append(`
<meta property="og:title" content="${CUSTOM_TITLE}">
<meta property="og:description" content="${CUSTOM_DESC}">
<meta property="og:image" content="${CUSTOM_IMAGE}">
<meta property="og:url" content="https://${HOSTNAME}${url.pathname}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${CUSTOM_TITLE}">
<meta name="twitter:description" content="${CUSTOM_DESC}">
<meta name="twitter:image" content="${CUSTOM_IMAGE}">
`, { html: true });
        }
      })
      // Переписываем абсолютные ссылки на твой домен
      .on('a[href^="https://query-art-06696058.figma.site"]', {
        element(e){ e.setAttribute('href', e.getAttribute('href').replace('https://query-art-06696058.figma.site', `https://${HOSTNAME}`)); }
      });

    const h = new Headers(resp.headers);
    h.set('content-type', 'text/html; charset=utf-8');
    // полезно: не кэшировать для быстрых правок (убери потом)
    h.set('cache-control', 'no-cache');

    return rewriter.transform(new Response(resp.body, { status: resp.status, headers: h }));
  }
}
