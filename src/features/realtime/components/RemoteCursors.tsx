// 다른 사용자 커서 표시 컴포넌트

import { useMemo } from 'react';
import type { RemoteCursor } from '../types';

interface RemoteCursorsProps {
  cursors: Map<string, RemoteCursor>;
}

export function RemoteCursors({ cursors }: RemoteCursorsProps) {
  const cursorList = useMemo(() => Array.from(cursors.values()), [cursors]);

  if (cursorList.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {cursorList.map((cursor) => (
        <div
          key={cursor.profileId}
          className="absolute transition-all duration-75 ease-out"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* 커서 아이콘 */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5.65376 12.4561L5.65376 5.65376L12.4561 12.4561L8.43768 12.4561L5.65376 12.4561Z"
              fill={cursor.profileColor}
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>

          {/* 사용자 이름 */}
          <span
            className="absolute left-4 top-4 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: cursor.profileColor }}
          >
            {cursor.profileName}
          </span>
        </div>
      ))}
    </div>
  );
}

export default RemoteCursors;
