#!/usr/bin/env python3
"""gaia v2 金丝雀：对一个会话发送任务，订阅 SSE（命名事件格式），自动确认，统计工具调用与结局。"""
import json
import sys
import threading
import time
import uuid

import requests

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:48080"
SESSION = sys.argv[2] if len(sys.argv) > 2 else ("canary-" + uuid.uuid4().hex[:8])
MESSAGE = sys.argv[3] if len(sys.argv) > 3 else "创建一个工作流：输入一段文本，用 LLM 总结，然后输出结果。"


def classify(payload_text):
    """从 tool_result payload 判定 ok/error_code"""
    try:
        pj = json.loads(payload_text) if payload_text else {}
    except Exception:
        return True, None
    err = pj.get("error")
    if isinstance(err, dict):
        return False, err.get("code")
    if err:
        return False, None
    if pj.get("code"):
        return False, pj.get("code")
    return bool(pj.get("success", True)), None


def run_canary():
    tool_calls = []
    done = threading.Event()
    turns = 0

    def listen():
        nonlocal turns
        current_event = None
        with requests.get(f"{BASE}/api/agent/session/{SESSION}/events", stream=True, timeout=600) as r:
            for raw_line in r.iter_lines(decode_unicode=False):
                if raw_line is None:
                    continue
                line = raw_line.decode("utf-8", "replace")
                if line.startswith("event:"):
                    current_event = line[len("event:"):].strip()
                    if current_event == "turn":
                        turns += 1
                    continue
                if not line.startswith("data:"):
                    continue
                try:
                    data = json.loads(line[5:].strip())
                except Exception:
                    continue
                etype = current_event
                if etype == "confirm_request":
                    tc = data.get("toolCallId")
                    if tc:
                        resp = requests.post(f"{BASE}/api/agent/session/{SESSION}/confirm",
                                             json={"toolCallId": tc, "approved": True}, timeout=10)
                        print(f"[canary] auto-approved {tc}: {resp.status_code}")
                elif etype == "tool_call":
                    tool_calls.append({"name": data.get("name"), "id": data.get("id")})
                elif etype == "tool_result":
                    ok, code = classify(data.get("payload"))
                    for call in reversed(tool_calls):
                        if call.get("id") == data.get("toolCallId") and "ok" not in call:
                            call["ok"] = ok and not data.get("rejected")
                            call["error_code"] = code
                            break
                elif etype == "done":
                    done.set()
                    return

    t = threading.Thread(target=listen, daemon=True)
    t.start()
    time.sleep(0.8)

    resp = requests.post(f"{BASE}/api/agent/session/{SESSION}/run",
                         json={"message": MESSAGE, "locale": "zh-CN"}, timeout=15)
    print(f"[canary] run accepted: {resp.json()}")

    if not done.wait(timeout=420):
        print("[canary] TIMEOUT waiting for done")
    time.sleep(2)

    print(f"\n[canary] session={SESSION} turns={turns}")
    print("[canary] tool calls:")
    for call in tool_calls:
        print(f"  - {str(call.get('name')):20s} ok={call.get('ok')} err={call.get('error_code')}")
    ok_count = sum(1 for c in tool_calls if c.get("ok"))
    print(f"[canary] success: {ok_count}/{len(tool_calls)}")
    try:
        m = requests.get(f"{BASE}/api/agent/metrics/tools?days=1", timeout=10).json()
        print(f"[canary] metrics overall: calls={m.get('totalCalls')} rate={m.get('overallSuccessRate')}%")
        for t2 in m.get("tools", [])[:10]:
            print(f"    {t2.get('tool'):20s} total={t2.get('total')} rate={t2.get('successRate')}% outcomes={t2.get('outcomes')}")
    except Exception as e:
        print(f"[canary] metrics fetch failed: {e}")


if __name__ == "__main__":
    run_canary()
