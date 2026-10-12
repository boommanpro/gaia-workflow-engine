/**
 * LanguageToggle — 语言切换（暂缓开放）。
 *
 * 中文体验是当前唯一打磨目标：两套文案来回切换的维护成本高、翻译质量不可控，
 * 切换入口先统一显示「待实现」，等中文效果稳定后再放开。
 */
import { useLanguage, t } from '../../i18n';

export const LanguageToggle = ({ style }: { style?: React.CSSProperties }) => {
  useLanguage(); // 订阅语言变化（当前恒为 zh）
  return (
    <button
      type="button"
      disabled
      title={t('shell.langPendingTitle')}
      style={{
        padding: '6px 14px',
        border: '1px solid #e0e0e6',
        borderRadius: 6,
        background: '#fafafa',
        cursor: 'not-allowed',
        fontSize: 13,
        color: '#aaa',
        opacity: 0.75,
        ...style,
      }}
    >
      {t('shell.langPending')}
    </button>
  );
};

export default LanguageToggle;
