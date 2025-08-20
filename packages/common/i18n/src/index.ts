import { I18n as I18nStore } from 'i18n-js';
import { Emitter } from '@flowgram.ai/utils';

type Scope = Readonly<string | string[]>;

interface TranslateOptions {
  defaultValue?: any;
  [key: string]: any;
}

interface I18nLanguage {
  languageId: string;
  languageName?: string;
  localizedLanguageName?: string;
  contents: Record<string, string | string[]>;
}

import zhCNLanguageDefault from './i18n/zh-CN';
import enUSLanguageDefault from './i18n/en-US';

function getDefaultLanugage(): string {
  if (typeof navigator !== 'object') return 'en-US';
  const defaultLanguage = navigator.language;
  if (defaultLanguage === 'en' || defaultLanguage === 'en-US') {
    return 'en-US';
  }
  if (defaultLanguage === 'zh' || defaultLanguage === 'zh-CN') {
    return 'zh-CN';
  }
  return defaultLanguage;
}
class I18nImpl {
  public i18n = new I18nStore();

  private _onLanguageChangeEmitter = new Emitter<string>();

  readonly onLanguageChange = this._onLanguageChangeEmitter.event;

  constructor(languages: I18nLanguage[]) {
    this.addLanguages(languages);
    this.locale = getDefaultLanugage();
    this.i18n.onChange(() => {
      this._onLanguageChangeEmitter.fire(this.i18n.locale);
    });
  }

  /**
   * missing check
   */
  missingStrictMode = false;

  /**
   * @param key
   * @param options
   */
  t(key: Scope, options?: TranslateOptions): string {
    return this.i18n.t(key, {
      defaultValue: this.missingStrictMode ? undefined : key,
      ...options,
    });
  }

  get locale(): string {
    return this.i18n.locale;
  }

  set locale(locale: string) {
    this.i18n.locale = locale;
  }

  addLanguages(newLanguage: I18nLanguage[]): void {
    this.i18n.store(
      newLanguage.reduce(
        (dict, lang) =>
          Object.assign(dict, {
            [lang.languageId]: {
              languageName: lang.languageName,
              localizedLanguageName: lang.localizedLanguageName,
              ...lang.contents,
            },
          }),
        {}
      )
    );
  }

  addLanguage(language: I18nLanguage) {
    this.addLanguages([language]);
  }
}

const I18n = new I18nImpl([enUSLanguageDefault, zhCNLanguageDefault]);

export { I18n, I18nLanguage };
