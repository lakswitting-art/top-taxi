(function(){
  "use strict";

  const cfg = window.TOP_TAXI_DEMO_PAGE;
  const loading = document.getElementById("demoLoading");

  function fail(message, error){
    console.error("TOP Taxi DEMO loader:", message, error || "");
    if (loading) {
      loading.innerHTML = '<div style="max-width:520px;margin:60px auto;padding:22px;border-radius:18px;background:#fff;color:#222;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Noto Sans TC,sans-serif;box-shadow:0 15px 45px rgba(0,0,0,.18)"><strong style="color:#c90012">DEMO 安全檢查未通過</strong><div style="margin-top:10px;font-size:13px;line-height:1.7;color:#666">'+String(message || "載入失敗")+'<br>為避免碰到正式環境，本頁已停止執行。</div><div style="margin-top:14px"><a href="./index.html" style="color:#c90012;font-weight:800">返回 Demo 首頁</a></div></div>';
    }
  }

  if (!cfg || !cfg.source || !cfg.type) {
    fail("Demo 頁面設定遺失");
    return;
  }

  const forbiddenAfterTransform = [
    /2011008197-[A-Za-z0-9]+/,
    /lakswitting\.app\.n8n\.cloud\/webhook/i,
    /topTaxiAddresses/,
    /topTaxiCustomerPreferences/,
    /static\.line-scdn\.net\/liff/i
  ];

  async function boot(){
    try {
      const sourceUrl = new URL(cfg.source, location.href);
      sourceUrl.searchParams.set("__demo_source", Date.now().toString());

      const response = await fetch(sourceUrl.href, { cache:"no-store", credentials:"same-origin" });
      if (!response.ok) throw new Error("Production source HTTP " + response.status);

      let html = await response.text();
      if (!/^\s*<!doctype html/i.test(html) && !/<html[\s>]/i.test(html)) {
        throw new Error("Production source 格式不正確");
      }

      html = html
        .replace(/<script\b[^>]*src=["']https:\/\/static\.line-scdn\.net\/liff\/[^"']+["'][^>]*><\/script>/gi, "")
        .replace(/2011008197-[A-Za-z0-9]+/g, "DEMO-LIFF-DISABLED")
        .replace(/https:\/\/lakswitting\.app\.n8n\.cloud\/webhook\/[A-Za-z0-9-]+/gi, "https://demo.invalid/webhook")
        .replace(/topTaxiAddresses/g, "topTaxiDemoAddresses")
        .replace(/topTaxiCustomerPreferences/g, "topTaxiDemoCustomerPreferences")
        .replace(/<title>([\s\S]*?)<\/title>/i, "<title>$1｜DEMO</title>");

      const remaining = forbiddenAfterTransform.find(re => re.test(html));
      if (remaining) throw new Error("偵測到未隔離的正式環境識別，已阻止執行：" + remaining);

      const runtimeUrl = new URL("./demo.js", location.href).href;
      const cssUrl = new URL("./demo.css", location.href).href;
      const productionBase = new URL("../", location.href).href;
      const runtimeConfig = JSON.stringify({ type:String(cfg.type), environment:"demo" }).replace(/</g, "\\u003c");

      const injection =
        '<base href="'+productionBase+'">' +
        '<link rel="stylesheet" href="'+cssUrl+'">' +
        '<script>window.TOP_TAXI_DEMO_RUNTIME_CONFIG='+runtimeConfig+';<\/script>' +
        '<script src="'+runtimeUrl+'"><\/script>';

      if (!/<head[\s>]/i.test(html)) throw new Error("Production source 缺少 head");
      html = html.replace(/<head([^>]*)>/i, "<head$1>" + injection);

      document.open();
      document.write(html);
      document.close();
    } catch (error) {
      fail(error?.message || "Demo 載入失敗", error);
    }
  }

  boot();
})();
