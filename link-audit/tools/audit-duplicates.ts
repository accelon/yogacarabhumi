#!/usr/bin/env bun
/**
 * 找出「版控版」與「scratch 同名副本」之間的**邏輯**分岔（排除我這兩天做的 raw/ 路徑改造）。
 *
 * 為什麼要這個：`verify-all` 過去用 `cwd: SCR` 委派子腳本，實際執行的是 scratch 那份；
 * 而 scratch 累積了未回合的修改（實測 `verify-zhu-refs.ts` 的 Q2 處理只存在於 scratch）。
 * 於是「review 過的版本」和「被執行的版本」是兩份程式——驗收 PASS 記的是哪一份都说不清。
 *
 * 做法：把 tools 版路徑正規化（去掉 /raw 段、把環境常數還原成字面值）後再 diff，
 * 剩下的差異才可能是邏輯分岔，需人工決定以哪一份為準。
 * 只報告，不改檔——合併方向必須逐檔判断，自動覆蓋會把較新的一面抹掉。
 *
 * 用法：bun run link-audit/tools/audit-duplicates.ts [相比對目錄]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { P } from './paths.ts';

const TOOLS = import.meta.dirname;
const OTHER = process.argv[2] ?? P.scratch;

const norm = (t: string) => t
  .replace(/\/raw'/g, "'")                                            // RAW = ROOT + '/raw' 的改造
  .replace(/D:\/2026\/_scratch-ybh/g, 'SCR')                          // 中繼目錄常數化
  .replace(/'D:\/2026\/yogacarabhumi-dila'/g, 'ROOT')
  .replace(/D:\/2026\/adb-converter\/ts\/src/g, 'SRC')                // 母區模組改走 paths.ts
  .replace(/P\.scratch/g, 'SCR').replace(/P\.taisho/g, "TAISHO").replace(/P\.home/g, 'ROOT')
  .replace(/await import\(([^)]*)\)/g, 'await import(MOD)')           // 動態 import 的路徑改寫
  .replace(/\r\n/g, '\n');

const names = fs.readdirSync(TOOLS).filter((f) => /\.(ts|py)$/.test(f)).sort();
const report: { f: string, kind: string, hint: string }[] = [];
for (const f of names) {
    const b = path.join(OTHER, f);
    if (!fs.existsSync(b)) continue;
    const aTxt = fs.readFileSync(path.join(TOOLS, f), 'utf8');
    const bTxt = fs.readFileSync(b, 'utf8');
    if (aTxt === bTxt) { report.push({ f, kind: '相同', hint: '' }); continue; }
    const na = norm(aTxt), nb = norm(bTxt);
    if (na === nb) { report.push({ f, kind: '只差路徑（本輪改造）', hint: '' }); continue; }
    // 有邏輯差異：抓幾行差異當提示，並看 scratch 是否「多东西」（可能是未回合的修正）
    let diff = '';
    try { diff = execFileSync('diff', ['-u', path.join(TOOLS, f), b], { encoding: 'utf8', maxBuffer: 8 << 20 }); } catch (e: any) { diff = String(e?.stdout ?? ''); }
    const plus = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++') && l.slice(1).trim());
    const minus = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---') && l.slice(1).trim());
    // 只報「分岔」而不報方向，清單就等於叫人工全部重看一次。用 mtime 給個初步方向：
    // 注意 mtime 只是線索不是結論（本輪 raw/ 改造讓 tools 一律較新，卻不代表內容較新）。
    const ta = fs.statSync(path.join(TOOLS, f)).mtimeMs, tb = fs.statSync(b).mtimeMs;
    const dir = tb > ta ? 'scratch 較新 ⇒ 可能有未回合的修正' : 'tools 較新 ⇒ 多為本輪路徑改造';
    report.push({ f, kind: `邏輯分岔（scratch 多 ${plus.length} 行／tools 多 ${minus.length} 行）｜${dir}`, hint: (plus[0] ?? minus[0] ?? '').trim().slice(0, 78) });
}

const div = report.filter((r) => r.kind.startsWith('邏輯'));
console.log(`比對 ${report.filter((r) => r.kind !== '相同').length} 對同名檔（目錄：${OTHER}）`);
console.log(`  完全相同: ${report.filter((r) => r.kind === '相同').length}`);
console.log(`  僅路徑改造差異: ${report.filter((r) => r.kind.includes('只差路徑')).length}`);
console.log(`  ⇒ **邏輯分岔: ${div.length}**（這些需要逐檔決定以哪一份為準）\n`);
for (const d of div) console.log(`  ${d.f.padEnd(28)} ${d.kind}\n      例: ${d.hint}`);
