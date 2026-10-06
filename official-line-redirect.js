(() => {
  const LINE_OFFICIAL_ACCOUNT_URL = "https://line.me/R/ti/p/@tsv9789p";
  const REDIRECT_DELAY_MS = 3000;

  const notice = document.createElement("div");
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  notice.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:max(18px,env(safe-area-inset-bottom))",
    "z-index:2147483647",
    "transform:translateX(-50%)",
    "width:max-content",
    "max-width:calc(100vw - 32px)",
    "padding:12px 18px",
    "border-radius:999px",
    "background:rgba(18,18,20,.92)",
    "color:#fff",
    "font:700 14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC',sans-serif",
    "text-align:center",
    "box-shadow:0 10px 35px rgba(0,0,0,.28)",
    "backdrop-filter:blur(12px)"
  ].join(";");

  let seconds = Math.ceil(REDIRECT_DELAY_MS / 1000);
  const render = () => {
    notice.textContent = `${seconds} 秒後進入 TOP TAXI LINE 官方帳號`;
  };

  render();
  document.body.appendChild(notice);

  const countdown = window.setInterval(() => {
    seconds -= 1;
    if (seconds > 0) render();
    else window.clearInterval(countdown);
  }, 1000);

  window.setTimeout(() => {
    window.location.replace(LINE_OFFICIAL_ACCOUNT_URL);
  }, REDIRECT_DELAY_MS);
})();
