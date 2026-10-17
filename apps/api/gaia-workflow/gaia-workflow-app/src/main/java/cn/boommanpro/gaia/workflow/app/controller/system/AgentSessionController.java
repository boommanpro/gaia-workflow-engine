package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.app.agent.ass.AgentServiceSessionService;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowStore;
import cn.boommanpro.gaia.workflow.app.domain.agent.input.SessionCreateInput;
import cn.boommanpro.gaia.workflow.app.domain.agent.input.SessionFlagInput;
import cn.boommanpro.gaia.workflow.app.domain.agent.input.SessionRenameInput;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMessage;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSession;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentWorkFolder;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentMessageService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentWorkFolderService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Agent 会话管理
 */
@RestController
@RequestMapping("/api/agent/session")
public class AgentSessionController {

    private final AgentSessionService sessionService;
    private final AgentMessageService messageService;
    private final AgentWorkFolderService folderService;
    private final AgentServiceSessionService asServiceSessionService;
    private final SessionWorkflowStore sessionWorkflowStore;

    public AgentSessionController(AgentSessionService sessionService,
                                  AgentMessageService messageService,
                                  AgentWorkFolderService folderService,
                                  AgentServiceSessionService asServiceSessionService,
                                  SessionWorkflowStore sessionWorkflowStore) {
        this.sessionService = sessionService;
        this.messageService = messageService;
        this.folderService = folderService;
        this.asServiceSessionService = asServiceSessionService;
        this.sessionWorkflowStore = sessionWorkflowStore;
    }

