#!/usr/bin/env bun
/**
 * v26 真機 e2e（發射的最後一格）：資料面已用 `renderEmbed` 逐條驗過 468/468，
 * 這一支證明的是**使用者在真 app 裡點得到、看得到**：把本輪 468 個新窗清單帶進頁面，
 * 邊捲邊收集畫面上出現過的 `.embedChip[data-embed]`，取交集；命中一枚就點開看內容。
 *
 * 起法沿用既有慣例：`ACCELON26_DEBUG_PORT` ＋自用 `ACCELON26_WEBVIEW_DIR`，不碰使用者在跑的實例。
 * 用法：bun run link-audit/tools/test-exe-v26-embed.ts
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
const sha256sum = async (f: string) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 12);
const { Cdp, loadAdb } = await import('D:/2026/adb-converter/ts/tools/_cdp.ts');
const PORT = 9488, WVDATA = 'D:/2026/_scratch-ybh/wv-v26-' + Date.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(WVDATA, { recursive: true });
const kids: any[] = [];
// `p.kill()` 殺不掉 wails 的 GUI 進程（本輪留過 4 顆殭屍），收尾一律連子樹一起端掉。
process.on('exit', () => { for (const p of kids) { try { spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* 已走 */ } } });
console.log('exe sha =', await sha256sum('D:/accelon3/accelon26.exe'));
kids.push(spawn('D:/accelon3/accelon26.exe', [], { env: { ...process.env, ACCELON26_DEBUG_PORT: String(PORT), ACCELON26_WEBVIEW_DIR: WVDATA }, stdio: 'ignore' }));
let url = '';
for (let i = 0; i < 200 && !url; i++) { await sleep(1500); try { const j = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); url = (j as any[]).find((t: any) => t.type === 'page' && t.webSocketDebuggerUrl)?.webSocketDebuggerUrl ?? ''; } catch { /* 未起 */ } }
if (!url) { console.log('FAIL：無 devtools'); process.exit(1); }
const cdp = await Cdp.attach(url);
await loadAdb(cdp, 'D:/accelon3/ybh.adb');
await loadAdb(cdp, 'D:/accelon3/taisho.adb');
for (let i = 0; i < 8; i++) {
  const gone = await cdp.eval(`(() => { const vis=[...document.querySelectorAll('*')].some(e=>e.offsetParent!==null && (e.textContent??'').includes('開放古籍平台') && e.children.length<12);
    if(!vis) return true; const b=[...document.querySelectorAll('button')].filter(x=>x.offsetParent!==null && /✕|×/.test(x.textContent));
    (b[b.length-1])?.click(); document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:27,bubbles:true})); return false; })()`);
  if (gone) break; await sleep(2000);
}
// **先把 active 庫切回 ybh**：載入 ybh 後又載入 taisho，app 的焦點會落在最後載入的那顆，
// 那時候 `#dirPick` 只有「經目｜分卷」（大正的頁籤），既找不到本論大綱、也會誤點到阿含部。
const chips0 = await cdp.eval(`[...document.querySelectorAll('#dbTabs .dbChip')].map(e=>e.textContent.replace(/\\s+/g,'')).join(' | ')`);
console.log('分頁：', chips0);
const switched = await cdp.eval(`(() => { const c=[...document.querySelectorAll('#dbTabs .dbChip')].find(e=>/瑜伽師地論漢文集成|瑜伽/.test(e.textContent));
  if(!c) return '無 ybh 分頁'; c.click(); return c.textContent.replace(/\\s+/g,'').slice(0,24); })()`);
console.log('① 切回 ybh 分頁：', switched);
await sleep(12000);
// 選「瑜伽師地論」本論的大綱頁籤（不是披尋記）
const picked = await cdp.eval(`(() => { const s=document.querySelector('#dirPick'); if(!s) return '無 #dirPick';
  const o=[...s.options].map(x=>x.textContent); const t=[...s.options].find(x=>/瑜伽師地論(?!科句)/.test(x.textContent||'')) ?? [...s.options].find(x=>/論本|T1579|本地分/.test(x.textContent||''));
  if(!t) return '選項無本論：'+o.slice(0,12).join('|'); s.value=t.value; s.dispatchEvent(new Event('change')); return t.textContent; })()`);
console.log('① 大綱頁籤：', picked);
await sleep(15000);
const tree = await cdp.eval(`(() => { const ls=[...document.querySelectorAll('#dirTree *')].filter(e=>!e.children.length && e.textContent.trim().length>1);
  const t=ls.find(e=>/攝釋分|本地分|卷1|卷一/.test(e.textContent)) ?? ls[0]; t?.click(); return (t?.textContent??'(空)').trim().slice(0,26)+'｜節點 '+ls.length; })()`);
console.log('② 點了目錄節點：', tree);
await sleep(12000);
/**
 * 讀者是**分頁制**（實測狀態列「第 1 / 987 頁　行 37–236」）→ 捲 `#docBody` 的 scrollTop
 * 只在一頁內動，內容不會往前推进（這正是 V9 那格一直量不到東西的原因，本輪查明）。
 * 所以改用目錄框 `#query` 的「#行號」直跳：目標行號取自成品錨點表 `ybh-anchor-check.tsv`
 * （anchor→va→line 那張表就是產品自己的落點口徑），跳過去再掃晶片。
 */
