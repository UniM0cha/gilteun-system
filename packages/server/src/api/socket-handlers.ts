import { Server as SocketIOServer, Socket } from 'socket.io';
import type { 
  Command, 
  DrawingData, 
  PageNavigation, 
  UserSession 
} from '@gilteun/shared';

// Socket.IO 이벤트 리스트 (문서화)
// - user:join: 사용자 예배 참가
// - score:page-change: 악보 페이지 변경  
// - score:drawing: 드로잉 데이터 전송
// - command:send: 명령 전송
// - command:received: 명령 수신
// - score:sync: 악보 동기화
// - users:update: 사용자 목록 업데이트
// - page:update: 페이지 변경 알림

// 연결된 사용자 세션 관리
const connectedUsers = new Map<string, UserSession>();

export function setupSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`클라이언트 연결됨: ${socket.id}`);

    // 사용자 입장
    socket.on('user:join', (data: { userId: string; worshipId: string }) => {
      const userSession: UserSession = {
        userId: data.userId,
        worshipId: data.worshipId,
        currentPage: 1,
        isOnline: true,
        lastSeen: new Date(),
      };

      // 사용자 세션 저장
      connectedUsers.set(socket.id, userSession);
      
      // 해당 예배 룸에 참가
      socket.join(`worship:${data.worshipId}`);
      
      // 다른 사용자들에게 새 사용자 알림
      socket.to(`worship:${data.worshipId}`).emit('users:update', 
        Array.from(connectedUsers.values()).filter(user => user.worshipId === data.worshipId)
      );

      console.log(`사용자 ${data.userId}가 예배 ${data.worshipId}에 참가했습니다.`);
    });

    // 악보 페이지 변경
    socket.on('score:page-change', (data: { page: number; userId: string }) => {
      const userSession = connectedUsers.get(socket.id);
      if (!userSession) return;

      // 사용자 세션 업데이트
      userSession.currentPage = data.page;
      userSession.lastSeen = new Date();
      connectedUsers.set(socket.id, userSession);

      const pageNavigation: PageNavigation = {
        scoreId: 'current', // TODO: 실제 scoreId 사용
        pageNumber: data.page,
        userId: data.userId,
        timestamp: new Date(),
      };

      // 같은 예배의 다른 사용자들에게 페이지 변경 알림
      socket.to(`worship:${userSession.worshipId}`).emit('page:update', pageNavigation);
    });

    // 드로잉 데이터 동기화
    socket.on('score:drawing', (data: DrawingData) => {
      const userSession = connectedUsers.get(socket.id);
      if (!userSession) return;

      // TODO: 데이터베이스에 드로잉 저장
      
      // 같은 예배의 다른 사용자들에게 드로잉 동기화
      socket.to(`worship:${userSession.worshipId}`).emit('score:sync', {
        scoreId: data.scoreId,
        drawings: [data], // TODO: 전체 드로잉 데이터 조회
      });
    });

    // 명령 전송
    socket.on('command:send', (data: Omit<Command, 'id' | 'timestamp' | 'expiresAt'>) => {
      const userSession = connectedUsers.get(socket.id);
      if (!userSession) return;

      const command: Command = {
        ...data,
        id: generateId(),
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 3000), // 3초 후 만료
      };

      // 대상에 따라 명령 전송
      if (data.target === 'all') {
        // 전체 예배 참가자에게 전송
        io.to(`worship:${userSession.worshipId}`).emit('command:received', command);
      } else {
        // TODO: 특정 그룹에게만 전송 로직 구현
        socket.to(`worship:${userSession.worshipId}`).emit('command:received', command);
      }

      console.log(`명령 전송: ${data.content} (발신자: ${data.senderName})`);
    });

    // 연결 해제
    socket.on('disconnect', () => {
      const userSession = connectedUsers.get(socket.id);
      if (userSession) {
        // 사용자 세션 제거
        connectedUsers.delete(socket.id);
        
        // 다른 사용자들에게 사용자 퇴장 알림
        socket.to(`worship:${userSession.worshipId}`).emit('users:update',
          Array.from(connectedUsers.values()).filter(user => user.worshipId === userSession.worshipId)
        );

        console.log(`사용자 ${userSession.userId}가 연결을 해제했습니다.`);
      }
    });
  });
}

// 간단한 ID 생성 함수
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}