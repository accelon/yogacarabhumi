#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ybh 線的 QQ 信箱包裝：沿用 fuyan 現成的 src\\qq_mail.py，但**狀態檔另起一份**。

誰算「本區來函」（2026-11-15 查明，别再重猜）：
  耀悟法師（又署名 `avatar q`，微信 avatarqz）走的是**官網 accelon26 的留言表單**，
  因此通知信的寄件者是表單機器人 `accelon26 留言 <3820618924@qq.com>`、
  主旨 `[accelon26] 留言 — avatar q`，而**他的地址只出現在內文**這一行：
      Email：avatarmail@qq.com
  ⇒ 判準＝**內文含 `avatarmail@qq.com`**，不能看寄件者（看寄件者會把他跟一堆系統通知混在一起，
  也會漏掉他）。實測 221 封舊信裡符合的有 3 封（UID 155／229／230），
  其餘 132 封 `gprajna@gmail.com` 是厚觀法師＝fuyan 那條線，本區一率不碰、不標記、不回信。

為什麼要另外一包（最要緊的一件事）：
  `qq_mail.py` 的游標是 `last_uid`，`mark()`/`ack` 會把它推到 `max(last_uid, uid)`，
  而 `new_uids()` 只取「UID 大於 last_uid」的信。兩條線若共用同一個狀態檔，
  ybh 這邊標記一封信，就會讓 fuyan 那條線**永久跳過厚觀法師後來到的信**（反之亦然）。
  本檔把狀態指到 `link-audit/data/ybh-mail-state.json`，與 fuyan 的游標完全隔離；
  除此之外不改任何行為，也不去動 `D:\\2026\\fuyan` 裡的檔案。

用法（在 D:\\2026\\yogacarabhumi-dila 下）：
  python link-audit\\tools\\qq_mail_ybh.py check            列出新信（JSON，含寄件者）
  python link-audit\\tools\\qq_mail_ybh.py check --init     以目前最高 UID 為基準（首次啟用）
  python link-audit\\tools\\qq_mail_ybh.py read <uid>       讀全文
  python link-audit\\tools\\qq_mail_ybh.py attach <uid>     下載附檔到 out/mail-<uid>
  python link-audit\\tools\\qq_mail_ybh.py mark <uid> ...   標成已處理（只動本區狀態檔）
  python link-audit\\tools\\qq_mail_ybh.py who              只看寄件者清單，方便辨認客戶

憑證仍由 fuyan 的模組去讀 `D:\\2026\\adb-converter\\.local\\smtp.json`；
本檔不讀、不印、不複存任何密碼。

**本子系不寄信**：`ack`/`reply`/`send` 一律擋掉——對客戶的回信是對外溝通，
需作者過目後由人發出（作者 2026-11-15 授權的是「修 ybh.adb 的 bug 並發布」）。
"""
import importlib.util
import os
import re
import sys

FUYAN_MAIL = r"D:\2026\fuyan\src\qq_mail.py"
MY_STATE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "ybh-mail-state.json")
NO_SEND = {"ack", "reply", "send"}


def load_module():
    if not os.path.exists(FUYAN_MAIL):
        sys.stderr.write("找不到 fuyan 的 qq_mail.py：" + FUYAN_MAIL + "\n")
        sys.exit(3)
    spec = importlib.util.spec_from_file_location("qq_mail_ybh_inner", FUYAN_MAIL)
    mod = importlib.util.module_from_spec(spec)
    sys.stdout.reconfigure(encoding="utf-8")
    spec.loader.exec_module(mod)
    mod.STATE = MY_STATE          # ← 唯一被改掉的東西
    return mod


def cmd_who(mod):
    """只列寄件者與主旨，用來辨認哪些信是耀悟法師來的（不印內文）。"""
    import json
    imap, _, _ = mod.connect()
    try:
        uids = [u for u in mod.all_uids(imap) if u.isdigit()]
        rows = []
        for uid in uids[-15:]:
            msg = mod.fetch(imap, uid)
            if msg is None:
                continue
            frm = str(mod.dh(msg.get("From")))
            rows.append({"uid": uid, "from": frm, "date": str(msg.get("Date")),
                         "subject": str(mod.dh(msg.get("Subject")))[:80],
                         "ybh_sender": bool(re.search(r"耀悟|yaowu", frm, re.I))})
        print(json.dumps({"state": MY_STATE, "mails": rows}, ensure_ascii=False, indent=1))
    finally:
        try:
            imap.logout()
        except Exception:
            pass


def main():
    if len(sys.argv) < 2:
        sys.stderr.write(__doc__)
        sys.exit(1)
    verb = sys.argv[1]
    if verb in NO_SEND:
        sys.stderr.write("本子系不寄信（" + verb + " 已被擋）——對客戶的回信請作者過目後由人發出。\n")
        sys.exit(4)
    mod = load_module()
    if verb == "who":
        cmd_who(mod)
        return
    if verb == "check" and "--init" not in sys.argv and not os.path.exists(MY_STATE):
        sys.stderr.write("提示：本區狀態檔尚未建立。首次執行請用 `check --init`，"
                         "否則會把整箱舊信當成未處理。\n")
    sys.argv[0] = FUYAN_MAIL          # 讓 argparse 的 prog 顯示有意義
    mod.main()


if __name__ == "__main__":
    main()
