/**
 * LanguageToggle — compact button that switches between `zh` and `en`.
 *
 * Reused across Home, Admin, and Editor headers so the user can switch
 * language from anywhere in the app.
 */
import { useLanguage, setLanguage, t } from '../../i18n';

export const LanguageToggle = ({ style }: { style?: React.CSSProperties }) => {
  const lang = useLanguage();
  const next = lang === 'zh' ? 'en' : 'zh';
  const label = lang === 'zh' ? 'EN' : '中文';
  const title = lang === 'zh' ? t('Switch to English') : t('Switch to Chinese');

  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      title={title}
      style={{
        padding: '6px 14px',
        border: '1px solid #e0e0e6',
        borderRadius: 6,
        background: '#fff',
        cursor: 'pointer',
        fontSize: 13,
        color: '#333',
        ...style,
      }}
    >
      {label}
    </button>
  );
};

export default LanguageToggle;
