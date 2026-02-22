import { Server, Socket } from 'socket.io';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { commands, profiles, roles } from '../db/schema.js';

export function setupCommandHandler(io: Server, socket: Socket): void {
  socket.on(
    'command:send',
    (data: { worshipId: string; commandId: string; profileId: string }) => {
      try {
        const command = db
          .select()
          .from(commands)
          .where(eq(commands.id, data.commandId))
          .get();
        if (!command) return;

        const profile = db
          .select()
          .from(profiles)
          .where(eq(profiles.id, data.profileId))
          .get();

        let senderName = '익명';
        let senderRole = '';
        let senderRoleIcon = '👤';

        if (profile) {
          senderName = profile.name;
          const role = db
            .select()
            .from(roles)
            .where(eq(roles.id, profile.roleId))
            .get();
          if (role) {
            senderRole = role.name;
            senderRoleIcon = role.icon;
          }
        }

        io.to(`worship:${data.worshipId}`).emit('command:received', {
          commandId: data.commandId,
          emoji: command.emoji,
          label: command.label,
          senderName,
          senderRole,
          senderRoleIcon,
        });
      } catch (error) {
        console.error('[Command] Failed to send command:', error);
      }
    },
  );
}
