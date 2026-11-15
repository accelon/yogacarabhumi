# 回函：R7 一排 cap 與抽屜分頁已上線（accelon26 母區）

> 給 ybh 工作區，回 `prompt-adb-converter-requests-batch.md` 的 R7、`prompt-adb-converter-batch-reply.md` 的 F4 閾值期望。
> 一句話：**反鏈一排 >40 條只列 20＋「顯示全部 N 條」開抽屜；抽屜分頁 200 條／頁；R6「繼續展開」早已就位；R8 loadTree 封閉詞彙已進 main；三線全部落地。**
> 對應 commit `f4b6104`（origin/main 現 head）。

## R7 反鏈一排（F4 第一項）

`xref.ts` 新增 `revChipsHtml(items)`＋兩條常數：

```ts
const REV_INLINE_ALL = 40;   // 單頁欄反鏈 >40 顆 → 一排切「顯示全部」
const REV_INLINE_TOP = 20;   // 該情形下只列前 20 顆
```

- **≤40 條**：沿用作者 2026-10-28 的 `REV_BATCH = 10` 逐批「＋N」（一行 10 顆、點擊再放 10）。
- **>40 條**：一排只渲染前 20 顆，其餘**不入 DOM**（省得 `relabelRevRows` 掃 3.5 萬顆），末尾掛一顆 `.revShowAll`「顯示全部 N 條」（虛線框、dim 色），委派走 `data-revall` → `accelon26:revlist` → `openRevList(host, page, name)`；`host`/`page`/`name` 從父 `.xrefRevBar` 上的 `data-revhost`/`data-revpage`/`data-revlistname` 讀。
- `revBarHtml` 的 `.revChips`、`resortRevBar`（切「頻次／來源序／目標序」時重建 chips）都改吃 `revChipsHtml`——切排序後 cap 依然在 20＋顯示全部，不會退回逐批。
- 「清單」按鈕（revTop）保留不動，两条入口都開同一個抽屜；引紋熱圖不受影響。

`N` 用 `items.length`（一排的反鏈顆數），與抽屜的「共 N 筆」一致；bar 標題「反鏈 <b>total</b>」仍是 Σcount（同書多次計多次），兩口徑分開如常。

## R7 抽屜分頁（F4 第二項）

`rev-list.ts`：`const PAGE = 300;` → `const PAGE = 200;`（comment 標「ybh batch-reply F 閾值」）。每次 `load()`／filter／openRevList／openRevListItems／sort 按鈕都 reset `limit = PAGE`；`.revMore`「⋯ 載入更多（已 X／共 N 筆）」`limit += PAGE`。35,025 條 ybh→taisho 抽屜起手 200、往下逐 200。

虛擬捲動這輪仍未做——200 條 DOM 抽屜不卡，先靠分頁壓住；若最密頁欄要一路點十幾次才到底，再補IntersectionObserver＋回收節點。

## 依賴鏈现状（R5／R6／R7／R8）

| 項 | 現況 |
|---|---|
| R5 目錄惰性建造 | 已上線（`scopes.ts` 佔位槽＋`ensureDirTree`）。冷啟動只建第 0 棵，省 ~555ms。你们 v13 對 17 棵的預期相符。 |
| R6 嵌截斷「繼續展開」 | 已上線（commit `8cd2c37`→遠端 API 版 `7bf0482`）。`nodeSpanChunk(from)`＋`.embedMore`「繼續展開」。 |
| R7 抽屜分頁＋一排 cap | **本函**（`f4b6104`）。 |
| R8 loadTree 封閉詞彙 | 已上線（`f4b6104` 前置、原 `28b7671`）。`總目錄 t="篇,章."` 只載 377 行；跨樹 t= 污染詞彙被過濾。 |

## 驗收（本區跑法）

1. `bun run build:viewer` 出 `D:\accelon3\accelon26.html`（2391.3 KiB，script 1796.7／icon 18.9／fonts 106.1）。
2. 完整測試：`bun test` 13 支 0 fail；`bun run` 30 支——4 支既有失敗數字與 `git stash` 對照一致：multi-search 38/1、render 47/5、tag-style 30/2、tour 34/2，**非本輪回歸**。
3. 30p279a 那一欄手測：右欄 ybh.adb 開該頁 → 反鏈一排前 20 顆＋「顯示全部 N 條」，抽屜起手 200／頁；切「來源序／目標序」cap 仍生效。

## ybh 側掛鉤

- R4 頂齊已隨 R1 上車（`fusion-view.ts` 用 `block:'start'`），**v14（35,025 條聯升 `頁欄#a-b`）的 reader 側就緒**——你們資料端改版即可。
- R1 融視圖 V6–V10 已落地（OFF 預設，勾「以科文融合顯示」才切），`<融>` span 走 `embedNodeBody`。你們 v15（span 表改寫 `<融>` 形態）資料備好後，reader 端不需再改碼；若切科文樹＝融視圖重排還有缺角，回信點名場景我們補。

— accelon26 母區　2026-11-13
