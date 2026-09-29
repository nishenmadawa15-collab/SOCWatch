const pptxgen = require("pptxgenjs");
const fs = require("fs");

const ARCH_IMG = "F:/CCA Internship Project/SOCWatch-Evidence/SOCWatch-Evidence/week7/architecture-final.png";
const CHART_DIR = "F:/CCA Internship Project/SOCWatch-Evidence/SOCWatch-Evidence/week7/charts";
const CHART_VULN = `${CHART_DIR}/chart-vuln-severity.png`;
const CHART_ATTACK = `${CHART_DIR}/chart-attack-traffic.png`;

// - Academic-pptx skill palette (communication-first, max 3 colors) ----
const COLORS = {
  bg: "FFFFFF",
  primary: "1F4E79",
  accent: "2E75B6",
  body: "2D2D2D",
  muted: "777777",
  rule: "CCCCCC",
  highlight: "FFF2CC",
};
const FACE = "Calibri";
const FONTS = { title: 26, sectionHeader: 22, body: 20, label: 16, cite: 13 };
const MARGIN = 0.5;

function pres() {
  const p = new pptxgen();
  p.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  return p;
}
function newSlide(p) {
  const s = p.addSlide();
  s.background = { color: COLORS.bg };
  return s;
}
function actionTitle(slide, text, opts = {}) {
  slide.addText(text, {
    x: MARGIN, y: 0.35, w: 12.33, h: opts.h ?? 1.0,
    fontFace: FACE, fontSize: opts.size ?? FONTS.title, bold: true,
    color: COLORS.primary, align: "left", valign: "top",
    isTextBox: true, margin: 0,
  });
  slide.addShape("rect", {
    x: MARGIN, y: opts.ruleY ?? 1.35, w: 12.33, h: 0.02,
    fill: { color: COLORS.rule }, line: { type: "none" },
  });
}
function cite(slide, text, y = 6.95) {
  slide.addText(text, {
    x: MARGIN, y, w: 12.33, h: 0.35,
    fontFace: FACE, fontSize: FONTS.cite, color: COLORS.muted,
    align: "left", isTextBox: true, margin: 0,
  });
}
function pageNum(slide, n) {
  slide.addText(String(n), {
    x: 12.7, y: 7.1, w: 0.5, h: 0.3, fontFace: FACE, fontSize: 11,
    color: COLORS.muted, align: "right", isTextBox: true, margin: 0,
  });
}
function bullets(slide, items, opts = {}) {
  slide.addText(
    items.map((t) => ({ text: t, options: { breakLine: true } })),
    {
      x: opts.x ?? MARGIN, y: opts.y ?? 1.55, w: opts.w ?? 12.33, h: opts.h ?? 4.5,
      fontFace: FACE, fontSize: opts.size ?? FONTS.body, color: COLORS.body,
      bullet: { code: "2022" }, paraSpaceAfter: opts.spaceAfter ?? 14, valign: "top",
    }
  );
}

const p = pres();
let n = 1;

// - 1. TITLE ----------------
{
  const s = p.addSlide();
  s.background = { color: COLORS.primary };
  s.addText("SOCWatch: a Wazuh SOC monitoring lab proves four detection\ncapabilities end-to-end on AWS", {
    x: 0.7, y: 1.7, w: 11.9, h: 1.9, fontFace: FACE, fontSize: 32, bold: true,
    color: "FFFFFF", align: "left", valign: "top", isTextBox: true, margin: 0,
  });
  s.addShape("rect", { x: 0.7, y: 3.65, w: 2.0, h: 0.04, fill: { color: COLORS.accent }, line: { type: "none" } });
  s.addText("CCA Cyber Security Internship - Individual Project", {
    x: 0.7, y: 3.9, w: 10, h: 0.45, fontFace: FACE, fontSize: 17, italic: true,
    color: "D9E6F2", isTextBox: true, margin: 0,
  });
  s.addText("Candidate Name: Nishen Madawa Abedeera", {
    x: 0.7, y: 4.55, w: 10, h: 0.4, fontFace: FACE, fontSize: 16, bold: true,
    color: "FFFFFF", isTextBox: true, margin: 0,
  });
  s.addText("Student Number: CCA5008", {
    x: 0.7, y: 4.9, w: 8, h: 0.35, fontFace: FACE, fontSize: 14,
    color: "FFFFFF", isTextBox: true, margin: 0,
  });
  s.addText("nishenmadawa15@gmail.com", {
    x: 0.7, y: 5.25, w: 8, h: 0.35, fontFace: FACE, fontSize: 13,
    color: "C5D7EA", isTextBox: true, margin: 0,
  });
  s.addText("Mentor checkpoint review | 24 September 2026", {
    x: 0.7, y: 6.6, w: 10, h: 0.35, fontFace: FACE, fontSize: 12,
    color: "9FB3D6", isTextBox: true, margin: 0,
  });
}

