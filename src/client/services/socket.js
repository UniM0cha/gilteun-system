import { io } from 'socket.io-client';
export class SocketService {
    constructor(serverUrl = 'http://localhost:3001') {
        this.socket = null;
        this.isConnected = false;
        this.serverUrl = serverUrl;
    }
    connect() {
        return new Promise((resolve, reject) => {
            if (this.socket?.connected) {
                resolve();
                return;
            }
            this.socket = io(this.serverUrl, {
                transports: ['websocket', 'polling'],
                timeout: 5000,
            });
            this.socket.on('connect', () => {
                console.log('서버에 연결되었습니다:', this.socket?.id);
                this.isConnected = true;
                resolve();
            });
            this.socket.on('disconnect', (reason) => {
                console.log('서버 연결이 해제되었습니다:', reason);
                this.isConnected = false;
            });
            this.socket.on('connect_error', (error) => {
                console.error('서버 연결 오류:', error);
                this.isConnected = false;
                reject(error);
            });
        });
    }
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }
    // 예배 참가
    joinWorship(userId, worshipId) {
        this.emit('user:join', { userId, worshipId });
    }
    // 페이지 변경 알림
    changePageNotify(page, userId) {
        this.emit('score:page-change', { page, userId });
    }
    // 드로잉 데이터 전송
    sendDrawing(drawingData) {
        this.emit('score:drawing', drawingData);
    }
    // 실시간 드로잉 이벤트 전송
    sendDrawingEvent(drawingEvent) {
        this.emit('drawing:event', drawingEvent);
    }
    // 명령 전송
    sendCommand(command) {
        this.emit('command:send', command);
    }
    // 이벤트 리스너 등록
    onCommandReceived(callback) {
        this.on('command:received', callback);
    }
    onScoreSync(callback) {
        this.on('score:sync', callback);
    }
    onUsersUpdate(callback) {
        this.on('users:update', callback);
    }
    onPageUpdate(callback) {
        this.on('page:update', callback);
    }
    onDrawingReceived(callback) {
        this.on('drawing:received', callback);
    }
    // 이벤트 리스너 제거
    offCommandReceived(callback) {
        this.off('command:received', callback);
    }
    offScoreSync(callback) {
        this.off('score:sync', callback);
    }
    offUsersUpdate(callback) {
        this.off('users:update', callback);
    }
    offPageUpdate(callback) {
        this.off('page:update', callback);
    }
    offDrawingReceived(callback) {
        this.off('drawing:received', callback);
    }
    // 연결 상태 확인
    get connected() {
        return this.isConnected && this.socket?.connected === true;
    }
    // Private 헬퍼 메서드
    emit(event, data) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        }
        else {
            console.warn(`Socket not connected. Cannot emit event: ${event}`);
        }
    }
    on(event, callback) {
        this.socket?.on(event, callback);
    }
    off(event, callback) {
        this.socket?.off(event, callback);
    }
}
// 싱글톤 인스턴스
let socketInstance = null;
export const getSocketService = () => {
    if (!socketInstance) {
        socketInstance = new SocketService();
    }
    return socketInstance;
};
