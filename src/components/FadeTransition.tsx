'use client';

import { useEffect, useState, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  transitionKey: string;
}

export default function FadeTransition({ children, transitionKey }: Props) {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState(children);

  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => {
      setContent(children);
      setVisible(true);
    }, 150);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitionKey]);

  // On first mount, show immediately
  useEffect(() => {
    setContent(children);
    setVisible(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {content}
    </div>
  );
}
