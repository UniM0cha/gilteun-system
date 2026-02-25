import { Server, Socket } from 'socket.io';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { profiles, roles } from '../db/schema.js';

interface UserInfo {
  profileId: string;
  name: string;
  role: string;
  roleIcon: string;
  sheetId: string | null;
  socketId: string;
}

// worshipId → Map<socketId, UserInfo>
const presenceMap = new Map<string, Map<string, UserInfo>>();

function broadcastPresence(io: Server, worshipId: string): void {
  const worship = presenceMap.get(worshipId);
  if (!worship) return;

  // 중복 프로필 제거 (같은 프로필 여러 탭)
  const users = Array.from(worship.values());
  io.to(`worship:${worshipId}`).emit('presence:update', {
    worshipId,
    users: users.map(({ profileId, name, role, roleIcon, sheetId }) => ({
      profileId,
      name,
      role,
      roleIcon,
      sheetId,
    })),
  });
}

export function setupPresenceHandler(io: Server, socket: Socket): void {
  // 예배 입장
  socket.on(
    'join:worship',
    (data: { worshipId: string; profileId: string }) => {
      socket.join(`worship:${data.worshipId}`);

      // 유저 정보 조회
      let name = '익명';
      let role = '';
      let roleIcon = '👤';

      try {
        const profile = db
          .select()
          .from(profiles)
          .where(eq(profiles.id, data.profileId))
          .get();
        if (profile) {
          name = profile.name;
          const roleData = db
            .select()
            .from(roles)
            .where(eq(roles.id, profile.roleId))
            .get();
          if (roleData) {
            role = roleData.name;
            roleIcon = roleData.icon;
          }
        }
      } catch (error) {
        console.error('[Presence] Failed to load profile:', error);
      }

      if (!presenceMap.has(data.worshipId)) {
        presenceMap.set(data.worshipId, new Map());
      }
      presenceMap.get(data.worshipId)!.set(socket.id, {
        profileId: data.profileId,
        name,
        role,
        roleIcon,
        sheetId: null,
        socketId: socket.id,
      });

      // socket 데이터에 worshipId 저장 (disconnect 시 정리용)
      (socket as unknown as { _worshipId?: string })._worshipId = data.worshipId;

      broadcastPresence(io, data.worshipId);
    },
  );

  // 예배 퇴장
  socket.on('leave:worship', (data: { worshipId: string }) => {
    socket.leave(`worship:${data.worshipId}`);
    const worship = presenceMap.get(data.worshipId);
    if (worship) {
      worship.delete(socket.id);
      if (worship.size === 0) {
        presenceMap.delete(data.worshipId);
      }
    }
    broadcastPresence(io, data.worshipId);
  });

  // 현재 보고 있는 페이지 변경
  socket.on(
    'page:change',
    (data: { worshipId: string; sheetId: string }) => {
      const worship = presenceMap.get(data.worshipId);
      if (worship) {
        const user = worship.get(socket.id);
        if (user) {
          user.sheetId = data.sheetId;
          broadcastPresence(io, data.worshipId);
        }
      }
    },
  );

  // 페이지 호출 (스포트라이트)
  socket.on(
    'page:spotlight',
    (data: {
      worshipId: string;
      sheetId: string;
      sheetTitle: string;
      profileId: string;
    }) => {
      const worship = presenceMap.get(data.worshipId);
      let senderName = '익명';
      let senderRole = '';
      if (worship) {
        const user = worship.get(socket.id);
        if (user) {
          senderName = user.name;
          senderRole = user.role;
        }
      }

      socket.to(`worship:${data.worshipId}`).emit('page:spotlight', {
        sheetId: data.sheetId,
        sheetTitle: data.sheetTitle,
        senderName,
        senderRole,
      });
    },
  );

  // 연결 해제 시 정리
  socket.on('disconnect', () => {
    const worshipId = (socket as unknown as { _worshipId?: string })._worshipId;
    if (worshipId) {
      const worship = presenceMap.get(worshipId);
      if (worship) {
        worship.delete(socket.id);
        if (worship.size === 0) {
          presenceMap.delete(worshipId);
        }
        broadcastPresence(io, worshipId);
      }
    }
  });
}
