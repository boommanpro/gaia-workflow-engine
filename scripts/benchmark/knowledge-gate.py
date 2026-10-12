#!/usr/bin/env python3
"""知识库静态 gate（对标 dsh 的 docs gate，零成本进 CI）。

扫描 seed 知识条目与提示词，拦截已实证会把模型带偏的教学事故：
1. JSON 有效性 + 条目结构（nodeType/title/content 必填）
2. 危险教学黑名单：true/false 出边、multi-condition 正面推荐、
   start 用 inputs / end 用 outputs（与引擎真实结构相反的旧术语）
3. 中英条目集合一致性（防止单边修订）
4. 提示词关键教学存在性（fromPort=key、试运行无需 save）

用法：python3 scripts/benchmark/knowledge-gate.py
退出码：0 = 通过；1 = 有违规（打印明细）
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED_ZH = ROOT / "apps/api/gaia-workflow/gaia-workflow-app/src/main/resources/seed/node-knowledge.json"
SEED_EN = ROOT / "apps/api/gaia-workflow/gaia-workflow-app/src/main/resources/seed/node-knowledge-en.json"
PROMPT_ZH = ROOT / "apps/api/gaia-workflow/gaia-workflow-app/src/main/resources/agent/prompt-zh.md"
PROMPT_EN = ROOT / "apps/api/gaia-workflow/gaia-workflow-app/src/main/resources/agent/prompt-en.md"

violations = []


def check(cond, message):
    if not cond:
        violations.append(message)


def load_seed(path):
    try:
        return json.loads(path.read_text())
    except Exception as e:
        violations.append(f"{path.name}: JSON 解析失败: {e}")
        return []


def scan_entries(entries, label):
    types = set()
    for item in entries:
        nt = item.get("nodeType")
        title = item.get("title")
        content = item.get("content", "")
        check(nt and title and content, f"[{label}] 条目缺字段: {nt or title or '(?)'}")
        if nt:
            check(nt not in types, f"[{label}] nodeType 重复: {nt}")
            types.add(nt)
        # 危险教学黑名单（每条都是 2026-10-11 实证过的事故源）
        if nt == "condition":
            check(not re.search(r"两个出边（true|出边.*true[/／]false.*端口|true 分支或 false 分支", content),
                  f"[{label}] condition 条目含「true/false 出边」旧教学（引擎真实端口 = conditions[].key / else）")
            negated = any(k in content for k in ("没有这个类型", "不支持", "does not exist", "not supported", "no such type"))
            check("multi-condition" not in content or negated,
                  f"[{label}] condition 条目正面提及 multi-condition（幻影类型，引擎无解析器）")
            check("conditions" in content and '"key"' in content,
                  f"[{label}] condition 条目缺少 key 字段的真实结构")
        if nt == "multi-condition":
            violations.append(f"[{label}] multi-condition 是幻影类型，不应有知识条目")
        if nt == "start":
            check("outputs.properties" in content, f"[{label}] start 条目缺 outputs.properties 真实结构")
            check(not re.search(r"## 参数\s*\n- inputs[：:]", content),
                  f"[{label}] start 条目参数段用 inputs 旧术语（真实字段是 outputs）")
        if nt == "end":
            check("inputsValues" in content, f"[{label}] end 条目缺 inputsValues 真实结构")
            check(not re.search(r"## 参数\s*\n- outputs[：:]", content),
                  f"[{label}] end 条目参数段用 outputs 旧术语（真实字段是 inputsValues）")
    return types


def main():
    zh = load_seed(SEED_ZH)
    en = load_seed(SEED_EN)
    zh_types = scan_entries(zh, "zh")
    en_types = scan_entries(en, "en")
    check(zh_types == en_types, f"中英条目集合不一致: zh-en={zh_types - en_types}, en-zh={en_types - zh_types}")

    pz = PROMPT_ZH.read_text() if PROMPT_ZH.exists() else ""
    pe = PROMPT_EN.read_text() if PROMPT_EN.exists() else ""
    for label, prompt in (("zh", pz), ("en", pe)):
        if not prompt:
            violations.append(f"[{label}] 提示词文件缺失: {PROMPT_ZH.name}/{PROMPT_EN.name}")
            continue
        check("fromPort" in prompt, f"[{label}] 提示词缺 fromPort 教学（2026-10-11 实证的盲猜源头）")
        check("save_workflow" not in prompt,
              f"[{label}] 提示词仍教 save_workflow（AI 无落版工具，持久化归用户）")
        check("run_workflow" in prompt, f"[{label}] 提示词缺 run_workflow 验证教学")

    if violations:
        print(f"✗ {len(violations)} 处违规：")
        for v in violations:
            print("  -", v)
        sys.exit(1)
    print(f"✓ 知识 gate 通过：zh {len(zh)} 条 / en {len(en)} 条，提示词关键教学齐全")


if __name__ == "__main__":
    main()
