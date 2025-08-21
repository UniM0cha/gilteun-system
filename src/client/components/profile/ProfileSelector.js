import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useProfile } from '@/hooks/useProfile';
export const ProfileSelector = ({ onCreateNew, onContinue }) => {
    const { currentUser, getCurrentInstrument, clearProfile } = useProfile();
    const currentInstrument = getCurrentInstrument();
    if (!currentUser) {
        return (<Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">길튼 시스템에 오신 것을 환영합니다</CardTitle>
          <CardDescription className="text-center">
            찬양팀 예배 진행을 지원하는 앱입니다. 먼저 프로필을 생성해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onCreateNew} className="w-full">
            새 프로필 생성
          </Button>
        </CardContent>
      </Card>);
    }
    return (<Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">기존 프로필</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg bg-muted">
          <div className="flex items-center space-x-3">
            {currentInstrument && <span className="text-3xl">{currentInstrument.icon}</span>}
            <div>
              <p className="font-semibold text-lg">{currentUser.name}</p>
              <p className="text-sm text-muted-foreground">
                {currentUser.role === 'session' && '세션'}
                {currentUser.role === 'leader' && '인도자'}
                {currentUser.role === 'admin' && '관리자'}
                {currentInstrument && ` • ${currentInstrument.name}`}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button onClick={onContinue} className="w-full">
            이 프로필로 계속하기
          </Button>
          <div className="flex space-x-3">
            <Button onClick={onCreateNew} variant="outline" className="flex-1">
              새 프로필 생성
            </Button>
            <Button onClick={clearProfile} variant="outline" className="flex-1">
              프로필 삭제
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>);
};
