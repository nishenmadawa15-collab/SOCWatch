import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from matplotlib.font_manager import FontProperties
import matplotlib.font_manager as fm

OUT = "F:/CCA Internship Project/SOCWatch-Evidence/SOCWatch-Evidence/week7/charts"
import os
os.makedirs(OUT, exist_ok=True)

# ---- palette (from dataviz skill, light mode) ----
SURFACE = "#fcfcfb"
INK = "#0b0b0b"
SECONDARY_INK = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
BASELINE = "#c3c2b7"

STATUS = {"critical": "#d03b3b", "serious": "#ec835a", "warning": "#fab219", "good": "#0ca30c"}
CAT = {"blue": "#2a78d6", "orange": "#eb6834", "aqua": "#1baf7a"}

plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.sans-serif"] = ["Segoe UI", "DejaVu Sans", "Arial"]
plt.rcParams["axes.edgecolor"] = GRID
plt.rcParams["text.color"] = INK
plt.rcParams["axes.labelcolor"] = SECONDARY_INK
plt.rcParams["xtick.color"] = MUTED
plt.rcParams["ytick.color"] = INK


def rounded_hbar(ax, y, width, color, height=0.5, max_width=None):
    """Draw a horizontal bar with a rounded right (data) end, square baseline."""
    x0 = 0
    w = width
    r = height * 0.28
    box = FancyBboxPatch(
        (x0, y - height / 2), max(w - r, 0.0001), height,
        boxstyle=f"round,pad=0,rounding_size={r}",
        linewidth=0, facecolor=color, mutation_aspect=1,
        clip_on=False,
    )
    ax.add_patch(box)


def make_hbar_chart(fname, title, categories, values, colors, xlabel, value_fmt="{:,}", xmax=None, figsize=(7.2, 3.2)):
    fig, ax = plt.subplots(figsize=figsize, dpi=200)
    fig.patch.set_facecolor(SURFACE)
    ax.set_facecolor(SURFACE)

    n = len(categories)
    ys = list(range(n))[::-1]  # first category on top
    xmax = xmax or max(values) * 1.22

    for y, val, col in zip(ys, values, colors):
        rounded_hbar(ax, y, val, col, height=0.46)
        ax.text(val + xmax * 0.018, y, value_fmt.format(val), va="center", ha="left",
                fontsize=11, color=INK, fontweight="medium")

    ax.set_yticks(ys)
    ax.set_yticklabels(categories, fontsize=11.5, color=INK)
    ax.set_xlim(0, xmax)
    ax.set_ylim(-0.6, n - 0.4)

    # gridlines (vertical, hairline, recessive) behind bars
    ax.xaxis.grid(True, color=GRID, linewidth=1, zorder=0)
    ax.set_axisbelow(True)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_visible(False)
    ax.spines["bottom"].set_color(BASELINE)
    ax.tick_params(axis="y", length=0)
    ax.tick_params(axis="x", labelsize=9.5, colors=MUTED)

    ax.set_title(title, fontsize=13.5, color=INK, fontweight="bold", loc="left", pad=14)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=9.5, color=MUTED, labelpad=8)

    fig.tight_layout()
    fig.savefig(f"{OUT}/{fname}", facecolor=SURFACE, bbox_inches="tight")
    plt.close(fig)
    print("wrote", fname)


# ---- Chart 1: Vulnerability severity breakdown (status palette) ----
make_hbar_chart(
    "chart-vuln-severity.png",
    "Vulnerability findings by severity — agent-linux-1 (2,189 total)",
    ["Critical", "High", "Medium", "Low"],
    [266, 1309, 565, 49],
    [STATUS["critical"], STATUS["serious"], STATUS["warning"], STATUS["good"]],
    "Number of findings",
)

# ---- Chart 2: FIM lifecycle events (categorical identity) ----
make_hbar_chart(
    "chart-fim-lifecycle.png",
    "File Integrity Monitoring — alerts by lifecycle stage (24h)",
    ["File added\n(rule 554)", "File modified\n(rule 550)", "File deleted\n(rule 553)"],
    [7, 18, 4],
    [CAT["blue"], CAT["orange"], CAT["aqua"]],
    "Number of alerts",
    figsize=(7.2, 2.6),
)

# ---- Chart 3: Real attack traffic detected, by platform ----
make_hbar_chart(
    "chart-attack-traffic.png",
    "Genuine internet-sourced brute-force traffic detected (24h)",
    ["Linux — sshd\n(rule 5710)", "Windows — RDP\n(rule 60122)"],
    [471, 981],
    [CAT["blue"], CAT["orange"]],
    "Failed login attempts",
    figsize=(7.2, 2.6),
)

# ---- Chart 4: Week-by-week completion ----
fig, ax = plt.subplots(figsize=(7.4, 3.6), dpi=200)
fig.patch.set_facecolor(SURFACE)
ax.set_facecolor(SURFACE)
weeks = [f"Week {i}" for i in range(1, 9)]
pct = [100, 100, 100, 100, 100, 100, 100, 20]
ys = list(range(8))[::-1]
xmax = 118
for y, val in zip(ys, pct):
    track_col = "#cde2fb"  # lightest sequential step, as the unfilled track
    rounded_hbar(ax, y, 100, track_col, height=0.5)
    rounded_hbar(ax, y, val, CAT["blue"], height=0.5)
    label = f"{val}%" + ("  (rehearsal ready)" if val < 100 else "")
    ax.text(max(val, 100) + 3, y, label, va="center", ha="left", fontsize=10.5, color=INK)
ax.axvline(100, color=BASELINE, linewidth=1, linestyle=(0, (1, 2)))
ax.set_yticks(ys)
ax.set_yticklabels(weeks, fontsize=11.5, color=INK)
ax.set_xlim(0, xmax)
ax.set_ylim(-0.6, 7.4)
ax.xaxis.grid(True, color=GRID, linewidth=1, zorder=0)
ax.set_axisbelow(True)
for s in ["top", "right", "left"]:
    ax.spines[s].set_visible(False)
ax.spines["bottom"].set_color(BASELINE)
ax.tick_params(axis="y", length=0)
ax.tick_params(axis="x", labelsize=9.5, colors=MUTED)
ax.set_title("Eight-week plan — completion by week", fontsize=13.5, color=INK, fontweight="bold", loc="left", pad=14)
ax.set_xlabel("Percent complete", fontsize=9.5, color=MUTED, labelpad=8)
fig.tight_layout()
fig.savefig(f"{OUT}/chart-week-progress.png", facecolor=SURFACE, bbox_inches="tight")
plt.close(fig)
print("wrote chart-week-progress.png")

print("ALL CHARTS WRITTEN")
