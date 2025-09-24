// === Config ===
const UPSTREAM = 'https://query-art-06696058.figma.site';
const HOSTNAME = 'ddma.the-clutch.fun';

const CUSTOM_TITLE = 'DDMA: Реєстрація на турнір';
const CUSTOM_DESC  = 'Формуємо пари 2×2. Швидкий відбір, фінал того ж дня.';
const CUSTOM_IMAGE = 'https://the-clutch.fun/static/og.jpg'; // свой 1200×630

// Скрипт, который удерживает тайтл/мета и выпиливает noindex
const PIN_META_SCRIPT = `
(function(){
  const T='${CUSTOM_TITLE}', D='${CUSTOM_DESC}', IMG='${CUSTOM_IMAGE}', H='https://${HOSTNAME}';
  const ensure = () => {
    if (document.title !== T) document.title = T;

    const set = (sel, attr, val) => {
      let el = document.head.querySelector(sel);
      if (!el) { el = document.createElement('meta');
        if (sel.includes('property=')) el.setAttribute('property', sel.match(/"([^"]+)"/)[1]);
        if (sel.includes('name='))     el.setAttribute('name',     sel.match(/"([^"]+)"/)[1]);
        document.head.appendChild(el);
      }
      if (el.getAttribute(attr) !== val) el.setAttribute(attr, val);
    };

    // description (один)
    Array.from(document.head.querySelectorAll('meta[name="description"]')).forEach((e,i)=>{
      if(i===0){ e.setAttribute('content', D);} else { e.remove(); }
    });

    // убрать noindex
    Array.from(document.head.querySelectorAll('meta[name="robots"]')).forEach(e=>e.remove());

    set('meta[property="og:title"]','content',T);
    set('meta[property="og:description"]','content',D);
    set('meta[property="og:image"]','content',IMG);
    set('meta[property="og:url"]','content',H + location.pathname);
    set('meta[property="og:site_name"]','content','The Clutch');

    set('meta[name="twitter:card"]','content','summary_large_image');
    set('meta[name="twitter:title"]','content',T);
    set('meta[name="twitter:description"]','content',D);
    set('meta[name="twitter:image"]','content',IMG);
  };

  ensure();
  // если их бандл снова меняет — возвращаем назад
  const mo = new MutationObserver(()=>ensure());
  mo.observe(document.head, {childList:true, subtree:true, attributes:true});
})();
`;

export default {
  async fetch(request) {
    const reqUrl = new URL(request.url);
    const upstreamUrl = new URL(UPSTREAM + reqUrl.pathname + reqUrl.search);

    const fwdHeaders = new Headers(request.headers);
    fwdHeaders.set('host', new URL(UPSTREAM).hostname);

    const uResp = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers: fwdHeaders,
      body: ['GET','HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: 'follow',
    });

    const ct = uResp.headers.get('content-type') || '';
    if (!ct.includes('text/html')) {
      return new Response(uResp.body, { status: uResp.status, headers: uResp.headers });
    }

    const rewriter = new HTMLRewriter()
      // убираем все сторонние OG/Twitter/robots/description
      .on('meta', { element(e){
        const n = e.getAttribute('name') || '';
        const p = e.getAttribute('property') || '';
        if (n === 'robots' || n === 'description' || n.startsWith('twitter:') || p.startsWith('og:')) e.remove();
      }})
      .on('title', { element(e){ e.setInnerContent(CUSTOM_TITLE); }})
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
<script>${PIN_META_SCRIPT}</script>
`, { html:true });
      }})
      // переписываем абсолютные ссылки на твой домен
      .on('a[href^="https://query-art-06696058.figma.site"]', {
        element(e){ e.setAttribute('href', e.getAttribute('href').replace('https://query-art-06696058.figma.site', `https://${HOSTNAME}`)); }
      });

    const h = new Headers(uResp.headers);
    h.set('content-type','text/html; charset=utf-8');
    h.set('cache-control','no-cache, no-store, must-revalidate');

    return rewriter.transform(new Response(uResp.body, { status: uResp.status, headers: h }));
  }
};
