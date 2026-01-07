// 예배 생성 페이지

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateWorship } from '@/api/worships';
import { useAppStore } from '@/store/appStore';
import { ROUTES } from '@/constants/routes';
import { formatDateForInput } from '@/lib/date';
import { Button, Card, CardContent, CardHeader, CardFooter, Input, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui';

export function WorshipCreatePage() {
  const navigate = useNavigate();
  const setCurrentWorship = useAppStore((state) => state.setCurrentWorship);
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(formatDateForInput(new Date()));
  const [time, setTime] = useState('');
  const [memo, setMemo] = useState('');

  const createWorship = useCreateWorship();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.warning('제목을 입력하세요');
      return;
    }

    if (!date) {
      toast.warning('날짜를 선택하세요');
      return;
    }

    try {
      const worship = await createWorship.mutateAsync({
        title: title.trim(),
        date,
        time: time || undefined,
        memo: memo.trim() || undefined,
      });

      toast.success('예배가 생성되었습니다');
      setCurrentWorship(worship);
      navigate(ROUTES.SONG_LIST);
    } catch {
      toast.error('예배 생성에 실패했습니다');
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">새 예배 만들기</h2>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              label="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 주일 1부 예배"
              required
            />

            <Input
              label="날짜"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <Input
              label="시간 (선택)"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />

            <Textarea
              label="메모 (선택)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예배에 대한 메모를 입력하세요"
              rows={3}
            />
          </CardContent>

          <CardFooter className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              취소
            </Button>
            <Button type="submit" isLoading={createWorship.isPending}>
              만들기
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
