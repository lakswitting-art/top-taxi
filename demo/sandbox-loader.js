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

  if (!cfg || !cfg.source || !cfg.type || !cfg.liffId) {
    fail("Demo 頁面設定遺失");
    return;
  }

  if (!/^2011084643-[A-Za-z0-9]+$/.test(String(cfg.liffId))) {
    fail("Demo LIFF ID 格式不正確");
    return;
  }

  const forbiddenAfterTransform = [
    /2011008197-[A-Za-z0-9]+/,
    /lakswitting\.app\.n8n\.cloud\/webhook/i,
    /topTaxiAddresses/,
    /topTaxiCustomerPreferences/
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

      if (!/static\.line-scdn\.net\/liff/i.test(html)) {
        throw new Error("Production source 缺少 LINE LIFF SDK");
      }

      html = html
        .replace(/2011008197-[A-Za-z0-9]+/g, String(cfg.liffId))
        .replace(/https:\/\/lakswitting\.app\.n8n\.cloud\/webhook\/[A-Za-z0-9-]+/gi, "https://demo.invalid/webhook")
        .replace(/topTaxiAddresses/g, "topTaxiDemoAddresses")
        .replace(/topTaxiCustomerPreferences/g, "topTaxiDemoCustomerPreferences")
        .replace(/<title>([\s\S]*?)<\/title>/i, "<title>$1｜DEMO</title>");

      if (String(cfg.type) === "fare") {
        html = html.replace(
          /showStatus\(\s*"Google 地址搜尋載入失敗，請確認 API Key 與 API 設定。"\s*,\s*true\s*\);/,
          'showStatus("DEMO Google 初始化失敗：" + (error?.name ? error.name + "｜" : "") + (error?.message || String(error)), true);'
        );

        /*
          Demo Fare：Places ready 後先建立地址 UI；Routes 改背景載入。
          避免 LINE WebView 裡 routes library 較慢時卡住上／下車欄位。
          Production fare.html 完全不修改。
        */
        const fareBeforeRoutesPatch = html;
        html = html.replace(
          /const\s*{\s*Route\s*}\s*=\s*await\s*google\.maps\.importLibrary\(\s*["']routes["']\s*\);\s*RouteClass\s*=\s*Route\s*;/,
          'google.maps.importLibrary("routes").then(({Route})=>{RouteClass=Route;}).catch((error)=>{console.warn("DEMO Routes library delayed:",error);});'
        );

        if (html === fareBeforeRoutesPatch) {
          throw new Error("Demo Fare 找不到 Routes 初始化區塊，已停止載入");
        }

        /*
          關鍵修正：不要在 fetch + document.write 還沒完成時搶跑 initGoogle。
          先把正式頁原本的 window.load 啟動點改成 Demo marker，
          等整份 mirror DOM parse 完、DOMContentLoaded 後，再由頁尾 bootstrap 啟動。
        */
        const fareBeforeGoogleBootPatch = html;
        html = html.replace(
          /window\.addEventListener\(\s*["']load["']\s*,\s*initGoogle\s*\);/,
          'window.__TOP_TAXI_DEMO_FARE_INIT_GOOGLE__ = initGoogle;'
        );

        if (html === fareBeforeGoogleBootPatch) {
          throw new Error("Demo Fare 找不到 Google 啟動鉤子，已停止載入");
        }
      }

      const remaining = forbiddenAfterTransform.find(re => re.test(html));
      if (remaining) throw new Error("偵測到未隔離的正式環境識別，已阻止執行：" + remaining);
      if (!html.includes(String(cfg.liffId))) throw new Error("Demo LIFF ID 未成功套用");

      const runtimeUrl = new URL("./demo.js", location.href).href;
      const cssUrl = new URL("./demo.css", location.href).href;
      const productionBase = new URL("../", location.href).href;
      const runtimeConfig = JSON.stringify({
        type:String(cfg.type),
        environment:"demo-line",
        liffId:String(cfg.liffId)
      }).replace(/</g, "\\u003c");

      const injection =
        '<base href="'+productionBase+'">' +
        '<link rel="stylesheet" href="'+cssUrl+'">' +
        '<script>window.TOP_TAXI_DEMO_RUNTIME_CONFIG='+runtimeConfig+';<\/script>' +
        '<script src="'+runtimeUrl+'"><\/script>';

      if (!/<head[\s>]/i.test(html)) throw new Error("Production source 缺少 head");
      html = html.replace(/<head([^>]*)>/i, "<head$1>" + injection);

      html = html.replace(
        /(<script\b[^>]*src=["']https:\/\/static\.line-scdn\.net\/liff\/[^"']+["'][^>]*><\/script>)/i,
        '$1<script>window.__TOP_TAXI_DEMO_PATCH_LIFF__&&window.__TOP_TAXI_DEMO_PATCH_LIFF__();<\/script>'
      );

      if (String(cfg.type) === "fare") {
        if (!/<\/body>/i.test(html)) throw new Error("Demo Fare source 缺少 body 結尾");

        const fareEndBoot =
          '<script>(function(){' +
          'let tries=0;let busy=false;' +
          'const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));' +
          'async function start(){' +
          'if(busy)return;busy=true;' +
          'try{' +
          'while(++tries<=120){' +
          'if(typeof pickupController!=="undefined"&&pickupController){return;}' +
          'if(!document.getElementById("pickupBox")){await sleep(100);continue;}' +
          'try{' +
          'if(typeof window.google?.maps?.importLibrary==="function"){' +
          'await window.google.maps.importLibrary("places");' +
          'if(typeof window.__TOP_TAXI_DEMO_FARE_INIT_GOOGLE__==="function"){' +
          'await window.__TOP_TAXI_DEMO_FARE_INIT_GOOGLE__();' +
          '}' +
          'if(typeof pickupController!=="undefined"&&pickupController){return;}' +
          '}' +
          '}catch(error){' +
          'console.error("DEMO Fare Google bootstrap error:",error);' +
          'if(typeof showStatus==="function"){' +
          'showStatus("DEMO Google 初始化失敗："+(error?.name?error.name+"｜":"")+(error?.message||String(error)),true);' +
          '}' +
          '}' +
          'await sleep(250);' +
          '}' +
          'if(typeof showStatus==="function")showStatus("DEMO Google 地址系統載入逾時，請重新開啟頁面。",true);' +
          '}finally{busy=false;}' +
          '}' +
          'const launch=()=>setTimeout(start,0);' +
          'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",launch,{once:true});else launch();' +
          '})();<\/script>';

        html = html.replace(/<\/body>/i, fareEndBoot + '</body>');
      }

      document.open();
      document.write(html);
      document.close();
    } catch (error) {
      fail(error?.message || "Demo 載入失敗", error);
    }
  }

  boot();
})();
