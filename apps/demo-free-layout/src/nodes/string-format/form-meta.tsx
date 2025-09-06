/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {FormMeta, FormRenderProps} from '@flowgram.ai/free-layout-editor';
import {createInferInputsPlugin, DisplayOutputs} from '@flowgram.ai/form-materials';

import {FormContent, FormHeader} from '../../form-components';
import {CodeNodeJSON} from './types';
import {Inputs} from './components/inputs';
import {Code} from './components/code';
import {defaultFormMeta} from '../default-form-meta';
import {Divider} from "@douyinfe/semi-ui";

export const FormRender = ({form}: FormRenderProps<CodeNodeJSON>) => (
    <>
        <FormHeader/>
        <FormContent>
            <Inputs/>
            <Code/>
            <Divider />
            <DisplayOutputs displayFromScope/>
        </FormContent>
    </>
);

export const formMeta: FormMeta = {
    render: (props) => <FormRender {...props} />,
    effect: defaultFormMeta.effect,
    validate: defaultFormMeta.validate,
    plugins: [createInferInputsPlugin({sourceKey: 'inputsValues', targetKey: 'inputs'})],
};
