# 反鏈恒 0 的真正根因：`anchorIndex` 要求 `頁.id`，ybh 沒有 `<頁>` → 整庫在 `xref.ts:410` 早退（你們 `19ccdb8` 是必要的一半，但不是這顆病）

> 2026-11-14（21:0x）
> 來文：`prompt-ybh-revlink-fix-and-exe.md`（母區 `19ccdb8` ＋ §五更正「exe `f800cf6f21f1` 已含修復、只差『v21 實機 count 0→非0』這一格」）
> 一句話：**這一格我方測了（真 exe e2e ＋ 離線模擬兩條路），答案是仍為 0——但病根不在鍵綴。adb 的屬性索引根本不存窗綴（`index-builder.ts:241-243` 建置時就把 `i` 截到 `#` 前），而 ybh 這一庫在讀 `聯.i` 之前就先被 `xref.ts:410 if (!idx) return;` 整庫退出了。真正的卡點是：`anchorIndex()` 沒有 `頁.id` 就回 null，而《瑜伽師地論》漢文集成按文獻本相就沒有「頁」這一層。**
> 請注意我方**不是**要你們回滾 `19ccdb8`：e2e 實測查表側收到的就是帶窗字串（`__revBar.pageId = "30p279a#34-40"`），所以那一刀是**必要**的。只是兩個修復**缺一不可**，光有它在 ybh 上永遠量不到東西。
> 拆掉閘門 A 後的預期數字在 §二：`__revPerf.n` 2,403 → **52,152**，`taisho?30p279a` 反鏈 **81 條**（整頁 236）。改完直接對這幾個數。

## 一、根因定位（碼路＋資料兩端都查實）

**碼路**（母區 `19ccdb8` 現行 main，我方全程唯讀）：

| 位置 | 內容 | 對 ybh 的後果 |
|---|---|---|
| `page-text.ts:33-37` `anchorIndex()` | `const av = await r.attributeValues('頁.id'); if (!av \|\| !av.pointers) return null;`，另需 `containers.tags` 名稱表裡有 `頁` | ybh **兩件都不具** → 回 `null` |
| `xref.ts:409-410` `addReverseFrom()` | `const idx = await anchorIndex(r); if (!idx) return;` | **整庫早退**，`聯.i` 那 49,749 條根本沒被讀到 |
| `xref.ts:515-516` `addReverseFromXrev()` | 同樣 `const idx = await anchorIndex(r); if (!idx) return;` | 連 `xrev` 快速路也一起堵死（⇒ §五的 xrev 方案必須先拆這一行） |

**資料端**（`tools/probe-lib-shape.ts`＋`tools/probe-rev-index-filters.ts`，讀 `D:\accelon3\ybh.adb` sha `1627b025…`＝v25）：

```
dbname=ybh  lineCount=973924  xrev=false
A1 attributeValues('頁.id') = null   A2 containers.tags = 有   A3 tags 裡有「頁」= false
B  `聯.i` 值數 = 49749   pointers = Int32Array(49749)   tags「聯」實例 = 49749
→ 早退：xref.ts:410 會 return，這顆庫對反鏈索引貢獻 0 條
```

ybh 的標籤結構是 `集 1／篇 17／章 360／卷次 360／書目 17／科NN…／聯 49,749／節聯 181,924／嵌 40,786／融 21,975`，**沒有「頁」**——漢文集成不是頁欄制文獻，`頁.id=null` 是資料本相，不是打包漏欄位。

**三庫對照**（同一支腳本、同一口徑）：

| 庫 | `頁.id` | tags 有「頁」 | `聯.i` | 過得了 `xref.ts:410`？ | 進索引條數 |
|---|---|---|---|---|---|
| `ybh.adb` | null | 否 | 49,749 | **否** | **0** |
| `fuyan-反鏈版.adb` | 344 | 是 | 2,403 | 是（閘門 C/D/E 全過、0 丟） | 2,403 |
| `taisho.adb` | 238,278 | 是 | 0（`pointers=null`） | 是，但 `xref.ts:412` 早退 | 0 |

## 二、離線模擬把兩個現況數字一次重現，並給出修復後的預期

`tools/sim-rev-index.ts` 照 `addReverseFrom` 的碼路在 Bun 端重寫一份建索引＋查表，只開兩個開關（閘門 A 關不關、窗綴剝不剝），四組跑同一批真檔；查表側照實機傳下來的字串（帶窗 `30p279a#34-40`）：

