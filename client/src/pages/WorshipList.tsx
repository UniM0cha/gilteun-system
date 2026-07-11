import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { Plus, Calendar, Music, Edit, Trash2, Play, ArrowLeft, Filter, X, ChevronDown } from "lucide-react";
import { useWorships, useWorshipYears, useWorshipTypes, useDeleteWorship } from "@/hooks/queries";
import { useAppStore } from "@/store/appStore";
import { getColorOption } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";

export default function WorshipList() {
  const { data: worshipTypes = [] } = useWorshipTypes();
  const { data: availableYears = [] } = useWorshipYears();
  const deleteWorshipMutation = useDeleteWorship();
  const currentProfileId = useAppStore((s) => s.currentProfileId);
  const navigate = useNavigate();

  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // 검색어 디바운스 (서버 호출이므로 매 타이핑마다 요청하지 않도록)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 무한 스크롤 목록 (서버 페이지네이션 + 날짜 최신순 정렬, 필터는 서버에서 처리)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useWorships({
    typeId: selectedTypeId,
    q: debouncedQuery,
    year: selectedYear,
    month: selectedMonth,
  });

  const worships = data?.pages.flatMap((p) => p.items) ?? [];

  // 프로필 미선택 시 홈으로 리다이렉트
  useEffect(() => {
    if (!currentProfileId) {
      navigate("/");
    }
  }, [currentProfileId, navigate]);

  // 필터 변경 시 스크롤 최상단 리셋 (queryKey 변경으로 page 1부터 재조회됨)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [selectedTypeId, debouncedQuery, selectedYear, selectedMonth]);

  // 무한 스크롤 sentinel — 목록 끝이 보이면 다음 페이지 로드
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatLastEdited = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR");
  };

  const handleDelete = async (id: string) => {
    await deleteWorshipMutation.mutateAsync(id);
  };

  const hasActiveFilter = !!(debouncedQuery || selectedTypeId || selectedYear);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Link
            to="/"
            title="홈으로"
            aria-label="홈으로"
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-11 shrink-0")}
          >
            <ArrowLeft />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">예배 목록</h1>
            <p className="text-sm sm:text-base text-muted-foreground">예배를 선택하거나 새로운 예배를 만드세요</p>
          </div>
          <Link to="/worship-edit/new" className={cn(buttonVariants(), "h-11 shrink-0")}>
            <Plus />
            <span className="hidden sm:inline">새 예배 만들기</span>
            <span className="sm:hidden">새 예배</span>
          </Link>
        </div>

        {/* 필터 섹션 */}
        <Card className="mb-6 gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="size-4 text-muted-foreground" />
              필터
            </CardTitle>
            {/* 모바일: 유형·날짜 필터 접기/펼치기 (검색은 항상 노출) */}
            <CardAction className="sm:hidden">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground"
                onClick={() => setShowMobileFilters((v) => !v)}
                aria-expanded={showMobileFilters}
              >
                {(selectedTypeId ? 1 : 0) + (selectedYear ? 1 : 0) > 0 && (
                  <Badge variant="secondary" className="mr-1">
                    {(selectedTypeId ? 1 : 0) + (selectedYear ? 1 : 0)}
                  </Badge>
                )}
                {showMobileFilters ? "접기" : "유형·날짜"}
                <ChevronDown className={`transition-transform ${showMobileFilters ? "rotate-180" : ""}`} />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {/* 검색 */}
            <div className="relative mb-4">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-10"
                placeholder="예배 이름 검색..."
              />
              <Music className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-0 size-11 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setSearchQuery("")}
                  title="검색어 지우기"
                  aria-label="검색어 지우기"
                >
                  <X />
                </Button>
              )}
            </div>

            {/* 유형·날짜: 모바일에선 토글로 접힘, sm+에선 항상 노출 */}
            <div className={`${showMobileFilters ? "block" : "hidden"} sm:block`}>
              {/* 예배 유형 필터 */}
              <div className="mb-4">
                <Label className="mb-2">예배 유형</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={!selectedTypeId ? "default" : "outline"}
                    className="h-11"
                    onClick={() => setSelectedTypeId("")}
                  >
                    전체
                  </Button>
                  {worshipTypes.map((type) => {
                    const isSelected = selectedTypeId === type.id;
                    const colorOption = getColorOption(type.color);
                    return (
                      <Button
                        key={type.id}
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => setSelectedTypeId(type.id)}
                        className={`h-11 ${isSelected ? `${colorOption?.bg || "bg-blue-500"} text-white hover:opacity-90` : ""}`}
                      >
                        {type.name}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* 날짜 필터 */}
              <div>
                <Label className="mb-2">날짜</Label>
                <div className="flex items-center gap-3">
                  <Select
                    items={{
                      all: "전체 연도",
                      ...Object.fromEntries(availableYears.map((y) => [String(y), `${y}년`])),
                    }}
                    value={selectedYear || "all"}
                    onValueChange={(v) => {
                      const year = v && v !== "all" ? v : "";
                      setSelectedYear(year);
                      if (!year) setSelectedMonth("");
                    }}
                  >
                    <SelectTrigger className="data-[size=default]:h-11 min-w-32">
                      <SelectValue placeholder="전체 연도" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all" className="min-h-11">
                          전체 연도
                        </SelectItem>
                        {availableYears.map((year) => (
                          <SelectItem key={year} value={String(year)} className="min-h-11">
                            {year}년
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Select
                    items={{
                      all: "전체 월",
                      ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), `${i + 1}월`])),
                    }}
                    value={selectedMonth || "all"}
                    onValueChange={(v) => setSelectedMonth(v && v !== "all" ? v : "")}
                    disabled={!selectedYear}
                  >
                    <SelectTrigger className="data-[size=default]:h-11 min-w-28">
                      <SelectValue placeholder="전체 월" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all" className="min-h-11">
                          전체 월
                        </SelectItem>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                          <SelectItem key={month} value={String(month)} className="min-h-11">
                            {month}월
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {(selectedYear || selectedMonth) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 text-muted-foreground"
                      onClick={() => {
                        setSelectedYear("");
                        setSelectedMonth("");
                      }}
                      title="날짜 필터 초기화"
                      aria-label="날짜 필터 초기화"
                    >
                      <X />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 예배 목록 */}
        <div className="space-y-3">
          {worships.map((worship) => {
            const worshipType = worshipTypes.find((t) => t.id === worship.typeId);
            return (
              <Card key={worship.id} className="py-4">
                <CardContent className="px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        <h3 className="font-semibold text-lg">{worship.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="size-4 shrink-0" />
                            {formatDate(worship.date)}
                          </div>
                          <div className="text-sm text-muted-foreground">악보 {worship.sheets?.length ?? 0}개</div>
                          {worshipType && (
                            <Badge className={`text-white ${getColorOption(worshipType.color)?.bg || "bg-blue-500"}`}>
                              {worshipType.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        마지막 수정: {formatLastEdited(worship.updatedAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link to={`/worship/${worship.id}`} className={cn(buttonVariants(), "h-11")}>
                        <Play />
                        시작
                      </Link>
                      <Link
                        to={`/worship-edit/${worship.id}`}
                        title="예배 편집"
                        aria-label={`${worship.title} 편집`}
                        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-11")}
                      >
                        <Edit />
                      </Link>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            title="예배 삭제"
                            aria-label={`${worship.title} 삭제`}
                          >
                            <Trash2 />
                          </Button>
                        }
                        title="예배 삭제"
                        description={`"${worship.title}" 예배를 삭제하시겠습니까?`}
                        confirmLabel="삭제"
                        onConfirm={() => handleDelete(worship.id)}
                        destructive
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* 무한 스크롤 sentinel + 로딩 표시 */}
          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && <div className="text-center py-4 text-muted-foreground text-sm">불러오는 중...</div>}
        </div>

        {/* 첫 로딩 */}
        {isLoading && <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>}

        {/* 빈 상태 */}
        {!isLoading && worships.length === 0 && (
          <EmptyState
            icon={Music}
            title={hasActiveFilter ? "검색 결과가 없습니다" : "아직 예배가 없습니다"}
            description={hasActiveFilter ? "다른 검색어나 필터를 시도해보세요" : "새 예배를 만들어 악보를 추가하세요"}
            action={
              !hasActiveFilter ? (
                <Link to="/worship-edit/new" className={cn(buttonVariants(), "h-11")}>
                  <Plus />새 예배 만들기
                </Link>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
