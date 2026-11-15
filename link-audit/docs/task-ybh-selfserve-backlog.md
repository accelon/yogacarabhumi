# ybh 自贖清單 —— 不動 accelon26 前提下的可做項（交接用，冷啟動可讀）

> 2026-11-14 撰寫，**同日 21:0x 依本輪實測更新**。用途：另一個任務不必讀聊天史，拿這一檔就能接手。
> 一句話：**原頭號項「拿新 exe 複測反鏈 e2e」已做完並結案——反鏈恒 0 與母區 `19ccdb8` 那一刀無關，根因是 `xref.ts:410 anchorIndex` 要 `頁.id`、ybh 無 `<頁>` → 整庫在讀 `聯.i` 之前就早退。球已回母區，我方在資料端無可修。下一優先序改§五.2「T1579 自身科判補窗」。**


## 一、脈絡（三十秒）

`ybh.adb` 是十七部漢譯瑜伽系論書合成的一顆 ADB 容器（原料 `D:\2026\yogacarabhumi-dila`），
用 `D:\accelon3\accelon26.exe` 開啟。既定架構：**科文／原文／注文分層儲存，再用 `<嵌>`、
`<融>`、`<聯>`、`<節聯>` 把它們指回同一份原文**，讓讀者能換科判看同段論本。
母區（`D:\2026\adb-converter`，reader＋exe 的正典）與我方（ybh 資料端）分兩條線，
使用者是唯一通道；母區 fuyan 線自己壓 exe、自己發佈，我方不代壓代發。

## 二、硬邊界（違反即錯）

> **2026-11-15 權責變更（使用者定案）**：耀悟法師是 **ybh 的 maintainer**——ybh.adb 改什麼、
> 不改什麼**以法師為準**；需要 accelon26 配合的事回報使用者；**法師（含他的 agent）不得發布官網**。
> 完整規則與現況速覽見 `link-audit/docs/MAINTAINER-HANDOVER.md`（法師或其 agent 的起點檔）。
> 本檔§二的第 2、3 條是給**本區 agent**的約束，不因上述變更而放寬。
## 二、硬邊界（違反即錯）

1. **不改 accelon26／母區任何檔**（讀檔允許，寫檔需先問使用者）。
2. 不跑 `release.ts`／`deploy.ts --site`（＝發佈，寫 `versions.json`＋www＋傳兩站），除非使用者明說「發佈」。純本地重壓（`build-desktop.ts`＋`go build`）也不由我方做。
3. commit／push 只推自己產出的檔；別人改的／未追蹤的一律不夾帶。未獲使用者指示不 commit。
4. 刪除一律 `host_safe_delete`（進回收桶），不用 `rm`／`Remove-Item`／API 硬刪；刪目錄前先清點內容再報數，別真的「清空回收筒」。
5. 交付物放 `link-audit/{docs,data,tools,web,patch,fixtures}`，不放倉庫根。
6. 驗收必須走**產品自己的碼路**（`renderEmbed`／`pageHanTextOf`／`nodeSpanText`／engine `search`），抽樣綠＝假綠，全庫斷言必全掃；驗收腳本本身也要被驗。
7. 回覆用繁體中文；數字一律附量測方法，沒有實據就寫「前測值／待復算」，不圓話。

## 三、現況帳目（本輪量到，非推估）

