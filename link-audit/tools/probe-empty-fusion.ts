#!/usr/bin/env bun
/**
 * 查已部署 adb 裡的 `<融>` 是否有**空目標**或解析不到的 nodeKey
 * （法師兩封信都貼了 `<融 i="ybh?" j="0-0"></融>`，若成品真有這種殼就是死鏈成因）。
 * 走解碼路（raw grep .adb 無效：標籤以 id 編碼）。只報計數與鍵，不摘正文。
 * 用法：bun run link-audit/tools/probe-empty-fusion.ts [adb]
 */
import { AdbReader, SyncIO } from 'D:/2026/adb-converter/ts/src/accelon26/adb.ts';
import { nodeAnchorInfo } from 'D:/2026/adb-converter/ts/src/accelon26/page-text.ts';

const rd = await AdbReader.open(new SyncIO(process.argv[2] ?? 'D:/accelon3/ybh.adb'));
let whole = '';
for (let b = 0; b < rd.containers.get('source')!.count; b++) whole += await rd.sourceText(b);

const all = [...whole.matchAll(/<融 i="([^"]*)"/g)].map((m) => m[1]!);
const noHash = all.filter((v) => !v.includes('#'));
const literallyEmpty = all.filter((v) => v === 'ybh?' || v === '');
console.log(`<融> 枚數 ${all.length}｜目標缺「#」${noHash.length} 條｜形如 ybh?<空> ${literallyEmpty.length} 條`);
if (noHash.length) console.log('  缺 # 的樣本:', noHash.slice(0, 6).map(v => JSON.stringify(v)).join(' '));

const perVol = new Map<string, number>();
for (const v of all) { const p = (v.split('#')[0] || '(空)').replace('ybh?', ''); perVol.set(p, (perVol.get(p) ?? 0) + 1); }
console.log('  目標所屬卷（前 10）:', [...perVol].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => `${k || '(空)'}=${n}`).join(' '));

/* 逐種解析：融的目標節點能不能落到 VA（這才是「點了有沒有反應」的判準） */
const uniq = [...new Set(all)];
let ok = 0; const bad: string[] = [];
const badByVol = new Map<string, number>();
for (const t of uniq) {
  const info = await nodeAnchorInfo(rd, t.replace(/^ybh\?/, ''));
  if (info) ok++;
  else {
    const p = (t.split('#')[0] || '(空)').replace('ybh?', '');
    badByVol.set(p, (badByVol.get(p) ?? 0) + 1);
    if (bad.length < 8) bad.push(t);
  }
}
console.log(`\n唯一目標 ${uniq.length} 種 → 解析 OK ${ok}、FAIL ${uniq.length - ok}`);
console.log('  FAIL 依卷:', [...badByVol].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => `${k || '(空)'}=${n}`).join(' '));
if (bad.length) console.log('  FAIL 樣本:', bad.join(' '));
