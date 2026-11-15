# ybh 交接檔 —— 給耀悟法師（maintainer）與法師的 agent

> 2026-11-15 由使用者（網站與閱讀器的維護者）定案權責：**法師是《瑜伽師地論》漢文整合（ybh）的 maintainer**，
> ybh.adb 的改動以法師的判斷為準。本檔是給法師本人、或法師開的 agent 使用的起點，
> 讀這一檔就不需要翻聊天記錄。

## 一、現況速覽（全部為成品實測，非抽樣）

| 項 | 值 | 怎麼量的 |
|---|---|---|
| 成品 | `D:\accelon3\ybh.adb` **v27**，50,336,341 B（48.0 MiB），sha `52e1cec5e527…` | `sha256sum` |
| 行數／詞元／標籤種數 | 974,474 行／9,971 token／1,379 種標籤 | 建置報告＋引擎 |
| 收書 | 十七部漢譯瑜伽系論書（本論一百卷為中心）；原料 515 個 md 現存 `raw/` | `list-dead-anchors`、檔統計 |
| 跨庫連結 `<聯>` | 49,749 條，其中 **41,254 條帶行窗** `#a-b` | 引擎解碼路 |
| 行內速覽 `<嵌 j=>` | 41,254 枚 | 建置發射統計 |
| 庫內科判跳 `<節聯>` | 181,878 條／94,632 種目標，**解析失敗 0** | `anchor-check.tsv` |
| 科文融合 `<融>` | 21,975 枚，成對、內容留空（standoff，論本文字不複製） | `verify-all` ⑥ |
| 目錄樹 | 35 個頁籤；總目錄 17 根／377 節 | `verify-all` ⑤（走 UI 那條碼路） |
| 官網 | 主站與映象均為 v27，sha 一致；清單頁該列有「改版說明」連結 | HEAD＋抓內容比對 |

