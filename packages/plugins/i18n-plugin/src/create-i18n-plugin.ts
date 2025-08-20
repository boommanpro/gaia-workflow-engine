import { I18n, type I18nLanguage } from '@flowgram.ai/i18n';
import { definePluginCreator } from '@flowgram.ai/core';

export interface I18nPluginOptions {
  locale?: string;
  /**
   * use `locale` instead
   * @deprecated
   */
  localLanguage?: string;
  /**
   * if missingStrictMode is true
   *  expect(I18n.t('Unknown')).toEqual('[missing "en-US.Unknown" translation]')
   * else
   *  expect(I18n.t('Unknown')).toEqual('Unknown')
   */
  missingStrictMode?: boolean;
  languages?: I18nLanguage[] | Record<string, Record<string, any>>;
  onLanguageChange?: (languageId: string) => void;
}
/**
 * I18n Plugin
 */
export const createI18nPlugin = definePluginCreator<I18nPluginOptions>({
  onInit: (ctx, _opts) => {
    if (_opts.onLanguageChange) {
      ctx.playground.toDispose.push(I18n.onLanguageChange(_opts.onLanguageChange));
    }
    if (_opts.languages) {
      if (Array.isArray(_opts.languages)) {
        I18n.addLanguages(_opts.languages);
      } else {
        I18n.addLanguages(
          Object.keys(_opts.languages).map((key) => ({
            languageId: key,
            contents: (_opts.languages as any)![key],
          }))
        );
      }
    }
    if (_opts.locale || _opts.localLanguage) {
      I18n.locale = (_opts.locale || _opts.localLanguage)!;
    }
  },
});
