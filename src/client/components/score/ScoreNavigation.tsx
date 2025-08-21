import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { ScoreViewport } from '@shared/types/score';

interface ScoreNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  viewport: ScoreViewport;
  onViewportChange: (viewport: ScoreViewport) => void;
  className?: string;
}

export const ScoreNavigation = ({
  currentPage,
  totalPages,
  onPageChange,
  viewport,
  onViewportChange,
  className,
}: ScoreNavigationProps) => {
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(3, viewport.zoom + 0.2);
    onViewportChange({ ...viewport, zoom: newZoom });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.1, viewport.zoom - 0.2);
    onViewportChange({ ...viewport, zoom: newZoom });
  };

  const handleResetView = () => {
    onViewportChange({
      ...viewport,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= totalPages) {
      onPageChange(value);
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          {/* 페이지 네비게이션 */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">페이지 이동</h3>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center space-x-1">
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={handlePageInput}
                  className="w-12 h-8 text-center text-sm"
                />
                <span className="text-sm text-muted-foreground">/ {totalPages}</span>
              </div>

              <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 페이지 목록 (작은 썸네일) */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">전체 페이지</h4>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNum = index + 1;
                const isActive = pageNum === currentPage;

                return (
                  <Button
                    key={pageNum}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className="h-12 text-xs"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 줌 컨트롤 */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">확대/축소</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={viewport.zoom <= 0.1}>
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <span className="text-sm font-mono min-w-[4rem] text-center">{Math.round(viewport.zoom * 100)}%</span>

                <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={viewport.zoom >= 3}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="ghost" size="sm" onClick={handleResetView} title="원래 크기로 복원">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 키보드 단축키 안내 */}
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-xs font-medium text-muted-foreground">단축키</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>← → : 페이지 이동</div>
              <div>Ctrl + 마우스휠 : 확대/축소</div>
              <div>마우스 드래그 : 이동</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