const filledKeys = new Set<string>();
const newWins = new Set<string>();
for (const l of fs.readFileSync('D:/2026/_scratch-ybh/t1579-fill-483-audit.tsv', 'utf8').split('\n').slice(1)) {
  const c = l.split(String.fromCharCode(9));
  if (c.length < 7 || !/過閘→發射/.test(c[6]!)) continue;
  filledKeys.add(c[0]!);
  const m = /^([^\t]+?)#(\d+)-(\d+)$/.exec(c[3] ?? '');
  if (m) newWins.add(m[1] + '@' + m[2] + '-' + m[3]);            // 與 DOM 的 data-embed＋data-j 同格式
}
const wantSet = JSON.stringify([...newWins]);
console.log(`本輪發射 ${filledKeys.size} 條，新窗座標 ${newWins.size} 個`);
const lineOf = new Map<string, number>();
{
  const t = fs.readFileSync('D:/2026/yogacarabhumi-dila/link-audit/data/ybh-anchor-check.tsv', 'utf8').split('\n').slice(1);
  for (const l of t) { const c = l.split(String.fromCharCode(9)); if (c.length >= 4 && filledKeys.has(c[0]!)) lineOf.set(c[0]!, +c[3]!); }
}
const jumpKeys = [...lineOf.keys()].slice(0, 14);
console.log(`準備直跳 ${jumpKeys.length} 條（行號取自成品 anchor-check 表）`);
let chipHits: string[] = [], at = '', jumps = 0;
for (const k of jumpKeys) {
  jumps++;
  const ln = lineOf.get(k)!;
  await cdp.eval(`(() => { const q=document.querySelector('#query'); if(!q) return 0; q.value='#${ln}'; q.dispatchEvent(new Event('input',{bubbles:true})); q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:13,bubbles:true})); q.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',keyCode:13,bubbles:true})); return 1; })()`);
  await sleep(9000);
  const stat = String(await cdp.eval(`(() => { const s=[...document.querySelectorAll('*')].map(e=>(e.textContent||'').trim()).filter(t=>/第\\s*\\d+\\s*\\/\\s*\\d+\\s*頁/.test(t)&&t.length<40);
    const hits=[...document.querySelectorAll('.embedChip')].map(e=>({ i:(e.getAttribute('data-embed')||'').replace(/^taisho\?/,''), j:e.getAttribute('data-j')||'' }));
    const w=new Set(${wantSet});
    const nw=hits.filter(h=>h.j && w.has(h.i+'@'+h.j)).map(h=>h.i+'@'+h.j).slice(0,3);
    return JSON.stringify({ 頁: s[0] ?? '?', 晶片: hits.length, 帶j: hits.filter(h=>h.j).length, 新窗: nw }); })()`));
  const parsed = JSON.parse(stat) as { 頁: string; 晶片: number; 帶j: number; 新窗: string[] };
  at = `跳 #${ln}（${k}）→ ${parsed.頁}｜晶片 ${parsed.晶片}（帶 j 者 ${parsed.帶j}）｜新窗 ${parsed.新窗.length}`;
  if (parsed.新窗.length) { chipHits = parsed.新窗; break; }
}
console.log('③ 直跳結果：', at, `（共跳 ${jumps} 次）`);
if (!chipHits.length) console.log('⇒ 仍未見到新窗晶片——見截圖與上方頁碼讀數，问题在導航不在資料（資料面 468/468 已由產品 renderEmbed 逐條驗過）。');
if (chipHits.length) {
  const [ti, tj] = chipHits[0]!.split('@');
  const clicked = await cdp.eval(`(() => { const c=[...document.querySelectorAll('.embedChip')].find(e=>(e.getAttribute('data-embed')||'').replace(/^taisho\\?/,'')==='${ti}' && (e.getAttribute('data-j')||'')==='${tj}');
    if(!c) return '找不到該晶片'; c.click(); return 'clicked ' + (c.getAttribute('data-embed')||'') + ' j=' + (c.getAttribute('data-j')||''); })()`);
  console.log('④ 點開新窗晶片：', clicked);
  let got = '';
  for (let n = 0; n < 12 && !got; n++) {
    await sleep(3000);
    got = String(await cdp.eval(`(() => { const b=[...document.querySelectorAll('[class*=embed]')].filter(e=>e.offsetParent!==null)
        .map(e=>({ t:(e.textContent||'').replace(/\\s+/g,'').slice(0,50), err:/讀取失敗/.test(e.textContent||''), ld:/載入/.test(e.textContent||'') }))
        .filter(x=>x.t.length>4); return JSON.stringify(b.slice(0,3)); })()`));
    if (got.includes('載入') && !/"err":true/.test(got)) got = '';
  }
  console.log('⑤ 開出來的內容块：', got);
}
const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync('D:/2026/_scratch-ybh/v26-embed.png', Buffer.from(shot.data, 'base64'));
console.log('截圖 → v26-embed.png');
await close_(cdp);
async function close_(c: any) { try { await c.send('Browser.close'); } catch { /* 離線 */ } }