| 項 | 值 | 怎麼量的 |
|---|---|---|
| 部署庫 | `D:\accelon3\ybh.adb` v25，50,279,472 B（47.95 MiB），sha 前綴 `1627b025`，mtime 11-14 10:50 | `sha256sum` |
| anchor-check | 94,632 鍵，0 FAIL | `verify-all.ts` 第二節 |
| 段落 ref | 10,200（v25 由 10,162 增） | `verify-all.ts` 第四節＋SUMMARY §16.30 |
| `<融>` | 21,975 枚（大綱樹掛進主體節點） | SUMMARY §16.29 |
| 標籤 | 1,379 種；`聯`=第 22、`嵌`=24、`融`=149 | `probe-tag-index-limit.ts`（只讀標籤表） |
| exe（新） | `D:\accelon3\accelon26.exe` 19,410,432 B，mtime **11-14 20:30**，sha 前綴 `a83921cb8157` | `sha256sum` |
| exe 是否含母區鍵修復 `19ccdb8` | **字串層面命中**：`revPageKey` 在 exe 與 `accelon26.html` 各命中 4 行（html mtime 20:34） | `grep -ac revPageKey` |
| HTML 版 | `D:\accelon3\accelon26.html` 2,546,571 B | `ls` |
| 母區 tip | `19ccdb8`（`revPageKey`／`revPageWholeKey`，建鍵 3 處＋查表 2 處對稱）；其前為 `6091226`（`tools/fusion-gate.ts`，V0/V6/V7/V8 起真 exe 自動綠 4 passed） | 母區回信＋我方復核 |
| 我方倉庫 | 本地 `2ffa996`（本輪產出**尚未 commit**，等使用者指示）；fork `18fac96`（`github.com:443` 不時死，REST 備援 `push-via-api.ts`） | `git log` |
| 磁碟 | `link-audit/deliv` 43 MB、scratch `D:\2026\_scratch-ybh` 716 MB（本輪只多一個 `wv-revfix-1794659818009` 11 MB）、回收桶另有先前 3 個 WebView2 profile 約 222 MB 待核准 | `du -sh` |
| **ybh 的 `聯` 到底幾條（本輪定案）** | 正文端 `<聯 i="taisho?…">` **49,749 條、29,350 種、含 `#` 40,786 條**；屬性索引端 `attributeValues('聯.i')` **49,749 條、1,786 種、含 `#` 0 條**（兩端去窗後多重集逐條相等） | `compare-lian-index-vs-source.ts`（解碼 `source` 容器＋`attributeValues` 各掃一次） |
| **反鏈索引收到 ybh 幾條** | **0 條**——`anchorIndex()`（母區 `page-text.ts:33-37`）要 `頁.id`、ybh tags 無 `頁` → `xref.ts:410 if(!idx) return` 整庫早退；`fuyan-反鏈版.adb`（有 `頁.id`）貢獻 2,403 | `probe-lib-shape.ts`＋`probe-rev-index-filters.ts`＋真機 e2e `{ms:23,n:2403,xrev:false}` |

**R7／V9 目前狀態**：反鏈一排 cap 20＋「顯示全部」、抽屜 200/頁 —— 因索引對 ybh 收 0 條而無從 Exercise；V9（點科判觸發 linkTo）尚未量到綠，V10（延遲取段、增量峰值 2 ≪ BATCH 50）已轉綠。**本輪已算出修復後的預期觸發面**（`sim-rev-index.ts`／`data/rev-index-sim.csv`）：欄級 >40 條 224 個、>200 條 1 個；整頁 >40 條 571 個、>200 條 9 個。

**§五.2 補窗基數（本輪後段實測，口算 1,588 已作廢）**：kpD 標題行定義 11,671 → 已發 j 窗 4,499 → 無窗 7,172；但無窗者 **5,115 條沒有正文首行**（上級科判只有標名）＋171 條過短 ⇒ **送搜母體 1,886**。實測判語：**可排工 483**（連寫唯一 ≥7 字）／62（唯一但僅 4–5 字）／338（鄰近弱尺救回）／248（多命中需消歧）／755（兩把尺都搜不到）。正控：連寫尺召回 91.5%、唯一 83.0%、唯一且還原同頁 82.5%（頁層級精確 99.4%）。分桶反直覺結論——`T-demoted`（曾被剝窗）可補率 **73.8%**，`I`（插值）連寫唯一僅 **0.8%**。明細 `data/t1579-window-baseline-both.csv`，正典 SUMMARY §16.34＋勘誤#27。

## 四、已殺死的假設（別再花預算重試）

