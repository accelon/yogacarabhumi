#!/usr/bin/env bun
/**
 * 量尺自检：`span-build.ts:24-30` 那套「書＝瑜伽師地論」VA 區間，到底圈進來的是一本還是 100 卷？
 * 若 `cachedStrings('書')` 裡「瑜伽師地論」只命中第一卷，其餘 99 卷在區間外 →
 * 「零命中」是量尺造成的假數，不是資料沒有。（使用者硬規則：驗收腳本也要被驗）
 * 用法：bun run link-audit/tools/probe-book-range.ts
 */
import { AdbReader, SyncIO } from 'D:/2026/adb-converter/ts/src/accelon26/adb.ts';

const rd = await AdbReader.open(new SyncIO('D:/accelon3/taisho.adb'));
const tags = rd.containers.get('tags')!;
const si = tags.names.indexOf('書');
const sVas: number[] = await rd.decodeBlockList('tags', si);
const names = await rd.cachedStrings('書');
console.log(`書 實例數 ${sVas.length}／字串數 ${names.length}`);

const hits: number[] = [];
for (let i = 0; i < names.length; i++) if (String(names[i]).includes('瑜伽師地論')) hits.push(i);
console.log(`名稱含「瑜伽師地論」的實例 ${hits.length} 個：索引 ${hits.slice(0, 8).join(', ')}${hits.length > 8 ? ' …' : ''}`);
for (const i of hits.slice(0, 8)) console.log(`  [${i}] ${JSON.stringify(names[i])} va=${sVas[i]}`);

const av = await rd.attributeValues('頁.id');
const pv: number[] = await rd.decodeBlockList('tags', tags.names.indexOf('頁'));
const ids: string[] = (av?.values ?? []).map(String);
const pageOf = (va: number) => { let a = 0, b = pv.length - 1, at = -1; while (a <= b) { const m = (a + b) >> 1; if (pv[m]! <= va) { at = m; a = m + 1; } else b = m - 1; } return at < 0 ? '' : ids[at] ?? ''; };

if (hits.length) {
  const f = hits[0]!;
  const spanOnlyFirst = { lo: sVas[f]!, hi: sVas[f + 1] ?? Infinity };
  const loAll = sVas[hits[0]!]!, hiAll = sVas[hits[hits.length - 1]!]!;
  console.log(`\n只取第一條（span-build 現行做法）：[${spanOnlyFirst.lo}, ${spanOnlyFirst.hi}) ＝頁 ${pageOf(spanOnlyFirst.lo)} ～ ${pageOf((sVas[f + 1] ?? pv[pv.length - 1]!) - 1)}`);
  console.log(`全部含名實例：首 ${pageOf(loAll)}（va ${loAll}）～ 末條起點 ${pageOf(hiAll)}（va ${hiAll}）`);
  // 我方 ybh 的聯到底落在哪些頁欄？（拿已知的兩個端點當外部對照）
  for (const p of ['30p279a', '30p500a', '30p517c', '30p600a', '30p694c']) {
    const i = ids.indexOf(p);
    console.log(`  頁 ${p} 存在=${i >= 0}${i >= 0 ? `、va=${pv[i]}、落在只取第一條的區間內=${pv[i]! >= spanOnlyFirst.lo && pv[i]! < spanOnlyFirst.hi}、落在全部區間內=${pv[i]! >= loAll && pv[i]! <= hiAll}` : ''}`);
  }
}