// - 2. MOTIVATION ----------------
{
  const s = newSlide(p);
  actionTitle(s, "Security signal is scattered across every host, so incidents go undetected until someone manually reconstructs them");
  bullets(s, [
    "No central visibility: each host keeps its own logs, so an analyst has to SSH or RDP into every machine to see what happened.",
    "Evidence is hard to produce: reconstructing 'what changed, when, from where' after the fact means stitching together logs by hand.",
    "Attacks blend into noise: a single failed login means nothing; a dozen from one IP in ten seconds means something - but only if a system is watching for the pattern.",
  ], { y: 1.65, h: 3.2 });
  cite(s, "Motivation drawn from the project brief's SOC-analyst workflow requirements (CCA_Cyber_Security_Internship_Project_Brief.pdf).");
  pageNum(s, n++);
}

// - 3. OBJECTIVE (research-question analog) ----------------
{
  const s = newSlide(p);
  actionTitle(s, "This lab must prove four SOC detection capabilities end-to-end, with real evidence, not just working infrastructure");
  s.addShape("roundRect", {
    x: 1.5, y: 1.9, w: 10.33, h: 1.9, rectRadius: 0.08,
    fill: { color: COLORS.highlight }, line: { color: COLORS.accent, pt: 1.5 },
  });
  s.addText("Log ingestion | File integrity monitoring | Vulnerability detection | Authentication-failure / brute-force detection", {
    x: 1.8, y: 2.15, w: 9.73, h: 1.4, fontFace: FACE, fontSize: 20, bold: true,
    color: COLORS.primary, align: "center", valign: "middle", isTextBox: true, margin: 0,
  });
  bullets(s, [
    "Each use case must show a real, captured alert - rule ID, evidence, and an explanation of why it matters to an analyst, not just 'it's configured.'",
    "The environment: one Wazuh manager (server + indexer + dashboard) and three monitored endpoints (2 Linux, 1 Windows) inside a purpose-built VPC.",
  ], { y: 4.1, h: 1.8 });
  pageNum(s, n++);
}

// - 4. METHODS / ARCHITECTURE ----------------
{
  const s = newSlide(p);
  actionTitle(s, "One manager and three monitored endpoints run inside a single VPC, with agent traffic scoped to the network and admin access via SSH keys");
  if (fs.existsSync(ARCH_IMG)) {
    s.addImage({ path: ARCH_IMG, x: MARGIN, y: 1.55, w: 7.6, h: 7.6 * (5.4 / 8.6) });
  }
  s.addText("Access design", { x: 8.4, y: 1.6, w: 4.4, h: 0.4, fontFace: FACE, fontSize: FONTS.sectionHeader, bold: true, color: COLORS.primary, isTextBox: true, margin: 0 });
  bullets(s, [
    "22 / 443 / 3389 (SSH, dashboard, RDP): open to 0.0.0.0/0 - a deliberate tradeoff after the operator's mobile ISP's carrier-grade NAT made any CIDR restriction unworkable. SSH keys and dashboard/Windows login remain the real access control.",
    "1514 / 1515 (agent traffic): scoped to the VPC CIDR only, unchanged throughout the project.",
    "All four instances provisioned manually via the AWS Console after local Terraform credentials could not be configured; infra/main.tf is retained as reference IaC.",
  ], { x: 8.4, y: 2.1, w: 4.4, h: 5.0, size: 16, spaceAfter: 10 });
  cite(s, "Architecture diagram: week7/architecture-final.png, redrawn with real IPs 2026-09-24.");
  pageNum(s, n++);
}