    @GetMapping("/list")
    public List<AgentSession> listSessions(
            @RequestParam(value = "scope", required = false) String scope,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "folderId", required = false) Long folderId,
            @RequestParam(value = "unfiled", required = false) Boolean unfiled,
            @RequestParam(value = "includeArchived", required = false, defaultValue = "false") boolean includeArchived,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pageSize", required = false) Integer pageSize) {
        List<AgentSession> all = querySessions(scope, keyword, folderId, unfiled, includeArchived);
        if (page != null && page > 0 && pageSize != null && pageSize > 0) {
            int from = Math.min((page - 1) * pageSize, all.size());
            int to = Math.min(from + pageSize, all.size());
            return all.subList(from, to);
        }
        return all;
    }

    /**
     * 会话分页（返回 { total, items, page, pageSize }，供左栏按文件夹/关键字分页加载）
     */
    @GetMapping("/page")
    public Map<String, Object> pageSessions(
            @RequestParam(value = "scope", required = false) String scope,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "folderId", required = false) Long folderId,
            @RequestParam(value = "unfiled", required = false) Boolean unfiled,
            @RequestParam(value = "includeArchived", required = false, defaultValue = "false") boolean includeArchived,
            @RequestParam(value = "page", required = false, defaultValue = "1") int page,
            @RequestParam(value = "pageSize", required = false, defaultValue = "50") int pageSize) {
        List<AgentSession> all = querySessions(scope, keyword, folderId, unfiled, includeArchived);
        page = Math.max(1, page);
        pageSize = Math.max(1, pageSize);
        int from = Math.min((page - 1) * pageSize, all.size());
        int to = Math.min(from + pageSize, all.size());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", all.size());
        result.put("items", all.subList(from, to));
        result.put("page", page);
        result.put("pageSize", pageSize);
        return result;
    }

    /** 通用查询：置顶优先 + 按更新时间倒序 + 空间/关键字/文件夹/归档过滤 */
    private List<AgentSession> querySessions(String scope, String keyword, Long folderId, Boolean unfiled, boolean includeArchived) {
        QueryWrapper<AgentSession> qw = new QueryWrapper<>();
        if (!includeArchived) {
            qw.eq("archived", 0);
        }
        if (scope != null && !scope.trim().isEmpty()) {
            qw.eq("scope", scope.trim());
        }
        if (keyword != null && !keyword.trim().isEmpty()) {
            String kw = keyword.trim();
            qw.and(w -> w.like("title", kw).or().like("session_key", kw));
        }
        if (folderId != null) {
            qw.eq("folder_id", folderId);
        } else if (Boolean.TRUE.equals(unfiled)) {
            qw.isNull("folder_id");
        }
        qw.orderByDesc("pinned").orderByDesc("updated_at").orderByDesc("id");
        return sessionService.list(qw);
    }

    @PostMapping("/create")
    public AgentSession createSession(@RequestBody SessionCreateInput input) {
        AgentSession session = new AgentSession();
        session.setSessionKey(UUID.randomUUID().toString().replace("-", ""));
        session.setTitle(input.getTitle() != null ? input.getTitle() : "新对话");
        String scope = input.getScope() != null && !input.getScope().trim().isEmpty()
            ? input.getScope().trim() : "chat";
        session.setScope(scope);
        if ("work".equals(scope)) {
            // Work 会话缺省归入「默认空间」文件夹
            session.setFolderId(input.getFolderId() != null ? input.getFolderId() : ensureDefaultFolder());
        }
        session.setPinned(0);
        session.setArchived(0);
        session.setCreatedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        sessionService.save(session);
        return session;
    }

    /** 确保「默认空间」文件夹存在并返回其 id（Work 会话缺省归入） */
    private Long ensureDefaultFolder() {
        final String DEFAULT_FOLDER_NAME = "默认空间";
        AgentWorkFolder folder = folderService.getOne(
            new QueryWrapper<AgentWorkFolder>().eq("name", DEFAULT_FOLDER_NAME).last("LIMIT 1"));
        if (folder != null) {
            return folder.getId();
        }
        AgentWorkFolder created = new AgentWorkFolder();
        created.setName(DEFAULT_FOLDER_NAME);
        created.setSortOrder(0);
        created.setCreatedAt(LocalDateTime.now());
        created.setUpdatedAt(LocalDateTime.now());
        folderService.save(created);
        return created.getId();
    }

    @PutMapping("/rename")
    public boolean renameSession(@RequestBody SessionRenameInput input) {
        AgentSession session = sessionService.getOne(
            new QueryWrapper<AgentSession>().eq("session_key", input.getSessionKey()));
        if (session == null) {
            return false;
        }
        session.setTitle(input.getTitle());
        session.setUpdatedAt(LocalDateTime.now());
        return sessionService.updateById(session);
    }

    @DeleteMapping("/{sessionKey}")
    public boolean deleteSession(@PathVariable String sessionKey) {
        // as-service 会话先回收远端托管 Agent（按会话建 Agent 的配套清理），再删本地行
        asServiceSessionService.archiveRemoteAgentForSession(sessionKey);
        sessionWorkflowStore.dropSession(sessionKey);
        return sessionService.remove(
            new QueryWrapper<AgentSession>().eq("session_key", sessionKey));
    }

    /**
     * 更新会话标记（置顶 / 归档），只更新传入的非 null 字段
     */
    @PutMapping("/{sessionKey}/flags")
    public boolean updateSessionFlags(@PathVariable String sessionKey, @RequestBody SessionFlagInput input) {
        AgentSession session = sessionService.getOne(
            new QueryWrapper<AgentSession>().eq("session_key", sessionKey));
        if (session == null) {
            return false;
        }
        if (input.getPinned() != null) {
            session.setPinned(Boolean.TRUE.equals(input.getPinned()) ? 1 : 0);
        }
        if (input.getArchived() != null) {
            session.setArchived(Boolean.TRUE.equals(input.getArchived()) ? 1 : 0);
        }
        session.setUpdatedAt(LocalDateTime.now());
        return sessionService.updateById(session);
    }

    @GetMapping("/{sessionKey}/messages")
    public List<AgentMessage> getMessages(@PathVariable String sessionKey) {
        return messageService.list(
            new QueryWrapper<AgentMessage>()
                .eq("session_key", sessionKey)
                .orderByAsc("id"));
    }

    /**
     * 保存会话的调试信息到 DB
     */
    @PutMapping("/{sessionKey}/debug")
    public boolean saveDebugData(@PathVariable String sessionKey,
                                  @RequestBody java.util.Map<String, Object> body) {
        AgentSession session = sessionService.getOne(
            new QueryWrapper<AgentSession>().eq("session_key", sessionKey));
        if (session == null) {
            return false;
        }
        Object data = body.get("debugData");
        session.setDebugData(data != null ? data.toString() : null);
        session.setUpdatedAt(LocalDateTime.now());
        return sessionService.updateById(session);
    }

    /**
     * 加载会话的调试信息
     * 返回空字符串而非 null，避免空 body 导致前端 JSON 解析失败
     */
    @GetMapping("/{sessionKey}/debug")
    public String getDebugData(@PathVariable String sessionKey) {
        AgentSession session = sessionService.getOne(
                new QueryWrapper<AgentSession>().eq("session_key", sessionKey));
        return session != null && session.getDebugData() != null ? session.getDebugData() : "";
    }
}