| 閘門 A（`xref.ts:410`） | 剝 `#a-b`（`19ccdb8`） | 過閘門的庫 | `n` | 鍵數 | **查帶窗 `30p279a#34-40`** | 整頁鍵 | （查純頁 `30p279a`） |
|---|---|---|---|---|---|---|---|
| 關＝母區現行 | 否（修前） | fuyan-反鏈版 | 2,403 | 2,004 | **0** | 0 | 0 |
| 關＝母區現行 | 是（現行） | fuyan-反鏈版 | 2,403 | 2,004 | **0** | 0 | 0 |
| 開＝提議修復 | 否 | ybh＋反鏈版 | 52,152 | 4,332 | **0** | 0 | 81 |
| 開＝提議修復 | 是 | ybh＋反鏈版 | 52,152 | 4,332 | **81** | 236 | 81 |

讀法：

- **第 1 列 vs 第 2 列**：剝不剝窗綴，`n` 一模一樣（2,403）——這正是你們 §一 那個「實測 `n` 與修前一字不差」的解釋，也說明**光靠 `19ccdb8` 在 ybh 上量不到任何變化**。
- **第 3 列 vs 第 4 列**：拆掉閘門 A 之後，若沒有 `19ccdb8`，純頁查會中（81）但**實機那條帶窗的查表路仍是 0**。所以你們那一刀管的是查表側，**有效、必要、請保留**。
- **第 2 列的 2,403 一條都不是 ybh 的**：那是 `fuyan-反鏈版.adb`（有 `頁.id`）貢獻的。⇒ **你們信裡 §一「n=2403≈沒帶窗的舊鏈、47k 帶窗鏈全成孤兒鍵」這句要改**：ybh 的 49,749 條不是「進了索引變孤兒鍵」，而是**從頭到尾沒進過索引**。
- HTML 端上輪那次 `{ms:5, n:0}` 也落在同一模型內：那場只開 ybh＋taisho（無反鍵版），兩庫都早退 → `n=0`。
- 明細彙總（含四列與查表命中）：`data/rev-index-sim.csv`。

## 三、窗綴到底在哪一層被剝掉——順帶給你們一條格式層鐵律

`tools/compare-lian-index-vs-source.ts` 對同一顆 ybh.adb 數了兩端：

| 端 | 讀法 | 條數 | 不同值 | 含 `#` |
|---|---|---|---|---|
| **正文／渲染端** | 解碼 `source` 容器後正規表達式（與我方 `verify-all` ③ 同口徑） | 49,749 | **29,350** 種 | **40,786 條**（例 `taisho?30p279a#34-40`） |
| **屬性索引端** | `attributeValues('聯.i')`（**你們建反鏈索引讀的就是這一路**） | 49,749 | 1,786 種 | **0 條** |

兩端「去窗後」的多重集**逐種逐條完全相等**（1,786 種、差異 0）。原因在你們自己的建置端：

```ts
// ts/src/index-builder.ts:234-243（原文註解：the `i` (linkto) value is cut at #）
if (attr.name === 'i') { const hash = value.indexOf('#'); if (hash > 0) value = value.slice(0, hash); }
```

由此得兩條結論：

1. **`entry.targetPage` 在索引路徑上永遠拿不到窗綴**。所以你們 §一 那句「`targetPage` 仍留完整 `#a-b`（點按鈕照跳精確窗，不回歸）」——在 `addReverseFrom`（屬性索引）這條路上**不成立**，只在 `xrev` 路上成立。要讓 ybh 的反鏈按鈕落回精確窗，只有 §五的 xrev 一條路。
2. **查表側仍必須剝窗**，因為 `pageId` 是渲染端直接交下來的帶窗原文。e2e 實測坐實：`__revBar = {db:"taisho", pageId:"30p279a#34-40", count:0}`（見 §六）。

## 四、我方上輪信（`prompt-adb-converter-revkey-not-effective.md`）有兩句要更正

1. §三 我方寫「『0 條帶窗』應是你方量測口徑的問題（可能是查 `n=` 而非 `i=`）」——**這句收回**。你們查 `聯.i` 得到 0 條帶窗是**對的**（屬性索引端確實為 0）；我方在 DOM 看到 `data-xref="taisho?30p279a#34-40"` 也**確實為真**（渲染端從正文 `i=` 取字串，`xref.ts:296-302`）。**兩造皆實，只差在層不在人。**
2. 你們 §一 猜「D 盤那顆是 pre-v21 版」則不成立：`1627b025…` 就是 v25（11-14 10:50 部署），`verify-all` ③ 的 29,350 種正是這顆 v25 正文裡的不同 `i=` 值。

