// Powrót z GitHuba: wymiana kodu na token i przekazanie go do panelu Decap
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = ((request.headers.get("Cookie") || "").match(/oauth_state=([^;]+)/) || [])[1];
  if (!code || !state || state !== saved) return new Response("Błąd logowania (state).", { status: 400 });

  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
  });
  const d = await r.json();
  const msg = d.access_token
    ? "authorization:github:success:" + JSON.stringify({ token: d.access_token, provider: "github" })
    : "authorization:github:error:" + JSON.stringify(d);
  const safe = JSON.stringify(msg).replace(/</g, "\\u003c");
  const html = `<!doctype html><script>
(function(){
  function recv(e){ window.opener.postMessage(${safe}, e.origin); }
  window.addEventListener("message", recv, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>`;
  return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8", "Set-Cookie": "oauth_state=; Path=/api; Max-Age=0" } });
}
