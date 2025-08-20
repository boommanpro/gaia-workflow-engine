'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('./editor').then((module) => module.Editor), { ssr: false });

export const EditorClient = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // only render <Editor /> in browser client
    return null;
  }

  return <Editor />;
};