1. **8-bit 標籤 id 截斷**：曾疑母區 `idx.tags[(ptr>>>24)&0xff]` 只取一位元組、ybh 1,379 種標籤會溢出。實測 `聯` 在 ybh 與「能進索引的 fuyan-反鏈版」都排在**第 22 位**（反鏈版僅 34 種標籤）→ 截斷理論死亡。差異必在索引的**源庫枚舉／觸發條件**。→ ✅ 本輪裁決：是 `anchorIndex()` 的 `頁.id` 閘門（`xref.ts:410`），不是源庫沒被枚舉（見 §五.1）。
2. **用位元組 grep 數 ybh 的聯**：`grep -ao '<聯 i="...' ybh.adb` → **0 筆**，全檔「聯」字只出現 **1 次**（標籤表定義處）。原因是 .adb 正文的標籤以 id 編碼、屬二進位結構。凡「ybh 有／沒有 49,749 條帶 `#a-b` 的聯」之爭，**必須走解碼路**重測，位元組掃描的結論無效。✅ **本輪已按此裁決完畢**（見 §五.1 結案欄與 `compare-lian-index-vs-source.ts`）。
3. **49,749 之爭已結案，答案是「兩邊都對，差一層」**：我方已用解碼路在部署檔上獨立復算＝**49,749 條**（正文端與索引端條數相同）；母區說「0 條帶 `#a-b`」也對，但那是**屬性索引端**——`index-builder.ts:241-243` 建索引時就把 `i` 截到 `#` 前（原文註解 "the i (linkto) value is cut at #"）。我方 DOM 看到的 `30p279a#34-40` 是**渲染端**從正文 `i=` 直取（母區 `xref.ts:296-302`）。⇒ **代價：`entry.targetPage` 在索引路徑上永遠拿不到窗綴**，母區「點按鈕照跳精確窗」只在 `xrev` 路成立。往後引用這個數，必寫明是 `source` 容器還是 `attributes` 容器。
4. **「舊 exe 沒有融視圖」**：已由母區換檔解決（五個符號 `fusionWrap/fusionBlock/initFusion/setFusionView/hasFusionTag` 從 0 命中轉 5 命中）；不要再拿 11-13 那顆做對照。
5. **抽樣 250 枚 `<融>` 走 data 路**：只證資料填充，證不了「按一下開關」；交互與效能兩維必須上機。
6. **母區 `19ccdb8`（`revPageKey` 剝窗綴）救不了 ybh**：四組合模擬證明「剝不剝窗綴，`n` 都是 2,403」——那一刀管的是**查表側**（真機 e2e 量到 `__revBar.pageId="30p279a#34-40"`，故該留、該生效），但 ybh 的病在**建索引側的 `頁.id` 閘門**，兩刀缺一不可。別再拿「exe 已含 `revPageKey`」當「反鏈該亮了」的論據。

## 五、可做項（依建議順序）

> **順序已變**：原 §五.1 結案（見下），下一棒是 §五.2「T1579 自身科判補窗」。

### 1. 拿 20:30 新 exe 複測反鏈 e2e ——✅ **本輪結案（2026-11-14 21:0x）**

- **做了什麼**：真機 e2e（`test-exe-revfix.ts`，exe 又換到 `a83921cb8157` 20:30）＋離線四組合模擬（`sim-rev-index.ts`）＋逐閘門計數（`probe-rev-index-filters.ts`）＋庫形態探針（`probe-lib-shape.ts`）＋兩端窗綴對照（`compare-lian-index-vs-source.ts`、`count-lian-window.ts`）。
- **結果**：`count=0`、`__revPerf={ms:23,n:2403,xrev:false}`，與含 `19ccdb8` 與否無關。根因**不是**鍵綴，而是母區 `xref.ts:410`（及 `:515` xrev 路）的 `if (!idx) return`——`anchorIndex()` 要 `頁.id`，ybh 無 `<頁>` 這一層 → **49,749 條一條都沒進索引**；那 2,403 條全來自 `fuyan-反鏈版.adb`。
- **交付**：缺陷單式回信 `docs/prompt-adb-converter-revgate-anchorindex.md`（帶檔名＋行號、含最小修法兩案、修復後可對的數字 `n=52,152`／`taisho?30p279a=81`／整頁 236、性能風險一筆如實標「只推導未實測」）；SUMMARY 記 §16.32 ＋ 勘誤 §八#25／#26。
- **剩下的球在母區**：拆掉閘門 A（`xref.ts:410`／`:515` 降級容忍無頁庫）。我方待辦只有「母區改完 3 分鐘內重跑 `test-exe-revfix.ts`＋`test-rev-ab.ts`」，以及若母區同意，**我方產 `xrev` 容器**（見 §七.3）。R7 兩格與 V9 在母區拆閘門之前**在 ybh 上無素材可驗**，不要再排預算。

