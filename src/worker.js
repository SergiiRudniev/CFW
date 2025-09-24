const UPSTREAM = 'https://query-art-06696058.figma.site';
const HOSTNAME = 'ddma.the-clutch.fun';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upstreamUrl = new URL(UPSTREAM + url.pathname + url.search);

    const headers = new Headers(request.headers);
    headers.set('host', new URL(UPSTREAM).hostname);

    const resp = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers,
      body: ['GET','HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: 'follow',
    });

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let html = await resp.text();
      html = html
        .replaceAll('https://query-art-06696058.figma.site', `https://${HOSTNAME}`)
        .replaceAll('http://query-art-06696058.figma.site', `https://${HOSTNAME}`);
      const h = new Headers(resp.headers);
      h.set('content-type', 'text/html; charset=utf-8');
      return new Response(html, { status: resp.status, headers: h });
    }

    return new Response(await resp.arrayBuffer(), {
      status: resp.status,
      headers: resp.headers,
    });
  }
}
