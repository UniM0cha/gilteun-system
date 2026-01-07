// Room 관리자 (songId 기반)

import type { WebSocket } from 'ws';
import type { ConnectedClient, Room, ParticipantInfo, ServerToClientEvent } from './types.js';

export class RoomManager {
  // songId -> Room
  private rooms: Map<string, Room> = new Map();
  // ws -> profileId (역방향 매핑)
  private wsToProfile: Map<WebSocket, string> = new Map();
  // profileId -> ConnectedClient
  private clients: Map<string, ConnectedClient> = new Map();

  // 클라이언트 등록 (join)
  join(
    ws: WebSocket,
    profileId: string,
    profileName: string,
    profileColor: string,
    songId: string
  ): ParticipantInfo[] {
    // 기존 연결이 있으면 정리
    const existingClient = this.clients.get(profileId);
    if (existingClient) {
      this.leave(existingClient.ws);
    }

    // 새 클라이언트 생성
    const client: ConnectedClient = {
      ws,
      profileId,
      profileName,
      profileColor,
      songId,
      lastActivity: Date.now(),
    };

    // 등록
    this.clients.set(profileId, client);
    this.wsToProfile.set(ws, profileId);

    // Room 생성 또는 참가
    let room = this.rooms.get(songId);
    if (!room) {
      room = { songId, clients: new Map() };
      this.rooms.set(songId, room);
    }
    room.clients.set(profileId, client);

    // 기존 참여자 목록 반환
    const participants: ParticipantInfo[] = [];
    room.clients.forEach((c) => {
      if (c.profileId !== profileId) {
        participants.push({
          profileId: c.profileId,
          profileName: c.profileName,
          profileColor: c.profileColor,
        });
      }
    });

    // 다른 참여자들에게 알림
    this.broadcastToRoom(songId, profileId, {
      type: 'participant:joined',
      participant: { profileId, profileName, profileColor },
    });

    return participants;
  }

  // 클라이언트 퇴장 (leave)
  leave(ws: WebSocket): void {
    const profileId = this.wsToProfile.get(ws);
    if (!profileId) return;

    const client = this.clients.get(profileId);
    if (!client || !client.songId) return;

    const room = this.rooms.get(client.songId);
    if (room) {
      room.clients.delete(profileId);

      // Room이 비면 삭제
      if (room.clients.size === 0) {
        this.rooms.delete(client.songId);
      } else {
        // 다른 참여자들에게 알림
        this.broadcastToRoom(client.songId, profileId, {
          type: 'participant:left',
          profileId,
        });
      }
    }

    this.clients.delete(profileId);
    this.wsToProfile.delete(ws);
  }

  // WebSocket으로 클라이언트 조회
  getClientByWs(ws: WebSocket): ConnectedClient | undefined {
    const profileId = this.wsToProfile.get(ws);
    if (!profileId) return undefined;
    return this.clients.get(profileId);
  }

  // 프로필 ID로 클라이언트 조회
  getClientByProfileId(profileId: string): ConnectedClient | undefined {
    return this.clients.get(profileId);
  }

  // Room의 모든 클라이언트 조회
  getRoomClients(songId: string): ConnectedClient[] {
    const room = this.rooms.get(songId);
    if (!room) return [];
    return Array.from(room.clients.values());
  }

  // Room 내 다른 클라이언트들에게 브로드캐스트
  broadcastToRoom(songId: string, excludeProfileId: string, event: ServerToClientEvent): void {
    const room = this.rooms.get(songId);
    if (!room) return;

    const message = JSON.stringify(event);
    room.clients.forEach((client) => {
      if (client.profileId !== excludeProfileId && client.ws.readyState === 1) {
        client.ws.send(message);
      }
    });
  }

  // Room 내 모든 클라이언트에게 브로드캐스트 (자신 포함)
  broadcastToRoomAll(songId: string, event: ServerToClientEvent): void {
    const room = this.rooms.get(songId);
    if (!room) return;

    const message = JSON.stringify(event);
    room.clients.forEach((client) => {
      if (client.ws.readyState === 1) {
        client.ws.send(message);
      }
    });
  }

  // 특정 클라이언트에게 메시지 전송
  sendTo(profileId: string, event: ServerToClientEvent): void {
    const client = this.clients.get(profileId);
    if (client && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(event));
    }
  }

  // 활성 Room 수
  getRoomCount(): number {
    return this.rooms.size;
  }

  // 전체 클라이언트 수
  getClientCount(): number {
    return this.clients.size;
  }

  // 클라이언트 활동 시간 갱신
  updateActivity(ws: WebSocket): void {
    const client = this.getClientByWs(ws);
    if (client) {
      client.lastActivity = Date.now();
    }
  }

  // 비활성 클라이언트 정리 (timeout 기준)
  cleanupInactive(timeoutMs: number = 60000): void {
    const now = Date.now();
    this.clients.forEach((client) => {
      if (now - client.lastActivity > timeoutMs) {
        this.leave(client.ws);
        client.ws.close();
      }
    });
  }
}

// 싱글톤
export const roomManager = new RoomManager();
