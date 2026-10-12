#!/usr/bin/env python3
"""E2E 行为 benchmark（提示词/知识/校验规则的质量回归，对标 dsh snapshot 回放思路的最小落地）。

对每个任务：发起真实对话 → 轮询 run_end → 从 DB 断言四层：
  ① 工具轮次数 ≤ 上限（经济性）
  ② 落版次数 = 0（AI 不落版语义）
  ③ 最终草稿结构断言（fromPort=key、end 有 inputsValues、无空壳）
  ④ 试运行输出断言（正反双向）

用法：
  python3 scripts/benchmark/run-benchmark.py                # 跑全部任务
  python3 scripts/benchmark/run-benchmark.py --task contains-check
  python3 scripts/benchmark/run-benchmark.py --baseline out.json   # 与基线对比

评分口径（写入结果 JSON，作为下次对比基线）：
  passed / toolsUsed / runsUsed / warnings / structureOk / outputsOk

前置：后端已启动（默认 http://localhost:48080）；SQLite 位于 app 目录。
"""
import argparse
import json
import sys
import time
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "apps/api/gaia-workflow/gaia-workflow-app/gaia_workflow.db"
TASKS_DIR = Path(__file__).parent / "e2e-tasks"
API = "http://localhost:48080"


def api_post(path, body):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def api_get(path):
    with urllib.request.urlopen(API + path, timeout=30) as r:
        return json.loads(r.read())


def sqlite(query):
    import sqlite3
    conn = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    try:
        return conn.execute(query).fetchall()
    finally:
        conn.close()


def run_task(task):
    session_key = uuid.uuid4().hex
    started = time.time()
    api_post(f"/api/agent/session/{session_key}/run",
             {"message": task["message"], "locale": "zh-CN"})

    # 轮询到 run_end（上限 10 分钟）
    deadline = time.time() + 600
    ended = False
    while time.time() < deadline:
        rows = sqlite(f"SELECT COUNT(*) FROM agent_session_event WHERE session_key='{session_key}' AND event_type='run_end'")
        if rows[0][0] >= 1:
            ended = True
            break
        time.sleep(4)
    result = {
        "task": task["name"], "sessionKey": session_key, "ended": ended,
        "durationSec": round(time.time() - started),
    }
    if not ended:
        result["passed"] = False
        result["failure"] = "run 未在 10 分钟内结束"
        return result

    tools = sqlite(f"SELECT tool_name, outcome FROM agent_tool_call_log WHERE session_key='{session_key}' ORDER BY id")
    result["toolsUsed"] = len(tools)
    result["toolFailures"] = sum(1 for _, o in tools if o != "SUCCESS")
    result["runsUsed"] = sum(1 for t, _ in tools if t == "run_workflow")

    versions_before = task.get("_versions_before", 0)
    versions = sqlite("SELECT COUNT(*) FROM gaia_workflow_version")[0][0]
    result["versionsCreatedByAi"] = versions - versions_before

    # 最终草稿（会话 document 事件里最后一次）
    doc_rows = sqlite(f"SELECT payload FROM agent_session_event WHERE session_key='{session_key}' "
                      f"AND event_type='document' ORDER BY id DESC LIMIT 1")
    structure_ok, structure_issues = True, []
    outputs_ok, outputs_issues = True, []
    if doc_rows:
        payload = json.loads(doc_rows[0][0])
        doc = payload.get("doc") or payload.get("document") or payload
        nodes = doc.get("nodes") or []
        edges = doc.get("edges") or []
        by_id = {n.get("id"): n for n in nodes}
        for rule in task.get("structure", []):
            kind = rule.get("check")
            if kind == "edgePort" and not rule.get("allowMissingElse", True):
                cond_nodes = [n for n in nodes if n.get("type") in ("condition", "branches")]
                for cn in cond_nodes:
                    keys = {c.get("key") for c in (cn.get("data", {}).get("conditions") or [])}
                    ports = {e.get("sourcePortID") for e in edges if e.get("sourceNodeID") == cn.get("id")}
                    if keys and not (ports & keys):
                        structure_ok = False
                        structure_issues.append(f"{cn.get('id')} 出边未命中任何 key")
            if kind == "endHasInputs":
                ends = [n for n in nodes if n.get("type") == "end"]
                for en in ends:
                    iv = en.get("data", {}).get("inputsValues")
                    if not iv:
                        structure_ok = False
                        structure_issues.append(f"{en.get('id')} 没有 inputsValues")
            if kind == "noEmptyNodes":
                for n in nodes:
                    if n.get("type") != "start" and not n.get("data"):
                        structure_ok = False
                        structure_issues.append(f"{n.get('id')} 空壳节点")
            if kind == "edgeFromPortIn" and rule.get("ports"):
                for e in edges:
                    sp = e.get("sourcePortID")
                    if sp and sp not in rule["ports"] and e.get("sourceNodeID", "").startswith(("condition", "branches")):
                        structure_ok = False
                        structure_issues.append(f"非法 fromPort: {sp}")
    else:
        structure_ok = False
        structure_issues.append("没有 document 事件")

    # 试运行输出（从 run 回执事件断言）
    run_rows = sqlite(f"SELECT payload FROM agent_session_event WHERE session_key='{session_key}' "
                      f"AND event_type='tool_result' AND payload LIKE '%工作流运行%'")
    outputs_seen = []
    warnings = 0
    for row in run_rows:
        d = json.loads(row[0])
        p = json.loads(d.get("payload") or "{}")
        if p.get("outputs"):
            outputs_seen.append(p["outputs"])
        if p.get("warnings"):
            warnings += len(p["warnings"])
    result["warnings"] = warnings
    for expect in task.get("expectOutputs", []):
        if not any(_matches(o, expect) for o in outputs_seen):
            outputs_ok = False
            outputs_issues.append(f"未见预期输出 {expect}，实际: {outputs_seen}")
    result["structureOk"] = structure_ok
    result["structureIssues"] = structure_issues
    result["outputsOk"] = outputs_ok
    result["outputsIssues"] = outputs_issues

    limits = task.get("limits", {})
    result["withinToolLimit"] = result["toolsUsed"] <= limits.get("maxToolCalls", 30)
    result["noVersionByAi"] = result["versionsCreatedByAi"] == 0
    result["passed"] = all([structure_ok, outputs_ok, result["withinToolLimit"], result["noVersionByAi"]])
    return result


