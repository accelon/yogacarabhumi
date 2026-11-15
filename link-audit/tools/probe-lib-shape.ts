/**
 * 輔助探針：列出庫的容器／tag／屬性名，用来判「anchorIndex 為何回 null」與
 * 「反鏈若放開 `頁.id` 必要條件，有哪些欄位會空」。
 * 用法：bun run link-audit/tools/probe-lib-shape.ts [adb…]
 */
import { AdbReader, SyncIO } from 'D:/2026/adb-converter/ts/src/accelon26/adb.ts';

const FILES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['D:/accelon3/ybh.adb', 'D:/accelon3/fuyan-反鏈版.adb'];

for (const f of FILES) {
  const rd = await AdbReader.open(new SyncIO(f));
  const t = rd.containers.get('tags')!;
  const counts: string[] = [];
  for (let i = 0; i < t.names.length; i++) counts.push(`${t.names[i]}=${(await rd.decodeBlockList('tags', i)).length}`);
  const attrC = rd.containers.get('attributes');
  const attrNames = attrC ? [...(attrC as any).names] : [];
  console.log(`\n════ ${f}  dbname=${rd.header.dbname}`);
  console.log('  容器：', [...rd.containers.keys()].join(', '));
  console.log('  tags：', counts.join('  '));
  console.log('  屬性鍵（前 60）：', attrNames.slice(0, 60).join(' '));
  for (const k of ['頁.id', '聯.i', '聯.q', '卷.id', '書.id']) {
    const av = await rd.attributeValues(k).catch(() => null);
    console.log(`    attributeValues('${k}') = ${av ? av.values.length + ' 值' : 'null'}`);
  }
}
