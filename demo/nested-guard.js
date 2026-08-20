(function(){
  "use strict";

  const cfg = window.TOP_TAXI_DEMO_RUNTIME_CONFIG || {};
  const DEMO_LIFF_ID = String(cfg.liffId || "");
  const BUILD = String(cfg.build || "20260821-0230");

  if (!/^2011084643-[A-Za-z0-9]+$/.test(DEMO_LIFF_ID)) {
    throw new Error("TOP Taxi DEMO nested guard: invalid Demo LIFF ID");
  }

  if (window.__TOP_TAXI_DEMO_NESTED_GUARD_INSTALLED__) return;
  Object.defineProperty(window, "__TOP_TAXI_DEMO_NESTED_GUARD_INSTALLED__", {
    value:true, configurable:false, enumerable:false, writable:false
  });

  const currentScriptUrl = (document.currentScript && document.currentScript.src) || new URL("./nested-guard.js", location.href).href;
  const guardUrl = new URL("./nested-guard.js?v=" + encodeURIComponent(BUILD), currentScriptUrl).href;
  const runtimeUrl = new URL("./demo.js?v=" + encodeURIComponent(BUILD), currentScriptUrl).href;
  const cssUrl = new URL("./demo.css?v=" + encodeURIComponent(BUILD), currentScriptUrl).href;
  const productionBase = new URL("../", currentScriptUrl).href;
  const runtimeConfig = JSON.stringify({
    type:String(cfg.type || "demo"), environment:"demo-line", liffId:DEMO_LIFF_ID, build:BUILD
  }).replace(/</g, "\\u003c");

  const forbiddenAfterTransform = [
    /2011008197-[A-Za-z0-9]+/,
    /lakswitting\.app\.n8n\.cloud\/webhook/i,
    /topTaxiAddresses/,
    /topTaxiCustomerPreferences/
  ];

  function transformHtml(input){
    let html = String(input || "");
    html = html
      .replace(/2011008197-[A-Za-z0-9]+/g, DEMO_LIFF_ID)
      .replace(/https:\/\/lakswitting\.app\.n8n\.cloud\/webhook\/[A-Za-z0-9-]+/gi, "https://demo.invalid/webhook")
      .replace(/topTaxiAddresses/g, "topTaxiDemoAddresses")
      .replace(/topTaxiCustomerPreferences/g, "topTaxiDemoCustomerPreferences")
      .replace(/<title>([\s\S]*?)<\/title>/i, function(match, title){
        return /｜DEMO\s*$/i.test(String(title || "").trim()) ? match : "<title>" + title + "｜DEMO</title>";
      });

    if (/static\.line-scdn\.net\/liff/i.test(html) && !/__TOP_TAXI_DEMO_PATCH_LIFF__/.test(html)) {
      html = html.replace(
        /(<script\b[^>]*src=["']https:\/\/static\.line-scdn\.net\/liff\/[^"']+["'][^>]*><\/script>)/i,
        '$1<script>window.__TOP_TAXI_DEMO_PATCH_LIFF__&&window.__TOP_TAXI_DEMO_PATCH_LIFF__();<\/script>'
      );
    }

    if (/<head[\s>]/i.test(html) && !/data-top-taxi-demo-nested/i.test(html)) {
      const injection =
        '<base data-top-taxi-demo-nested href="' + productionBase + '">' +
        '<link rel="stylesheet" href="' + cssUrl + '">' +
        '<script>window.TOP_TAXI_DEMO_RUNTIME_CONFIG=' + runtimeConfig + ';<\/script>' +
        '<script src="' + guardUrl + '"><\/script>' +
        '<script src="' + runtimeUrl + '"><\/script>';
      html = html.replace(/<head([^>]*)>/i, "<head$1>" + injection);
    }

    const remaining = forbiddenAfterTransform.find(re => re.test(html));
    if (remaining) throw new Error("TOP Taxi DEMO nested isolation failed: " + remaining);
    return html;
  }

  function targetUrl(input){
    try { return new URL(typeof input === "string" ? input : (input && input.url) || "", location.href); }
    catch (_) { return null; }
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function(input, init){
    const response = await nativeFetch(input, init);
    const url = targetUrl(input);
    if (!url || url.origin !== location.origin || /\/demo\//i.test(url.pathname) || !/\.html$/i.test(url.pathname)) return response;

    const text = await response.clone().text();
    const safe = transformHtml(text);
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(safe, { status:response.status, statusText:response.statusText, headers });
  };

  window.__TOP_TAXI_DEMO_SANITIZE_HTML__ = transformHtml;
})();