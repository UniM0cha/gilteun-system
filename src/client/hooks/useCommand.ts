import { useCallback, useEffect, useState } from 'react';
import { getSocketService } from '@/services/socket';
import type { Command, CommandTarget, CommandTemplate } from '@shared/types/command';

interface UseCommandProps {
  userId: string;
  userName: string;
  userInstrument: string;
  isConnected: boolean;
}

export const useCommand = ({ userId, userName, userInstrument, isConnected }: UseCommandProps) => {
  const [commands, setCommands] = useState<Command[]>([]);
  const [commandTemplates, setCommandTemplates] = useState<CommandTemplate[]>([]);

  const socketService = getSocketService();

  // 명령 수신 처리
  const handleCommandReceived = useCallback((command: Command) => {
    setCommands((prev) => {
      // 중복 명령 방지
      const exists = prev.some((cmd) => cmd.id === command.id);
      if (exists) return prev;

      // 최신 명령을 앞에 추가 (최대 10개까지 유지)
      return [command, ...prev].slice(0, 10);
    });
  }, []);

  // Socket 이벤트 리스너 등록
  useEffect(() => {
    if (!isConnected) return;

    socketService.onCommandReceived(handleCommandReceived);

    return () => {
      socketService.offCommandReceived(handleCommandReceived);
    };
  }, [isConnected, handleCommandReceived, socketService]);

  // 명령 전송
  const sendCommand = useCallback(
    (commandData: { content: string; icon?: string; target: CommandTarget }) => {
      if (!isConnected) {
        console.warn('서버에 연결되지 않아 명령을 전송할 수 없습니다.');
        return;
      }

      const command = {
        content: commandData.content,
        icon: commandData.icon,
        senderId: userId,
        senderName: userName,
        senderInstrument: userInstrument,
        target: commandData.target,
      };

      socketService.sendCommand(command);
    },
    [isConnected, userId, userName, userInstrument, socketService]
  );

  // 명령 만료 처리
  const expireCommand = useCallback((commandId: string) => {
    setCommands((prev) => prev.filter((cmd) => cmd.id !== commandId));
  }, []);

  // 현재 활성 명령만 필터링 (3초 이내)
  const getActiveCommands = useCallback(() => {
    const now = Date.now();
    return commands.filter((command) => {
      const commandTime = new Date(command.timestamp).getTime();
      return now - commandTime < 3500; // 여유시간 500ms 추가
    });
  }, [commands]);

  // 명령 템플릿 로드 (localStorage에서)
  const loadCommandTemplates = useCallback(() => {
    try {
      const saved = localStorage.getItem(`command-templates-${userId}`);
      if (saved) {
        const templates = JSON.parse(saved) as CommandTemplate[];
        setCommandTemplates(templates);
      }
    } catch (error) {
      console.error('명령 템플릿 로드 실패:', error);
      setCommandTemplates([]);
    }
  }, [userId]);

  // 명령 템플릿 저장
  const saveCommandTemplates = useCallback(
    (templates: CommandTemplate[]) => {
      try {
        localStorage.setItem(`command-templates-${userId}`, JSON.stringify(templates));
        setCommandTemplates(templates);
      } catch (error) {
        console.error('명령 템플릿 저장 실패:', error);
      }
    },
    [userId]
  );

  // 새 템플릿 추가
  const addCommandTemplate = useCallback(
    (template: Omit<CommandTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      const newTemplate: CommandTemplate = {
        ...template,
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updated = [...commandTemplates, newTemplate].sort((a, b) => a.order - b.order);
      saveCommandTemplates(updated);
    },
    [userId, commandTemplates, saveCommandTemplates]
  );

  // 템플릿 수정
  const updateCommandTemplate = useCallback(
    (templateId: string, updates: Partial<CommandTemplate>) => {
      const updated = commandTemplates.map((template) =>
        template.id === templateId ? { ...template, ...updates, updatedAt: new Date() } : template
      );

      saveCommandTemplates(updated.sort((a, b) => a.order - b.order));
    },
    [commandTemplates, saveCommandTemplates]
  );

  // 템플릿 삭제
  const deleteCommandTemplate = useCallback(
    (templateId: string) => {
      const updated = commandTemplates.filter((template) => template.id !== templateId);
      saveCommandTemplates(updated);
    },
    [commandTemplates, saveCommandTemplates]
  );

  // 템플릿 순서 변경
  const reorderCommandTemplates = useCallback(
    (templateIds: string[]) => {
      const reordered = templateIds
        .map((id, index) => {
          const template = commandTemplates.find((t) => t.id === id);
          return template ? { ...template, order: index } : null;
        })
        .filter(Boolean) as CommandTemplate[];

      saveCommandTemplates(reordered);
    },
    [commandTemplates, saveCommandTemplates]
  );

  // 초기 템플릿 로드
  useEffect(() => {
    loadCommandTemplates();
  }, [loadCommandTemplates]);

  // 명령 자동 정리 (5분마다)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setCommands((prev) =>
        prev.filter((command) => {
          const commandTime = new Date(command.timestamp).getTime();
          return now - commandTime < 300000; // 5분
        })
      );
    }, 60000); // 1분마다 체크

    return () => clearInterval(cleanup);
  }, []);

  return {
    // State
    commands: getActiveCommands(),
    allCommands: commands,
    commandTemplates,

    // Actions
    sendCommand,
    expireCommand,
    addCommandTemplate,
    updateCommandTemplate,
    deleteCommandTemplate,
    reorderCommandTemplates,

    // Helpers
    getActiveCommands,
    loadCommandTemplates,
  };
};
