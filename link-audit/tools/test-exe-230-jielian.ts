#!/usr/bin/env bun
/**
 * UID 230「《略纂》这些链接都失效」真機重現——**兩個場景都要測**，因為法師是在貼了
 * `<融 i="ybh?" j="0-0"></融>` 之後才說這句話，懷疑針對的是**融合塊填入後內容裡的連結**，
 * 不是正文裡那批（正文那批 384 種／1,564 條在資料層全部解析成功）。
 *
 *   場景 A：正文行的 `a[data-node]`（《略纂》《論釋》《分門記》晶片）點下去有沒有反應
 *   場景 B：勾「以科文融合顯示」→ 等 `.fusionBlock[data-done="1"]` 填好 → 點塊**內部**的
 *           `a[data-node]`，看是否無效（這正是 V9 那格「沒 hydrate 就沒鏈」的同型問題）
 *
 * 讀者是分頁制（捲 scrollTop 不推進內容），所以落點一律用左欄 `#query` 的 `#行號` 直跳。
 * 用法：bun run link-audit/tools/test-exe-230-jielian.ts
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
const { Cdp, loadAdb } = await import('D:/2026/adb-converter/ts/tools/_cdp.ts');
const PORT = 9491, WVDATA = 'D:/2026/_scratch-ybh/wv-230-' + Date.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sha = (f: string) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 12);
fs.mkdirSync(WVDATA, { recursive: true });
const kids: any[] = [];
process.on('exit', () => { for (const p of kids) { try { spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* 已走 */ } } });

console.log('exe   =', sha('D:/accelon3/accelon26.exe'));
console.log('ybh   =', sha('D:/accelon3/ybh.adb'));
const kids2 = spawn('D:/accelon3/accelon26.exe', [], { env: { ...process.env, ACCELON26_DEBUG_PORT: String(PORT), ACCELON26_WEBVIEW_DIR: WVDATA }, stdio: 'ignore' });
kids.push(kids2);
let url = '';
for (let i = 0; i < 120 && !url; i++) { await sleep(1500); try { const j = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); url = (j as any[]).find((t: any) => t.type === 'page' && t.webSocketDebuggerUrl)?.webSocketDebuggerUrl ?? ''; } catch { /* 未起 */ } }
if (!url) { console.log('FAIL：起不來'); process.exit(1); }
const cdp = await Cdp.attach(url);
await loadAdb(cdp, 'D:/accelon3/ybh.adb');
for (let i = 0; i < 8; i++) {
  const gone = await cdp.eval(`(() => { const vis=[...document.querySelectorAll('*')].some(e=>e.offsetParent!==null && (e.textContent??'').includes('開放古籍平台') && e.children.length<12);
    if(!vis) return true; const b=[...document.querySelectorAll('button')].filter(x=>x.offsetParent!==null && /✕|×/.test(x.textContent)); (b[b.length-1])?.click();
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:27,bubbles:true})); return false; })()`);
  if (gone) break; await sleep(2000);
}
await cdp.eval(`(() => { const c=[...document.querySelectorAll('#dbTabs .dbChip')].find(e=>/瑜伽/.test(e.textContent)); c?.click(); return 1; })()`);
await sleep(9000);
// 大綱頁籤＝本論自己的科判樹，再點根節點讓正文出來
console.log('頁籤：', await cdp.eval(`(() => { const s=document.querySelector('#dirPick'); const o=[...s.options].find(x=>/瑜伽師地論科判/.test(x.textContent||'')); if(o){s.value=o.value;s.dispatchEvent(new Event('change'));} return o?o.textContent:'(找不到，選項 '+[...s.options].map(x=>x.textContent).join('|')+')'; })()`));
await sleep(12000);
await cdp.eval(`(() => { const ls=[...document.querySelectorAll('#dirTree *')].filter(e=>!e.children.length && e.textContent.trim().length>1); (ls.find(e=>/卷第1|本地分/.test(e.textContent)) ?? ls[0])?.click(); return 1; })()`);
await sleep(12000);

/** 數畫面上的節聯晶片，並依「顯示文字」分類（《略纂》／《論釋》…） */
const countNodes = () => cdp.eval(`(() => {
  const a=[...document.querySelectorAll('a[data-node]')];
  const by={}; a.forEach(e=>{ const k=(e.textContent||'').replace(/[\\s《》]/g,''); by[k]=(by[k]||0)+1; });
  return JSON.stringify({ 總數: a.length, 依標籤: by, 首個: a[0]? (a[0].getAttribute('data-node')||'') : '' });
})()`);

