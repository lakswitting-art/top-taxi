(function(){
  "use strict";

  const cfg = window.TOP_TAXI_DEMO_RUNTIME_CONFIG || {};
  const ORDER_KEY = "topTaxiDemoOrders";
  const MESSAGE_KEY = "topTaxiDemoMessages";
  const PAGE_TYPE = String(cfg.type || "demo");
  const DEMO_LIFF_ID = String(cfg.liffId || "");

  function nowIso(){ return new Date().toISOString(); }

  function safeJson(value){
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return { value: String(value ?? "") }; }
  }

  function readList(key){
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }

  function writeList(key, list){
    try { localStorage.setItem(key, JSON.stringify(list.slice(0, 100))); }
    catch (error) { console.warn("TOP Taxi DEMO storage warning:", error); }
  }

  function saveOrder(order, source){
    const copy = safeJson(order || {});
    copy.environment = "demo";
    copy.demo = {
      ...(copy.demo && typeof copy.demo === "object" ? copy.demo : {}),
      source: source || PAGE_TYPE,
      capturedAt: nowIso(),
      sandbox: true,
      liffId: DEMO_LIFF_ID
    };

    const list = readList(ORDER_KEY);
    const id = copy.orderId || copy.id || "";
    const existing = id ? list.findIndex(item => (item?.orderId || item?.id || "") === id) : -1;
    if (existing >= 0) list.splice(existing, 1);
    list.unshift(copy);
    writeList(ORDER_KEY, list);
    window.TOP_TAXI_DEMO_LAST_ORDER = copy;
    return copy;
  }

  function saveMessages(messages){
    const list = readList(MESSAGE_KEY);
    list.unshift({
      pageType: PAGE_TYPE,
      capturedAt: nowIso(),
      liffId: DEMO_LIFF_ID,
      messages: safeJson(messages || [])
    });
    writeList(MESSAGE_KEY, list);
  }

  function toast(message){
    let el = document.getElementById("topTaxiDemoToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "topTaxiDemoToast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function parsePossibleOrder(body){
    if (typeof body !== "string" || !body.trim()) return null;
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === "object" && (parsed.orderId || parsed.schemaVersion || parsed.orderType)) return parsed;
    } catch (_) {}
    return null;
  }

  function urlString(input){
    try {
      if (typeof input === "string") return new URL(input, location.href).href;
      if (input && typeof input.url === "string") return new URL(input.url, location.href).href;
    } catch (_) {}
    return String(input || "");
  }

  function hostMatches(host, root){
    host = String(host || "").toLowerCase();
    root = String(root || "").toLowerCase();
    return host === root || host.endsWith("." + root);
  }

  function isAllowedExternalHost(host){
    return hostMatches(host, "google.com") ||
      hostMatches(host, "googleapis.com") ||
      hostMatches(host, "gstatic.com") ||
      hostMatches(host, "ggpht.com") ||
      hostMatches(host, "line.me") ||
      hostMatches(host, "line-scdn.net") ||
      hostMatches(host, "line-apps.com") ||
      hostMatches(host, "linecorp.com") ||
      hostMatches(host, "lin.ee") ||
      hostMatches(host, "cloudinary.com");
  }

  function classifyUrl(raw){
    try {
      const u = new URL(raw, location.href);
      if (u.origin === location.origin) return "same-origin";
      if (isAllowedExternalHost(u.hostname)) return "allowed-external";
      return "blocked-external";
    } catch (_) {
      return "blocked-external";
    }
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function(input, init){
    const raw = urlString(input);
    const kind = classifyUrl(raw);

    if (kind === "same-origin" || kind === "allowed-external") {
      return nativeFetch(input, init);
    }

    const order = parsePossibleOrder(init?.body);
    if (order) saveOrder(order, PAGE_TYPE);

    console.info("TOP Taxi DEMO blocked external fetch:", raw);
    return new Response(JSON.stringify({ ok:true, demo:true, blocked:true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const NativeXHR = window.XMLHttpRequest;
    if (NativeXHR) {
      const nativeOpen = NativeXHR.prototype.open;
      const nativeSend = NativeXHR.prototype.send;
      NativeXHR.prototype.open = function(method, url){
        this.__topTaxiDemoUrl = urlString(url);
        this.__topTaxiDemoBlocked = classifyUrl(this.__topTaxiDemoUrl) === "blocked-external";
        return nativeOpen.apply(this, arguments);
      };
      NativeXHR.prototype.send = function(body){
        if (!this.__topTaxiDemoBlocked) return nativeSend.apply(this, arguments);
        const order = parsePossibleOrder(body);
        if (order) saveOrder(order, PAGE_TYPE);
        console.info("TOP Taxi DEMO blocked external XHR:", this.__topTaxiDemoUrl);
        try { this.abort(); } catch (_) {}
      };
    }
  } catch (error) {
    console.warn("TOP Taxi DEMO XHR guard warning:", error);
  }

  function setMethod(target, name, fn){
    try {
      Object.defineProperty(target, name, {
        value: fn,
        configurable: true,
        enumerable: true,
        writable: true
      });
      return true;
    } catch (_) {
      try {
        target[name] = fn;
        return target[name] === fn;
      } catch (_) {
        return false;
      }
    }
  }

  function patchRealLiff(){
    const realLiff = window.liff;
    if (!realLiff || typeof realLiff.init !== "function") return false;
    if (realLiff.__topTaxiDemoGuarded) return true;

    const nativeIsApiAvailable =
      typeof realLiff.isApiAvailable === "function"
        ? realLiff.isApiAvailable.bind(realLiff)
        : null;

    const safeSendMessages = async function(messages){
      saveMessages(messages);
      setTimeout(() => toast("DEMO：LINE 訊息已攔截，不會正式送出"), 0);
      return true;
    };

    if (!setMethod(realLiff, "sendMessages", safeSendMessages)) {
      console.error("TOP Taxi DEMO: 無法攔截 liff.sendMessages");
      return false;
    }

    setMethod(realLiff, "isApiAvailable", function(name){
      if (name === "sendMessages") return true;
      return nativeIsApiAvailable ? nativeIsApiAvailable(name) : false;
    });

    try {
      Object.defineProperty(realLiff, "__topTaxiDemoGuarded", {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
      });
    } catch (_) {
      realLiff.__topTaxiDemoGuarded = true;
    }

    if (window.TOP_TAXI_DEMO) window.TOP_TAXI_DEMO.realLiffReady = true;
    console.info("TOP Taxi DEMO: real Demo LIFF connected with sendMessages guard", DEMO_LIFF_ID);
    return true;
  }

  window.__TOP_TAXI_DEMO_PATCH_LIFF__ = patchRealLiff;

  window.TOP_TAXI_DEMO = {
    enabled: true,
    environment: "demo-line",
    pageType: PAGE_TYPE,
    liffId: DEMO_LIFF_ID,
    realLiffReady: false,
    orderStorageKey: ORDER_KEY,
    addressesStorageKey: "topTaxiDemoAddresses",
    preferencesStorageKey: "topTaxiDemoCustomerPreferences",
    saveOrder,
    toast,
    markResult: () => toast("DEMO 測試完成｜不會正式派車")
  };

  let patchAttempts = 0;
  const patchTimer = setInterval(function(){
    patchAttempts += 1;
    if (patchRealLiff() || patchAttempts >= 400) clearInterval(patchTimer);
  }, 25);

  function installBanner(){
    if (!document.body || document.getElementById("topTaxiDemoBar")) return;
    document.body.classList.add("top-taxi-demo-active");

    const bar = document.createElement("div");
    bar.id = "topTaxiDemoBar";
    const demoBase = new URL("./", location.href).href;
    bar.innerHTML =
      '<div class="demo-pill"><span class="demo-dot"></span><span>DEMO LINE 測試環境</span></div>' +
      '<div class="demo-copy">使用 Demo LINE 身分｜送出只進 Sandbox，不會進正式 n8n／派單</div>' +
      '<div class="demo-actions"><a href="'+demoBase+'index.html">測試首頁</a><a href="'+demoBase+'orders.html">測試訂單</a></div>';
    document.body.prepend(bar);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installBanner, {once:true});
  else installBanner();
})();
