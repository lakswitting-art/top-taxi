(function(){
  "use strict";

  const cfg = window.TOP_TAXI_DEMO_RUNTIME_CONFIG || {};
  const ORDER_KEY = "topTaxiDemoOrders";
  const MESSAGE_KEY = "topTaxiDemoMessages";
  const PAGE_TYPE = String(cfg.type || "demo");

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
      sandbox: true
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
    list.unshift({ pageType: PAGE_TYPE, capturedAt: nowIso(), messages: safeJson(messages || []) });
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

  function isGoogleHost(host){
    host = String(host || "").toLowerCase();
    return host === "google.com" || host.endsWith(".google.com") ||
      host === "googleapis.com" || host.endsWith(".googleapis.com") ||
      host === "gstatic.com" || host.endsWith(".gstatic.com") ||
      host === "ggpht.com" || host.endsWith(".ggpht.com");
  }

  function classifyUrl(raw){
    try {
      const u = new URL(raw, location.href);
      if (u.origin === location.origin) return "same-origin";
      if (isGoogleHost(u.hostname)) return "google";
      return "blocked-external";
    } catch (_) {
      return "blocked-external";
    }
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function(input, init){
    const raw = urlString(input);
    const kind = classifyUrl(raw);

    if (kind === "same-origin" || kind === "google") {
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

  const demoLiff = {
    init: async () => true,
    ready: Promise.resolve(),
    isLoggedIn: () => true,
    login: () => true,
    logout: async () => true,
    isInClient: () => true,
    getProfile: async () => ({ displayName:"Demo Tester", userId:"demo-user", pictureUrl:"", statusMessage:"" }),
    getContext: () => ({ type:"utou", userId:"demo-user", viewType:"full", endpointUrl:location.href }),
    sendMessages: async (messages) => { saveMessages(messages); return true; },
    closeWindow: () => { setTimeout(() => toast("DEMO：不會關閉視窗，也不會返回正式 LINE"), 0); },
    openWindow: ({url}={}) => { if (url) window.open(url, "_blank", "noopener"); },
    getOS: () => "web",
    getLanguage: () => "zh-TW",
    getVersion: () => "demo",
    isApiAvailable: (name) => name === "sendMessages"
  };

  try {
    Object.defineProperty(window, "liff", { value: demoLiff, configurable:false, enumerable:true, writable:false });
  } catch (_) {
    window.liff = demoLiff;
  }

  window.TOP_TAXI_DEMO = {
    enabled: true,
    environment: "demo",
    pageType: PAGE_TYPE,
    orderStorageKey: ORDER_KEY,
    addressesStorageKey: "topTaxiDemoAddresses",
    preferencesStorageKey: "topTaxiDemoCustomerPreferences",
    saveOrder,
    toast,
    markResult: () => toast("DEMO 測試完成｜不會正式派車")
  };

  function installBanner(){
    if (!document.body || document.getElementById("topTaxiDemoBar")) return;
    document.body.classList.add("top-taxi-demo-active");

    const bar = document.createElement("div");
    bar.id = "topTaxiDemoBar";
    const demoBase = new URL("./", location.href).href;
    bar.innerHTML =
      '<div class="demo-pill"><span class="demo-dot"></span><span>DEMO 測試環境</span></div>' +
      '<div class="demo-copy">所有送出均為 Sandbox，不會進入正式 LINE／n8n／派單</div>' +
      '<div class="demo-actions"><a href="'+demoBase+'index.html">測試首頁</a><a href="'+demoBase+'orders.html">測試訂單</a></div>';
    document.body.prepend(bar);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installBanner, {once:true});
  else installBanner();
})();
