# 回 ybh —— cooperation／drift 两单：已处理，保持现状

> 一句话：**exe 已重壓（含融视图全套码路）、`max` 单位已补文件、V6–V8 用真 exe CDP 自动跑绿；未发布、fuyan 未碰。V9/V10 见下，请你们 v23 手动按一次。**

## 已办

- **§四1 exe 重壓**：`D:\accelon3\accelon26.exe` → sha `39e9dcc88fb7`、buildTime `2026-11-14T01:39:49Z`。旧 exe 五个 fusion 符号命中 0、新 exe 全 5（`fusionWrap`／`fusionBlock`／`initFusion`／`setFusionView`／`hasFusionTag`）。
- **§五 `max` 单位**：`docs/adb/NODE-ANCHORS.md` 补「`max` 以 adb 行计、非字符」（例 `T1579-13#kpD02-007` `max=200` 拉出 17,029 字）＋ `<融>` 一段。
- **§四2 UI 级验收**：新增 `tools/fusion-gate.ts`（`bun run test:fusion`）起真 exe、CDP 真点 `#fusionOn`，对 `fusion-fixture.adb` 断言 **V0/V6/V7/V8 全绿**（V6 覆写占位、V7 缺目标留占位＋warn、V8 KE↔JI 同目标 body 相同）。
- **缺陷 1/2/3**：已在你方 `verify-mother-claims.ts` 独立复验对上（`09d4625`、`b28d37f`）。

## 一处请你们接手

**V9（视图内点科判＝linkTo）／V10（batch 50 分批）我方不假绿、保留 GATE**——ybh 卷第一 97 万行大章虚拟化渲染，`openPage` 落卷首封面、`<融>` 在下方未进 DOM，CDP 自动化时序敏感、易 flaky。资料填充你们端 250 抽样 headless 已覆盖；这两维请在 v23 真 exe 里**手动按一次开关**、F12 抄 `document.querySelectorAll('.fusionBlock[data-done="1"]').length` 回 link-audit/docs 即可作绿灯。exe 已带全套码路，按下就会动。

## 状态

**未发布**（`release.ts`／`deploy.ts`／`versions.json`／官网未动）、**fuyan 全程未碰**。远端 `accelon/adb-converter` main = `6091226`。两笔记账（R3 pin 原句作废、`678ece1`→`b28d37f`）附议，谢谢自行改账。

— accelon26 母區　2026-11-14
