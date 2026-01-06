import {ref, watch} from 'vue'
import {useWorkflowStore} from '../store'

export function useWorkflowData(props) {
    const workflowData = ref(null)
    const dataLoaded = ref(false)

    const workflowStore = useWorkflowStore()

    // 加载数据
    const loadData = async () => {
        // 如果有工作流ID，则加载工作流数据
        const workflow = await workflowStore.getWorkflowById(props.workflowId)
        if (workflow) {
            // 获取工作流当前版本数据
            const versionData = await getCurrentWorkflowVersion(workflow.workflowCode, workflow.currentVersionId)

            workflowData.value = {
                id: workflow.id,
                workflowCode: workflow.workflowCode,
                name: workflow.workflowName,
                currentVersionId: workflow.currentVersionId,
                content: versionData ? JSON.parse(versionData.workflowData) : {
                    nodes: [],
                    edges: []
                }
            }
            console.log('加载工作流数据:', workflowData.value)
        }


        // 标记数据加载完成
        dataLoaded.value = true
    }

    // 获取当前工作流版本
    async function getCurrentWorkflowVersion(workflowCode, currentVersionId) {
        try {
            if (currentVersionId) {
                // 如果有当前版本ID，则直接获取该版本
                const response = await fetch(`/api/workflow-version/${currentVersionId}`)
                if (response.ok) {
                    return await response.json()
                } else {
                    console.error('获取当前工作流版本失败')
                    return null
                }
            } else {
                // 如果没有当前版本ID，则获取标记为当前版本的版本
                const response = await fetch(`/api/workflow-version/list/${workflowCode}`)
                if (response.ok) {
                    const versions = await response.json()
                    // 返回标记为当前版本的版本
                    return versions && versions.length > 0 ? 
                        versions.find(version => version.isCurrent === 1) || versions[0] : null
                } else {
                    console.error('获取工作流版本列表失败')
                    return null
                }
            }
        } catch (error) {
            console.error('获取当前工作流版本异常:', error)
            return null
        }
    }

    // 监听工作流ID变化
    watch(() => props.workflowId, async (newId) => {
        console.log('Workflow ID changed:', newId)
        if (newId !== undefined) {
            dataLoaded.value = false
            await loadData()
        }
    })

    // 监听示例ID变化
    watch(() => props.exampleId, async (newExampleId) => {
        console.log('Example ID changed:', newExampleId)
        if (newExampleId !== undefined) {
            dataLoaded.value = false
            await loadData()
        }
    })
    
    // 切换到指定版本
    const switchToVersion = async (versionId) => {
        try {
            // 获取指定版本数据
            const versionData = await fetch(`/api/workflow-version/${versionId}`)
            if (versionData.ok) {
                const version = await versionData.json()
                
                // 获取工作流基本信息
                const workflow = await workflowStore.getWorkflowByCode(version.workflowCode)
                
                if (workflow) {
                    workflowData.value = {
                        id: workflow.id,
                        workflowCode: workflow.workflowCode,
                        name: workflow.workflowName,
                        currentVersionId: version.id,
                        content: version ? JSON.parse(version.workflowData) : {
                            nodes: [],
                            edges: []
                        }
                    }
                    console.log('切换到版本:', workflowData.value)
                    return workflowData.value
                }
            } else {
                console.error('获取指定版本失败')
                return null
            }
        } catch (error) {
            console.error('切换版本异常:', error)
            return null
        }
    }

    return {
        workflowData,
        dataLoaded,
        loadData,
        switchToVersion
    }
}
