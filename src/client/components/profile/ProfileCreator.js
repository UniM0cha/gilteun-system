import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { InstrumentSelector } from './InstrumentSelector';
import { useProfile } from '@/hooks/useProfile';
const roleOptions = [
    {
        value: 'session',
        label: '세션',
        description: '악보 열람, 마크업 가능',
    },
    {
        value: 'leader',
        label: '인도자',
        description: '명령 전송 가능',
    },
    {
        value: 'admin',
        label: '관리자',
        description: '전체 관리 권한',
    },
];
export const ProfileCreator = ({ onComplete }) => {
    const { availableInstruments, createProfile } = useProfile();
    const [name, setName] = useState('');
    const [role, setRole] = useState('session');
    const [selectedInstrumentId, setSelectedInstrumentId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !selectedInstrumentId) {
            return;
        }
        setIsSubmitting(true);
        try {
            createProfile(name.trim(), role, selectedInstrumentId);
            onComplete();
        }
        catch (error) {
            console.error('프로필 생성 실패:', error);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const isFormValid = name.trim() && selectedInstrumentId;
    return (<Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">새 프로필 생성</CardTitle>
        <CardDescription className="text-center">예배팀에서 사용할 프로필을 만들어주세요</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 이름 입력 */}
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력하세요" maxLength={20} required/>
          </div>

          {/* 역할 선택 */}
          <div className="space-y-3">
            <Label>역할</Label>
            <RadioGroup value={role} onValueChange={(value) => setRole(value)} className="space-y-2">
              {roleOptions.map((option) => (<div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value}/>
                  <Label htmlFor={option.value} className="flex flex-col space-y-1 cursor-pointer">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </Label>
                </div>))}
            </RadioGroup>
          </div>

          {/* 악기 선택 */}
          <InstrumentSelector instruments={availableInstruments} selectedInstrumentId={selectedInstrumentId} onSelect={setSelectedInstrumentId}/>

          {/* 제출 버튼 */}
          <Button type="submit" disabled={!isFormValid || isSubmitting} className="w-full" size="lg">
            {isSubmitting ? '생성 중...' : '프로필 생성'}
          </Button>
        </form>
      </CardContent>
    </Card>);
};
