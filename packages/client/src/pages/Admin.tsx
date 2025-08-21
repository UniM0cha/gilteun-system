import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ScoreUploadDialog } from '../components/admin/ScoreUploadDialog';
import { ScoreListDialog } from '../components/admin/ScoreListDialog';
import { useAdmin } from '../hooks/useAdmin';
import { 
  Settings, 
  Users, 
  FileText, 
  Activity,
  Server,
  Wifi,
  WifiOff,
  Download,
  Trash2,
  Upload,
  RefreshCw,
  AlertTriangle,
  Clock,
  HardDrive,
  X
} from 'lucide-react';

export const Admin = () => {
  const {
    systemStatus,
    userSessions,
    systemLogs,
    systemSettings,
    isLoading,
    error,
    updateSystemSettings,
    disconnectUser,
    cleanupSystem,
    exportData,
    importData,
    clearCache,
    clearError
  } = useAdmin();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [localSettings, setLocalSettings] = useState(systemSettings || {});

  // 설정 변경 감지
  useState(() => {
    if (systemSettings) {
      setLocalSettings(systemSettings);
      setSettingsChanged(false);
    }
  }, [systemSettings]);

  const handleSettingsChange = (key: string, value: unknown) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setSettingsChanged(true);
  };

  const handleSaveSettings = async () => {
    await updateSystemSettings(localSettings);
    setSettingsChanged(false);
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await importData(file);
      }
    };
    input.click();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">길튼 시스템 관리</h1>
            <p className="text-muted-foreground mt-1">시스템 모니터링 및 설정 관리</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge 
              variant={systemStatus?.isOnline ? "default" : "destructive"}
              className="flex items-center space-x-1"
            >
              {systemStatus?.isOnline ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span>{systemStatus?.isOnline ? '온라인' : '오프라인'}</span>
            </Badge>
          </div>
        </div>

        {/* 시스템 상태 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">연결된 사용자</p>
                  <p className="text-2xl font-bold">{systemStatus?.connectedUsers || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">서버 포트</p>
                  <p className="text-2xl font-bold">{systemStatus?.serverPort || 3001}</p>
                </div>
                <Server className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">업타임</p>
                  <p className="text-lg font-bold">{systemStatus?.uptime || '0분'}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">메모리 사용량</p>
                  <p className="text-lg font-bold">
                    {systemStatus?.memoryUsage ? formatBytes(systemStatus.memoryUsage.heapUsed) : '0 MB'}
                  </p>
                </div>
                <HardDrive className="h-8 w-8 text-purple-500" />
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
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>현재 연결된 사용자가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userSessions.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.instrument} • {user.joinedAt}</p>
                            {user.worshipId && (
                              <p className="text-xs text-muted-foreground">예배 ID: {user.worshipId}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? '활성' : '비활성'}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => disconnectUser(user.id, '관리자에 의한 연결 해제')}
                            disabled={isLoading}
                          >
                            연결 해제
                          </Button>
                        </div>
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
                  <Button 
                    className="h-24 flex flex-col items-center justify-center space-y-2 hover:shadow-md transition-shadow"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    <Upload className="h-6 w-6" />
                    <span>악보 업로드</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center space-y-2 hover:shadow-md transition-shadow"
                    onClick={() => setListDialogOpen(true)}
                  >
                    <FileText className="h-6 w-6" />
                    <span>악보 목록</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center space-y-2 hover:shadow-md transition-shadow"
                    onClick={() => cleanupSystem()}
                  >
                    <RefreshCw className="h-6 w-6" />
                    <span>시스템 정리</span>
                  </Button>
                </div>
                
                {/* 데이터베이스 통계 */}
                {systemStatus?.databaseStats && (
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div className="p-3 bg-muted rounded">
                      <p className="text-lg font-bold">{systemStatus.databaseStats.worships}</p>
                      <p className="text-xs text-muted-foreground">예배</p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="text-lg font-bold">{systemStatus.databaseStats.scores}</p>
                      <p className="text-xs text-muted-foreground">악보</p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="text-lg font-bold">{systemStatus.databaseStats.drawings}</p>
                      <p className="text-xs text-muted-foreground">드로잉</p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="text-lg font-bold">{systemStatus.databaseStats.templates}</p>
                      <p className="text-xs text-muted-foreground">템플릿</p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="text-lg font-bold">{systemStatus.databaseStats.users}</p>
                      <p className="text-xs text-muted-foreground">사용자</p>
                    </div>
                  </div>
                )}
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
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoBackup">자동 백업</Label>
                      <input
                        id="autoBackup"
                        type="checkbox"
                        checked={localSettings.autoBackup || false}
                        onChange={(e) => handleSettingsChange('autoBackup', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="dataSync">데이터 동기화</Label>
                      <input
                        id="dataSync"
                        type="checkbox"
                        checked={localSettings.dataSync !== false}
                        onChange={(e) => handleSettingsChange('dataSync', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="securityEnabled">보안 설정</Label>
                      <input
                        id="securityEnabled"
                        type="checkbox"
                        checked={localSettings.securityEnabled || false}
                        onChange={(e) => handleSettingsChange('securityEnabled', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxUsers">최대 사용자 수</Label>
                      <Input
                        id="maxUsers"
                        type="number"
                        value={localSettings.maxUsers || 50}
                        onChange={(e) => handleSettingsChange('maxUsers', parseInt(e.target.value))}
                        min="1"
                        max="200"
                      />
                    </div>
                    {settingsChanged && (
                      <Button 
                        onClick={handleSaveSettings}
                        disabled={isLoading}
                        className="w-full"
                      >
                        설정 저장
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>데이터 관리</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={exportData}
                    disabled={isLoading}
                    className="w-full flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>데이터 백업</span>
                  </Button>
                  <Button 
                    onClick={handleImportData}
                    variant="outline"
                    disabled={isLoading}
                    className="w-full flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>데이터 가져오기</span>
                  </Button>
                  <Button 
                    onClick={() => {
                      if (confirm('캐시를 모두 삭제하시겠습니까?')) {
                        clearCache();
                      }
                    }}
                    variant="destructive"
                    disabled={isLoading}
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
                <div className="bg-card border rounded-lg font-mono text-sm h-64 overflow-y-auto p-4">
                  {systemLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>로그가 없습니다</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {systemLogs.map((log) => (
                        <div key={log.id} className={`text-xs ${
                          log.level === 'error' ? 'text-destructive' :
                          log.level === 'warn' ? 'text-yellow-500' :
                          log.level === 'debug' ? 'text-muted-foreground' :
                          'text-foreground'
                        }`}>
                          <span className="text-muted-foreground">
                            [{new Date(log.timestamp).toLocaleTimeString('ko-KR')}]
                          </span>
                          {log.component && (
                            <span className="text-blue-500 ml-1">[{log.component}]</span>
                          )}
                          <span className="ml-1">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* 에러 메시지 */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-auto p-1 h-auto"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      
      {/* 다이얼로그들 */}
      <ScoreUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={() => {
          // 업로드 성공 후 필요한 작업
        }}
      />
      
      <ScoreListDialog
        open={listDialogOpen}
        onOpenChange={setListDialogOpen}
      />
    </div>
  );
};