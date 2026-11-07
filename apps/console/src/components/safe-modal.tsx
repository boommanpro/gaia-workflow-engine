/**
 * safe-modal — Semi Modal 关闭链路的确定性防御
 *
 * 背景（2026-11-07 交互审计 A1）：Semi Modal 依赖 CSS animationend 触发弹层卸载，
 * 实测存在「动画已播完但回调未触发」的竞态，导致全屏 .semi-modal-wrap（pointer-events:auto）
 * 永久残留、整页不可点击。本模块从两个层面根除：
 *
 * 1. appConfirm / MOTION_OFF：关闭动画直接去掉（motion=false），Semi 在
 *    componentDidMount/Update 同步完成 onAnimationEnd，不再依赖 animationend 事件。
 * 2. ModalSweeper：兜底清扫器，轮询移除「hide 动画已 finished 且 opacity:0」的孤儿
 *    wrap（挂 App 根部，覆盖未来新增或 Semi 内部使用的 Modal）。
 */
import { useEffect } from 'react';
import { Modal } from '@douyinfe/semi-ui';

type ConfirmProps = Parameters<typeof Modal.confirm>[0];

/** 所有受控 <Modal> 与 appConfirm 共用的关闭策略：无动画 = 无 animationend 依赖 */
export const MOTION_OFF = false as const;

/**
 * Modal.confirm 的安全替代：行为一致，仅关闭动画关闭。
 * 用法：把 `Modal.confirm({...})` 换成 `appConfirm({...})` 即可。
 */
export const appConfirm = (props: ConfirmProps): void => {
  Modal.confirm({ ...props, motion: MOTION_OFF });
};

/** 判定一个 wrap 是否处于「关闭动画终态且内容不可见」的孤儿状态 */
const isOrphanWrap = (wrap: HTMLElement): boolean => {
  // 受控 Modal 的内容挂在 wrap 内；confirm 结构中内容与 mask 是 wrap 的兄弟节点，
  // 因此同时检查 wrap 内部与同级 .semi-modal-content。
  const root = wrap.parentElement ?? wrap;
  const contents = Array.from(root.querySelectorAll<HTMLElement>('.semi-modal-content'));
  if (contents.length === 0) return false;
  return contents.every((content) => {
    const cls = content.className || '';
    if (!cls.includes('animate-hide')) return false;
    if (getComputedStyle(content).opacity !== '0') return false;
    const anims = content.getAnimations();
    // 没拿到动画对象时不冒险移除；全部 finished 才视为终态
    return anims.length > 0 && anims.every((a) => a.playState === 'finished');
  });
};

/** 首次发现终态时打时间戳，下一轮仍在终态（≥1 个扫描周期）才移除，防止误杀 */
const MARK = 'data-gaia-sweep-at';

export const ModalSweeper = (): null => {
  useEffect(() => {
    const id = window.setInterval(() => {
      document.querySelectorAll<HTMLElement>('.semi-modal-wrap').forEach((wrap) => {
        if (!isOrphanWrap(wrap)) {
          wrap.removeAttribute(MARK);
          return;
        }
        const seen = wrap.getAttribute(MARK);
        if (!seen) {
          wrap.setAttribute(MARK, String(Date.now()));
          return;
        }
        // 与 appConfirm/motion=false 路径互不影响：那些弹窗瞬时卸载，不会进入这里
        const host = wrap.closest('.semi-portal') ?? wrap.parentElement ?? wrap;
        // eslint-disable-next-line no-console
        console.warn('[safe-modal] 清理未卸载的 Modal 遮罩（animationend 竞态兜底）');
        host.remove();
      });
    }, 2000);
    return () => window.clearInterval(id);
  }, []);
  return null;
};
