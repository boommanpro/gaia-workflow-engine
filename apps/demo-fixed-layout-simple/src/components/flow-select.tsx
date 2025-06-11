import { useEffect, useState } from 'react';

import { useClientContext, FlowLayoutDefault } from '@flowgram.ai/fixed-layout-editor';

import { FLOW_LIST } from '../data';

const url = new window.URL(window.location.href);

export function FlowSelect() {
  const [demoKey, updateDemoKey] = useState(url.searchParams.get('demo') ?? 'condition');
  const clientContext = useClientContext();
  useEffect(() => {
    const targetDemoJSON = FLOW_LIST[demoKey];
    if (targetDemoJSON) {
      clientContext.history.stop(); // Stop redo/undo
      clientContext.history.clear(); // Clear redo/undo
      clientContext.document.fromJSON(targetDemoJSON); // Reload Data
      console.log(clientContext.document.toString(true)); // Print the document tree
      clientContext.history.start(); // Restart redo/undo
      clientContext.document.setLayout(
        targetDemoJSON.defaultLayout || FlowLayoutDefault.VERTICAL_FIXED_LAYOUT
      );
      // Update URL
      if (url.searchParams.get('demo')) {
        url.searchParams.set('demo', demoKey);
        window.history.pushState({}, '', `/?${url.searchParams.toString()}`);
      }
      // Fit View
      setTimeout(() => {
        clientContext.playground.config.fitView(clientContext.document.root.bounds, true, 40);
      }, 20);
    }
  }, [demoKey]);
  return (
    <div style={{ position: 'absolute', zIndex: 100 }}>
      <label style={{ marginRight: 12 }}>Select Demo:</label>
      <select
        style={{ width: '180px', height: '32px', fontSize: 16 }}
        onChange={(e) => updateDemoKey(e.target.value)}
        value={demoKey}
      >
        {Object.keys(FLOW_LIST).map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </div>
  );
}
