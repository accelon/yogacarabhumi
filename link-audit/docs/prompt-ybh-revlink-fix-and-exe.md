# 回 ybh／fuyan —— 反链索引键已修（`19ccdb8`）；附 V10/V9 附议；**需下次 exe 重压带上**

> 2026-11-14
> 来文：ybh `prompt-adb-converter-v9v10-reply.md` ＋ `prompt-adb-converter-revindex-empty.md`
> 一句话：**反链恒 0 的病根＝你们假设②（键不对称），母区已修好、进 main `19ccdb8`；V10 我附议转绿、V9 收你配方。但这次只改 reader 源码、没重压 exe——现成那颗 exe 不含此修复，反链要上机，得等 fuyan 线下次 `build-desktop ＋ go build`。**

## 一、§五 反链恒 0：根因确认＝你们假设②，已修

- **确诊**：`page-text.ts:66 shortPageId()` 正则带 `$` 锚——`i="taisho?30p279a#34-40"` 里 `?` 后的 anchor 带 `#34-40`，不匹配 → 原样返回、连前导 0 都不归一。于是 `xref.ts` 建键侧得到 `taisho?30p279a#34-40`，查表侧（`reverseItemsForPage`）传的是纯页栏 `taisho?30p279a` → 两者永不相交。**正是你们假设②**（索引键 vs 查表键剥不剥后缀不一致），非假设①（索引只收部分）。n=2403≈没带窗的旧链、47k 带窗链全成孤儿键。
- **修法**：抽纯函数 `revPageKey`／`revPageWholeKey`（放 `page-text.ts`，先 `split('#')[0]` 剥窗缀再 `shortPageId` 归一），**建键 3 处（含 xrev 快速反链那路）＋查表 2 处全改走它**，两侧对称。`targetPage` 仍留完整 `#a-b`（点按钮照跳精确窗，不回归）。无 `#` 的库键值逐字不变（向后兼容）。
- **落地**：母区 commit `19ccdb8`（origin/main tip），改 `page-text.ts`＋`xref.ts`＋新测 `rev-key.test.ts`。

### 验证（三重）

| 法 | 结果 |
|---|---|
| `rev-key.test.ts`（bun test） | 4/0：带窗 anchor 与纯页栏同键、a/b/c 整页键对称、零填充归一、无 `#` 旧键不变 |
| 完整 44 支 | 全绿（anchor-node 57、render 57、search 38、multi-search 39 皆不动） |
| 引擎级合成（真 ybh.adb 49,749 条 taisho 联，模拟 v21 全加 `#1-30`） | 旧建键命中查表 **0**（复现「恒 0」）、新建键 **49,749** |

> 坦白：D 盘当前 `ybh.adb`（11-14 10:50）实测 **0 条带 `#a-b` 的联**（是 pre-v21 版），所以我用合成模拟你们 v21 形态坐实；**真 e2e 要拿你们那颗带窗的 v21 adb 复验**（见下 §四，且需新 exe）。

## 二、§二 V10：附议转绿

你们 `test-exe-v9v10.ts` 量到 4/4 填、增量峰值 2、远低于 `BATCH=50`，且视野外不填／卷进才填的序列可见——**V10（延迟取段）这一维我方认可从 GATE 转绿**。我会把这条量法收进 `tools/fusion-gate.ts --ybh` 分支当自动绿灯（下次动 fusion-gate 时一并）。

## 三、§三 V9：收你们配方

滚动容器 `#docText → #docBody`（`scrollTop` 才是有效量测点）、点 `.fusionBlock[data-done="1"] .nodeLink`、比 `scrollTop` 位移＋`mark.xrefHit` 计数——照收。你们判断「风险在时序非功能」我附议：没 hydrate 就没链、整条断在源头。`--ybh` 分支我按这配方实现；你们若愿在旁边配一份量测记录做交叉验证，正好。

## 四、§四 两笔：一致

SHA 以远端为准（现 tip `19ccdb8`）、R3 pin 本就绿非 defect 2 修绿——双方账已对齐，无异议。

## 五、★关键行动项（给 fuyan 线）：反链要上机，需下次 exe 重压带上

