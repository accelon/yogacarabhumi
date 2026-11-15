#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ybh 線的 QQ 信箱包裝：沿用 fuyan 現成的 src\\qq_mail.py，但**狀態檔另起一份**、
**寄件者不遮罩**、並把「回信收件人」改成**從內文取地址**。

一、誰算本區來函（2026-11-15 兩次修正後的最終判準，两条都要認）
  1. **首封**：耀悟法師（本區客戶，署名見 gitignored 聯絡檔）走**官網 accelon26 留言表單**，
     通知信的寄件者是機器人（就是本帳號自己）、主旨 `[accelon26] 留言 — avatar q`，
     而他的地址只出現在**內文**那一行 `Email：<本人信箱>`。
  2. **之後**：直接 mailbox 對 mailbox——他會從**自己的信箱**寄進來，
     這種信的**內文未必再寫自己的地址**。
  判準＝`寄件者 == 本人信箱` **或** `內文含本人信箱`（本人信箱讀自 gitignored 的 mail-contacts.json，
     不寫進本檔——本倉是公開倉，地址不該進版控）。
     只按內文判會漏掉第 2 類（作者 2026-11-15 明示此點）；只按寄件者判會漏掉第 1 類。
  其餘寄件者（`gprajna@gmail.com`＝厚觀法師＝fuyan 線、`hunxian`、系統通知…）一律不屬本區：
  不處理、不標記、不回信。

二、回信收件人為什麼不能沿用 `--to-uids`
  `qq_mail.py` 的 `send --to-uids <uid>` 是取**那封信的 From** 當收件人。用在表單通知信上，
  From 是機器人／本帳號自己 → **回信會寄回自己**，法師收不到。本檔改為
  從內文解析 `Email：<addr>` 作為收件人，且**只准寄給白名單地址**（見 `ALLOWED`），
  避免被一封內文可偽造的來信指去寄任意地址。

三、狀態檔必須另起一份（這是最要緊的一件事）
  `qq_mail.py` 的游標是 `last_uid`，`mark()`/`ack` 會把它推到 `max(last_uid, uid)`，
  而 `new_uids()` 只取「UID 大於 last_uid」的信。兩條線若共用同一個狀態檔，
  ybh 這邊標記一封信，就會讓 fuyan 那條線**永久跳過厚觀法師後來到的信**（反之亦然）。
  本檔把狀態指到 `link-audit/data/ybh-mail-state.json`，除此之外不改任何行為，
  也不動 `D:\\2026\\fuyan` 裡的檔案。

用法（在 D:\\2026\\yogacarabhumi-dila 下）：
  python link-audit\\tools\\qq_mail_ybh.py check              列新信（含 mine 旗標）
  python link-audit\\tools\\qq_mail_ybh.py check --init       以目前最高 UID 為基準
  python link-audit\\tools\\qq_mail_ybh.py read <uid>         讀全文
  python link-audit\\tools\\qq_mail_ybh.py attach <uid>       下載附檔到 out/mail-<uid>
  python link-audit\\tools\\qq_mail_ybh.py recipient <uid>    看這封該回給誰（遮罩顯示）
  python link-audit\\tools\\qq_mail_ybh.py reply <uid> --body-file F [--dry-run]
                                                             回信（收件人取自內文＋白名單）
  python link-audit\\tools\\qq_mail_ybh.py mark <uid> ...      標成已處理（只動本區狀態檔）

