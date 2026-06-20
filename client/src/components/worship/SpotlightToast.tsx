interface SpotlightToastProps {
  senderName: string;
  sheetTitle: string;
  onAccept: () => void;
}

// page:spotlight 수신 시 표시하는 호출 토스트 카드 (탭하면 해당 페이지로 이동 + 닫힘).
export default function SpotlightToast({ senderName, sheetTitle, onAccept }: SpotlightToastProps) {
  return (
    <div
      className="bg-white rounded-2xl shadow-2xl p-6 flex items-center gap-4 min-w-87.5 border-4 border-amber-500 cursor-pointer active:bg-amber-50 transition-colors"
      onClick={onAccept}
    >
      <div className="text-4xl">📢</div>
      <div className="flex-1">
        <div className="text-lg font-bold text-slate-800">{senderName}님이 호출합니다</div>
        <div className="text-sm text-slate-500 mt-1">&quot;{sheetTitle}&quot;로 이동하려면 클릭하세요</div>
      </div>
    </div>
  );
}