**讀取 adb 請走 API，不要翻引擎原始碼**：母區已建 adb MCP
（`D:\2026\adb-converter\mcp\`，打包成純 Node 單檔 `adb-mcp.cjs`，走 GitHub Release＋sha256 旁檔）。
工具：`adb_list / adb_info / adb_tags / adb_toc / adb_search / adb_read`。
慣例：**先 info／search 定位，需要才 read**；查證內容一律用引擎解碼路——
**對 .adb 做位元組 grep 是無效的**（正文標籤以 id 編碼，`grep '<聯 i="'` 會得 0 筆）。

## 二、這個倉庫怎麼用

```
D:\2026\yogacarabhumi-dila\
  raw/                  515 個語料 md（原樣，不要改寫正文）
  link-audit/
    docs/SUMMARY.md     ★正典：所有結論與「勘誤表」（記分析者自己犯過的錯）
    docs/task-ybh-selfserve-backlog.md   交接清單（可做項與硬邊界）
    docs/prompt-adb-converter-*.md       給閱讀器母區的回信／缺陷單
    tools/*.ts|*.py     離線探針、驗收、發射指令碼
    data/*.csv|tsv      逐條清單與原始輸出（可覆核、可匯入 Excel）
    out/*.txt           建置／驗收／寄件紀錄
```

跑任何一版：

```
bun run link-audit/tools/build-ybh.ts                      # 重建（輸出在 scratch）
bun run link-audit/tools/verify-all.ts D:\accelon3\ybh.adb v<N>   # 六節全綠才算 PASS
```

**兩條不可妥協的紀律**（都是踩過坑之後定的）：
1. **驗收的檔案必須等於部署的檔案**。曾有並行 rebuild 讓 PASS 記在重建前的位元組上，
   而實際部署的是另一顆——所以對「部署那一顆」要另行覆驗。
2. **同一資料被兩支指令碼處理時，提取規則只能有一份實作**。曾因為一支取整行、
   另一支取表格最長格，同一條記錄得到不同判定，發射數就不可信。

## 三、邊界（請務必遵守，這是使用者定的）

**可以做**：改 `raw/` 以外的本區一切（轉檔規則、發射標記、探針、清單）；對 ybh.adb 做重建與部署
`D:\accelon3`；提交與推播本倉（**upstream `avatarqz/yogacarabhumi-dila` 與法師的 fork 法師都有許可權**）。

**不可以做**：
- **不得發布到官網**（`shutonggui.cn`／`nissaya.cn`）。上架adb、改 `deploy/adb-status.json`、
  `adb-notes.json`、`www/adb/*`、跑 `publish-adb.ts`／`deploy.ts`——這些**仍由本區或母區執行**。
  法師要發布時知會一聲即可。
- 不動 accelon26 閱讀器碼（`ts/src/`、`wails/`）、不壓 exe、不跑 `release.ts`、不碰 `versions.json`。
- **需要 accelon26 配合的事，回報使用者**（寫成帶檔名＋行號＋重現資料＋可對數字的缺陷單，
  放 `link-audit/docs/prompt-adb-converter-*.md`）。目前已知需要閱讀器配合的有兩件，見下節。

## 四、待法師定的四件事

1. **表格欄內 `<br>` 顯示成字面五個字元**（已去信請裁，184 段／824 格）：
   ①換分隔符 ②閱讀器認真斷行（需 accelon26）③維持原樣。我方傾向 ②。
2. **《略纂》連結失效**（2026-11-15 09:05 來信）：資料層 T1829 384 種／1,564 條
   **全部解析成功、失敗 0**；真機兩個場景（正文行的晶片、融合塊內部的晶片）**都能跳成功**。
   法師信中記的客戶端版本是 **2026-11-11 08:20**，早於 11-14 三批渲染修復。
   需要您：更新後再試；若仍失效，請給**哪一巻哪一列點的哪一枚**＋當時狀態列的頁碼行號。
3. **補窗的三批複核清單**（基數 483 已發射 468；其餘）：
   `data/review-62.csv`（唯一性僅 4–5 字）、`data/review-338.csv`（靠較寬的片段鄰近法救回，
   正控樣本僅 17 條）、`data/review-248.csv`（多命中需卷內單調序消歧）。
4. **反鏈對本庫恆為空**：閱讀器建反鏈索引時要求來源庫有 `頁.id`，而整合式文獻沒有這一層
   （本庫只有 集／篇／章／卷次／書目／科／聯）。缺陷單已開（`prompt-adb-converter-revgate-anchorindex.md`，
   帶檔名行號與修復後可對的數字 `n=52,152`、`30p279a=81`），**等母區改碼**，本區做不了。

## 五、已知缺口（不是 bug，別再當工數排）

- 死錨 **273 種／引用 1,475 條**，約 96％ 集中在 T1584《決定藏論》與 T2801《瑜伽論分門記》——
  DILA 權威略符表自己標注這兩部「科判未完成」，屬源頭缺口，等補編重建即癒合；
  **不要把它們硬改成「最近的一個科」**。
- 無窗的 7,172 條科判裡 **5,115 條根本就沒有自己的正文首行**（上級科判只有標名），
  加上義引者本質上無逐字對應——**這批永遠補不成細窗**。口算那個「1,588 條可補」已作廢。
- 梵本與藏譯不入庫，所以本檔內做不了漢梵／漢藏對照。

## 六、聯絡方式

- 來信：官網 accelon26 留言表單會轉進信箱，或直接寄 avatarmail@qq.com 往來；
  本區有一支排程每 30 分鐘巡查（QQ IMAP 連續登入會被鎖，30 分鐘是上限），
  ybh.adb 的 bug **直接修並發布到本機與兩站之外的正式上架仍由本區做**。
- 給 agent 的建議起點：本檔 ＋ `link-audit/docs/SUMMARY.md` 的 §八「勘誤表」與最後兩節。


## 七、本地打包：skill、環境覆寫與自主範圍（2026-11-15 更新）

**skill 分三層**（2026-11-15 重整：往後其他文本的維護者也要用，且這些 skill 會上官網分享）：

| skill | 管什麼 | 封裝檔 |
|---|---|---|
| `adb-author` | **通用流程**：原料 md → .adb；為什麼驗收必須用閱讀器那支解析器；結構化四原則、互鏈分層、座標系換算、窗的閘門與正控、驗收類別、交付紀律 | `adb-author.skill` |
| `adb-inspect` | **通用查證**：走 adb MCP API；三條鐵律（禁位元組 grep、不抽全文、行號是行表不是 `\n`）；地址鍵要含冊號且零填充先轉數字；探針自己要有正控與負控 | `adb-inspect.skill` |
| `ybh-adb-package` | **本專案覆蓋**：原料與跨庫路徑、十七部代號與命名、六節在本專案的實測數字、專案特有缺口 | `ybh-adb-package.skill` |

規則：**通則只寫在 `adb-author`，覆蓋檔只寫差異**。同一件事寫兩處，將來必有一處是錯的
（我們真發生過兩支腳本各寫一份表格行提取規則、同一條記錄判定不同的事）。

打包由 `bun run link-audit/tools/package-skills.ts` 產生，**確定性**（同來源重複打包 sha 不變，
已實測兩遍相同）且**標準 unzip 讀得到**（CRC 檢查通過）——「可安裝」不能只由自己寫的讀取器證明。
清單在 `link-audit/out/skills-dist/manifest.json`，欄位沿用官網 `www/adb/manifest.json` 的形狀，可直接上架。
交付前四道檢查：frontmatter 可解析且 `name` 與目錄一致、`description` 不空、無憑證與個資樣式
（email／IP／password／家目錄絕對路徑）、**解壓回讀必須與來源逐字相同**。最後那道當場抓出
打包器自己的 bug（zip 本檔標頭的壓縮長度欄位在偏移 18，我讀了 24），三只全數報錯才修對。

**先跑體檢，不要直接 build**：

    bun run link-audit/tools/preflight.ts           # 人讀版
    bun run link-audit/tools/preflight.ts --json    # 要貼回信裡回報環境的版本（不含憑證）

路徑已改為**可用環境變數覆寫、不需改碼**（先前 124 支工具裡有 92 支把絕對路徑寫死，換機器就跑到一半才報 `Cannot find module`）：

| 變數 | 意義 | 我們這臺的預設值 |
|---|---|---|
| `YBH_HOME` | 本倉根（含 `raw/`、`link-audit/`） | 由檔案位置自動推得 |
| `YBH_SCRATCH` | 建置中繼與大輸出 | `D:/2026/_scratch-ybh` |
| `ACCELON_SRC` | adb-converter 的 `ts/src` | `D:/2026/adb-converter/ts/src` |
| `ACCELON_ADB` | 成品 adb 部署目錄 | `D:/accelon3` |
| `TAISHO_ADB` | 大正藏底座 | `D:/accelon3/taisho.adb` |

**必要前提（也是本次最大的依賴）**：打包器 `authorAdb`、reader 模組（`AdbReader`／`VaPaMapper`／
`parseTableBlock`）與 ④⑥ 節的 `renderEmbed` 驗收，都 import 自 **adb-converter 的 TypeScript 原始碼**；
③ 節需要 `taisho.adb`。所以本地打包在原理上需要那一份原始碼與大正底座 —— 這不是我們故意設限，
是驗收標準與閱讀器共用同一支解析器所必需（否則「驗收過了但畫面不對」無從避免）。
如果你那邊不方便放 adb-converter，請告知，我們另想辦法（例如把必要的幾個模組以固定版本 vendoring 進本倉，
但那會產生與閱讀器版本漂移的風險，需要你同意才做）。

**自主範圍（使用者 2026-11-15 定案）**：除以下兩類，你可以獨立作業、不必等使用者過目——
1. **動到 accelon26**（`ts/src/`、`wails/`、`release.ts`、exe、`versions.json`、首頁文案與授權文字）：
   寫成自包含缺陷單（帶檔名＋行號＋重現資料＋修復後可對的數字）交使用者轉母區。
2. **把 ybh.adb 發布到官網**（`publish-adb.ts`、`deploy.ts`、`www/adb/*`、`deploy/adb-status.json`、
   `adb-notes.json`）：仍由官網維護者執行。

其餘（轉檔規則、發射標記、探針、清單、重建、本地部署、本倉 commit／push 到 upstream 與 fork）
**以你的判斷為準**。ybh.adb 的內容取捨也屬你的許可權，我方不再代為決定，只把可查證的坐標與實測數字送到你手上。

**兩條我方踩過、請你一併守住的紀律**：
- 驗收的檔案必須等於交付的檔案（並行 rebuild 會把 PASS 記到舊位元組上）——交付前後都算 sha。
- 部署目標可能是**硬鏈**（我們這臺的 `D:ccelon3\ybh.adb` 就是，另有兩個名字掛在母區測試目錄）；
  就地截斷寫入會連帶改掉別人的檔。先 `fsutil hardlink list <路徑>` 查，多名字就先移走這個名字再放入新檔。