// - 5. RESULT 1 - LOG INGESTION ----------------
{
  const s = newSlide(p);
  actionTitle(s, "Every host's security events reach the manager continuously, with no extra configuration required");
  s.addShape("roundRect", { x: MARGIN, y: 1.55, w: 6.0, h: 4.6, rectRadius: 0.06, fill: { color: "F5F8FC" }, line: { color: COLORS.rule, pt: 1 } });
  s.addText("Data flow", { x: 0.75, y: 1.75, w: 5.5, h: 0.4, fontFace: FACE, fontSize: FONTS.sectionHeader, bold: true, color: COLORS.primary, isTextBox: true, margin: 0 });
  const flow = ["Endpoint event", "Agent (wazuh-agent)", "TCP 1514 -> Manager", "Decoder -> Rule match", "Indexer (OpenSearch)", "Dashboard"];
  flow.forEach((f, i) => {
    s.addShape("roundRect", { x: 0.75, y: 2.25 + i * 0.58, w: 5.5, h: 0.42, rectRadius: 0.04, fill: { color: "FFFFFF" }, line: { color: COLORS.accent, pt: 1 } });
    s.addText(f, { x: 0.95, y: 2.25 + i * 0.58, w: 5.1, h: 0.42, valign: "middle", fontFace: FACE, fontSize: 14, color: COLORS.body, isTextBox: true, margin: 0 });
  });
  bullets(s, [
    "PAM/sudo/sshd events flow continuously from both Linux agents - confirmed directly in alerts.log, no setup needed.",
    "Windows Event Log ingestion (Application/Security/System channels) separately verified 2026-09-24: a real windows_application-tagged alert (rule 60642) reached the manager via EventChannel.",
    "Dashboard screenshots captured 2026-09-26: Threat Hunting event tables for both agents, including live real-world attack traffic (see risk note, next section).",
  ], { x: 6.9, y: 1.55, w: 5.9, h: 4.6, size: 16, spaceAfter: 12 });
  cite(s, "Evidence: week4/windows-eventlog-ingestion-proof.txt; week5/log-ingestion-linux.png, week5/log-ingestion-windows.png.");
  pageNum(s, n++);
}

// - 6. RESULT 2 - FIM ----------------
{
  const s = newSlide(p);
  actionTitle(s, "File integrity monitoring fires a distinct, evidenced alert for every stage of a file's lifecycle");
  const rules = [
    ["554", "File added to monitored directory", "Level 5"],
    ["550", "File modified - diff captured (report_changes=\"yes\")", "Level 7"],
    ["553", "File deleted from monitored directory", "Level 7"],
  ];
  let ry = 1.65;
  rules.forEach((r) => {
    const isKey = r[0] === "550";
    s.addShape("roundRect", { x: MARGIN, y: ry, w: 6.0, h: 0.95, rectRadius: 0.05, fill: { color: isKey ? COLORS.highlight : "F5F8FC" }, line: { color: isKey ? COLORS.accent : COLORS.rule, pt: isKey ? 1.5 : 1 } });
    s.addText(r[0], { x: 0.7, y: ry, w: 1.1, h: 0.95, valign: "middle", fontFace: FACE, fontSize: 26, bold: true, color: COLORS.primary, isTextBox: true, margin: 0 });
    s.addText(r[1], { x: 1.9, y: ry + 0.1, w: 3.9, h: 0.45, fontFace: FACE, fontSize: 14, bold: true, color: COLORS.body, isTextBox: true, margin: 0 });
    s.addText(r[2], { x: 1.9, y: ry + 0.52, w: 3.9, h: 0.35, fontFace: FACE, fontSize: 12, color: COLORS.muted, isTextBox: true, margin: 0 });
    ry += 1.15;
  });
  bullets(s, [
    "Tested on agent-linux-1: /home/ubuntu/fim-test monitored in realtime mode (Linux inotify); create -> modify -> delete all fired correctly.",
    "Rule 550's diff shows the exact line an attacker added - the strongest single piece of evidence in the project, since the file timestamp alone would not reveal this.",
    "Applies to catching an attacker modifying /etc/passwd, planting a webshell, or tampering with a binary.",
  ], { x: 6.9, y: 1.65, w: 5.9, h: 4.6, size: 16, spaceAfter: 12 });
  cite(s, "Evidence: week5/fim-config.md, week5/fim-explanation.md; dashboard screenshots week5/fim-alert-created.png, -modified.png, -deleted.png.");
  pageNum(s, n++);
}

