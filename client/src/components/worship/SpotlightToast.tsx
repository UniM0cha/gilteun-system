import { ChevronsLeft, ChevronsRight } from "lucide-react";

interface SpotlightToastProps {
  senderName: string;
  sheetTitle: string;
  // 현재 악보 → 호출된 악보 오프셋 (+: 오른쪽, -: 왼쪽, 0: 현재 악보, null: 계산 불가)
  offset: number | null;
  onAccept: () => void;
}

// page:spotlight 수신 시 표시하는 호출 토스트 카드 (탭하면 해당 페이지로 이동 + 닫힘).
export default function SpotlightToast({ senderName, sheetTitle, offset, onAccept }: SpotlightToastProps) {
  return (
    <div
      className="bg-card text-card-foreground rounded-lg shadow-lg p-6 flex items-center gap-4 min-w-87.5 border cursor-pointer active:bg-accent transition-colors"
      onClick={onAccept}
    >
      <div className="text-4xl">📢</div>
      <div className="flex-1">
        <div className="text-lg font-semibold text-foreground">{senderName}님이 호출합니다</div>
        <div className="text-sm text-muted-foreground mt-1">&quot;{sheetTitle}&quot;로 이동하려면 클릭하세요</div>
        {offset !== null && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-3 py-1 text-sm font-semibold">
            {offset === 0 ? (
              "지금 보고 있는 악보예요"
            ) : offset > 0 ? (
              <>
                오른쪽으로 {offset}장
                <ChevronsRight className="size-4" />
              </>
            ) : (
              <>
                <ChevronsLeft className="size-4" />
                왼쪽으로 {-offset}장
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
