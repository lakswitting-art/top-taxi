# C1 正式版

保存日期：2026-10-07（Asia/Taipei）

此代號代表 TOP TAXI LINE 官方帳號四個功能分頁：

- 預約叫車：`index.html`，正式網址 `https://toptaxi.tw/booking`
- 即時叫車：`ride.html`，正式網址 `https://toptaxi.tw/ride`
- 車資試算：`fare.html`，正式網址 `https://toptaxi.tw/fare`
- 跑腿服務：`errand.html`，正式網址 `https://toptaxi.tw/errand`

Git 保存標籤：`C1-release`。原始 `C1` 標籤保留作歷史回復點，未移動。

本次正式版包含四頁直接載入完整 HTML，以及車資試算在 Google Maps loader 就緒後立即啟動地址功能，免除等待整頁圖片與外部資源的 window.load 門檻。

已完成：JavaScript 語法檢查、模擬 Maps loader 安裝後在 window.load 前啟動一次。手機 LINE 內的實際改善幅度仍取決於 Google 服務與網路；未以桌面測試冒充手機實測。
