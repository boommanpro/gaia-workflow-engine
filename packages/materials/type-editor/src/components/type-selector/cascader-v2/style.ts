/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled, { createGlobalStyle } from 'styled-components';
import { Typography } from '@douyinfe/semi-ui';

export const StyledFullContainer = styled.div`
  width: 100%;
  height: 100%;
`;

export const CustomCascaderContainer = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

export const CascaderContainer = styled(StyledFullContainer)`
  position: relative;
`;

export const TriggerText = styled.div`
  display: flex;
  width: 100%;
`;

export const CascaderDropdown = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
`;

export const TriggerGlobalStyle = createGlobalStyle`
  .semi-cascader-selection {
    font-size: 12px !important;

    svg {
      width: 12px;
      height: 12px;
    }
  }
`;

export const CascaderOptionItem = styled.li<{ focus?: boolean }>`
  ${(props) => (props.focus ? 'background-color: var(--semi-color-fill-0)' : '')}
`;

export const DropdownGlobalStyle = createGlobalStyle`
  .semi-cascader-option-lists {
    max-width: 510px;
    overflow-x: auto;
    height: auto;


    .semi-cascader-option-list {
    width: 150px;
    flex-shrink: 0;
    border-left: none;
    border-right: 1px solid var(--semi-color-fill-0);

    max-height: 50vh;

    ::-webkit-scrollbar {
      width: 0;
      height: 0;
    }

    .semi-cascader-option {
      font-size: 12px !important;
      width: 100%;
      padding: 6px 12px;
      cursor: pointer;
      box-sizing: border-box;

      svg {
        width: 12px;
        height: 12px;
      }
    }
  }


    .semi-cascader-option-disabled {
      cursor: not-allowed;
    }

  }

  .semi-cascader-option-icon {
    margin-right:8px;
  }

  .semi-cascader-option-icon-empty {
    margin-right: 0;
  }

`;

export const StyledSearchList = styled.ul`
  &::-webkit-scrollbar {
    display: none;
  }
  width: 100%;
  height: 100%;
`;

export const TypeSearchText = styled(Typography.Text)`
  padding: 8px 12px;
`;

export const TextGlobalStyle = createGlobalStyle`
  .semi-typography {
    color: unset !important;
  }

`;
export const SearchText = styled.span<{
  disabled?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  width: 100%;
  gap: 8px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  ${(props) => (props.disabled ? 'color: var(--semi-color-disabled-text);' : '')};
`;

export const SearchIcon = styled.span`
  display: inline-flex;
  align-items: center;

  svg {
    width: 12px;
    height: 12px;
  }
`;
