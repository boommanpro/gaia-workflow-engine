package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.app.domain.agent.input.FolderCreateInput;
import cn.boommanpro.gaia.workflow.app.domain.agent.input.FolderRenameInput;
import cn.boommanpro.gaia.workflow.app.domain.agent.input.SessionFolderInput;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSession;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentWorkFolder;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentWorkFolderService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 工作空间（Work 模式：文件夹分组的对话）
 *
 * 文件夹 CRUD + 会话归属：
 *   · 删除文件夹时，其中的会话自动移出（folder_id 置空），不删除会话本身
 */
@RestController
@RequestMapping("/api/agent/workspace")
public class AgentWorkspaceController {

    private final AgentWorkFolderService folderService;
    private final AgentSessionService sessionService;

    public AgentWorkspaceController(AgentWorkFolderService folderService,
                                    AgentSessionService sessionService) {
        this.folderService = folderService;
        this.sessionService = sessionService;
    }

    /**
     * 文件夹列表（带每个文件夹的会话数，按 sort_order / 创建时间排序）
     */
    @GetMapping("/folders")
    public List<Map<String, Object>> listFolders() {
        List<AgentWorkFolder> folders = folderService.list(
            new QueryWrapper<AgentWorkFolder>()
                .orderByAsc("sort_order")
                .orderByDesc("id"));

        // 统计每个文件夹下的会话数（未删除、未归档）
        Map<Long, Long> counts = sessionService.list(
            new QueryWrapper<AgentSession>()
                .eq("archived", 0)
                .isNotNull("folder_id"))
            .stream()
            .filter(s -> s.getFolderId() != null)
            .collect(Collectors.groupingBy(AgentSession::getFolderId, Collectors.counting()));

        List<Map<String, Object>> result = new ArrayList<>();
        for (AgentWorkFolder folder : folders) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", folder.getId());
            item.put("name", folder.getName());
            item.put("sortOrder", folder.getSortOrder());
            item.put("createdAt", folder.getCreatedAt());
            item.put("updatedAt", folder.getUpdatedAt());
            item.put("sessionCount", counts.getOrDefault(folder.getId(), 0L));
            result.add(item);
        }
        return result;
    }

    /**
     * 新建文件夹
     */
    @PostMapping("/folder")
    public AgentWorkFolder createFolder(@RequestBody FolderCreateInput input) {
        String name = input.getName() == null ? "" : input.getName().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("文件夹名称不能为空");
        }
        AgentWorkFolder folder = new AgentWorkFolder();
        folder.setName(name);
        folder.setSortOrder(0);
        folder.setCreatedAt(LocalDateTime.now());
        folder.setUpdatedAt(LocalDateTime.now());
        folderService.save(folder);
        return folder;
    }

    /**
     * 重命名文件夹
     */
    @PutMapping("/folder/{id}")
    public boolean renameFolder(@PathVariable Long id, @RequestBody FolderRenameInput input) {
        AgentWorkFolder folder = folderService.getById(id);
        if (folder == null) {
            return false;
        }
        String name = input.getName() == null ? "" : input.getName().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("文件夹名称不能为空");
        }
        folder.setName(name);
        folder.setUpdatedAt(LocalDateTime.now());
        return folderService.updateById(folder);
    }

    /**
     * 删除文件夹：其中会话自动移出（folder_id 置空），不删除会话
     */
    @DeleteMapping("/folder/{id}")
    public boolean deleteFolder(@PathVariable Long id) {
        boolean removed = folderService.removeById(id);
        if (!removed) {
            return false;
        }
        // 移出其中的会话（UpdateWrapper 显式置空，绕过 updateById 跳过 null 字段）
        UpdateWrapper<AgentSession> uw = new UpdateWrapper<>();
        uw.eq("folder_id", id).set("folder_id", null).set("updated_at", LocalDateTime.now());
        sessionService.update(uw);
        return true;
    }

    /**
     * 设置会话所属文件夹（folderId 为 null 表示移出文件夹）
     */
    @PutMapping("/session/{sessionKey}/folder")
    public boolean setSessionFolder(@PathVariable String sessionKey, @RequestBody SessionFolderInput input) {
        AgentSession session = sessionService.getOne(
            new QueryWrapper<AgentSession>().eq("session_key", sessionKey));
        if (session == null) {
            return false;
        }
        UpdateWrapper<AgentSession> uw = new UpdateWrapper<>();
        uw.eq("session_key", sessionKey)
            .set("folder_id", input.getFolderId())
            .set("updated_at", LocalDateTime.now());
        return sessionService.update(uw);
    }
}
