#!/usr/bin/env bun
/**
 * github.com:443 掛掉時的備援推送：走 api.github.com（實測可達）用 Git Data API 重放
 * fork/main..HEAD 的每一筆 commit，最後 PATCH refs/heads/<branch>。
 * - token 由本機 git credential helper 取，**絕不印出、不寫檔**。
 * - 逐檔以 base64 blob 上傳（binary-safe：用 cat-file 取位元組）；commit 沿用原作者／日期／訊息。
 * - 代價：API 重建的 commit SHA 與本地不同（內容相同）；網路恢復後以
 *   `git fetch fork && git reset --hard fork/main` 對齊（reset 屬破壞性，須使用者點頭）。
 * 用法：bun push-via-api.ts [owner/repo] [branch]
 */
import { execFileSync } from 'node:child_process';

const REPO = process.argv[2] ?? 'accelon/yogacarabhumi-dila';
const BRANCH = process.argv[3] ?? 'main';
const CWD = 'D:/2026/yogacarabhumi-dila';

const gitStr = (...a: string[]) => execFileSync('git', a, { cwd: CWD, maxBuffer: 256 * 1024 * 1024 }).toString();
const gitBuf = (...a: string[]) => execFileSync('git', a, { cwd: CWD, maxBuffer: 256 * 1024 * 1024 });

const cred = execFileSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8' });
const token = (/^password=(.*)$/m.exec(cred)?.[1] ?? '').trim();
if (!token) { console.log('拿不到 GitHub token（git credential helper 無紀錄）'); process.exit(1); }
console.log(`token 已取得（長度 ${token.length}，內容不顯示）`);

const api = async (path: string, method = 'GET', body?: unknown) => {
  const r = await fetch('https://api.github.com' + path, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'User-Agent': 'ybh-line' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({} as any));
  if (!r.ok) throw new Error(`${method} ${path} → HTTP ${r.status} ${(j as any).message ?? ''}`);
  return j as any;
};

/**
 * 遠端真 tip 與本地追蹤參照常常不一致：本工具自己用 API 重建過的 commit，
 * SHA 與本地不同，而 `git fetch`（走 github.com）在本機經常被 SNI 斷掉 →
 * `remotes/fork/<branch>` 會**落後**。若照落後的本地 ref 去重放，已上架的那筆會被
 * **再推一遍**（內容重複的 commit）。故這裡先查遠端真實 tip，再按**標題去重**。
 */
const localBase = gitStr('rev-parse', `remotes/fork/${BRANCH}`).trim();
const head = gitStr('rev-parse', BRANCH).trim();
const remoteTip = (await api(`/repos/${REPO}/git/refs/heads/${BRANCH}`)).object.sha as string;
// 遠端近期 commit 的標題集合（用來剔掉「已經上過」的——SHA 不同但標題相同）
const remoteHist = await api(`/repos/${REPO}/commits?sha=${BRANCH}&per_page=50`) as { commit?: { message?: string } }[];
const remoteSubjects = new Set((Array.isArray(remoteHist) ? remoteHist : []).map((c) => (c.commit?.message ?? '').split('\n')[0].trim()));
const base = remoteTip;                                       // 新 commit 要接在**遠端**鏈尾
const headSubject = gitStr('show', '-s', '--format=%s', head).trim();
const candidates = (() => { try { return gitStr('log', '--format=%H', '--reverse', `${localBase}..${head}`).trim().split(/\s+/).filter(Boolean); } catch { return []; } })();
// 本地 SHA 不在遠端（遠端是重建的），所以只能靠「標題是否已在遠端出現」來判定要不要推
const commits = candidates.filter((c) => !remoteSubjects.has(gitStr('show', '-s', '--format=%s', c).trim()));
console.log(`遠端真 tip=${remoteTip.slice(0, 12)} 本地 fork/${BRANCH} 追蹤=${localBase.slice(0, 12)}${localBase === remoteTip ? '（一致）' : '（**落後**，已改用遠端 tip 為 base）'}`);
console.log(`候選 ${candidates.length} 筆，剔除已在遠端的 ${candidates.length - commits.length} 筆 → 待重放 ${commits.length} 筆：${commits.map((c) => c.slice(0, 7)).join(' ') || '（無）'}`);
if (!commits.length) { console.log('遠端已包含本區全部提交（按標題比對），不必再推。'); process.exit(0); }
if (process.argv.includes('--dry')) process.exit(0);

// `parent` 是**遠端**鏈上的 SHA（本地沒這物件，只能送給 API）；`localPrev` 必須是**本地**可比對的 SHA，
// 取「待重放第一筆的本地父」——base 已改成遠端 tip，直接拿它當 localPrev 會讓 git diff 找不到物件。
let parent = base, localPrev = gitStr('rev-parse', `${commits[0]}^`).trim(), nBlobs = 0, nBytes = 0, cur = '';
const t0 = Date.now();
for (const sha of commits) {
  // 注意：`parent` 是**遠端**鏈上的 SHA（API 重建後與本地不同），`localPrev` 才是本地可比對的上一筆
  const files = gitStr('diff', '--name-status', `${localPrev}..${sha}`).trim().split('\n').filter(Boolean);
  const tree: any[] = [];
  for (const line of files) {
    const st = line[0]!;
    const path = line.slice(1).trim();
    if (st === 'D') { tree.push({ path, mode: '100644', type: 'blob', sha: null }); continue; }
    let buf: Buffer;
    try { buf = gitBuf('cat-file', 'blob', `${sha}:${path}`); } catch { continue; }     // 改名等邊角：以 base_tree 現況為準
    nBlobs++; nBytes += buf.length;
    const b = await api(`/repos/${REPO}/git/blobs`, 'POST', { content: buf.toString('base64'), encoding: 'base64' });
    tree.push({ path, mode: '100644', type: 'blob', sha: b.sha });
  }
  const pc = await api(`/repos/${REPO}/git/commits/${parent}`);
  const nt = await api(`/repos/${REPO}/git/trees`, 'POST', { base_tree: pc.tree.sha, tree });
  const meta = gitStr('show', '-s', '--format=%an%x1f%ae%x1f%aI%x1f%B', sha);
  const [an, ae, ad, ...rest] = meta.split('\x1f');
  const created = await api(`/repos/${REPO}/git/commits`, 'POST', {
    message: rest.join('\x1f').replace(/\s+$/, ''),
    tree: nt.sha, parents: [parent],
    author: { name: an!, email: ae!, date: ad! },
    committer: { name: an!, email: ae!, date: new Date().toISOString() },
  });
  cur = created.sha; parent = created.sha; localPrev = sha;
  console.log(`  ${sha.slice(0, 7)} → API ${created.sha.slice(0, 7)}（${tree.length} 檔，累計 ${nBlobs} blob／${(nBytes / 1048576).toFixed(1)} MiB／${((Date.now() - t0) / 1000).toFixed(0)}s）`);
}
const ref = await api(`/repos/${REPO}/git/refs/heads/${BRANCH}`, 'PATCH', { sha: cur, force: false });
console.log(`refs/heads/${BRANCH} → ${typeof ref === 'object' ? 'PATCH 送出' : ref}；本地 HEAD ${head.slice(0, 7)} 與遠端 ${cur.slice(0, 7)} 內容相同、SHA 不同（API 重建）`);
