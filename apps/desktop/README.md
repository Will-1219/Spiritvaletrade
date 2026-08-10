# ValeTrade Desktop Companion — Phase 2 POC

F8 tooltip capture for SpiritVale。流程：SpiritVale 前景視窗檢查 → 游標位置 → 螢幕 ROI 擷取（絕不全桌面）→ tooltip 邊界偵測 → 本機存檔 → UI 預覽。

## 結構

```
apps/desktop/
  crates/capture-core/   純 Rust 邏輯(ROI 數學 + tooltip 偵測),無 OS 相依,cargo test 可在任何平台跑
  src-tauri/             Tauri 2 殼層:F8 global hotkey、視窗偵測(Win32)、xcap 螢幕擷取、事件推送
  src/                   React 前端:狀態、預覽、手動測試按鈕
```

## Windows 建置步驟（Will 的機器）

1. 安裝 [Rust](https://rustup.rs)(stable)與 [Node.js LTS](https://nodejs.org)。
2. 安裝 Tauri Windows 前置需求:Microsoft Visual Studio C++ Build Tools + WebView2(Win11 內建)。
3. ```powershell
   cd apps\desktop
   npm install
   npm run tauri dev
   ```
4. 開啟 SpiritVale → 滑鼠移到物品上 → 按 **F8**。
5. App 視窗會顯示:擷取耗時、tooltip 偵測信心、裁切預覽。檔案存於 `%APPDATA%\com.valetrade.companion\captures\`。

沒開遊戲時,擷取會被拒絕(「SpiritVale is not the foreground window」)——這是隱私設計,不是 bug。要在無遊戲環境測試流程,可以把任何視窗標題改成含 `SpiritVale` 字樣,或先用「手動測試擷取」按鈕觀察拒絕路徑。

## 純邏輯測試（任何平台）

```bash
cd apps/desktop/crates/capture-core
cargo test   # 9 tests: ROI clamp / tooltip 偵測 / 雜訊拒絕 / 裁切
```

## 隱私規則（程式碼強制）

- SpiritVale 非前景視窗 → 拒絕擷取
- 只擷取游標周圍 bounded ROI(680×820 @1080p),整幀僅暫存記憶體並立即釋放
- 檔案只存本機;Phase 2 完全沒有上傳功能
- 無 memory reading、無 injection、無 packet sniffing、無遊戲自動化

## 已知待辦（Phase 2 → 3）

- tooltip 偵測參數(dark_luma 等)需用真實 SpiritVale 截圖校準——Will 提供 5-10 張 F8 截圖後調參
- 系統匣(tray)常駐模式
- 擷取結果餵給 PaddleOCR(Phase 3)
