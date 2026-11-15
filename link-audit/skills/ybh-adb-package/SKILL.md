---
name: ybh-adb-package
description: 《瑜伽師地論》漢文整合（ybh.adb）的專案覆蓋：原料位置、跨庫目標、十七部著作代號與命名、專案特有閘門與缺口。通用流程見 adb-author skill——本檔刻意不重複它，只列差異與具體路徑。用於在本地建立或改版 ybh.adb 並完成交付前驗收。
version: 2.0.0
---

# ybh.adb 專案覆蓋

**先讀 `adb-author`（通用流程）與 `adb-inspect`（查證方法）**，本檔只寫差異。
兩邊同一件事只允許有一份寫著——重複的第二份遲早是錯的。

## 一、本專案的路徑與前提

| 項 | 值 | 覆寫變數 |
|---|---|---|
| 原料 | `<倉庫根>/raw/*.md`（515 個；2026-11-15 起從倉庫根移入 `raw/`，根目錄只留 README.md／索引.md／_sidebar.md／index.html＋三個 vendor 檔） | `YBH_HOME` |
| 建置中繼與大輸出 | 預設 `D:/2026/_scratch-ybh` | `YBH_SCRATCH` |
| 打包器與 reader 模組 | 預設 `D:/2026/adb-converter/ts/src` | `ACCELON_SRC` |
| 成品部署目錄 | 預設 `D:/accelon3` | `ACCELON_ADB` |
| 跨庫目標（大正藏底座） | 預設 `D:/accelon3/taisho.adb` | `TAISHO_ADB` |

環境體檢：`bun run link-audit/tools/preflight.ts`（`--json` 版本可直接貼回信裡回報，不含憑證）。

**前提不可省**：本倉的 ④⑥ 兩節驗收用的就是閱讀器那支 `renderEmbed`；`<表>` 閘門用 `parseTableBlock`。
所以要「驗收過了＝畫面對」，本地就必須有 adb-converter 原始碼與 taisho.adb。
替代方案是把必要模組固定版本 vendoring 進本倉——代價是與閱讀器版本漂移，需資料維護者同意才做。

## 二、內容結構與命名

- **收十七部漢譯瑜伽系論書**（依 DILA 權威略符表判定身分；**倉庫 README 的 38 條系列對照實測有 23 條錯誤，不得作為 metadata 來源**）。
  梵本（`AS-sP`／`AS-sG`／`ASBhT`）與藏譯（`CT…` 丹珠爾）**不入庫**。
- 主檔名規則 `{代號}-{卷號}.md`；`-k` 為科判大綱、`-a` 為校勘附編。
- 標籤家族**每部一個字**（本論 `科NN`、披尋記 `科漢NN`、論釋 `科釋NN`…共十六族），
  大綱另用 `科大NN`；`聯`=22、`嵌`=24、`融`=149 等 id 只作參考，**不要寫死 id 數**。
- 結構只有 **集／篇／章／卷次／書目／科／聯**——**沒有 `<頁>` 這一層**（整合式文獻本相如此）。
  這是反鏈索引長年踩到的結構性根因，不是打包漏欄位。
- 錨點命名：`{代號}-{卷}#kpD{卷內流水}`；校勘附編另有 `app…`。
  與《披尋記》干支制式（**父內編號**，換父復位）**數值不同**，不可直接互查。

## 三、專案特有閘門

| 專案 | 本專案的數值與判準 |
|---|---|
| 六節命令 | `bun run link-audit/tools/build-ybh.ts`；`bun run link-audit/tools/verify-all.ts <adb> v<版號>` |
| ②庫內錨點 | 現況 94,632 種／181,924 條，FAIL 0；負控＝卷級落點、篇級≠卷級首筆 |
| ③跨庫 taisho | 現況 29,612 種座標，FAIL 0（地址鍵必含冊號、零填充先轉數字） |
| ④段落 ref | 現況 10,200 條，**從已部署位元組回讀**＋`renderEmbed` |
| ⑤樹回歸 | 35 頁籤／總目錄 17 根／377 節；**走 UI 那條碼路**（`loadTrees→loadTree→buildTree`）；父例項必須自宣告子鏈 `t=` |
| ⑥`<融>` | 現況 21,975 枚，成對、自閉合 0、抽樣可填；`max=24`（單位是**行**；實測 `max=200` 會拉出 1.7 萬字大殼） |
| `<表>` 邊界 | 現況 275 段，其中 275 段經 `parseTableBlock` 過閘才發射；解不了的維持純文字並記錄原因 |
| 快速自測 | `verify-all.ts <adb> <標籤> --fast` 只跑 ①②③，改指令碼時用它避免全量等待 |

逐條清單（可匯入 Excel，UTF-8 BOM＋CRLF）：`link-audit/data/` 下的
`anchor-check.tsv`、`ybh-dead-anchors-review.tsv`、`t1579-window-baseline-both.csv`、
`br-tables-review.csv`、`review-62/338/248.csv`。

## 四、本專案的已知缺口（別當工數）

1. **死錨 273 種／引用 1,475 條**，約 96% 集中在 T1584《決定藏論》與 T2801《瑜伽論分門記》——
   DILA 略符表自己標注這兩部「科判未完成」，屬源頭缺口，補編重建即癒合。
   **不要把它們硬改成「最近的一個科」。**
2. **無 j 窗的科判裡 5,115 條根本沒有自己的正文首行**（上級節點只有標名），
   加上義引本質無逐字對應 → 這批補不成細窗。曾有的口算值「1,588 條可補」**已作廢**。
3. **反鏈對本庫恆為空**：閱讀器建索引要求來源庫有 `頁.id`，而本庫無「頁」層。
   屬 accelon26 側，缺陷單已開（含檔名＋行號＋重現資料＋修復後可對的數字 `n=52,152`、`30p279a=81`）。
4. **表格欄內 `<br>` 顯示成字面字元**（184 段／824 格）：屬正文呈現取捨，待資料維護者裁三選一。

## 五、交付時必做的兩件本地動作

1. **硬鏈檢查**：本機 `D:\accelon3\ybh.adb` 實測是硬鏈，另有兩個名字掛在閱讀器倉的測試暫存目錄。
   就地截斷會連帶改掉那兩份 → 先 `fsutil hardlink list` 查，多名字就「先移走這個名字、再放入新檔」，
   並前後比對各路徑 sha。
2. **備份目錄**：舊版放 `<倉庫根>/out/ybh.adb.v<舊版>.bak`（已 gitignore，48 MB 級不入版控）。
   提交只用明確路徑，**絕不用 `git add -A`**。

## 六、記帳位置

- 結論正典：`link-audit/docs/SUMMARY.md`（新增一節＋**§八勘誤表如實記自己犯的錯**）。
- 交接清單：`link-audit/docs/task-ybh-selfserve-backlog.md`。
- 需閱讀器配合者：`link-audit/docs/prompt-adb-converter-*.md`。
- 官網發布（`publish-adb.ts`／`deploy.ts`／`www/adb/*`／`adb-status.json`／`adb-notes.json`）
  **不在本專案許可權內**，由官網維護者執行。
