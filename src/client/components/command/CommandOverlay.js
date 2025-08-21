import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
const COMMAND_DURATION = 3000; // 3초
const UPDATE_INTERVAL = 100; // 100ms마다 업데이트
export const CommandOverlay = ({ commands, onCommandExpire, className }) => {
    const [displayCommands, setDisplayCommands] = useState([]);
    // 새 명령이 추가될 때 표시 상태로 변환
    useEffect(() => {
        const now = Date.now();
        setDisplayCommands((prevCommands) => {
            const existingIds = prevCommands.map((cmd) => cmd.id);
            const newCommands = commands
                .filter((cmd) => !existingIds.includes(cmd.id))
                .map((cmd) => ({
                ...cmd,
                isVisible: true,
                timeLeft: COMMAND_DURATION,
            }));
            // 기존 명령과 새 명령을 합침 (최신 명령이 상단에 표시되도록 역순)
            return [...newCommands, ...prevCommands].filter((cmd) => {
                const commandTime = new Date(cmd.timestamp).getTime();
                return now - commandTime < COMMAND_DURATION + 1000; // 여유시간 1초 추가
            });
        });
    }, [commands]);
    // 타이머 관리
    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            setDisplayCommands((prevCommands) => {
                return prevCommands
                    .map((cmd) => {
                    const commandTime = new Date(cmd.timestamp).getTime();
                    const elapsed = now - commandTime;
                    const timeLeft = Math.max(0, COMMAND_DURATION - elapsed);
                    return {
                        ...cmd,
                        timeLeft,
                        isVisible: timeLeft > 500, // 마지막 500ms에서 페이드아웃
                    };
                })
                    .filter((cmd) => {
                    const commandTime = new Date(cmd.timestamp).getTime();
                    const elapsed = now - commandTime;
                    if (elapsed >= COMMAND_DURATION + 500) {
                        // 완전히 만료된 명령 제거하고 콜백 호출
                        onCommandExpire(cmd.id);
                        return false;
                    }
                    return true;
                });
            });
        }, UPDATE_INTERVAL);
        return () => clearInterval(timer);
    }, [onCommandExpire]);
    // 수동으로 명령 닫기
    const handleDismiss = (commandId) => {
        setDisplayCommands((prev) => prev.map((cmd) => (cmd.id === commandId ? { ...cmd, isVisible: false, timeLeft: 0 } : cmd)));
        // 즉시 만료 처리
        setTimeout(() => onCommandExpire(commandId), 300);
    };
    if (displayCommands.length === 0) {
        return null;
    }
    return (<div className={`fixed top-4 right-4 z-50 space-y-2 max-w-sm ${className}`}>
      {displayCommands.map((command, index) => {
            const progressPercent = (command.timeLeft / COMMAND_DURATION) * 100;
            return (<Card key={command.id} className={`p-4 shadow-lg transition-all duration-300 ${command.isVisible ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-full'}`} style={{
                    animationDelay: `${index * 100}ms`,
                }}>
            <div className="flex items-start justify-between space-x-3">
              <div className="flex-1 min-w-0">
                {/* 발신자 정보 */}
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {command.senderName}
                    {command.senderInstrument && (<span className="ml-1">{getInstrumentIcon(command.senderInstrument)}</span>)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatTime(command.timestamp)}</span>
                </div>

                {/* 명령 내용 */}
                <div className="flex items-center space-x-2">
                  {command.icon && <span className="text-lg">{command.icon}</span>}
                  <p className="text-sm font-medium break-words">{command.content}</p>
                </div>

                {/* 대상 정보 */}
                {command.target !== 'all' && (<div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {getTargetLabel(command.target)}
                    </Badge>
                  </div>)}
              </div>

              {/* 닫기 버튼 */}
              <button onClick={() => handleDismiss(command.id)} className="flex-shrink-0 p-1 rounded-full hover:bg-muted transition-colors" aria-label="명령 닫기">
                <X className="h-3 w-3 text-muted-foreground"/>
              </button>
            </div>

            {/* 진행 바 */}
            <div className="mt-3">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-100 ease-linear" style={{ width: `${progressPercent}%` }}/>
              </div>
            </div>
          </Card>);
        })}
    </div>);
};
// 헬퍼 함수들
function getInstrumentIcon(instrument) {
    const iconMap = {
        piano: '🎹',
        keyboard: '🎹',
        guitar: '🎸',
        bass: '🎸',
        drum: '🥁',
        drums: '🥁',
        vocal: '🎤',
        voice: '🎤',
    };
    return iconMap[instrument.toLowerCase()] || '🎵';
}
function getTargetLabel(target) {
    const labelMap = {
        leaders: '인도자만',
        sessions: '세션만',
        all: '전체',
    };
    return labelMap[target] || target;
}
function formatTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    if (diff < 60000) {
        // 1분 미만
        return '방금 전';
    }
    else if (diff < 3600000) {
        // 1시간 미만
        const minutes = Math.floor(diff / 60000);
        return `${minutes}분 전`;
    }
    else {
        return time.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }
}
