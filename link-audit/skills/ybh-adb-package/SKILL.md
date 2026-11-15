---
name: ybh-adb-package
description: 在本地把《瑜伽師地論》漢文集成原料（raw/*.md）打包成 ybh.adb，並用 verify-all 六節验收判定能不能交付。適用情境：修改轉檔規則／發射標記後重建成品、或在另一台機器上佈局本倉。不涵蓋 accelon26 閱讀器改動與官網發布。
version: 1.0.0
---

# ybh.adb 本地打包與驗收

適用對象：`D:\2026\yogacarabhumi-dila`（或任何位置的本倉 clone）的維護者與它的 agent。
**範圍只有「打包＋本地驗收＋本地部署」**；動到 accelon26 閱讀器碼、或要把 ybh.adb 發布到官網，都不在本 skill 內（見「邊界」）。

## 步驟 0：環境體檢（先跑這個，不要直接 build）

```bash
bun run link-audit/tools/preflight.ts          # 人讀版
bun run link-audit/tools/preflight.ts --json    # 要貼進信裡回報環境的版（不含憑證）
```

它檢查：原料 `raw/`、中繼目錄、成品部署目錄、`taisho.adb`（跨庫連結的目標庫）、
以及打包器與 reader 模組（`adbauthor.ts`／`adb.ts`／`table-block.ts`，來自 adb-converter 原始碼）。

**路徑可用環境變數覆寫，不必改碼、也不必複製我們的磁碟佈局**：

| 變數 | 意義 | 我們這台的預設值 |
|---|---|---|
| `YBH_HOME` | 本倉根（含 raw/ 與 link-audit/） | 由檔案位置自動推得 |
| `YBH_SCRATCH` | 建置中繼與大輸出 | `D:/2026/_scratch-ybh` |
| `ACCELON_SRC` | adb-converter 的 `ts/src` | `D:/2026/adb-converter/ts/src` |
| `ACCELON_ADB` | 成品 adb 部署目錄 | `D:/accelon3` |
| `TAISHO_ADB` | 大正藏底座檔 | `D:/accelon3/taisho.adb` |

**必要前提**：打包需要 adb-converter 的 TypeScript 原始碼（打包器 `authorAdb` 與 reader 模組在那邊），
以及 `taisho.adb`。缺任何一項 preflight 會列在 `missing`，此時 build 一定失敗——先看這個，比看
`Cannot find module` 快得多。

## 步驟 1：建置

```bash
bun run link-audit/tools/build-ybh.ts
```

輸出在 `$YBH_SCRATCH/ybh/ybh.adb`。建置報告會印：行數、詞元數、標籤種數，以及互鏈發射計數
（`節聯`／`CBETA 聯`／科判行拆算／行內嵌枚數／`<融>` 枚數）。**把這些數字記下來**，下一步要對照。

## 步驟 2：驗收（六節，全綠才算 PASS）

```bash
bun run link-audit/tools/verify-all.ts <要交付的 adb 路徑> v<版號>
```

六節各自驗什麼：

| 節 | 驗什麼 | 判準 |
|---|---|---|
| ① | 本體大小與 sha256 | 記下來供部署比對 |
| ② | 庫內錨點（`節聯`／`嵌 i="ybh?…"` 目標） | 逐條解析，FAIL 必須 0；含負控與「篇級≠卷級首筆」語義控 |
| ③ | 跨庫 `taisho?…` 座標 | 每種都要能在 taisho.adb 解析出 VA，FAIL 0 |
| ④ | 段落 ref | **從已部署 adb 位元組回讀**＋`renderEmbed`，不是從中間檔 |
| ⑤ | 目錄樹回歸 | 走介面實際那條碼路（`loadTrees→loadTree→buildTree`），不是 CLI `toc` |
| ⑥ | `<融>` | 枚數、成對性（自閉合會吐未閉 span）、抽樣填入 |

判定行是 `=== 判定 PASS`／非零失敗計數。**任何一節紅就不要交付**。

### ⚠ 驗收的檔案必須「等於」交付的檔案

實測踩過：並行 rebuild 讓 PASS 記在重建前的位元組上，實際部署的卻是另一顆。
所以交付前做這一步：

```bash
sha256sum "$YBH_SCRATCH/ybh/ybh.adb"        # 剛驗的那顆
sha256sum <要覆蓋去的目標>                    # 部署前後都要比
```

## 步驟 3：本地部署（注意硬鏈）

1. 先備份舊檔：`cp <目標>/ybh.adb <本倉>/out/ybh.adb.v<舊版>.bak`（`out/` 已 gitignore，48 MB 級不入版控）。
2. **檢查目標是不是硬鏈**（我們這台實測是，另有兩個名字挂在母區測試目錄下）：
   ```powershell
   fsutil hardlink list D:\accelon3\ybh.adb
   ```
   若回傳多個名字，**就地截斷寫入會連帶改掉别人的档**。正確做法：先把這個名字移走
   （`Move-Item` 到別名），再把新檔放入，成為獨立 inode；並前後比對各路径的 sha 確認沒誤傷。
3. 部署後用步驟 2 的命令**對部署那顆重新驗一次**（不是對 scratch 那顆）。

## 步驟 4：查證成品（不要用位元組 grep）

`.adb` 正文的標籤是**以 id 編碼**的，`grep '<聯 i="' ybh.adb` 一定得 0 筆——這不是「資料不存在」的證據。
一律走引擎解碼路或 adb MCP API：

- `adb_list / adb_info / adb_tags / adb_toc / adb_search / adb_read`
- 慣例：**先 info／search 定位，需要才 read**；引用結果只記**行號與頁欄**。
- 行號是**行表**，不是文字裡的 `\n`：把 source 區塊串接後 `split('\n')` 會得到「1 行」的錯答案；
  要用 `VaPaMapper.lineText(i)` 或 `adb_read` 的行級介面。
- 計數要跨腳本一致時，**提取規則只能有一份實作**（同一批資料被兩支腳本各寫一份規則必漂移，
  實測過：表格行一支取整行、另一支取最長格，同一記錄得到不同判定）。

## 步驟 5：記帳

- `link-audit/docs/SUMMARY.md` 新增一節：版號、改了什麼、六節實測數字、成品 sha 與大小。
- 同檔 §八「勘誤表」：**如實記錄自己這輪犯的錯**（這是本倉的正典文化，不是客套）。
- `git commit` 只加**明確路徑**。**絕對不要用 `git add -A`**：`out/` 有 48 MB 成品備份、
  `link-audit/deliv/` 是卡片暫存、信箱狀態與客戶資料都在 gitignore 裡——一次 `-A` 就可能把
  不該入倉的東西送進公開歷史（真發生過風險）。
- commit 前先看 `git status`：若工作樹有**不是自己做的**未提交改動，先辨明歸屬，不要打包進自己的 commit。

## 邊界（超出就停下来交人工）

**可以做**：改 `raw/` 以外的本倉內容（轉檔規則、發射標記、探針、清單）、重建、本地驗收、本地部署、
本倉 commit／push（upstream 與 fork 皆可推）。ybh.adb 改什麼、正文呈現怎么取舍，以 ybh maintainer 的判断為準。

**必須停下交給閱讀器維護者（作者）的兩類**：
1. **動到 accelon26**：`ts/src/`、`wails/`、`release.ts`、exe、`versions.json`、首頁文案與授權文字，
   以及任何「要在閱讀器裡才能修」的問題 → 寫成自包含缺陷單（帶檔名＋行號＋重現數據＋修復後可對的數字）
   放 `link-audit/docs/prompt-adb-converter-*.md`。
2. **發布到官網**：`publish-adb.ts`、`deploy.ts`、`www/adb/*`、`deploy/adb-status.json`、`adb-notes.json`
   的上架動作 → 需由官網維護者執行，本 skill 不含。

**其他紅線**：不動别人的 adb（ys／tx／fuyan／taisho／wxzj…）；不刪除檔案（走回收桶）；
不讀不印 `.local` 憑證與客戶聯絡資料；含寄件者 IP／瀏覽器 UA 的留言原件不入版控也不外寄。

## 已知缺口（别当成待辦工數）

- 死錨約 273 種／1,475 條引用，其中約 96% 集中在 DILA 自己標注「科判未完成」的 T1584《決定藏論》
  與 T2801《瑜伽論分門記》——屬源頭缺口，補編重建後自然癒合，**不要硬改成「最近的一個科」**。
- 無 j 窗的科判裡約 5,115 條**根本沒有自己的正文首行**（上級節點只有標名），加上義引者本質上
  無逐字對應——這批補不成細窗。（曾有個口算值「1,588 條可補」已作廢。）
- 反鏈（「這一頁被誰引用」）對本庫目前恒為空：閱讀器建索引時要求來源庫有 `頁.id`，
  而集成式文獻沒有「頁」這一層。這是 accelon26 側待修，本區已開缺陷單。

## 完成檢查清單

- [ ] `preflight.ts` 必備項齊
- [ ] build 報告數字與預期一致（沒有莫名的 0）
- [ ] `verify-all` 六節全綠，且**對部署那顆**覆驗同數
- [ ] 交付前後 sha256 相符、舊版已備份
- [ ] 部署目標非硬鏈，或已用「先移名字再放入」處理
- [ ] SUMMARY 新增一節＋勘誤如實
- [ ] commit 用明確路徑，未含 out/、deliv/、信箱狀態
