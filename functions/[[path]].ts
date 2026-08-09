export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Don't intercept API requests - let the specific API handler handle them
  if (url.pathname.startsWith("/api/")) {
    return context.next();
  }

  // Don't intercept static asset requests (JS, CSS, images, etc.)
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json)$/)) {
    return context.next();
  }

  // For all other routes (SPA routes like /admin, /admin/login), serve index.html
  try {
    const indexRequest = new Request(`${url.origin}/index.html`, request);
    const response = await env.ASSETS.fetch(indexRequest);

    if (response.status === 200) {
      return new Response(response.body, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      });
    }
  } catch {
    // Fallback to next handler if ASSETS fetch fails
  }

  return context.next();
}
