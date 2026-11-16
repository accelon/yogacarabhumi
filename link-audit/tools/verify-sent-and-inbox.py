#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""查證兩件事，用的都是既有模組的連線與憑證（不讀不印密碼）：
  ① 已寄件匣裡那封 `<br>` 請益信是否真的在伺服器上、附件多大
  ② 收件匣是否有法師的新回信（避免重複發問，也避免漏看他回的東西）
用法：python link-audit/tools/verify-sent-and-inbox.py

注意（勘誤 #32→#36 的更正）：QQ 的 Sent 資料夾是**延遲同步**——剛寄完立刻查常看不到，
實測約 1–2 分鐘內才出現；2026-11-16 曾把這現象誤判成「QQ 不會同步 SMTP 提交」。
所以「寄出了沒」以 `send_message` 回傳 `refused == []` 為準（即時、協議層），
本腳本的 Sent 檢查只當延遲旁證；剛寄完查不到，等一下再查或直接信賴 refused 訊號。
"""
import importlib.util
import imaplib
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import qq_mail_ybh as wrapper   # 地址讀自 gitignored 的 mail-contacts.json，不寫死在本檔
wrapper._init_recipients()     # 一定要初始化：MY_MAILBOX 是延載入的，沒呼叫就是 None

FUYAN = r"D:\2026\fuyan\src\qq_mail.py"
spec = importlib.util.spec_from_file_location("qm", FUYAN)
mod = importlib.util.module_from_spec(spec)
sys.stdout.reconfigure(encoding="utf-8")
spec.loader.exec_module(mod)
imap, user, _ = mod.connect()

def folders():
    typ, data = imap.list()
    out = []
    for d in data or []:
        s = d.decode("utf-8", "replace")
        m = re.search(r'/ "?([^"]*)"?\s*$', s) or re.search(r'"([^"]+)"\s*$', s)
        if m:
            out.append(m.group(1))
    return out

names = folders()
print("全部資料夾:", names)
sent = next((f for f in names if ("已發送" in f) or ("sent" in f.lower())), None)
print("可用資料夾樣本:", [n for n in names if any(k in n for k in ("已發送", "Sent", "INBOX", "草稿"))][:6])
if sent:
    imap.select('"%s"' % sent, readonly=True)   # 資料夾名含空格必須加引號（QQ IMAP 會回 CLIENTBUG）
    typ, uids = imap.uid("search", None, "ALL")
    picks = (uids[0].split() if uids and uids[0] else [])[-6:]
    print("\n=== 已寄件匣最後", len(picks), "封 ===")
    for u in picks:
        msg = mod.fetch(imap, u.decode() if isinstance(u, bytes) else u)
        if msg is None:
            continue
        body = mod.body_text(msg)
        atts = [mod.dh(p.get_filename()) for p in msg.walk() if p.get_filename()]
        sz = sum(len(p.get_payload(decode=True) or b"") for p in msg.walk() if p.get_filename())
        print(" ", str(mod.dh(msg.get("Date"))), "| 寄給:", re.sub(r"(^.).*(@)", r"\1***\2", str(mod.dh(msg.get("To")))),
              "| 主旨:", str(mod.dh(msg.get("Subject")))[:58])
        if atts:
            print("     附件:", ", ".join(atts), "| 附件合計 %.0f KB" % (sz / 1024))
        if "<br>" in str(mod.dh(msg.get("Subject"))) or "br" in str(mod.dh(msg.get("Subject"))):
            print("     ★ 這封就是 <br> 請益信｜內文首行:", body.split("\n")[0][:40])

imap.select("INBOX", readonly=True)
typ, uids = imap.uid("search", None, "ALL")
allu = [u.decode() if isinstance(u, bytes) else u for u in (uids[0].split() if uids and uids[0] else [])]
print("\n=== 收件匣最近 6 封（看有無法師回信）===")
replies = []
for u in allu[-6:]:
    msg = mod.fetch(imap, u)
    if msg is None:
        continue
    frm = str(mod.dh(msg.get("From")))
    body = mod.body_text(msg)
    MB = wrapper.MY_MAILBOX
    own = MB in body.lower() or MB in frm.lower()
    print(("● " if own else "  "), u, "|", frm[:34], "|", str(mod.dh(msg.get("Subject")))[:52], "|", str(msg.get("Date"))[:24])
    if own:
        replies.append(u)
print("\n判定：本區相關來函 UID =", replies or "（無新回信）")
imap.logout()
