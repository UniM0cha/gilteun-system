import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// 현재 join된 방 정보를 추적하는 레지스트리 (재연결 시 자동 재입장용)
const roomRegistry = {
  worship: null as { worshipId: string; profileId: string } | null,
  sheet: null as { sheetId: string } | null,
};

export function setWorshipRoom(data: typeof roomRegistry.worship) {
  roomRegistry.worship = data;
}

export function setSheetRoom(data: typeof roomRegistry.sheet) {
  roomRegistry.sheet = data;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    // 재연결 시 이전 방 자동 재입장
    socket.on('connect', () => {
      if (roomRegistry.worship) {
        socket!.emit('join:worship', roomRegistry.worship);
      }
      if (roomRegistry.sheet) {
        socket!.emit('join:sheet', roomRegistry.sheet);
      }
    });
  }
  return socket;
}

export function useSocket() {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const s = socketRef.current;
    if (!s.connected) {
      s.connect();
    }
    return () => {
      // Don't disconnect - singleton shared across components
    };
  }, []);

  return socketRef.current;
}
