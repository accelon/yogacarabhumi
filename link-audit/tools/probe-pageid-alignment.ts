#!/usr/bin/env bun
/**
 * 量尺自檢（第 2 號）：`span-build.ts:19-34` 的 `pageOf()` 是**按位置**把
 *   `attributeValues('頁.id').values[k]` ↔ `decodeBlockList('tags','頁')[k]`
 * 對起來的；而母區正典 `xref.ts:426` 是**按 pointer** 對的：
 *   `vas[(pointers[k] & 0xffffff) - 1]` ↔ `values[k]`
 * 兩者是否同一件事？若不同，凡是沿用 span-build 口徑算出來的「頁欄」都可能是錯配
 * （實測徵兆：基數明細裡出現 `16p695a`、`9p638b` 這種**非冊 30** 的頁欄落在瑜伽師地論書區內）。
 *
 * 用法：bun run link-audit/tools/probe-pageid-alignment.ts [adb]
 */
import { AdbReader, SyncIO } from 'D:/2026/adb-converter/ts/src/accelon26/adb.ts';

const FILE = process.argv[2] ?? 'D:/accelon3/taisho.adb';
const rd = await AdbReader.open(new SyncIO(FILE));
const tags = rd.containers.get('tags')!;
const pi = tags.names.indexOf('頁');
const pageVas: number[] = await rd.decodeBlockList('tags', pi);
const av = await rd.attributeValues('頁.id');
if (!av || !av.pointers) { console.log('無 頁.id'); process.exit(0); }
const ids: string[] = av.values.map(String);
const ptr = av.pointers as Int32Array;

console.log(`頁 tag 實例 ${pageVas.length}、頁.id 值 ${ids.length}、pointers ${ptr.length}`);
console.log(`⇒ 三者是否等長：${pageVas.length === ids.length && ids.length === ptr.length}`);

// 兩套配對逐條比
let same = 0, diff = 0, unmapped = 0;
const samples: string[] = [];
for (let k = 0; k < ids.length; k++) {
  const byPos = ids[k]!;                                   // span-build 口徑（假定同序）
  const vaIdx = (ptr[k]! & 0xffffff) - 1;
  const vaByPtr = pageVas[vaIdx];
  // 正典口徑：值 k 的 VA ＝ 該值指到的 頁 tag 實例 VA；再用二分找 pageVas 位置
  const posInTags = vaByPtr == null ? -1 : (() => { let a = 0, b = pageVas.length - 1, at = -1; while (a <= b) { const m = (a + b) >> 1; if (pageVas[m]! <= vaByPtr) { at = m; b = m - 1; } else a = m + 1; } return at; })();
  if (vaByPtr == null) { unmapped++; continue; }
  if (posInTags === k) same++;
  else { diff++; if (samples.length < 6) samples.push(`k=${k} 值 ${byPos} 的 VA ${vaByPtr} 其實落在 pageVas[${posInTags}]（該位值 ${ids[posInTags] ?? '?'}）`); }
}
console.log(`按位＝按 pointer 一致 ${same}、不一致 ${diff}、取不到 VA ${unmapped}`);
for (const s of samples) console.log('  ' + s);

// 最關鍵的一題：乾脆拿書區起點 VA 反查，看兩種口徑各得到什麼頁欄
const si = tags.names.indexOf('書');
const sVas: number[] = await rd.decodeBlockList('tags', si);
const names = await rd.cachedStrings('書');
const at = names.findIndex((n) => String(n).includes('瑜伽師地論'));
if (at >= 0) {
  const lo = sVas[at]!;
  const le = (arr: number[], v: number) => { let a = 0, b = arr.length - 1, r = -1; while (a <= b) { const m = (a + b) >> 1; if (arr[m]! <= v) { r = m; a = m + 1; } else b = m - 1; } return r; };
  const idx = le(pageVas, lo);
  console.log(`\n瑜伽師地論書區起點 va=${lo} → pageVas 位置 ${idx}`);
  console.log(`  按位置取 id（span-build 口徑）= ${ids[idx] ?? '?'}`);
  // pointer 口徑：找哪一個 k 的 頁 tag 實例 VA 正好是 pageVas[idx]
  const wantVa = pageVas[idx]!;
  const viaPtr: string[] = [];
  for (let k = 0; k < ids.length && viaPtr.length < 3; k++) if (pageVas[(ptr[k]! & 0xffffff) - 1] === wantVa) viaPtr.push(`${k}:${ids[k]}`);
  console.log(`  按 pointer 反查同一 VA（正典口徑）= ${viaPtr.join(' ') || '查無'}`);
  for (const p of ['30p279a', '30p694c']) console.log(`  值 ${p} 在 ids 的位置 ${ids.indexOf(p)}、其 pointer 指向的 VA ${(() => { const k = ids.indexOf(p); return k < 0 ? -1 : pageVas[(ptr[k]! & 0xffffff) - 1]; })()}（pageVas 位置 ${(() => { const k = ids.indexOf(p); if (k < 0) return -1; const v = pageVas[(ptr[k]! & 0xffffff) - 1]; return v == null ? -1 : pageVas.indexOf(v); })()}）`);
}
