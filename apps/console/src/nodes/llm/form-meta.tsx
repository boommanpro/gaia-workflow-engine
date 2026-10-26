/**
 * LLM 节点表单：六字段输入 + 输出模式切换 + json 模式的输出声明编辑。
 *
 * outputMode（2026-10-25）：text=固定输出 result 字符串（默认）；json=结构化输出——
 * outputs.properties 声明的字段即运行时输出（引擎把模型 JSON 解析成声明字段，
 * 机制与 code 节点一致，下游可直接引用 llm_x.<字段>）。
 * 切回 text 时旧声明暂不清除（落库时后端 normalize 压回固定 result）。
 *
 * 模型凭证（modelName / apiHost / apiKey，2026-10-26）：必填（契约 x-gaia-form-inputs.required），
 * 表单打开时空位自动带入平台默认模型——与 AI 生成节点取值同源（/api/agent/models/node-default），
 * 手动节点和 AI 节点形状一致；原先顶部那条「由 AI 自动填入 / 手动请自行填写」说明随之撤掉。
 */
import { useEffect } from 'react';
import { Field, FormMeta, FormRenderProps } from '@flowgram.ai/free-layout-editor';
import { Divider, RadioGroup } from '@douyinfe/semi-ui';

import { defaultFormMeta } from '../default-form-meta';
import { Outputs } from '../code/components/outputs';
import { FormHeader, FormContent, FormInputs } from '../../form-components';
import { formInputOrderOf } from '../../agent/node-templates';
import { useNodeRenderContext } from '../../hooks';
import { LLM_CREDENTIAL_KEYS, isBlankCredential, loadPlatformLlmDefault } from './platform-default';

/** 表单行序以契约声明顺序为准（存量数据键序不可控） */
const LLM_FORM_INPUT_ORDER = formInputOrderOf('llm');

/**
 * 空凭证位预填平台默认：只填打开时为空的位，用户已填/AI 已填的一律不动；
 * 只读（历史版本查看等）不写。
 */
function usePlatformCredentialPrefill(form: FormRenderProps<any>['form']) {
  const { readonly } = useNodeRenderContext();
  useEffect(() => {
    if (readonly) return;
    const missing = LLM_CREDENTIAL_KEYS.filter((key) =>
      isBlankCredential(form.getValueIn(`inputsValues.${key}`))
    );
    if (missing.length === 0) return;
    let cancelled = false;
    void loadPlatformLlmDefault().then((defaults) => {
      if (cancelled || !defaults) return;
      for (const key of missing) {
        const value = defaults[key];
        // 请求在途期间用户可能已手填：再查一次空位
        if (!value || !isBlankCredential(form.getValueIn(`inputsValues.${key}`))) continue;
        form.setValueIn(`inputsValues.${key}`, { type: 'constant', content: value });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [form, readonly]);
}

/** 输出模式切换 + json 模式下的输出声明编辑器（复用 code 的 Outputs 组件，字段同为 outputs） */
function OutputModeSwitch() {
  return (
    <Field<string> name="outputMode" defaultValue="text">
      {({ field }) => (
        <>
          <Divider />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>输出模式</span>
            <RadioGroup
              type="button"
              buttonSize="small"
              value={field.value || 'text'}
              onChange={(e) => field.onChange(e.target.value as string)}
              options={[
                { label: '文本', value: 'text' },
                { label: 'JSON', value: 'json' },
              ]}
            />
            <span style={{ fontSize: 11, color: 'rgba(107,114,128,1)' }}>
              {(field.value || 'text') === 'json'
                ? '模型输出 JSON，按下方声明字段供下游引用'
                : '输出固定 result 字符串'}
            </span>
          </div>
          {(field.value || 'text') === 'json' && <Outputs />}
        </>
      )}
    </Field>
  );
}

export const FormRender = ({ form }: FormRenderProps<any>) => {
  usePlatformCredentialPrefill(form);
  return (
    <>
      <FormHeader />
      <FormContent>
        <FormInputs order={LLM_FORM_INPUT_ORDER} />
        <OutputModeSwitch />
      </FormContent>
    </>
  );
};

export const formMeta: FormMeta = {
  render: (props) => <FormRender {...props} />,
  effect: defaultFormMeta.effect,
  validate: defaultFormMeta.validate,
};
