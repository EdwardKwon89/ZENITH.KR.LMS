#!/usr/bin/env python3
"""Regenerate the auto-synced GitHub Issues section in .agent/ACTIVE_TASK.md.

Reads open issues via `gh issue list` and rewrites the block between the
GH_ISSUES_SYNC markers. Everything outside the markers (the hand-curated
team task tables) is left untouched.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ACTIVE_TASK = Path(".agent/ACTIVE_TASK.md")
START = "<!-- GH_ISSUES_SYNC:START -->"
END = "<!-- GH_ISSUES_SYNC:END -->"


def gh_issue_list():
    result = subprocess.run(
        [
            "gh", "issue", "list",
            "--state", "open",
            "--limit", "200",
            "--json", "number,title,labels,assignees,updatedAt",
        ],
        capture_output=True, text=True, check=True,
    )
    return json.loads(result.stdout)


def label_value(labels, prefix):
    for label in labels:
        name = label["name"]
        if name.startswith(prefix):
            return name[len(prefix):]
    return "-"


def build_table(issues):
    issues = sorted(issues, key=lambda i: i["number"], reverse=True)
    rows = [
        "| # | 제목 | 팀 | 우선순위 | 상태 | 담당 | 갱신일 |",
        "|:-:|:-----|:--:|:-------:|:----|:-----|:-------|",
    ]
    for issue in issues:
        labels = issue["labels"]
        team = label_value(labels, "team:")
        priority = label_value(labels, "priority:")
        status = label_value(labels, "status:")
        assignees = ", ".join(a["login"] for a in issue["assignees"]) or "미배정"
        title = issue["title"].replace("|", "\\|")
        updated = issue["updatedAt"][:10]
        rows.append(
            f"| [#{issue['number']}](https://github.com/{{repo}}/issues/{issue['number']}) "
            f"| {title} | {team} | {priority} | {status} | {assignees} | {updated} |"
        )
    if len(rows) == 2:
        rows.append("| - | (열린 이슈 없음) | - | - | - | - | - |")
    return "\n".join(rows)


def main():
    repo = sys.argv[1] if len(sys.argv) > 1 else ""
    issues = gh_issue_list()
    table = build_table(issues).replace("{repo}", repo)
    text = ACTIVE_TASK.read_text(encoding="utf-8")
    pattern = re.compile(re.escape(START) + r".*?" + re.escape(END), re.DOTALL)
    if not pattern.search(text):
        raise SystemExit(f"markers not found in {ACTIVE_TASK}")
    replacement = f"{START}\n{table}\n{END}"
    new_text = pattern.sub(replacement, text, count=1)
    ACTIVE_TASK.write_text(new_text, encoding="utf-8")


if __name__ == "__main__":
    main()
