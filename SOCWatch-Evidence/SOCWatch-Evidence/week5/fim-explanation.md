# FIM Explanation — File Integrity Monitoring

Wazuh's FIM module stores a baseline hash (MD5, SHA1, SHA256) and metadata for every file in a monitored directory. In realtime mode it uses the Linux inotify subsystem to receive kernel notifications the moment a file changes, rather than waiting for the periodic scan.

When `testfile.txt` was created, modified, and deleted under `/home/ubuntu/fim-test/`, the agent forwarded syscheck events to the manager for each change. The manager matched them to rules 554 (added), 550 (modified), and 553 (deleted).

Because `report_changes="yes"` was set, the modification event captured the full before/after hash and size change — old and new MD5/SHA1/SHA256 all recorded. In a real SOC this is how you detect an attacker modifying `/etc/passwd`, planting a webshell, or tampering with a binary — the content change is visible even if the attacker preserved the timestamp.

## Evidence captured (from the manager's alerts.log)

**Rule 554 — file added** (Alert 1790102556.xxxxxxx, 2026-09-22 18:42:36 UTC)
```
File '/home/ubuntu/fim-test/testfile.txt' added
Mode: realtime
Size: 17
MD5: f33ae2bcd3221650b7dc4f0e8aac5fde
SHA1: c12d9136f6401879d14a36ffb5e40094591d0c83
SHA256: cc7098632c30d31ed81ff5936a75a027f3136024cb96efd35e8fe3f9b4d3cfaf
```

**Rule 550 — file modified** (level 7, ~18:42:46 UTC)
```
File '/home/ubuntu/fim-test/testfile.txt' modified
Mode: realtime
Changed attributes: size,mtime,md5,sha1,sha256
Size changed from '17' to '42'
Old md5sum was: 'f33ae2bcd3221650b7dc4f0e8aac5fde'   New md5sum is: 'a6269e236808d7426474a813e62e6f7d'
Old sha1sum was: 'c12d9136f6401879d14a36ffb5e40094591d0c83'   New sha1sum is: 'ff0d7927c9770d8044e31e32779ea47751582286'
Old sha256sum was: 'cc7098632c30d31ed81ff5936a75a027f3136024cb96efd35e8fe3f9b4d3cfaf'   New sha256sum is: '3f40a539e2e7f91a9b523bbd294d75e08cf60fd48882f1d7e91ac3f15a6b6fa8'
```

**Rule 553 — file deleted** (level 7, Alert 1790102574.2244630, ~18:42:54 UTC)
```
File '/home/ubuntu/fim-test/testfile.txt' deleted
Mode: realtime
Size: 42
MD5: a6269e236808d7426474a813e62e6f7d
SHA1: ff0d7927c9770d8044e31e32779ea47751582286
SHA256: 3f40a539e2e7f91a9b523bbd294d75e08cf60fd48882f1d7e91ac3f15a6b6fa8
```

## Still needed for the final evidence set

Dashboard screenshots of these three events (Security Events, filter `rule.id: (550 OR 553 OR 554)`, or Agent → File Integrity Monitoring) — automation couldn't capture these due to a Chrome limitation with the manager's self-signed certificate (see troubleshooting log). Log into the dashboard directly at `https://13.126.121.206` and screenshot the modification alert (550) expanded, showing the diff panel.
