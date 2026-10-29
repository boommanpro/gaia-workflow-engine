package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;

/**
 * 画布节点放置服务 —— node(action=add) 的「LLM 无感知布局」。
 *
 * <p>agent 的 node 工具 schema 里没有 position 字段：新节点落点全部由这里计算。
 * 这是<b>搭建期</b>的增量落点（用户看着节点一个个出现），只保证不重叠；
 * run 结束由 {@link WorkflowLayoutEngine} 统一重排为分层布局。
 * 步长与碰撞盒按画布真实节点尺寸取上界（2026-10-29 修正：旧 320/200/240×120
 * 小于节点实际 360 宽、390 高，增量摆放阶段就会叠罗汉）：</p>
 * <ul>
 *   <li>有来源锚点（connect.from）：放锚点右侧一格；碰撞盒（360×390）被占则向下探测，</li>
 *   <li>无锚点：放画布内容包围盒右缘一格，纵向取包围盒中心；</li>
 *   <li>绝不移动既有节点、不做全图重排——用户摆好的布局神圣不可侵犯。</li>
 * </ul>
 */
public final class CanvasPlacement {

    private static final int X_STEP = 520;
    private static final int Y_STEP = 470;
    /** 碰撞检测盒：取常规节点尺寸上界（宽360×高390，llm/http/code 为最大件） */
    private static final int BOX_W = 360;
    private static final int BOX_H = 390;
    private static final int MAX_PROBES = 20;

    private CanvasPlacement() {
    }

    /**
     * 计算新节点落点。
     *
     * @param doc           当前草稿文档（nodes 含 meta.position）
     * @param anchorNodeId  来源锚点节点 id（connect.from；可为 null=无锚点）
     * @return {"x":..,"y":..}
     */
    public static JSONObject place(JSONObject doc, String anchorNodeId) {
        JSONObject anchor = anchorNodeId != null ? findNode(doc, anchorNodeId) : null;
        if (anchor != null) {
            JSONObject from = positionOf(anchor);
            if (from != null) {
                return probe(doc, from.getInt("x", 0) + X_STEP, from.getInt("y", 0));
            }
        }
        // 无锚点：内容包围盒右缘
        Bounds bounds = boundsOf(doc);
        int startX = bounds.maxX + X_STEP;
        int centerY = bounds.minY + Math.max(0, (bounds.maxY - bounds.minY) / 2);
        return probe(doc, startX, centerY);
    }

    /** 从 (x,y) 起先右后下找空位 */
    private static JSONObject probe(JSONObject doc, int x, int y) {
        int probeY = y;
        for (int i = 0; i < MAX_PROBES; i++) {
            if (!occupied(doc, x, probeY)) {
                return new JSONObject().set("x", x).set("y", probeY);
            }
            probeY += Y_STEP;
        }
        // 纵向满：右侧再开一列
        int probeX = x + X_STEP;
        for (int i = 0; i < MAX_PROBES; i++) {
            if (!occupied(doc, probeX, y)) {
                return new JSONObject().set("x", probeX).set("y", y);
            }
            y += Y_STEP;
        }
        return new JSONObject().set("x", x).set("y", y);
    }

    /** 碰撞：任一既有节点矩形与新节点矩形相交 */
    private static boolean occupied(JSONObject doc, int x, int y) {
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes == null) {
            return false;
        }
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject node = nodes.getJSONObject(i);
            JSONObject pos = positionOf(node);
            if (pos == null) {
                continue;
            }
            int ox = pos.getInt("x", 0);
            int oy = pos.getInt("y", 0);
            if (rectsOverlap(x, y, BOX_W, BOX_H, ox, oy, BOX_W, BOX_H)) {
                return true;
            }
        }
        return false;
    }

    private static boolean rectsOverlap(int ax, int ay, int aw, int ah, int bx, int by, int bw, int bh) {
        return ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;
    }

    private static JSONObject findNode(JSONObject doc, String nodeId) {
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes == null || nodeId == null) {
            return null;
        }
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject node = nodes.getJSONObject(i);
            if (nodeId.equals(node.getStr("id"))) {
                return node;
            }
        }
        return null;
    }

    private static JSONObject positionOf(JSONObject node) {
        JSONObject meta = node.getJSONObject("meta");
        return meta != null ? meta.getJSONObject("position") : null;
    }

    private static final class Bounds {
        int minX = 0;
        int minY = 0;
        int maxX = 0;
        int maxY = 0;
    }

    private static Bounds boundsOf(JSONObject doc) {
        Bounds bounds = new Bounds();
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes == null || nodes.isEmpty()) {
            return bounds;
        }
        boolean first = true;
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject pos = positionOf(nodes.getJSONObject(i));
            if (pos == null) {
                continue;
            }
            int x = pos.getInt("x", 0);
            int y = pos.getInt("y", 0);
            if (first) {
                bounds.minX = bounds.maxX = x;
                bounds.minY = bounds.maxY = y;
                first = false;
                continue;
            }
            bounds.minX = Math.min(bounds.minX, x);
            bounds.maxX = Math.max(bounds.maxX, x);
            bounds.minY = Math.min(bounds.minY, y);
            bounds.maxY = Math.max(bounds.maxY, y);
        }
        return bounds;
    }
}
