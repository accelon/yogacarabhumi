/**
 * 掃一顆 adb 的所有屬性鍵：哪些鍵的值裡出現 `#`（窗綴／詞序）、各幾條、樣本一条。
 * 用来回答「19ccdb8 剝窗綴這一刀，在部署中的這顆 adb 上到底有沒有作用」。
 * 用法：bun run link-audit/tools/scan-hash-attrs.ts [adb…]
 */
import { AdbReader, SyncIO } from 'D:/2026/adb-converter/ts/src/accelon26/adb.ts';

for (const f of (process.argv.slice(2).length ? process.argv.slice(2) : ['D:/accelon3/ybh.adb'])) {
  const rd = await AdbReader.open(new SyncIO(f));
  console.log(`\n════ ${f}  dbname=${rd.header.dbname}`);
  const attrC: any = rd.containers.get('attributes');
  if (!attrC) { console.log('  無 attributes 容器'); continue; }
  const names: string[] = attrC.names ?? [];
  console.log(`  屬性鍵 ${names.length} 個：${names.join(' ')}`);
  let hitKeys = 0;
  for (const nm of names) {
    const av = await rd.attributeValues(nm).catch(() => null);
    if (!av || !av.values.length) continue;
    const withHash = av.values.filter((v: string) => v.includes('#'));
    if (!withHash.length) continue;
    hitKeys++;
    console.log(`  ${nm}: ${av.values.length} 值，含 # ${withHash.length} 條，樣本 ${JSON.stringify(withHash[0].slice(0, 60))}`);
  }
  if (!hitKeys) console.log('  → 全庫沒有任何屬性值帶 `#`');
}