// - 7. RESULT 3 - VULNERABILITY ----------------
{
  const s = newSlide(p);
  actionTitle(s, "Wazuh already flags 3,910 real vulnerability findings, without needing to stage a fake CVE");
  s.addText("3,910", {
    x: MARGIN, y: 1.8, w: 6.0, h: 1.6, fontFace: FACE, fontSize: 72, bold: true,
    color: COLORS.primary, align: "left", isTextBox: true, margin: 0,
  });
  s.addText("real findings indexed against genuinely unpatched packages on the live agents", {
    x: MARGIN, y: 3.3, w: 6.0, h: 0.8, fontFace: FACE, fontSize: 16, color: COLORS.muted, isTextBox: true, margin: 0,
  });
  s.addImage({ path: CHART_VULN, x: MARGIN, y: 4.35, w: 5.8, h: 5.8 * (3.2 / 7.2) });
  bullets(s, [
    "The CVE feed correlates each agent's package inventory (via syscollector) against known-vulnerable ranges, refreshed on a 60-minute interval.",
    "Feed was wiped by the disk-full incident (Sept 22) and successfully re-downloaded - confirmed via \"Feed update process completed\" in the logs.",
    "Each finding includes severity, CVSS score, and the fixed version where one exists - turning 'what's installed' into 'what's exploitable.'",
  ], { x: 6.9, y: 1.65, w: 5.9, h: 4.6, size: 16, spaceAfter: 12 });
  cite(s, "Evidence: week6/detection-explanations.md; dashboard screenshots week6/vulnerability-cve-list.png, -cve-detail.png.");
  pageNum(s, n++);
}

// - 8. RESULT 4 - BRUTE FORCE ----------------
{
  const s = newSlide(p);
  actionTitle(s, "Twelve failed logins from one host trigger a single high-severity correlation alert, not twelve separate pages", { size: 24 });
  const rules = [
    ["5710", "Non-existent user login attempt", "Level 5"],
    ["5716", "SSH authentication failed", "Level 5"],
    ["5712", "SSHD brute force - correlated", "Level 10"],
  ];
  let rx = MARGIN;
  rules.forEach((r) => {
    const isKey = r[0] === "5712";
    s.addShape("roundRect", { x: rx, y: 1.65, w: 3.9, h: 1.9, rectRadius: 0.05, fill: { color: isKey ? COLORS.highlight : "F5F8FC" }, line: { color: isKey ? COLORS.accent : COLORS.rule, pt: isKey ? 1.5 : 1 } });
    s.addText(r[0], { x: rx + 0.2, y: 1.8, w: 3.5, h: 0.6, fontFace: FACE, fontSize: 30, bold: true, color: COLORS.primary, isTextBox: true, margin: 0 });
    s.addText(r[1], { x: rx + 0.2, y: 2.45, w: 3.5, h: 0.7, fontFace: FACE, fontSize: 13, color: COLORS.body, isTextBox: true, margin: 0, lineSpacingMultiple: 1.15 });
    s.addText(r[2], { x: rx + 0.2, y: 3.15, w: 3.5, h: 0.3, fontFace: FACE, fontSize: 12, bold: true, color: COLORS.muted, isTextBox: true, margin: 0 });
    rx += 4.15;
  });
  bullets(s, [
    "Test: 12 failed SSH logins (wrong password, nonexistent user) from agent-linux-2 against agent-linux-1's private IP.",
    "Result: rule 5710 fired 12 times, and the correlation rule 5712 fired once at level 10, correctly attributing source IP 10.0.11.208.",
    "The distinction matters operationally: 5710/5716 alone are noise; 5712 only fires once several arrive from one source inside a time window - that source IP is what would feed a blocklist or active-response rule in production.",
  ], { y: 3.85, h: 3.0, size: 16, spaceAfter: 10 });
  cite(s, "Evidence: week6/rule-ids.md, week6/detection-explanations.md; dashboard screenshots week6/auth-failure-single.png, -bruteforce.png (real internet-sourced attack traffic, not staged).");
  pageNum(s, n++);
}