/**
 * 前後都測**同一組**指標。第一版在這裡犯過錯：before 量「書籤」、after 量「分頁」，
 * 兩串字元本就不同 ⇒ `before !== after` 恒真，會把「什麼都沒發生」講成「跳動了」。
 * 指標取自 reader 自己的狀態元素：`#pageInfo`（第 N / M 頁 行 a-b）、`#status`（訊息與錯誤）、
 * 文件標頭（庫名／章名）、目前 active 分頁、目錄選中項。
 */
const SNAP = `(() => JSON.stringify({
  頁: (document.querySelector('#pageInfo')||{}).textContent||'',
  訊息: (document.querySelector('#status')||{}).textContent||'',
  標頭: (document.querySelector('.docHead')||document.querySelector('#docHead')||{}).textContent||'',
  active分頁: (document.querySelector('#dbTabs .dbChip.on,#dbTabs .dbChip.active,#dbTabs .dbChip[aria-selected=true]')||{}).textContent||'',
  目錄選中: (document.querySelector('#dirTree .sel,#dirTree .on,#dirTree [aria-current]')||{}).textContent||'',
  捲動: (document.querySelector('#docBody')||{scrollTop:-1}).scrollTop
}))()`;
const snap = async () => JSON.parse(String(await cdp.eval(SNAP))) as Record<string, unknown>;
const diffKeys = (a: Record<string, unknown>, b: Record<string, unknown>) => Object.keys(a).filter((k) => String(a[k]) !== String(b[k]));

console.log('\n【場景 A：正文行的《略纂》晶片】');
const A = JSON.parse(String(await countNodes())) as any;
console.log('  畫面上節聯：', A.總數, '｜《略纂》', (A.依標籤 as any)['略纂'] ?? 0, '枚');
if (A.總數) {
  const s0 = await snap();
  const clicked = await cdp.eval(`(() => { const a=[...document.querySelectorAll('a[data-node]')].find(e=>/略纂/.test(e.textContent||'')); if(!a) return '無《略纂》晶片'; a.click(); return 'clicked data-node=' + (a.getAttribute('data-node')||''); })()`);
  console.log('  ', clicked);
  await sleep(12000);
  const s1 = await snap();
  const d = diffKeys(s0, s1);
  console.log('  點前：', JSON.stringify(s0));
  console.log('  點後：', JSON.stringify(s1));
  console.log('  ⇒ 變化的欄位：', d.length ? d.join('、') : '（全無變化＝失效）');
}

console.log('\n【場景 B：融合塊內部的節聯（法師貼的是 <融>）】');
const tog = await cdp.eval(`(() => { const c=[...document.querySelectorAll('input[type=checkbox]')].find(x=>/科文融合/.test((x.closest('label')||x.parentElement||{textContent:''}).textContent)); if(!c) return '找不到開關'; if(!c.checked) c.click(); return '勾上 checked=' + c.checked; })()`);
console.log('  開關：', tog);
await sleep(12000);
let nDone = 0;
for (let i = 0; i < 8 && !nDone; i++) {
  nDone = Number(await cdp.eval(`document.querySelectorAll('.fusionBlock[data-done="1"]').length`));
  if (!nDone) await sleep(6000);
}
const inner = String(await cdp.eval(`(() => { const b=[...document.querySelectorAll('.fusionBlock[data-done="1"]')];
  return JSON.stringify({ 殼: document.querySelectorAll('.fusionBlock').length, 已填: b.length,
    塊內節聯: b.reduce((s,e)=>s+e.querySelectorAll('a[data-node]').length,0),
    塊內聯結: b.reduce((s,e)=>s+e.querySelectorAll('a[data-xref]').length,0),
    示例: b[0]? (b[0].textContent||'').replace(/\\s+/g,'').slice(0,36):'' }); })()`));
console.log('  ', inner);
const s2 = await snap();
const clicked2 = await cdp.eval(`(() => { const a=[...document.querySelectorAll('.fusionBlock a[data-node]')][0]; if(!a) return '融合塊內沒有節聯'; const n=a.getAttribute('data-node')||''; a.click(); return 'clicked ' + n; })()`);
console.log('  ', clicked2);
await sleep(12000);
const s3 = await snap();
console.log('  點前：', JSON.stringify(s2));
console.log('  點後：', JSON.stringify(s3));
console.log('  ⇒ 變化的欄位：', diffKeys(s2, s3).join('、') || '（全無變化＝失效）');
const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync('D:/2026/_scratch-ybh/e2e-230.png', Buffer.from(shot.data, 'base64'));
console.log('\n截圖 → e2e-230.png');
try { await cdp.send('Browser.close'); } catch { /* 離線 */ }