### 2. T1579 自身科判補窗 ——✅ **v26 已發射 468 條（2026-11-15 00:35）**

- **做了什麼**：`span-fill-t1579.ts` 把基數 483 條算成逐字 j 窗寫回 `spans-j-verified.tsv`（原檔備份 `*.pre-fill.tsv`）→ 重 build → 部署 `D:ccelon3\ybh.adb` **v26**（50,335,640 B，sha `d77b1ca9…`；v25 備份 `out/ybh.adb.v25.bak`）。
- **閘門**：`renderEmbed` 的 mark 漢字數必等於 `je-js` 且窗首相符（同 `span-refine-k.ts:176-179` 既有標準）。過閘 **468**（含跨頁鉗尾 49）、頁內定位失敗 14、窗首不符 1、無首行 0。
- **驗收**：`verify-all.ts` 六節全綠 PASS（③29,350→**29,612**/0）；行內嵌 40,786→**41,254（+468）**；`verify-fill-v26.ts` 從**已部署位元組**回讀逐條 renderEmbed → **468/468 相符、0 偏差**。
- **踩過的坑**（勘誤#29）：發射腳本與基數腳本必須共用同一份首行提取規則（各寫一份必漂移）；14 條失敗的真因是 **VA 含標點 vs `pageHanTextOf` 只剩漢字**兩套座標系沒換算，找鄰頁無效。
- **下一棒（三選一，清單已拆好）**：`data/review-62.csv`（4–6 字唯一，含 T-demoted 46）｜`data/review-338.csv`（邻近弱尺救回，含 I 260）｜`data/review-248.csv`（多命中需消歧，含 T-demoted 178）。另可做：把 VA→漢字偏移換算補進腳本，那 14＋1 條就能一起發射。


- **基數已實測，口算 1,588 作廢**（`count-t1579-window-baseline.ts` 全量跑、正控校尺；正典見 SUMMARY §16.34＋勘誤#27）：
  - 全集 kpD 標題行定義 **11,671**（100 卷）→ 已發 j 窗 **4,499** → 無窗 **7,172**。
  - 但無窗者裡 **5,115 條根本沒有正文首行**（上級科判只有標名）＋ 171 條首行過短 ⇒ **送搜母體只有 1,886 條**。
  - 實測判語：**可排工 483**（連寫唯一且 ≥7 字）｜62（唯一但僅 4–5 字，先覆核）｜338（鄰近兜底，弱尺）｜248（多命中需消歧）｜755（兩把尺都搜不到）。
  - 兩把尺的正控：連寫尺召回 91.5%／唯一 83.0%／唯一且還原同頁 82.5%（頁層級精確 99.4%）；鄰近尺正控僅 17 條樣本（8/8 對）——**所以鄰近救回的 338 條不得直接當可補**。
- **反直覺的排序結論**：`T-demoted`（曾被 `span-filter.ts` 判窗首≠引文而剝窗）775 條可補率 **73.8%**、搜不到僅 3.2%；`I` 插值族 1,028 條連寫唯一僅 **0.8%**。⇒ **先救「曾被剝窗」那批**（是窗位算錯，不是資料沒有），I 族那 704 條搜不到的是結構性缺口，如實留粗窗。
- **第一步**：483 條走 `span-refine-k.ts` 重算逐字 js/je。
- **驗收**：逐條過 `span-filter.ts` 的 `renderEmbed`（窗首 6 漢字必等於引文，且 `<mark class="xrefHit">` 長度必等於 `je-js`）才寫回 `spans-j-verified.tsv` → 重 build → `verify-all.ts` 全六節（第四節必全掃）。
- **坑**：唯一性判定用產品 `hanChars`（`accelon26/han.ts:22`，`\p{Script=Han}` 帶 u flag），不要用 `[一-鿿]`（㲉 U+3C89 會造出假「真錯位」）；跨頁時 `js` 要鉗到頁尾並記 `crossPage`，寧可留粗窗也不要錯位。
- **待裁**：弱尺 338 條與需消歧 248 條要不要開第二輪。

