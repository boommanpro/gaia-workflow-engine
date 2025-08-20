/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { LlmsContainer, LlmsCopyButton, LlmsViewOptions } from '@rspress/plugin-llms/runtime';
import { getCustomMDXComponent as basicGetCustomMDXComponent } from '@rspress/core/theme';

function getCustomMDXComponent() {
  const { h1: H1, ...components } = basicGetCustomMDXComponent();

  const MyH1 = ({ ...props }) => (
    <>
      <H1 {...props} />
      <LlmsContainer>
        <LlmsCopyButton />
        <LlmsViewOptions />
      </LlmsContainer>
    </>
  );
  return {
    ...components,
    h1: MyH1,
  };
}

export { getCustomMDXComponent };
export * from '@rspress/core/theme';
