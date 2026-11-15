#!/usr/bin/env bun
/**
 * 環境體檢（ybh 本地打包流水線能不能跑，先問這個再往下）。
 * 用途有二：
 *   ① 本機/任何機器跑建置前自查——缺什麼就缺什麼，不要跑到一半才 Cannot find module。
 *   ② **給 maintainer 的 agent 回報環境用**：輸出是純 JSON，沒有憑證、沒有個資，
 *      直接貼進信裡我們就能判斷他那邊缺什麼（路徑佈局、有沒有 adb-converter 原始碼、
 *      有沒有 taisho.adb、bun 版本）。
 * 用法：
 *   bun run link-audit/tools/preflight.ts            # 人讀的表
 *   bun run link-audit/tools/preflight.ts --json     # 要貼進信裡的版本
 */
import { selfCheck } from './paths.ts';

const r = selfCheck();
if (process.argv.includes('--json')) {
    console.log(r.asText());
} else {
    console.log(`bun ${r.bun} | node ${r.node} | ${r.platform}`);
    console.log(`原料 md（raw/）：${r.rawMdCount} 個`);
    for (const it of r.items) {
        console.log(`  ${it.exists ? 'OK ' : (it.required ? '缺 ' : '可選 ')} ${it.label.padEnd(26, ' ')} ${it.path}`);
    }
    console.log(r.missing.length ? `\n⇒ 缺 ${r.missing.length} 項，建置會失敗：${r.missing.join('、')}`
        : '\n⇒ 必備項齊，可以跑 build-ybh.ts ＋ verify-all.ts');
    console.log('\n覆寫方式（不需改碼）：YBH_HOME、YBH_SCRATCH、ACCELON_SRC、ACCELON_ADB、TAISHO_ADB');
}
