#!/usr/bin/env bun
/**
 * 把基數明細拆成三份**人工複核清單**（給下一輪排工用，Excel 直開：UTF-8 BOM、CRLF、含逗號欄加引號）：
 *   review-62.csv  ＝唯一命中但收口僅 4–6 字（短串易撞，需人眼看「是不是真唯一」）
 *   review-338.csv ＝邻近兜底救回的（弱尺：正控樣本僅 17 條，需人眼確認落點）
 *   review-248.csv ＝多命中（需逐條決定用卷內單調序取哪一筆，或乾脆不補）
 * 每份都附「複核要點」欄，寫明這批為什麼不能自動發射。
 * 用法：bun run link-audit/tools/split-review-lists.ts
 */
import fs from 'node:fs';
const SRC = 'D:/2026/yogacarabhumi-dila/link-audit/data/t1579-window-baseline-both.csv';
const OUT = 'D:/2026/yogacarabhumi-dila/link-audit/data';
const NL = '\r\n';

const raw = fs.readFileSync(SRC, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
const head = raw[0]!.split(',');
const idx = (k: string) => head.indexOf(k);
const parse = (l: string): string[] => {
  const o: string[] = []; let i = 0;
  while (i <= l.length) {
    if (l[i] === '"') { let j = i + 1, s = ''; while (j < l.length) { if (l[j] === '"' && l[j + 1] === '"') { s += '"'; j += 2; continue; } if (l[j] === '"') { j++; break; } s += l[j++]; } o.push(s); i = j + 1; if (l[i] === ',') i++; }
    else { let j = i; while (j < l.length && l[j] !== ',') j++; o.push(l.slice(i, j)); i = j + 1; }
    if (i > l.length) break;
  }
  return o;
};
const rows = raw.slice(1).map(parse);
const q = (s: string) => (/[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
const c卷 = idx('卷'), c判 = idx('判語'), c收 = idx('收口長度'), c原 = idx('窗空原因'), c首 = idx('送搜首行（本區 md 原文前 40 字）');

const groups: [string, (c: string[]) => boolean, string][] = [
  ['review-62', (c) => c[c判] === '可補（連寫唯一）' && +c[c收] >= 4 && +c[c收] <= 6,
   '唯一命中但只用首 4–6 字就收口——短串在大正裡撞號的機率高，需人眼確認該頁該句確實只此一處'],
  ['review-338', (c) => c[c判] === '可補（鄰近兜底）',
   '靠「末兩片段 ≤60 VA 邻近」救回，這條尺比連寫寬、正控樣本僅 17 條；且邻近只證「頁對」不證「窗位對」'],
  ['review-248', (c) => c[c判] === '需消歧（多命中）',
   '書區內多處命中，需逐條決定取哪一筆（可用 span-build.ts:104 的卷內單調序 prevRank），或判定不補'],
];
for (const [name, pred, why] of groups) {
  const sel = rows.filter(pred).sort((a, b) => +a[c卷] - +b[c卷] || a[2].localeCompare(b[2]));
  const head2 = [...head, '複核要點'];
  const out = [head2.join(','), ...sel.map((c) => [...c, q(why)].join(','))];
  fs.writeFileSync(`${OUT}/${name}.csv`, '\uFEFF' + out.join(NL) + NL, 'utf8');
  const byReason = new Map<string, number>();
  for (const c of sel) byReason.set(c[c原] ?? '?', (byReason.get(c[c原] ?? '?') ?? 0) + 1);
  console.log(`${name}.csv：${sel.length} 條｜依窗空原因 ${[...byReason].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join('、')}`);
}
