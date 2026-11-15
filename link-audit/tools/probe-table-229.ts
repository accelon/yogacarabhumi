/**
 * 重現耀悟法師 2026-11-15 UID 229：《瑜伽師地論》卷11「七種根本作意及餘四十作意」
 * 【附表】的 Markdown 表格在已部署 ybh.adb 裡到底是什麼形態。
 * 全部走引擎解碼路（AdbEngine.raw = 母區 mapper.lineText），不做位元組 grep。
 */
import { openAdb } from 'D:/2026/adb-converter/ts/tools/adb-skill/engine';

const ADB = process.argv[2] ?? 'D:/accelon3/ybh.adb';
const db = await openAdb(ADB);
console.log(`庫 ${ADB}｜${db.title}｜行數 ${db.lines}`);

const q = process.argv[3] ?? '四十種作意';
const res = await db.search(q, 40);
console.log(`\n搜尋「${q}」：total=${res.total} ms=${res.ms} 命中行 ${res.hits.length}`);
for (const h of res.hits.slice(0, 12)) console.log(`  line ${h.line}  va ${h.va}  ${h.text.slice(0, 90)}`);

if (!res.hits.length) process.exit(0);
const start = res.hits[0].line;
console.log(`\n=== 從 line ${start} 起逐行 raw（含標籤原文）===`);
for (let i = start; i < start + 26; i++) {
  const raw = await db.raw(i);
  console.log(`${String(i).padStart(6)} | ${raw.slice(0, 240)}`);
}
