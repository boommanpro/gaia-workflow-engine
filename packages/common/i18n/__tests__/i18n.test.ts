import { describe, it, expect } from 'vitest';

import { I18n } from '../src';

describe('i18n', () => {
  it('default', () => {
    expect(I18n.locale).toBe('en-US');
  });
  it('setLocal', () => {
    let changeTimes = 0;
    let dispose = I18n.onLanguageChange((langId) => {
      changeTimes++;
    });
    I18n.locale = 'en-US';
    expect(changeTimes).toEqual(0);
    I18n.locale = 'zh-CN';
    expect(changeTimes).toEqual(1);
    dispose.dispose();
    I18n.locale = 'en-US';
    expect(changeTimes).toEqual(1);
  });
  it('translation', () => {
    expect(I18n.t('Yes')).toEqual('Yes');
    I18n.locale = 'zh-CN';
    expect(I18n.t('Yes')).toEqual('是');
    expect(I18n.t('Unknown')).toEqual('Unknown');
    expect(I18n.t('Unknown', { defaultValue: '' })).toEqual('');
    I18n.addLanguage({
      languageId: 'zh-CN',
      contents: {
        Unknown: '未知',
      },
    });
    expect(I18n.t('Unknown')).toEqual('未知');
    expect(I18n.t('Unknown', { defaultValue: '' })).toEqual('未知');
  });
  it('missingStrictMode', () => {
    I18n.locale = 'en-US';
    I18n.missingStrictMode = true;
    expect(I18n.t('Unknown')).toEqual('[missing "en-US.Unknown" translation]');
    I18n.missingStrictMode = false;
    expect(I18n.t('Unknown')).toEqual('Unknown');
  });
});
