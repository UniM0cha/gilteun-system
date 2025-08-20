import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState } from 'react';

export function StyleTest() {
  const [radioValue, setRadioValue] = useState('option1');

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-6">shadcn/ui 스타일 테스트</h1>
      
      {/* Button 테스트 */}
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Button 컴포넌트</CardTitle>
          <CardDescription>다양한 variant와 hover 효과 테스트</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">🎵</Button>
          </div>
        </CardContent>
      </Card>

      {/* Input & Label 테스트 */}
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Input & Label 컴포넌트</CardTitle>
          <CardDescription>폼 요소 테스트</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-input">테스트 입력</Label>
            <Input id="test-input" placeholder="여기에 입력하세요..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="disabled-input">비활성화 입력</Label>
            <Input id="disabled-input" placeholder="비활성화됨" disabled />
          </div>
        </CardContent>
      </Card>

      {/* RadioGroup 테스트 */}
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>RadioGroup 컴포넌트</CardTitle>
          <CardDescription>라디오 버튼 선택 효과 테스트</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>옵션을 선택하세요</Label>
            <RadioGroup
              value={radioValue}
              onValueChange={setRadioValue}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option1" id="option1" />
                <Label htmlFor="option1" className="cursor-pointer">옵션 1</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option2" id="option2" />
                <Label htmlFor="option2" className="cursor-pointer">옵션 2</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option3" id="option3" />
                <Label htmlFor="option3" className="cursor-pointer">옵션 3</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Badge 테스트 */}
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Badge 컴포넌트</CardTitle>
          <CardDescription>뱃지 variant 테스트</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge>기본 뱃지</Badge>
            <Badge variant="outline">아웃라인 뱃지</Badge>
            <Badge variant="secondary">세컨더리 뱃지</Badge>
            <Badge variant="destructive">경고 뱃지</Badge>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        모든 컴포넌트에 올바른 hover 효과와 포커스 상태가 적용되어야 합니다.
      </p>
    </div>
  );
}