### 3. `<融>` 的 `max` 自適應

- **目標**：21,975 枚 `<融>` 目前全部一刀切 `max="24"`（為規避 `max=200` 拉出 17,029 字的大殼而定的防呆值），改成依目標節點實際行數分級發窗。
- **根據**：母區已在 `docs/adb/NODE-ANCHORS.md` 寫明 `max` 單位＝adb 行（`blocksVirtual` 一條）非字元，`<融 max>` 與 `<嵌 sub="1">` 共用 `nodeAnchorInfo → nodeSubtreeEnd → nodeSpanText` 同一碼路。
- **第一步**：以 `probe-fusion-size.ts` 的分佈為輸入，選一個「不爆字也不截太短」的分級表（例如依子樹行數分 3–4 檔），在 `build-ybh.ts` 發射處改寫。
- **驗收**：`verify-fusion-ybh.ts`（標籤表含 `融`、成對／自閉計數、250 抽樣填充、renderer OFF↔ON 剝殼後文字逐字相同、假錨走 V7 保留佔位）＋ 上機 `test-exe-v9v10.ts` 量 V10 增量峰值仍遠低於 `BATCH=50`，並補記 V9 一次。
- **坑**：`<融/>` 自閉合會吐未閉 span、弄壞 HTML（`test-fusion-form.ts` 已證）——必須成對 `<融 …></融>`；標籤若不在庫裡，`hasFusionTag()` 讀不到 → 開關整個不渲染。

### 4. 死錨 273 種／1,475 條的去處

- **根據**：`dead-anchors.tsv`（`list-dead-anchors.ts` 產、`dead-anchor-evidence.ts` 附證）。多數源自 DILA 略符表自己註記 T1584、T2801「科判未完成」，屬源頭缺口，非我方對錯。清單數字是 v10 時代正典值，v25 後**需重跑一次 `list-dead-anchors.ts` 更新計數**。
- **兩條路**：(a) 由使用者轉貼 DILA；(b) ybh 端把這些「查無此科」降成如實標名的平列標籤＋註記（誠實平列優於虛構階層，是既定原則）。**不要硬掛假窗。**

### 4b. 官網上架 ——✅ **ybh.adb 已上兩站（2026-11-15）**

- 頁面 `https://shutonggui.cn/accelon26/adb/index.html`（鏡像 `nissaya.cn`）已列「瑜伽師地論漢文集成」，
  **位置緊貼「大正新脩大藏經」上方**；該列下方說明列標注「數據提供者：耀悟法師、法鼓文理學院；
  授權方式 Creative Commons Zero（CC0）」。同批把該頁「關於這些資料庫」改成「僅供個人學習及學術研究使用」。
- **這頁是生成的**：要改 `www/adb/index.txt`（順序）＋ `deploy/adb-status.json`（`description` 才是公開可見的說明，
  `source`/`licenseNote` 對「可下載」的庫不顯示）＋ `deploy/adb-notes.json`（更新對話盒的 notes），
  再跑 `ts/tools/make-adb-index.ts`。**手改 `www/adb/index.html` 會被下次重建蓋掉。**
- **上傳必用 `ts/tools/publish-adb.ts --files ybh.adb --allow-large`**（同步主站＋鏡像、比對遠端 sha、>30 MB 有大檔閘）。
  `.local/publish-adb.ts` **只打主站**，會造成鏡像缺檔；`deploy.ts --site-only` 的前置比對會擋下來並報「鏡像：站上沒有這個檔」。
  而且那道閘在上傳**之前**，被擋時鏡像的 index.html 也不會更新——**驗發佈要抓線上內容，不能只看 log 的「N 個檔案都在線上」**。
