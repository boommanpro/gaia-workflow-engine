/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import './field-wrapper.css';

interface FieldWrapperProps {
  required?: boolean;
  title?: string;
  children?: React.ReactNode;
  error?: string;
  note?: string;
}

export const FieldWrapper = ({ required, title, children, error, note }: FieldWrapperProps) => (
  <div className="field-wrapper">
    <div className="field-title">
      {title}
      {note ? <p className="field-note">{note}</p> : null}
      {required ? <span className="required">*</span> : null}
    </div>
    {children}
    <p className="error-message">{error}</p>
    {note ? <br /> : null}
  </div>
);
