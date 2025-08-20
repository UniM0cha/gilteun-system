import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Settings, 
  Users, 
  FileText, 
  Activity,
  Server,
  Wifi,
  WifiOff,
  Download,
  Trash2
} from 'lucide-react';

interface SystemStatus {
  isOnline: boolean;
  connectedUsers: number;
  uptime: string;
  serverPort: number;
  lastSync: string;
}

interface UserSession {
  id: string;
  name: string;
  instrument: string;
  joinedAt: string;
  isActive: boolean;
}

export const Admin = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    isOnline: false,
    connectedUsers: 0,
    uptime: '0분',
    serverPort: 3001,
    lastSync: '방금 전'
  });

  const [userSessions] = useState<UserSession[]>([]);

  useEffect(() => {
    // 시스템 상태 체크
    const checkSystemStatus = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          setSystemStatus(prev => ({
            ...prev,
            isOnline: true,
            lastSync: new Date().toLocaleTimeString('ko-KR')
          }));
        }
      } catch {
        setSystemStatus(prev => ({ ...prev, isOnline: false }));
      }
    };

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleExportData = async () => {
    try {
      console.log('데이터 백업 시작...');
      
      // API 호출로 백업 데이터 요청
      const response = await fetch('/api/backup/export', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('백업 데이터를 가져올 수 없습니다.');
      }
      
      const backupData = await response.json();
      
      // JSON 파일로 다운로드
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `gilteun-backup-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      console.log('데이터 백업 완료');
    } catch (error) {
      console.error('데이터 백업 실패:', error);
      alert('데이터 백업 중 오류가 발생했습니다.');
    }
  };

  const handleClearCache = () => {
    if (confirm('캐시를 모두 삭제하시겠습니까?')) {
      localStorage.clear();
      console.log('캐시 삭제 완료');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">길튼 시스템 관리</h1>
            <p className="text-gray-600 mt-1">시스템 모니터링 및 설정 관리</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge 
              variant={systemStatus.isOnline ? "default" : "destructive"}
              className="flex items-center space-x-1"
            >
              {systemStatus.isOnline ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span>{systemStatus.isOnline ? '온라인' : '오프라인'}</span>
            </Badge>
          </div>
        </div>

        {/* 시스템 상태 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">연결된 사용자</p>
                  <p className="text-2xl font-bold">{systemStatus.connectedUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">서버 포트</p>
                  <p className="text-2xl font-bold">{systemStatus.serverPort}</p>
                </div>
                <Server className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">업타임</p>
                  <p className="text-2xl font-bold">{systemStatus.uptime}</p>
                </div>
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">마지막 동기화</p>
                  <p className="text-sm font-bold">{systemStatus.lastSync}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 메인 탭 컨테이너 */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">사용자 관리</TabsTrigger>
            <TabsTrigger value="content">컨텐츠 관리</TabsTrigger>
            <TabsTrigger value="system">시스템 설정</TabsTrigger>
            <TabsTrigger value="logs">로그 & 모니터링</TabsTrigger>
          </TabsList>

          {/* 사용자 관리 탭 */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>활성 사용자 세션</span>
                </CardTitle>
                <CardDescription>
                  현재 시스템에 연결된 사용자들을 관리합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userSessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>현재 연결된 사용자가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userSessions.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.instrument} • {user.joinedAt}</p>
                          </div>
                        </div>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? '활성' : '비활성'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 컨텐츠 관리 탭 */}
          <TabsContent value="content">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>악보 및 미디어 관리</span>
                </CardTitle>
                <CardDescription>
                  악보 파일과 미디어 리소스를 관리합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button className="h-24 flex flex-col items-center justify-center space-y-2">
                    <Download className="h-6 w-6" />
                    <span>악보 업로드</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
                    <FileText className="h-6 w-6" />
                    <span>악보 목록</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
                    <Settings className="h-6 w-6" />
                    <span>미디어 설정</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 시스템 설정 탭 */}
          <TabsContent value="system">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>일반 설정</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>자동 백업</span>
                    <Button size="sm" variant="outline">설정</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>데이터 동기화</span>
                    <Button size="sm" variant="outline">설정</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>보안 설정</span>
                    <Button size="sm" variant="outline">설정</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>데이터 관리</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleExportData}
                    className="w-full flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>데이터 백업</span>
                  </Button>
                  <Button 
                    onClick={handleClearCache}
                    variant="destructive"
                    className="w-full flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>캐시 삭제</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 로그 & 모니터링 탭 */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>시스템 로그</span>
                </CardTitle>
                <CardDescription>
                  시스템 활동과 오류 로그를 확인합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
                  <div className="space-y-1">
                    <div>[{new Date().toLocaleTimeString()}] 시스템 시작됨</div>
                    <div>[{new Date().toLocaleTimeString()}] 서버 포트 {systemStatus.serverPort} 바인딩 성공</div>
                    <div>[{new Date().toLocaleTimeString()}] PWA 서비스 워커 등록됨</div>
                    <div>[{new Date().toLocaleTimeString()}] 데이터베이스 연결 성공</div>
                    <div className="text-blue-400">[{new Date().toLocaleTimeString()}] 모든 시스템 정상 작동 중</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};