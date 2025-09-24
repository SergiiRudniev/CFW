// === Config ===
const UPSTREAM = 'https://query-art-06696058.figma.site';
const HOSTNAME = 'ddma.the-clutch.fun';

// OG/Twitter превью
const CUSTOM_TITLE = 'DDMA: Реєстрація на турнір';
const CUSTOM_DESC  = 'Формуємо пари 2×2. Швидкий відбір, фінал того ж дня.';
const CUSTOM_IMAGE = 'https://ddma.the-clutch.fun/og.jpg'; // положи картинку по этому URL

export default {
  async fetch(request, env, ctx) {
    const reqUrl = new URL(request.url);
    const upstreamUrl = new URL(UPSTREAM + reqUrl.pathname + reqUrl.search);

    // Прокидываем метод/тело/заголовки и корректный Host для upstream
    const fwdHeaders = new Headers(request.headers);
    fwdHeaders.set('host', new URL(UPSTREAM).hostname);

    const upstreamResp = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers: fwdHeaders,
      body: ['GET','HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: 'follow',
    });

    const ct = upstreamResp.headers.get('content-type') || '';

    // Нестрочные типы — отдаём как есть (стрим)
    if (!ct.includes('text/html')) {
      return new Response(upstreamResp.body, {
        status: upstreamResp.status,
        headers: upstreamResp.headers,
      });
    }

    // HTML: чистим старые теги и вставляем свои
    const rewriter = new HTMLRewriter()
      // Удаляем дубли/мусор, чтобы Telegram не схватил не те теги
      .on('meta[name="description"]',       { element(e){ e.remove(); }})
      .on('meta[name="robots"]',            { element(e){ e.remove(); }})
      .on('meta[property^="og:"]',          { element(e){ e.remove(); }})
      .on('meta[name^="twitter:"]',         { element(e){ e.remove(); }})
      // Меняем title
      .on('title',                          { element(e){ e.setInnerContent(CUSTOM_TITLE); }})
      // Добавляем нужные мета-теги
      .on('head', { element(e){
        e.append(`
<meta name="description" content="${CUSTOM_DESC}">
<meta property="og:title" content="${CUSTOM_TITLE}">
<meta property="og:description" content="${CUSTOM_DESC}">
<meta property="og:image" content="${CUSTOM_IMAGE}">
<meta property="og:url" content="https://${HOSTNAME}${reqUrl.pathname}">
<meta property="og:site_name" content="The Clutch">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${CUSTOM_TITLE}">
<meta name="twitter:description" content="${CUSTOM_DESC}">
<meta name="twitter:image" content="${CUSTOM_IMAGE}">
`, { html: true });
      }})
      // Переписываем абсолютные ссылки на твой домен (если Figma вставляет полные)
      .on('a[href^="https://query-art-06696058.figma.site"]', {
        element(e){ e.setAttribute('href',
          e.getAttribute('href').replace('https://query-art-06696058.figma.site', `https://${HOSTNAME}`));
        }
      });

    // Заголовки ответа
    const h = new Headers(upstreamResp.headers);
    h.set('content-type', 'text/html; charset=utf-8');
    // На время отладки карточек — отключаем кэш
    h.set('cache-control', 'no-cache, no-store, must-revalidate');

    return rewriter.transform(new Response(upstreamResp.body, {
      status: upstreamResp.status,
      headers: h,
    }));
  }
};