// - 8b. BONUS - REAL ATTACK TRAFFIC (not staged) ----------------
{
  const s = newSlide(p);
  actionTitle(s, "The lab's open admin ports drew genuine internet-sourced brute-force scanning during evidence capture");
  s.addImage({ path: CHART_ATTACK, x: MARGIN, y: 1.6, w: 7.6, h: 7.6 * (2.6 / 7.2) });
  bullets(s, [
    "Not staged: these are real unsolicited login attempts against SSH and RDP, captured while logging in to take the Week 3-6 dashboard screenshots (2026-09-26).",
    "Because admin ports are deliberately 0.0.0.0/0 (Section 9), this is consistent with routine opportunistic internet scanning - and it is exactly the traffic the brute-force use case is designed to catch.",
    "Operational note: narrow the security group or stop the instances once grading/demo is complete, now that evidence capture no longer needs the wide-open rule.",
  ], { x: 8.5, y: 1.6, w: 4.3, h: 5.0, size: 15, spaceAfter: 12 });
  cite(s, "Evidence: week6/auth-failure-windows-bruteforce.png, week5/log-ingestion-windows.png; rule 60204 \"Multiple Windows Logon Failures\" (level 10).");
  pageNum(s, n++);
}

// - 9. PROCESS / TROUBLESHOOTING ----------------
{
  const s = newSlide(p);
  actionTitle(s, "Two real incidents - a disk-full outage and an unworkable IP restriction - were diagnosed and resolved within the same session", { size: 22 });
  const incidents = [
    ["Manager disk fills up, crashing the indexer (2026-09-22)",
      "Root cause: the vulnerability-feed updater retried a failed download into an already-full disk. Fix: cleared 16GB of stale temp/feed-cache files, restarted services; both agents auto-reconnected within 15s."],
    ["Operator's mobile ISP breaks any CIDR-restricted security group rule (2026-09-22/23)",
      "Root cause: carrier-grade NAT (CGNAT) rotated the operator's public IP across a pool wider than a /21. Fix: widened admin ports to 0.0.0.0/0 as a deliberate tradeoff; SSH keys and dashboard login remain the real access control."],
  ];
  let ty = 1.65;
  incidents.forEach((it) => {
    s.addShape("roundRect", { x: MARGIN, y: ty, w: 12.33, h: 1.85, rectRadius: 0.05, fill: { color: "F5F8FC" }, line: { color: COLORS.rule, pt: 1 } });
    s.addText(it[0], { x: 0.75, y: ty + 0.15, w: 11.8, h: 0.45, fontFace: FACE, fontSize: 15, bold: true, color: COLORS.primary, isTextBox: true, margin: 0 });
    s.addText(it[1], { x: 0.75, y: ty + 0.62, w: 11.8, h: 1.1, fontFace: FACE, fontSize: 13, color: COLORS.body, isTextBox: true, margin: 0, lineSpacingMultiple: 1.2 });
    ty += 2.1;
  });
  cite(s, "Full write-ups: troubleshooting-log.md (5 total incident entries, well above the runbook's 2-minimum).");
  pageNum(s, n++);
}

