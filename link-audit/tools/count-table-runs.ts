/**
 * 表格發射前的基數測量（UID 229）：全倉 raw md 裡有多少段「管線表」，
 * 逐段送進**產品自己的解析器** `table-block.ts parseTableBlock`，量過閘率。
 * 解析不過的段＝發射 `<表>` 後渲染器仍退回純文字（無回歸、但也不會變成表格）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseTableBlock, splitPipeRow, isPipeAlignRow } from 'D:/2026/adb-converter/ts/src/accelon26/table-block.ts';

const RAW = 'D:/2026/yogacarabhumi-dila/raw';
const WORKS = ['T1579', 'PXJ-H', 'T1580', 'T1828', 'T1829', 'T2801', 'T2802', 'T2259', 'T1581',
  'T1582', 'T1583', 'T1584', 'T1602', 'T1604', 'T1605', 'T1606', 'X0794'];
const seriesOf = (b: string) => (b.match(/^(.*)-(?:\d+|k|a)$/) || [, b])[1]!;

type Run = { file: string; start: number; lines: string[] };
const runs: Run[] = [];
// 会被 bodyLines 的其他分支攔走的行（不算表格行，也不能被卷進 <表>）
const SKIP = /^(#{1,6}\s|\s*\[\^[^\]]+\]:|\s*<[^>]*\/?>)/;
const isPipe = (l: string) => l.trimStart().startsWith('|') && !SKIP.test(l);

for (const f of fs.readdirSync(RAW).filter((x) => x.endsWith('.md')).sort()) {
  if (!WORKS.includes(seriesOf(f.replace(/\.md$/, '')))) continue;
  const ls = fs.readFileSync(path.join(RAW, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  let cur: string[] = [], start = -1;
  const flush = () => { if (cur.length) runs.push({ file: f, start: start + 1, lines: cur }); cur = []; start = -1; };
  ls.forEach((l, i) => {
    if (isPipe(l)) { if (!cur.length) start = i; cur.push(l); }
    else flush();
  });
  flush();
}

let pass = 0, fail = 0, dataLines = 0, passLines = 0;
const fails: { file: string; start: number; why: string; cols: number[] }[] = [];
for (const r of runs) {
  dataLines += r.lines.length;
  const d = parseTableBlock(r.lines);
  if (d) { pass++; passLines += r.lines.length; continue; }
  fail++;
  const cols = r.lines.map((l) => (isPipeAlignRow(l) ? -1 : splitPipeRow(l.trim()).length));
  const uniq = [...new Set(cols)];
  let why = uniq.length > 1 ? `欄數不齊 ${cols.join('/')}` : `欄數 ${uniq[0]}、行數 ${r.lines.length}`;
  if (!r.lines.some((l) => isPipeAlignRow(l))) why = '無對齊列（md 缺 | :-- | 那一行）';
  fails.push({ file: r.file, start: r.start, why, cols });
}

console.log(`管線表段 ${runs.length}（分布在 ${new Set(runs.map(r => r.file)).size} 檔），行數合計 ${dataLines}`);
console.log(`過 parseTableBlock（產品解析器）：${pass} 段 / ${passLines} 行｜不過：${fail} 段 / ${dataLines - passLines} 行`);
console.log(`\n=== 不過的段（前 40）===`);
for (const f of fails.slice(0, 40)) console.log(`${f.file}:${f.start}  ${f.why}`);
fs.writeFileSync('D:/2026/yogacarabhumi-dila/link-audit/data/table-runs-baseline.tsv',
  ['file\tstart_line\tnrows\tpass\treason'].concat(runs.map((r) => {
    const d = parseTableBlock(r.lines);
    const fl = fails.find((x) => x.file === r.file && x.start === r.start);
    return [r.file, r.start, r.lines.length, d ? 'PASS' : 'FAIL', d ? `${d.cols}欄${d.header ? '/有表頭' : '/無表頭'}${d.caption ? '/有說明' : ''}` : (fl?.why ?? '')].join('\t');
  })).join('\n'), 'utf8');
console.log('\n清單 → link-audit/data/table-runs-baseline.tsv');
