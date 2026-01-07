// 실시간 협업 기능 export

export { useWebSocket } from './hooks/useWebSocket';
export { ConnectionStatus } from './components/ConnectionStatus';
export { RemoteCursors } from './components/RemoteCursors';
export { RemoteStrokes } from './components/RemoteStrokes';
export { pointsToPath, pointsToSmoothPath } from './utils/pointsToPath';
export type {
  ConnectionStatus as ConnectionStatusType,
  Participant,
  RemoteCursor,
  RemoteStroke,
  StrokePoint,
  ClientEvent,
  ServerEvent,
} from './types';