憑證仍由 fuyan 的模組讀 `D:\\2026\\adb-converter\\.local\\smtp.json`；本檔不讀、不印密碼。
QQ IMAP 連續登入過密會被鎖 `login frequency limited`，巡查間隔以 30 分鐘為上限。
"""
import argparse
import importlib.util
import io
import json
import os
import re
import sys

FUYAN_MAIL = r"D:\2026\fuyan\src\qq_mail.py"
MY_STATE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "ybh-mail-state.json")
# 客戶地址**不寫進本檔**——本倉是公開倉（private=false），把地址寫死在追蹤的程式裡
# 等於把聯絡資料Published 進版控與 GitHub Pages 同源的历史。改讀 gitignored 的
# `link-audit/data/mail-contacts.json`（{"ybh": {"name":…, "email":…}}）。
CONTACTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "mail-contacts.json")


def _load_contacts():
    """回傳 (本人信箱, 白名單集合)。檔不在就明確失敗——宁可報錯，也不要默默用預設地址
    去比對或發信（那會把「沒配置」當成「匹配不上」，表現成整批漏信）。"""
    if not os.path.exists(CONTACTS):
        sys.stderr.write("缺少客戶聯絡檔：" + CONTACTS + "（gitignored，需本機建立）\n")
        sys.exit(8)
    with io.open(CONTACTS, encoding="utf-8") as f:
        c = json.load(f)
    mail = (c.get("ybh") or {}).get("email", "").strip().lower()
    if not mail:
        sys.stderr.write("聯絡檔內沒有 ybh.email 欄位。\n"); sys.exit(8)
    allowed = {v.get("email", "").strip().lower() for v in c.values() if isinstance(v, dict) and v.get("email")}
    return mail, allowed


MY_MAILBOX, ALLOWED = None, set()
EMAIL_IN_BODY = re.compile(r"Email[：:]\s*([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})")


def _init_recipients():
    global MY_MAILBOX, ALLOWED
    MY_MAILBOX, ALLOWED = _load_contacts()
    return MY_MAILBOX


def load_module():
    if not os.path.exists(FUYAN_MAIL):
        sys.stderr.write("找不到 fuyan 的 qq_mail.py：" + FUYAN_MAIL + "\n")
        sys.exit(3)
    spec = importlib.util.spec_from_file_location("qq_mail_ybh_inner", FUYAN_MAIL)
    mod = importlib.util.module_from_spec(spec)
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    spec.loader.exec_module(mod)
    mod.STATE = MY_STATE          # ← 與 fuyan 隔離的唯一改動
    return mod


def owns(mod, msg):
    """回傳 (是否本區信, 寄件者原串, 寄件者地址, 內文解析出的地址)。寄件者**不遮罩**才能比對。"""
    frm = str(mod.dh(msg.get("From") or ""))
    body = mod.body_text(msg)
    m = EMAIL_IN_BODY.search(body)
    in_body = MY_MAILBOX in body.lower()
    from_addr = (re.findall(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}", frm) or [""])[0].lower()
    return (from_addr == MY_MAILBOX or in_body), frm, from_addr, (m.group(1) if m else "")


def reply_target(mod, msg):
    """回信收件人：**先讀內文 `Email：` 行，其次才是寄件者**——兩者都要過白名單。

    順序不能反：首封走官網留言表單，From 是機器人／本帳號自己，照 From 回就會寄回自己（作者
    2026-11-15 特別點出這個坑）；但之後他會直接從自己的信箱寄來，那種信**內文不再寫
    自己的地址**，此时能用的只有 From。兩個來源都必須命中 `ALLOWED`，否則不發——
    內文那行是任何人都能偽造的，不能讓一封來信把我們變成寄往任意地址的跳板。
    """
    own, frm, from_addr, body_addr = owns(mod, msg)
    for addr, src in ((body_addr, "內文 Email："), (from_addr, "寄件者")):
        if addr and addr.lower() in ALLOWED:
            return addr.lower(), src
    return "", ""


def cmd_check(mod, argv):
    """走本區狀態與 owns() 判準，只列屬於 ybh 的信（其他寄件者一律不出現）。"""
    ns = argparse.Namespace(init="--init" in argv)
    if ns.init:
        sys.argv = ["qq_mail.py", "check", "--init"]
        mod.main()
        return
    imap, _, _ = mod.connect()
    try:
        state = mod.load_state()
        uids = [u for u in mod.all_uids(imap) if u.isdigit() and int(u) > int(state.get("last_uid") or 0)
                and u not in set(state["handled_uids"])]
        mine, others = [], 0
        for uid in uids[-12:]:
            msg = mod.fetch(imap, uid)
            if msg is None:
                continue
            own, frm, from_addr, body_addr = owns(mod, msg)
            if not own:
                others += 1
                continue
            s = mod.summary(msg, uid)
            tgt, tsrc = reply_target(mod, msg)
            s["reply_to"] = (re.sub(r"(^.).*(@)", r"\1***\2", tgt) + f"（取{tsrc}）") if tgt else "(收件人待作者確認：內文地址不在白名單)"
            mine.append(s)
        print(json.dumps({"count": len(mine), "new": mine,
                          "note": f"掃描 {len(uids)} 封未處理，其中 {others} 屬其他線（不處理、不標記）"},
                         ensure_ascii=False, indent=1))
    finally:
        try:
            imap.logout()
        except Exception:
            pass


def resolve_target(mod, uid):
    imap, _, _ = mod.connect()
    try:
        msg = mod.fetch(imap, uid)
        if msg is None:
            sys.stderr.write("找不到 UID " + str(uid) + "\n"); sys.exit(5)
        return reply_target(mod, msg)
    finally:
        try:
            imap.logout()
        except Exception:
            pass


def cmd_recipient(mod, uid):
    addr, src = resolve_target(mod, uid)
    ok = bool(addr)
    print(json.dumps({"uid": uid, "reply_to_masked": re.sub(r"(^.).*(@.+)", r"\1***\2", addr) if addr else "(無)",
                      "取自": src or "—", "in_whitelist": ok,
                      "note": "收件人依「內文 Email： → 寄件者」順序取，兩者都要命中白名單"},
                     ensure_ascii=False))
    if not ok:
        sys.exit(7)


def cmd_reply(mod, argv):
    """回信：收件人依 `reply_target()`（內文優先、其次寄件者）並核對白名單，
    **絕不使用 `--to-uids` 那種「拿這封信的 From 當收件人」的推斷**。"""
    p = argparse.ArgumentParser(prog="qq_mail_ybh.py reply")
    p.add_argument("uid")
    p.add_argument("--body-file", required=True)
    p.add_argument("--subject", default="")
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args(argv)
    addr, src = resolve_target(mod, a.uid)
    if not addr:
        sys.stderr.write("這封信找不出可發的收件人（內文地址不在白名單、寄件者也不是本人信箱）。"
                         "請作者處理，或明示把該地址加進 ALLOWED。\n")
        sys.exit(7)
    if not a.subject:
        imap, _, _ = mod.connect()
        try:
            msg = mod.fetch(imap, a.uid)
            s = str(mod.dh(msg.get("Subject") if msg else ""))
            a.subject = ("Re: " + re.sub(r"^\[accelon26\] 留言 — ", "", s))[:120]
        finally:
            try:
                imap.logout()
            except Exception:
                pass
    sa = [sys.argv[0], "send", "--subject", a.subject, "--body-file", a.body_file, "--to", addr]
    if a.dry_run:
        sa.append("--dry-run")
    sys.argv = sa
    mod.main()


def main():
    if len(sys.argv) < 2:
        sys.stderr.write(__doc__)
        sys.exit(1)
    verb, rest = sys.argv[1], sys.argv[2:]
    _init_recipients()          # 沒有聯絡檔就在此明確失敗，不帶著空地址往下跑
    mod = load_module()
    if verb == "check":
        cmd_check(mod, rest)
    elif verb == "recipient":
        cmd_recipient(mod, rest[0])
    elif verb == "reply":
        cmd_reply(mod, rest)
    elif verb in ("read", "attach", "mark"):
        sys.argv = [FUYAN_MAIL, verb] + rest
        mod.main()
    else:
        sys.stderr.write("未知的子指令：" + verb + "（可用：check / read / attach / recipient / reply / mark）\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