- 記帳：母區 `docs/adb/adb-version-log.md` 新增 `### 2026-11-15` 節＋工作區表補我們這列；
  本區正典見 SUMMARY §16.36。母區六檔改動在其 git 工作樹、未 commit（母區的 commit 歸母區）。

### 5. 帳目與磁碟收尾

- `link-audit/deliv/` 43 MB：**本輪多放了兩份副本**（`prompt-adb-converter-revgate-anchorindex.md`＋`rev-index-sim.csv`）供卡片呈現；刪了會讓舊交付卡片失效，需使用者裁；要刪走 `host_safe_delete`。
- scratch 3 個本輪 WebView2 profile（約 222 MB）：`host_safe_delete` 核准逾時，尚未搬進回收桶；先清點名稱與大小再報。（本輪只新增 `wv-revfix-1794659818009` 11 MB；真機 e2e 那次的 CDP 逾時未產生新 profile。）
- PR #1 遠端狀態：用 REST 查一次（`git credential fill` 取 token、绝不回顯；`gh` CLI 不在機器上、`github.com:443` 不時死）。
- `SUMMARY.md`：本輪已併入 §16.32（根因鏈＋四組合模擬表＋真機 e2e 原始輸出）與勘誤 §八#25（引用數字先問來源集合是誰的）／#26（同一個聯在渲染端與索引端字串不同）。**前一版清單列的三筆（截斷否證、位元組 grep 無效、20:30 exe 含 `revPageKey`）也已在本輪實測中覆核並寫入。**

## 六、檔案索引（都在 `D:\2026\_scratch-ybh`，正典副本在 `link-audit/tools`）

生成／驗收：`build-ybh.ts`、`verify-all.ts`（六節一條命令）、`verify-zhu-refs.ts`、`verify-fusion-ybh.ts`、`verify-mother-claims.ts`、`audit-page-overflow.ts`
科判對齊：`span-build-zhu.ts`（LIS 對齊、AT>AP 優先、中位數帶閘）、`span-zhu.ts`（段落 ref，`--only`／`--wide=N --wstep=M`）、`span-refine-k.ts`（粗窗→逐字，`--retry-audit=`）
上機 CDP：`test-exe-revfix.ts`（**port 已改 9477**，避開佔用的舊 port）、`test-rev-ab.ts`、`test-rev-index-source.ts`、`test-exe-v9v10.ts`、`test-exe-v9b.ts`、`test-exe-fusion-ybh2.ts`、`test-fusion-form.ts`、`probe-fusion-size.ts`、`probe-tag-index-limit.ts`
本輪新增的離線探針（全部唯讀、Bun 直開 `AdbReader`，不用開 app）：`probe-lib-shape.ts`（容器／tags／屬性鍵計數，判 `頁.id` 在不在）、`probe-rev-index-filters.ts`（照母區 `xref.ts:402-483` 逐閘門計數）、`sim-rev-index.ts`（閘門 A × 剝窗綴 四組合模擬 → `data/rev-index-sim.csv`）、`compare-lian-index-vs-source.ts`（正文端 vs 索引端）、`count-lian-window.ts`（帶窗條數速寫）、`scan-hash-attrs.ts`（掃全庫哪個屬性鍵帶 `#`；答案：只有 `節聯.n` 帶，那是庫內錨不是跨庫窗）
基數／量尺：`count-t1579-window-baseline.ts`（§五.2 補窗基數，含雙正控與兩把尺，`--search` 才跑第二段）、`spotcheck-t1579-baseline.ts`（**回原檔抽檢**：改走 `engine.ts` 行級路徑核對落點，`--near` 抽鄰近那批）、`probe-pageid-alignment.ts`（頁.id 值序 vs pointer 序是否同序——實測同序，span-build 的 pageOf 無疑義）、（§五.2 補窗基數，含雙正控與兩把尺，`--search` 才跑第二段）、`probe-book-range.ts`（自檢「書＝瑜伽師地論」VA 區間有沒有圈進 100 卷）
引擎：`D:/2026/adb-converter/ts/tools/adb-skill/engine.ts`（`openAdb`／`search`／`toc`／`raw(line)`）、母區 `ts/tools/_cdp.ts`（`launch`／`Cdp.attach`／`loadAdb`）
推送備援：`push-via-api.ts`；回收桶：`purge-my-bin-items.ps1`（**僅 ASCII**，PowerShell 5.1 會誤判 UTF-8 中文註解）
帳目：`link-audit/docs/SUMMARY.md`（§16.21–§16.31 是本輪大事記）、`draft-kemon-gen-zhu.md`（進度線）、`prompt-adb-converter-*.md`（給母區的五封信）