// - 10. DISCUSSION / PRODUCTION GAPS ----------------
{
  const s = newSlide(p);
  actionTitle(s, "Production readiness requires closing six specific gaps beyond this lab's scope");
  const items = [
    ["CA-issued TLS", "Replace the self-signed dashboard certificate."],
    ["Bastion / VPN", "Put the dashboard behind a VPN instead of an IP allowlist - supersedes the current 0.0.0.0/0 tradeoff."],
    ["HA topology", "Split manager and indexer; add a second manager node."],
    ["External retention", "Ship alerts to an external SIEM or S3 beyond the indexer's window."],
    ["Tuned active response", "Careful thresholds; document the risk of auto-blocking an admin."],
    ["MITRE ATT&CK mapping", "Add triage context to detection rules."],
  ];
  let gx = MARGIN, gy = 1.65;
  items.forEach((it, i) => {
    if (i === 3) { gx = 6.9; gy = 1.65; }
    s.addShape("roundRect", { x: gx, y: gy, w: 5.9, h: 1.35, rectRadius: 0.05, fill: { color: "F5F8FC" }, line: { color: COLORS.rule, pt: 1 } });
    s.addText(it[0], { x: gx + 0.25, y: gy + 0.15, w: 5.4, h: 0.4, fontFace: FACE, fontSize: 15, bold: true, color: COLORS.primary, isTextBox: true, margin: 0 });
    s.addText(it[1], { x: gx + 0.25, y: gy + 0.58, w: 5.4, h: 0.65, fontFace: FACE, fontSize: 13, color: COLORS.body, isTextBox: true, margin: 0, lineSpacingMultiple: 1.15 });
    gy += 1.55;
  });
  pageNum(s, n++);
}

// - 11. CONCLUSIONS (stays on screen for Q&A) ----------------
{
  const s = newSlide(p);
  actionTitle(s, "Weeks 1-7 are substantively complete; only the Week 8 live demonstration remains");
  bullets(s, [
    "All 4 required detection use cases proven with real, captured evidence - not just working infrastructure.",
    "Infrastructure, root MFA, and all 3 agents (2 Linux + 1 Windows) confirmed healthy and Active as of 26 September 2026.",
    "Two real incidents diagnosed and resolved, demonstrating the operational process the grading criteria weight at 15%.",
    "All 12 required dashboard screenshots plus 3 bonus captures taken 2026-09-26 (Section 2.2). Remaining: only the Week 8 live demonstration, for which a rehearsal script is already written.",
  ], { y: 1.65, h: 4.0, size: 18, spaceAfter: 16 });
  s.addShape("rect", { x: MARGIN, y: 5.85, w: 12.33, h: 0.02, fill: { color: COLORS.rule }, line: { type: "none" } });
  s.addText("Contact: Nishen Madawa Abedeera (CCA5008) | nishenmadawa15@gmail.com", {
    x: MARGIN, y: 6.05, w: 12.33, h: 0.4, fontFace: FACE, fontSize: 14, color: COLORS.muted, isTextBox: true, margin: 0,
  });
  s.addText("Are there questions or feedback?", {
    x: MARGIN, y: 6.5, w: 12.33, h: 0.4, fontFace: FACE, fontSize: 14, italic: true, color: COLORS.accent, isTextBox: true, margin: 0,
  });
  pageNum(s, n++);
}

// - 12. REFERENCES ----------------
{
  const s = newSlide(p);
  actionTitle(s, "References");
  bullets(s, [
    "Wazuh Documentation. Rule reference (5710, 5712, 550/553/554, 60642) and vulnerability detection. documentation.wazuh.com/current/",
    "AWS. EC2, VPC, Systems Manager Run Command, and IAM documentation. docs.aws.amazon.com",
    "CCA Cyber Security Internship Project Brief (project specification and grading weights).",
    "SOCWatch_Runbook.md - internal week-by-week execution runbook (this project).",
    "SOCWatch-Evidence/troubleshooting-log.md, instance-inventory.md - primary evidence sources cited throughout this deck.",
  ], { y: 1.65, h: 4.5, size: 16, spaceAfter: 14 });
  pageNum(s, n++);
}

p.writeFile({ fileName: process.argv[2] }).then(() => console.log("Written:", process.argv[2]));