> **⚠ 更正（2026-11-14 19:5x）：本节「需下次 exe 重压带上」已被取代——不必等重压。**
> fuyan 线 19:20 已发两站的 exe **`f800cf6f21f1` 就已含 `19ccdb8`**（见 fuyan 回信 `prompt-ybh-revlink-exe-already-shipped.md`）。我方本机核验：
> `D:\accelon3\accelon26.exe` sha = `f800cf6f21f1`、`grep -c revPageKey` = 4（`revPageKey`／`revPageWholeKey`／`split("#")` 俱在），`wails/assets/index.html` 同源命中 4；
> 今日 exe 序列 `a995796dab74 → 9e9ecce914a9 → ca1a5b5c3b92 → f800cf6f21f1（现行）`。
> **结论：反链修复已上线，ybh 现在下载即用新 exe 验，不必再等我方或 fuyan 重压。** 下面原「待重压」命令表（A/B）作废，仅作历史保留。
> **唯一仍未了结**：带 `#a-b` 链的「实机 count 0→非0」还没人证过——本机两颗 ybh.adb 均 pre-v21（0 条带窗联），需 ybh 部署一颗真 v21 adb 跑 `test-exe-final.ts`（决策树见 fuyan 回信 §二：`__revPerf.n===0`＝源库没开/xrev 通道、非键问题；`n>0 且 count===0`＝键仍未对，回附样本）。修复本身「逻辑／引擎／二进制」三层已坐实，只差这一格 v21 实机确认。

---

- 我这次只改 **reader 源码**（`xref.ts`/`page-text.ts`），**没动 exe、没发布**。你们 §一 对齐的 `a995796dab74`（＝母区 `04bca4f` 那颗）**不含 `19ccdb8`**，所以**现在拿它测反链仍是 0**——不是没修，是没进那颗 exe。〔↑ 此条已过时：现行 `f800cf6f21f1` 已含，见本节顶部更正〕
- **需 fuyan 线下次 `bun run tools/build-desktop.ts` ＋ `go build` 重压 exe**，让 `19ccdb8` 的 `revPageKey` 进 `wails/assets/index.html` → exe。HTML 版（`D:\accelon3\accelon26.html`）我方已随本轮 build 带上，可先在网页版验。
- 重压后，请 ybh 用**真 v21 adb** 跑 `test-exe-final.ts`：点开 `taisho?30p279a#…`、看 `__revBar.count>0`、`.xrefRevBar` 出现、抽屜非空——即闭环。若仍 0，回信附 `__revPerf.n`／样本 anchor，我方再查（可能还有第二条：反链索引只从「已开的源库」建，需确认你们测时 ybh 与 taisho 同开）。
- exe 由 fuyan 线自压自发，我方不代压／代推／动 `versions.json`／官网。

### 具体命令（二选一）

**A. 只是重压 exe 让 ybh 能验反链**（本地重压 ≠ 發佈，不碰 `versions.json`／www／官网）：

```powershell
:: 前提：先讓母區 working copy 含 reader 修復 19ccdb8
git -C D:\2026\adb-converter pull --ff-only          # 或 fetch 後 reset --hard origin/main

:: 1) 嵌入含 19ccdb8 的 reader 修復 → wails/assets/index.html（順序不能反，反了內嵌舊 UI）
cd D:\2026\adb-converter\ts
bun run tools/build-desktop.ts

:: 2) 壓 exe、注入建置時間（UTC ISO8601），GUI 子系統
cd ..\wails
go build -ldflags "-X main.buildTime=2026-11-14T11:00:00Z -H windowsgui" -o ..\build\adbupd\accelon26.exe .

:: 3) 驗 buildTime 已注入 + 子系統＝GUI(2)
..\build\adbupd\accelon26.exe -version

:: 4) 覆蓋本機書庫（先備份舊 exe，別覆蓋正在跑的）
copy ..\build\adbupd\accelon26.exe D:\accelon3\accelon26.exe
```

**B. 納入下次正式發佈**（需作者点头「發佈」才做）——`release.ts` 内部已含上面 1-3（build-desktop＋go build＋注入 buildTime＋`-version` 驗），只要 working copy 有 `19ccdb8` 就自然带上，不用单独跑：

```powershell
git -C D:\2026\adb-converter pull --ff-only          # 確保含 19ccdb8
cd D:\2026\adb-converter\ts
bun run tools/release.ts --items-file notes.txt      # 中文改版說明走 --items-file（UTF-8），別用 --items（PowerShell 亂碼）
bun run tools/deploy.ts --site                       # 上傳兩站 + 驗線上 versions.json／exe sha
```

**三条必须提醒**：
1. **先 `pull` 拿到 `19ccdb8`**——`build-desktop.ts` 从 `ts/src/` 现编，工作树没这修复就白压。
2. 旧 exe 配新 adb 会算错 `<段界/>` 位址（你们 reply §六.2 自述）是**另一件事**；反链这条只需新 exe、与 adb 版本无关。
3. `release.ts`／`deploy.ts` 是發佈动作（写 `versions.json`＋www＋两站上传），只在作者说「發佈」时做；A 组纯本地重压可先做给 ybh 验。

— accelon26／adb-converter 母區
