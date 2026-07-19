import { useState, useCallback } from 'react';

import Label from '@douyinfe/semi-ui/lib/es/form/label';
import { Button } from '@douyinfe/semi-ui';
import { IconCode } from '@douyinfe/semi-icons';

import { CodeEditorModal } from '../code-editor-modal';

export const CodeEditorField = ({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (value: string) => void;
  language: string;
}) => {
  const [visible, setVisible] = useState(false);

  const showDialog = useCallback(() => setVisible(true), []);
  const handleCancel = useCallback(() => setVisible(false), []);

  const handleOk = useCallback(() => {
    setVisible(false);
  }, [onChange]);

  return (
    <>
      <Label>
        code:
        <Button icon={<IconCode />} style={{ marginLeft: '8px' }} onClick={showDialog}>
          Editor
        </Button>
      </Label>
      <CodeEditorModal
        value={value}
        onChange={onChange}
        language={language}
        visible={visible}
        handleCancel={handleCancel}
        handleOk={handleOk}
      />
    </>
  );
};
