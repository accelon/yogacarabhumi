#!/usr/bin/env bun
/**
 * UID 229「md表格未能显示」的真機確認：v27 已包 `<表>` 邊界，這裡要證明的是
 * **讀者在實際介面裡點到那一頁時，DOM 出現的是 `<table>`（有行有欄），不是純文字行**。
 *
 * 落點用左欄 `#query` 的 `#行號` 直跳（讀者是分頁制，捲 scrollTop 不推進內容）。
 * 行號先在成品 adb 裡算：找含「七種作意」且被 `<表>` 包住的那一段起點。
 * 用法：bun run link-audit/tools/test-exe-229-table.ts
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
const { Cdp, loadAdb } = await import('D:/2026/adb-converter/ts/tools/_cdp.ts');
const { AdbReader, SyncIO } = await import('D:/2026/adb-converter/ts/src/accelon26/adb.ts');

const PORT = 9493, WVDATA = 'D:/2026/_scratch-ybh/wv-229-' + Date.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sha = (f: string) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 12);

/* ── 1. 在成品裡算出那張表的行號：**用引擎**（`adb-skill/engine.ts` 的 search/raw），
      不自己拼 source 區塊——第一版自己拼行，結果 `總行數 1`，把整本壓成一行。
      查 adb 內容一律走引擎解碼路，這是本區硬規則。── */
const { openAdb } = await import('D:/2026/adb-converter/ts/tools/adb-skill/engine.ts');
const adb = await openAdb('D:/2026/_scratch-ybh/ybh/ybh.adb');
console.log('成品 sha =', sha('D:/accelon3/ybh.adb'), '| 總行數', adb.lines);
const res = await adb.search('四十種作意', 30);
let tableLine = -1;
for (const h of res.hits) {
  const up = await adb.raw(h.line);
  if (up.includes('|')) {
    // 往上 6 行找 `<表>` 開啟行，確認這一段真的被包住（包了才會有 <table>）
    for (let j = h.line; j > Math.max(0, h.line - 6); j--) {
      const t = await adb.raw(j);
      if (/<表>/.test(t)) { tableLine = j + 1; break; }
    }
    if (tableLine > 0) break;
  }
}
console.log('引擎命中「四十種作意」', res.total, '處；表段起點（1-based 行號）=', tableLine || '未定位');

/* ── 2. 真機跳過去數 <table> ── */
fs.mkdirSync(WVDATA, { recursive: true });
const kids: any[] = [];
process.on('exit', () => { for (const p of kids) { try { spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* 已走 */ } } });
console.log('exe sha =', sha('D:/accelon3/accelon26.exe'));
const pr = spawn('D:/accelon3/accelon26.exe', [], { env: { ...process.env, ACCELON26_DEBUG_PORT: String(PORT), ACCELON26_WEBVIEW_DIR: WVDATA }, stdio: 'ignore' });
kids.push(pr);
let url = '';
for (let i = 0; i < 120 && !url; i++) { await sleep(1500); try { const j = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); url = (j as any[]).find((t: any) => t.type === 'page' && t.webSocketDebuggerUrl)?.webSocketDebuggerUrl ?? ''; } catch { /* 未起 */ } }
if (!url) { console.log('FAIL：起不來'); process.exit(1); }
const cdp = await Cdp.attach(url);
await loadAdb(cdp, "D:/accelon3/ybh.adb");
for (let i = 0; i < 8; i++) {
  const gone = await cdp.eval(`(() => { const vis=[...document.querySelectorAll('*')].some(e=>e.offsetParent!==null && (e.textContent??'').includes('開放古籍平台') && e.children.length<12);
    if(!vis) return true; const b=[...document.querySelectorAll('button')].filter(x=>x.offsetParent!==null && /✕|×/.test(x.textContent)); (b[b.length-1])?.click();
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:27,bubbles:true})); return false; })()`);
  if (gone) break; await sleep(2000);
}
await cdp.eval(`(() => { const c=[...document.querySelectorAll('#dbTabs .dbChip')].find(e=>/瑜伽/.test(e.textContent)); c?.click(); return 1; })()`);
await sleep(9000);
const TAB0 = `(() => JSON.stringify({頁:(document.querySelector('#pageInfo')||{}).textContent||'', 表格:document.querySelectorAll('#docText table, #docBody table').length}))()`;
console.log('跳之前：', String(await cdp.eval(TAB0)));
if (tableLine > 0) {
  await cdp.eval(`(() => { const q=document.querySelector('#query'); if(!q) return 0; q.value='#${tableLine}'; q.dispatchEvent(new Event('input',{bubbles:true}));
    q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:13,bubbles:true})); q.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',keyCode:13,bubbles:true})); return 1; })()`);
  await sleep(15000);
  const after = String(await cdp.eval(TAB0));
  console.log('跳到行 ' + tableLine + ' 後：', after);
  const shape = String(await cdp.eval(`(() => { const t=document.querySelector('#docText table, #docBody table'); if(!t) return '無 table 元素';
    const rows=[...t.querySelectorAll('tr')]; const head=rows[0]?[...rows[0].querySelectorAll('th,td')].map(x=>(x.textContent||'').replace(/\\s+/g,'').slice(0,10)):[];
    return JSON.stringify({ 行數: rows.length, 表頭欄: head.slice(0,10), 第二列: rows[1]?[...rows[1].querySelectorAll('td,th')].map(x=>(x.textContent||'').replace(/\\s+/g,'').slice(0,8)):[],
      含勾選符: (t.textContent||'').includes('ˇ') || (t.textContent||'').includes('◎') || (t.textContent||'').includes('*') }); })()`));
  console.log('表格形狀：', shape);
} else {
  console.log('⚠ 沒定位到表段起點，改為全頁掃描：');
  console.log('  ', String(await cdp.eval(`(() => JSON.stringify({表格:document.querySelectorAll('table').length}))()`)));
}
const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync('D:/2026/_scratch-ybh/e2e-229-table.png', Buffer.from(shot.data, 'base64'));
console.log('截圖 → e2e-229-table.png');
try { await cdp.send('Browser.close'); } catch { /* 離線 */ }