## 五、建議的最小修復（兩個改點；改完我方 3 分鐘內回測）

**改點 1（核心，缺它 ybh 永遠不上線）**：讓反鏈建索引 tolerate「無頁庫」。`addReverseFrom` 真正需要的只有 `tags` 名稱表與 `lianVas`（`decodeBlockList('tags','聯')`），`頁.id`／`書` 取不到時降級為空即可：

```ts
// xref.ts:409 附近，示意
const idx = await anchorIndex(r);                       // 可能 null（ybh 這類無頁庫）
const lianVas = idx?.lianVas ?? await listLian(r);      // 沒有頁也能取到 49,749 個 <聯> VA
if (!lianVas.length) return;                            // 真一條聯都沒有才退
// pageByVa／bookVas 空時：entry.pageId=''、bookVa=-1（xref.ts:446-451 本來就是這種寫法）
```

`xref.ts:515`（`addReverseFromXrev`）裡同一個 `if (!idx) return` 也要拆，否則改點 2 上不了線。

降級後的 UI 表現（按你們現有碼推導，改完我方一起實測確認）：

- `pageId=''` → 分組鍵 `e.src + '\u0000' + e.pageId`（`xref.ts:1054`）會把「ybh 對同一欄的 N 條」收斂成**一排一顆按鈕、count＝N**；
- 標籤走 `xref.ts:1078-1079` 既有退路（`sourceLabelAt` 需要 idx，null 時退 `header.dbcname`）＝顯示「**瑜伽師地論漢文集成**」，沒有卷／科位置；
- 點按鈕 `data-rrev="ybh|va"` **仍能跳到正確 VA**（VA 來自 `lianVas`，不缺）——這一格是有用的。

**改點 2（可選，但能治「沒有座標」這件不好看的事）**：ybh 端產 `xrev` 容器。`xrev` 每行的 `srcPage`／`quote` 是自由字串，我方可把 **卷次＋科判節點**（例 `卷51·T1579-51#kpD51-003`）與 `聯.q` 引文寫進去，反鏈一排就能顯示「瑜伽師地論漢文集成 卷51·本地分…」，而且**順帶把精確窗補回來**（§三.1 那件事）。要做請先確認兩點：(a) 你們要不要我方發 `xrev`；(b) 容器名是否就叫 `xrev`、要不要 bzip2（我方讀得到 `bunzipAll` 吃得下多 block，但想按你們產生器 `D:\2026\ys` 的現狀對齊）。

**一筆性能風險請你們裁**（我方只推導、未實測）：`addReverseFrom` 每條聯都要 `mapperOf(r)`＋`docText(va, va+700, 20)`（`xref.ts:458-468`）取 cite／quote。現況 2,403 條建表 `ms:21`；ybh 進來是 **20.7 倍條數**，而且來自另一顆 47.95 MiB 的庫（跨庫換 block、快取命中率會掉）。若實測建表時間難看，改點 2（建置期算好）就是正解，別硬撐索引路。

**修復後你們會看到的數字**（真檔離線算，不是猜）：

- `__revPerf.n` 2,403 → **52,152**；索引鍵 2,004 → **4,332**；
- `taisho?30p279a`：**81 條**（整頁 `30p279`：**236 條**）；
- ybh 聯覆蓋 **1,786 個欄／602 個整頁** ＝ 大正 238,278 欄的 **0.75%**；單欄最多 `taisho?30p294b` **262 條**、整頁最多 **376 條**；
- 會真的觸發你們 R7 的兩條閾值：欄級 **>20 條 1,182 個**、**>40 條 224 個**（一排 cap 20）、**>200 條 1 個**（抽屜分頁）；整頁級 **>40 條 571 個**、**>200 條 9 個**。ybh 掛進來之前，R7 那兩格在 ybh 上根本沒有素材可驗。

## 六、實機 e2e（真 exe，跑完貼原始輸出）＋ exe 又換了一顆

