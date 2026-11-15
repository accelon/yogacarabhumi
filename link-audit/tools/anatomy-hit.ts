#!/usr/bin/env bun
/**
 * 單條落點解剖（發射前的最後一道人工核）：給一個字串，列出
 *   ① 引擎命中的 VA 與「按位置」算出的頁欄
 *   ② 該頁欄 ±1 欄的 `pageHanTextOf` 裡，這個字串到底在不在、在第幾個字
 * 用來判「頁內定位失敗」那 14 條是資料問題、還是我的頁欄映射問題。
 * 用法：bun run link-audit/tools/anatomy-hit.ts "<字串>" [頁欄]
 */
import { AdbReader, SyncIO } from 'D:/2026/adb-converter/ts/src/accelon26/adb.ts';
import { SearchSession } from 'D:/2026/adb-converter/ts/src/accelon26/search.ts';
import { pageHanTextOf } from 'D:/2026/adb-converter/ts/src/accelon26/page-text.ts';
import { hanChars } from 'D:/2026/adb-converter/ts/src/accelon26/han.ts';

const Q = process.argv[2] ?? '又非五識身有二剎那相';
const CENTER = process.argv[3] ?? '';
const rd = await AdbReader.open(new SyncIO('D:/accelon3/taisho.adb'));
const s = new SearchSession(rd); await s.init();
const tags = rd.containers.get('tags')!;
const pi = tags.names.indexOf('頁');
const pageVas = await rd.decodeBlockList('tags', pi);
const ids: string[] = ((await rd.attributeValues('頁.id'))?.values ?? []).map(String);

console.log(`頁 tag 實例 ${pageVas.length}、頁.id 值 ${ids.length}`);
console.log(`pageVas 是否單調遞增：前 5 ${pageVas.slice(0, 5).join(',')}｜單調=${pageVas.every((v, i) => i === 0 || v >= pageVas[i - 1]!)}`);
const le = (v: number) => { let a = 0, b = pageVas.length - 1, r = -1; while (a <= b) { const m = (a + b) >> 1; if (pageVas[m]! <= v) { r = m; a = m + 1; } else b = m - 1; } return r; };

const res = await s.search(Q, 50);
console.log(`送搜「${Q}」（${Q.length} 漢字）→ hits ${res.hits.length}`);
const vas = (res.hits as { va: number }[]).map((h) => h.va);
for (const va of vas.slice(0, 6)) {
  const at = le(va);
  console.log(`  va=${va} → 位置 ${at} → 頁欄 ${ids[at] ?? '?'}｜該欄起點 VA ${pageVas[at]}、頁內偏移 ${va - (pageVas[at] ?? 0)}`);
}
/* 命中處前後各一欄，看这句话究竟落在哪一欄的漢字流裡 */
const at0 = vas.length ? le(vas[0]!) : -1;
const probePages = [...new Set([at0 - 1, at0, at0 + 1, at0 + 2].map((n) => ids[n]).filter(Boolean))] as string[];
console.log(`\n逐欄查这句话在不在（含命中欄前後）：`);
for (const p of probePages) {
  const ph = await pageHanTextOf(rd, p);
  console.log(`  ${p}：${ph.length} 字｜整句@${ph.indexOf(Q)}｜前 6 字@${ph.indexOf(Q.slice(0, 6))}`);
}
if (at0 >= 0) {
  const p = ids[at0]!, ph = await pageHanTextOf(rd, p);
  console.log(`\n命中欄 ${p}：頁內偏移 VA ${vas[0]! - (pageVas[at0] ?? 0)}｜pageHanTextOf 長度 ${ph.length}｜含句=${ph.includes(Q)}`);
  console.log(`  該欄起 20 字 ${JSON.stringify(ph.slice(0, 20))}`);
  console.log(`  該欄第 340–400 字 ${JSON.stringify(ph.slice(340, 400))}`);
}
