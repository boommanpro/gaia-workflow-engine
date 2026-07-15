import { useState } from 'react';

import { CodeEditorModal } from '../components/code-editor-modal';

export const useModal = (initialContent: string, language: string) => {
  const [content, setContent] = useState(initialContent);
  const [isVisible, setIsVisible] = useState(false);

  const openModal = (newContent: string) => {
    setContent(newContent);
    setIsVisible(true);
  };

  const closeModal = () => {
    setIsVisible(false);
  };

  const modal = (
    <CodeEditorModal
      value={content}
      language={language}
      visible={isVisible}
      onVisibleChange={setIsVisible}
      options={{ readOnly: true }}
    />
  );

  return { openModal, closeModal, modal };
};