def _matches(actual, expect):
    for k, v in expect.items():
        if isinstance(v, dict):
            sub = actual.get(k)
            if not isinstance(sub, dict) or not _matches(sub, v):
                return False
        elif actual.get(k) != v:
            return False
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", help="只跑指定任务名")
    parser.add_argument("--baseline", help="与基线 JSON 对比（轮次/警告不回退）")
    args = parser.parse_args()

    tasks = []
    for f in sorted(TASKS_DIR.glob("*.json")):
        t = json.loads(f.read_text())
        versions_before = sqlite("SELECT COUNT(*) FROM gaia_workflow_version")[0][0]
        t["_versions_before"] = versions_before
        tasks.append(t)

    results = []
    for t in tasks:
        if args.task and t["name"] != args.task:
            continue
        print(f"▶ 运行任务 {t['name']} ...", flush=True)
        r = run_task(t)
        results.append(r)
        print(f"  {'✓' if r.get('passed') else '✗'} {r['task']}: tools={r.get('toolsUsed')} "
              f"runs={r.get('runsUsed')} warnings={r.get('warnings')} "
              f"structure={'ok' if r.get('structureOk') else r.get('structureIssues')} "
              f"outputs={'ok' if r.get('outputsOk') else r.get('outputsIssues')}")

    out = {"ranAt": time.strftime("%Y-%m-%d %H:%M:%S"), "results": results}
    out_path = Path("/tmp/gaia-benchmark-result.json")
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(f"\n结果已写入 {out_path}")

    if args.baseline and Path(args.baseline).exists():
        baseline = json.loads(Path(args.baseline).read_text())
        base_by = {r["task"]: r for r in baseline.get("results", [])}
        for r in results:
            b = base_by.get(r["task"])
            if not b:
                continue
            if r.get("toolsUsed", 0) > b.get("toolsUsed", 0) + 5:
                print(f"⚠ {r['task']}: 工具轮次回退 {b.get('toolsUsed')} → {r.get('toolsUsed')}")
            if r.get("warnings", 0) > b.get("warnings", 0):
                print(f"⚠ {r['task']}: 警告数回退 {b.get('warnings')} → {r.get('warnings')}")

    failed = [r for r in results if not r.get("passed")]
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
