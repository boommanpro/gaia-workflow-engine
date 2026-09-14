import React from 'react';

/** 内容型页面（预览 / 版本记录等）需要的可滚动外框 */
const ScrollPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>{children}</div>
);

export default ScrollPage;
