import {useCallback, useEffect, useState} from 'react';

import {useClientContext, usePlayground} from '@flowgram.ai/free-layout-editor';
import {Button, Tooltip} from '@douyinfe/semi-ui';
import {IconUpload} from '@douyinfe/semi-icons';

import {CodeEditorModal} from '../code-editor-modal';

export const Import = () => {
    const ctx = useClientContext();
    const [showData, setShowData] = useState('');
    const playground = usePlayground();
    const [showModal, setShowModal] = useState(false);
    const consoleJSON = useCallback(async () => {
        const jsonData = JSON.stringify(ctx.document.toJSON(), null, 2);
        setShowData(jsonData); // 先更新 showData
        setShowModal(true); // 然后再显示 Modal
    }, [ctx]);

    const saveData = useCallback(
        async (data: any) => {
            await ctx.document.reload(JSON.parse(data));
            setTimeout(() => {
                // 加载后触发画布的 fitview 让节点自动居中
                ctx.document.fitView();
            }, 100);
        },
        [ctx]
    );

    useEffect(() => {
        // 监听来自主应用的加载工作流事件
        const handleLoadWorkflow = (data) => {
            console.log('Editor组件收到加载工作流事件:', data);
            if (data.payload) {
                // 重新加载文档数据
                if (ctx && data.payload.content) {
                    console.log('正在加载工作流内容到编辑器', data.payload.content);
                    // 参考导入功能的实现方式，使用 JSON.parse 和 await

                    ctx.document.reload(data.payload.content)
                        .then(() => {
                            console.log('工作流内容加载完成');
                            ctx.document.fitView();
                        })
                        .catch((error) => {
                            console.error('工作流内容加载失败:', error);
                        });
                }
            }
        };

        // 如果是微前端环境，监听wujie事件
        if (window.$wujie) {
            window.$wujie.bus.$on('loadWorkflow', handleLoadWorkflow);
        }

        // 清理函数
        return () => {
            if (window.$wujie) {
                window.$wujie.bus.$off('loadWorkflow', handleLoadWorkflow);
            }
        };
    }, []);

    return (
        <>
            <Tooltip content={'Import JSON Data And Reload'}>
                <Button
                    disabled={playground.config.readonly}
                    type="tertiary"
                    icon={<IconUpload/>}
                    theme="borderless"
                    onClick={consoleJSON}
                />
            </Tooltip>
            <CodeEditorModal
                value={showData}
                language={'json'}
                visible={showModal}
                onVisibleChange={setShowModal}
                onChange={saveData}
                options={{readOnly: false}}
            />
        </>
    );
};
