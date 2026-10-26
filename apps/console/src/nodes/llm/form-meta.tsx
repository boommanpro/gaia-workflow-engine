/**
 * LLM 节点表单：六字段输入 + 输出模式切换 + json 模式的输出声明编辑。
 *
 * outputMode（2026-10-25）：text=固定输出 result 字符串（默认）；json=结构化输出——
 * outputs.properties 声明的字段即运行时输出（引擎把模型 JSON 解析成声明字段，
 * 机制与 code 节点一致，下游可直接引用 llm_x.<字段>）。
 * 切回 text 时旧声明暂不清除（落库时后端 normalize 压回固定 result）。
 */
import { Field, FormMeta, FormRenderProps } from '@flowgram.ai/free-layout-editor';
import { Divider, RadioGroup } from '@douyinfe/semi-ui';

import { defaultFormMeta } from '../default-form-meta';
import { Outputs } from '../code/components/outputs';
import { FormHeader, FormContent, FormInputs } from '../../form-components';

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

export const FormRender = ({ form }: FormRenderProps<any>) => (
  <>
    <FormHeader />
    <FormContent>
      {/* 凭证三字段留空是设计内行为（平台运行时注入），但空输入框会被理解为「没配置完」——
          显式说明（2026-10-25 用户反馈） */}
      <div
        style={{
          margin: '0 0 8px',
          padding: '6px 10px',
          borderRadius: 6,
          background: 'rgba(77,83,232,0.06)',
          border: '1px solid rgba(77,83,232,0.18)',
          fontSize: 11,
          lineHeight: 1.6,
          color: 'rgba(77,83,232,0.9)',
        }}
      >
        apiKey / apiHost / modelName 由 AI 生成时自动填入平台默认模型配置（表单可见、随草稿保存）；
        手动创建的节点请自行填写（与「模型配置」页一致），缺失会导致运行失败。
      </div>
      <FormInputs />
      <OutputModeSwitch />
    </FormContent>
  </>
);

export const formMeta: FormMeta = {
  render: (props) => <FormRender {...props} />,
  effect: defaultFormMeta.effect,
  validate: defaultFormMeta.validate,
};
