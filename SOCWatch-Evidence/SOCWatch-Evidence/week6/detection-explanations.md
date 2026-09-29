# Week 6 — Detection Explanations

## Vulnerability detection

Wazuh's vulnerability scanner correlates each agent's package inventory (collected by syscollector) against a CVE feed synced from multiple CNAs (CVE Numbering Authorities), refreshed on a 60-minute interval. When a package version matches a known-vulnerable range, the manager generates a finding with severity, CVSS score, and the fixed version if one exists. This turns "what's installed" into "what's exploitable" — the difference between an inventory and a risk assessment.

## Authentication failures — correlation, not just matching

Individual failed logins are noise; a SOC cannot alert on every one. Wazuh handles this with `frequency` and `timeframe` attributes on rules. Rule 5710 fires on each attempt to log in as a non-existent user, at level 5 — informational. Rule 5712 is a composite rule that fires only when several 5710/5716 events arrive from the same source IP inside the configured window — it escalates to level 10, which is what an analyst should actually be paged on.

The distinction matters operationally: 5710 tells you someone tried a username that doesn't exist, 5712 tells you someone is running a password-guessing tool against the host. The source IP field (`10.0.11.208` in this test) is what would be fed into a blocklist or an active-response rule in production.
