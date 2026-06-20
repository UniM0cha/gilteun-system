interface CommandToastProps {
  emoji: string;
  label: string;
  senderName: string;
  senderRoleIcon: string;
  onDismiss: () => void;
}

// command:received 수신 시 표시하는 토스트 카드 (탭하면 닫힘).
export default function CommandToast({ emoji, label, senderName, senderRoleIcon, onDismiss }: CommandToastProps) {
  return (
    <div
      className="bg-white rounded-2xl shadow-2xl p-6 flex items-center gap-4 min-w-87.5 border-4 border-blue-500 cursor-pointer"
      onClick={onDismiss}
    >
      <div className="text-6xl">{emoji}</div>
      <div className="flex-1">
        <div className="text-2xl font-bold text-slate-800">{label}</div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
          <span className="text-lg">{senderRoleIcon}</span>
          <span className="font-semibold">{senderName}</span>
          <span>님이 전송</span>
        </div>
      </div>
    </div>
  );
}