## 七、母區已承諾、我方等著的兩件事

1. `tools/fusion-gate.ts --ybh` 分支照我方 V9 配方實作（捲 `#docBody`、點 `.fusionBlock[data-done="1"] .nodeLink`、比 `scrollTop` 位移＋`mark.xrefHit` 計數）——母區說下次動 fusion-gate 時一併收。
2. ~~反鏈若根因確認在母區索引枚舉，由母區修碼~~ → **本輪已確認根因在母區 `xref.ts:410`／`:515` 的 `anchorIndex` 早退**，缺陷單已開出（`docs/prompt-adb-converter-revgate-anchorindex.md` §五 兩個改點）。我方等的是：**(a) 拆閘門 A 的最小修法要不要照改；(b) 要不要我方發 `xrev` 容器**（要則需母區回：容器名是否就叫 `xrev`、要不要 bzip2、`D:\2026\ys` 產生器格式細節）。
3. **接手者注意**：在母區回改之前，反鏈／R7／V9 三格在 ybh 上都**沒有可驗素材**，重跑 e2e 只會再拿到 `n=2403`。要做資料端工，直接從 §五.2 起。

---

## 八、上機導航的新發現（影響 V9 與一切「點得到」類驗收）

**讀者是分頁制，不是無限卷軸**。實測狀態列「第 1 / 987 頁　行 37–236（共 197,379 行）」，所以在 `#docBody` 加 `scrollTop` **只在一頁內移動**，內容不會往前——過去幾輪「捲 N 段找跨庫聯／晶片」的策略從根上就使不上力（V9 卡點、本輪 v26 嵌窗 e2e 都撞同一牆）。
可用做法三選一（本輪尚未驗通任何一個）：① 點底欄「下一頁」箭頭逐頁推；② 開「連續閱讀」讓它跨頁；③ 用左欄 `#query` 輸入 `#行號` 直跳（行號取自成品 `ybh-anchor-check.tsv` 的 anchor→va→line）。本輪用 ③ 跳 14 次：畫面能見 11 枚 `.embedChip` 且全部帶 `data-j`（`<嵌 j>` 確實有渲染），但頁碼讀數回传「?」——**直跳到底生效沒有尚未確認**，下一輪先把這件事測穿，再回來補 v26 的「使用者點得到」這一格與 V9。
另兩筆教訓：載入第二顆庫後 active 會跳到那顆，**驗 ybh 一定要先點回 ybh 分頁**（否則 `#dirPick` 只有大正的「經目｜分卷」）；腳本 `p.kill()` 殺不掉 GUI 進程，本輪留了 4 顆殭屍 accelon26.exe（約 00:53–01:14 之間起），已用 `Stop-Process -Id` 清掉——下輪請改用 `taskkill /PID x /T /F`。

---

— ybh 資料端　2026-11-14 撰寫、11-15 01:2x 更新（本檔為交接用，**未 commit，等使用者指示**；本輪產出：回信 1 封、探針／基數／發射腳本 15 支、v26 成品、`data/rev-index-sim.csv`＋`data/t1579-window-baseline{,-both}.csv`＋`data/review-{62,338,248}.csv`、**v26 成品**、SUMMARY §16.32／§16.34／§16.35＋勘誤 #25–#29）
