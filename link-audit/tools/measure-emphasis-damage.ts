/**
 * 量 build-ybh.ts:469 那條「剝 markdown 粗體／斜體／行內碼」的規則對語料的傷害面。
 * 現行式做三次 replace：粗體（雙星夾）、斜體（單星夾，前後不準是星號）、行內碼（反引號夾）。
 * 語料裡的「反斜線＋星號」是 markdown 的**跳脫字面星號**（DILA 附表符號 * 的寫法），
 * 而斜體那把尺的回顧只擋「前面是星號」，沒擋「前面是反斜線」→
 * 兩個跳脫星號之間被當成斜體配對，星號連文字一起被吃掉。
 */
import fs from 'node:fs';
import path from 'node:path';

const RAW = 'D:/2026/yogacarabhumi-dila/raw';
const WORKS = ['T1579', 'PXJ-H', 'T1580', 'T1828', 'T1829', 'T2801', 'T2802', 'T2259', 'T1581',
  'T1582', 'T1583', 'T1584', 'T1602', 'T1604', 'T1605', 'T1606', 'X0794'];
const seriesOf = (b: string) => (b.match(/^(.*)-(?:\d+|k|a)$/) || [, b])[1]!;
const cur = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1').replace(/`([^`]+)`/g, '$1');
// 修法＝先把「反斜線＋星號」藏成哨兵，跑完三條 replace 再還原。
// （不可只加回顧斷言：藏掉第一個星號後，第二個星號仍會和第三個配對，一樣吃字。）
const SENT = '\u0002';
const fixed = (s: string) => cur(s.replace(/\\\*/g, SENT)).split(SENT).join('\\*');

let escStarLines = 0, damaged = 0, escTotal = 0, onlyItalic = 0, collateral = 0, sentinelHit = 0;
const samples: string[] = [];
const backslashKinds = new Map<string, number>();
for (const f of fs.readdirSync(RAW).filter((x) => x.endsWith('.md')).sort()) {
  if (!WORKS.includes(seriesOf(f.replace(/\.md$/, '')))) continue;
  const ls = fs.readFileSync(path.join(RAW, f), 'utf8').replace(/\r\n?/g, '\n').split('\n');
  for (const ln of ls) {
    if (ln.includes(SENT)) sentinelHit++;                       // 哨兵不得與語料撞字（postInline 已用 \u0001）
    for (const m of ln.matchAll(/\\(.)/g)) backslashKinds.set(m[1]!, (backslashKinds.get(m[1]!) ?? 0) + 1);
    if (!/\*/.test(ln)) continue;
    escTotal += (ln.match(/\\\*/g) ?? []).length;
    const a = cur(ln), b = fixed(ln);
    if (/\\\*/.test(ln)) escStarLines++;
    else if (a !== b) collateral++;                              // 無 \* 的行絕對不許被改動
    if (a !== b) {
      damaged++;
      if (b.replace(/\\\*/g, '@') === a.replace(/\\\*/g, '@')) onlyItalic++;
      if (samples.length < 12 && a.includes('\\') && /\|/.test(ln)) samples.push(`${f}:${ln.slice(0, 70)}\n    現行→ ${a.slice(0, 70)}\n    修後→ ${b.slice(0, 70)}`);
    }
  }
}
console.log(`哨兵 \u0002 撞語料的行：${sentinelHit}（必須 0）`);
console.log(`含 \\* 的行 ${escStarLines}｜\\* 出現總次數 ${escTotal}`);
console.log(`現行式與「跳過 \\*」式結果不同的行：${damaged}（其中差異只在斜體配對、不含其他 = ${onlyItalic}）`);
console.log(`\n全倉反斜線跳脫種類型別（字元 → 次數）：`);
console.log([...backslashKinds.entries()].sort((x, y) => y[1] - x[1]).map(([k, v]) => `\\${k}:${v}`).join('  '));
console.log('\n=== 樣本 ===');
for (const s of samples) console.log(s);