我方量 `D:\accelon3\`：`accelon26.exe` 現行 **`a83921cb8157`**（11-14 20:30，19,410,432 B，`grep -c revPageKey` = **4**）——你們信裡點名的 `f800cf6f21f1`（19:09）已被 fuyan 線蓋掉；`accelon26.html` 也換成 20:34（2,546,571 B）。今日序列現在是 `a995796dab74 → 9e9ecce914a9 → ca1a5b5c3b92 → f800cf6f21f1 → a83921cb8157`。**往後請在信首直接給「exe sha 前 12 ＋ 內嵌資產 sha 前 12」**（上輪 §五 提過，這輪再報一次現值），我方就能一眼判定修復在不在這顆裡，省一趟來回。

`tools/test-exe-revfix.ts` 於 `a83921cb8157` 真啟動＋CDP（自用的 `ACCELON26_WEBVIEW_DIR`、port 9477，不碰使用者在跑的實例）：

```
對話框關閉嘗試 1：仍在
  對話框關閉嘗試 2：已關
① 點了聯： taisho?30p279a#34-40
② __revBar／儀表： {"revBar":{"db":"taisho","pageId":"30p279a#34-40","count":0,"srcs":[]},
   "revPerf":{"ms":23,"n":2403,"xrev":false},
   "xrefPerf":{"reader":0,"index":0,"reverse":0,"page":32,"paint":14,"total":46,"via":"none","j":""}}
③ 一排： {"有":false,"一排":0,"顯示全部":null,"revall":"","host":"","page":"","name":"","條頭":""}
④ 按顯示全部： 無按鈕
④ 抽屜第 1 次： {"可見列數":0,"更多":null}
error: timeout Runtime.evaluate   （_cdp.ts:110；④ 之後點 .revMore 時 CDP 逾時）
```

三件事一次定案：

1. `n=2403`、`count=0` 在**含 `19ccdb8` 的新 exe** 上與修前一字不差 ⇒ 與 §二 第 2 列完全吻合，修復在檔、但打不到這個病根。
2. `__revBar.pageId` 是 `30p279a#34-40`（**帶窗**）⇒ §三.2 那條「查表側必須剝窗」有直接實據，`19ccdb8` 該留。
3. 腳本在 ④ 之後 CDP 逾時（`.revMore` 不存在時點它），**不影響 ①②③ 的讀數**；R7 那兩格在 ybh 上目前無從驗——因為反鏈條根本沒出現，這也正是 §五 改點 1 修好後才有的第一件事。

## 七、上一輪 V9／V10 那兩格

V10 轉綠、V9 收我方配方進 `fusion-gate.ts --ybh`——我方無待辦。V9 那條「沒 hydrate 就沒鏈、整條斷在源頭」的判斷，在 §六 這次 e2e 裡也再次出現（同一段正文要捲 `#docBody` 才把帶窗聯拉進 DOM 點得到），我方那兩張對照截圖（`data/exe-v10-hydrated.png`／`data/exe-v9-nohydration.png`）仍在倉裡可供比對。

---

### 附：本輪腳本與重跑方式（全部唯讀；本區未動 `D:\2026\adb-converter` 一個字元）

| 腳本 | 用途 |
|---|---|
| `tools/probe-lib-shape.ts` | 列容器／tags／屬性鍵與計數 → 判 `頁.id` 在不在 |
| `tools/probe-rev-index-filters.ts` | 照 `xref.ts:402-483` 逐閘門計數（C 無 `?`／D tag 非聯／E lianVas 空），並把我方重寫的鍵與母區實作逐條對照（結果：一致） |
| `tools/sim-rev-index.ts` | 四組合模擬（閘門 A × 剝窗綴）→ 重現 2,403／0 並給修復後預期 52,152／81／236；彙總寫 `data/rev-index-sim.csv` |
| `tools/compare-lian-index-vs-source.ts` | 正文端 vs 屬性索引端的 `聯.i` 計數與去窗多重集對照 → 證 `index-builder.ts:241-243` 截窗 |
| `tools/count-lian-window.ts` | `聯.i` 帶窗條數速查 |
| `tools/test-exe-revfix.ts` | 真 exe e2e（`__revBar`／`__revPerf`／一排／抽屜） |

```
bun run link-audit/tools/probe-rev-index-filters.ts
bun run link-audit/tools/sim-rev-index.ts
bun run link-audit/tools/compare-lian-index-vs-source.ts
bun run link-audit/tools/test-exe-revfix.ts
```

— ybh 工作區　2026-11-14 21:0x（exe `a83921cb8157`／HTML 20:34 實測）
