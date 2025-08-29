import React, { memo } from 'react';
import { Activity, Clock, MemoryStick, Zap } from 'lucide-react';
import { PerformanceMetrics } from '../drawing/AnnotationEngine';

/**
 * 성능 모니터링 컴포넌트
 * - Apple Pencil 입력 지연시간 표시
 * - FPS 및 렌더링 성능 모니터링
 * - 메모리 사용량 추적
 * - 전체 성능 점수 표시
 */
interface PerformanceMonitorProps {
  /** 성능 메트릭스 */
  metrics: PerformanceMetrics;
  
  /** 표시 여부 */
  visible?: boolean;
  
  /** 컴팩트 모드 */
  compact?: boolean;
  
  /** 위치 */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = memo(({
  metrics,
  visible = true,
  compact = false,
  position = 'top-right',
}) => {
  if (!visible) return null;

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency <= 16) return 'text-green-400';
    if (latency <= 33) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMemoryColor = (memory: number) => {
    if (memory <= 300) return 'text-green-400';
    if (memory <= 500) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (compact) {
    return (
      <div className={`absolute ${getPositionClasses()} z-40`}>
        <div className="bg-black bg-opacity-80 rounded-lg px-3 py-2 text-sm text-white">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-1 ${getLatencyColor(metrics.inputLatency)}`}>
              <Clock className="w-4 h-4" />
              <span>{metrics.inputLatency.toFixed(1)}ms</span>
            </div>
            <div className={`flex items-center space-x-1 ${getFPSColor(metrics.fps)}`}>
              <Activity className="w-4 h-4" />
              <span>{metrics.fps}fps</span>
            </div>
            <div className={`flex items-center space-x-1 ${getScoreColor(metrics.performanceScore)}`}>
              <Zap className="w-4 h-4" />
              <span>{metrics.performanceScore}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute ${getPositionClasses()} z-40`}>
      <div className="bg-black bg-opacity-80 backdrop-blur-sm rounded-lg px-4 py-3 text-sm text-white shadow-lg">
        <div className="space-y-2">
          <div className="font-semibold text-center">성능 모니터</div>
          
          {/* 입력 지연시간 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>지연시간</span>
            </div>
            <span className={getLatencyColor(metrics.inputLatency)}>
              {metrics.inputLatency.toFixed(1)}ms
            </span>
          </div>

          {/* FPS */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span>프레임률</span>
            </div>
            <span className={getFPSColor(metrics.fps)}>
              {metrics.fps}fps
            </span>
          </div>

          {/* 메모리 사용량 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MemoryStick className="w-4 h-4 text-gray-400" />
              <span>메모리</span>
            </div>
            <span className={getMemoryColor(metrics.memoryUsage)}>
              {metrics.memoryUsage}MB
            </span>
          </div>

          {/* 성능 점수 */}
          <div className="flex items-center justify-between border-t border-gray-600 pt-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-gray-400" />
              <span className="font-medium">성능 점수</span>
            </div>
            <span className={`font-bold ${getScoreColor(metrics.performanceScore)}`}>
              {metrics.performanceScore}/100
            </span>
          </div>

          {/* 상태 표시기 */}
          <div className="text-xs text-center mt-2 pt-2 border-t border-gray-600">
            {metrics.performanceScore >= 80 && (
              <span className="text-green-400">✓ 우수한 성능</span>
            )}
            {metrics.performanceScore >= 60 && metrics.performanceScore < 80 && (
              <span className="text-yellow-400">⚠ 보통 성능</span>
            )}
            {metrics.performanceScore < 60 && (
              <span className="text-red-400">⚠ 성능 개선 필요</span>
            )}
          </div>

          {/* 성능 개선 제안 */}
          {metrics.performanceScore < 70 && (
            <div className="text-xs text-gray-300 mt-1">
              {metrics.inputLatency > 16 && (
                <div>• Apple Pencil 지연시간 높음</div>
              )}
              {metrics.fps < 45 && (
                <div>• 프레임률 저하</div>
              )}
              {metrics.memoryUsage > 500 && (
                <div>• 메모리 사용량 높음</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

export default PerformanceMonitor;