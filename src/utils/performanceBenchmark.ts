/**
 * 성능 벤치마크 시스템
 * - 자동화된 성능 테스트
 * - 시나리오별 메트릭 수집
 * - 목표 달성 검증
 * - 리포트 생성
 */

import { PerformanceMetrics } from '../components/drawing/AnnotationEngine';

export interface BenchmarkScenario {
  name: string;
  description: string;
  operations: (() => Promise<void>)[];
  targetMetrics: {
    inputLatency?: number;  // ms
    fps?: number;
    memoryUsage?: number;  // MB
    duration?: number;  // ms
  };
}

export interface BenchmarkResult {
  scenario: string;
  timestamp: number;
  duration: number;
  metrics: PerformanceMetrics;
  targetMet: boolean;
  details: {
    avgInputLatency: number;
    avgFPS: number;
    maxMemory: number;
    minFPS: number;
    maxInputLatency: number;
    p95InputLatency: number;  // 95 percentile
    p95FPS: number;
  };
}

export interface BenchmarkReport {
  timestamp: number;
  environment: {
    userAgent: string;
    deviceMemory?: number;  // GB
    hardwareConcurrency?: number;  // CPU cores
    screenResolution: string;
    connectionType?: string;
  };
  results: BenchmarkResult[];
  summary: {
    totalScenarios: number;
    passedScenarios: number;
    failedScenarios: number;
    overallScore: number;  // 0-100
    recommendations: string[];
  };
}

/**
 * 성능 벤치마크 실행기
 */
export class PerformanceBenchmark {
  private metricsHistory: PerformanceMetrics[] = [];
  private currentScenario: string = '';
  private startTime: number = 0;

  /**
   * 메트릭 수집
   */
  collectMetrics(metrics: PerformanceMetrics): void {
    if (this.currentScenario) {
      this.metricsHistory.push({ ...metrics, timestamp: Date.now() } as any);
    }
  }

  /**
   * 시나리오 실행
   */
  async runScenario(scenario: BenchmarkScenario): Promise<BenchmarkResult> {
    console.log(`🔄 Running benchmark: ${scenario.name}`);
    
    this.currentScenario = scenario.name;
    this.metricsHistory = [];
    this.startTime = performance.now();

    // 워밍업 (첫 실행은 항상 느림)
    await this.warmup();

    // 시나리오 작업 실행
    for (const operation of scenario.operations) {
      await operation();
      await this.wait(100); // 작업 간 대기
    }

    const duration = performance.now() - this.startTime;
    
    // 결과 분석
    const result = this.analyzeResults(scenario, duration);
    
    // 정리
    this.currentScenario = '';
    this.metricsHistory = [];

    console.log(`✅ Benchmark complete: ${scenario.name} - ${result.targetMet ? 'PASSED' : 'FAILED'}`);
    return result;
  }

  /**
   * 워밍업 실행
   */
  private async warmup(): Promise<void> {
    // Canvas 초기화 및 첫 렌더링으로 워밍업
    await this.wait(500);
  }

  /**
   * 결과 분석
   */
  private analyzeResults(scenario: BenchmarkScenario, duration: number): BenchmarkResult {
    if (this.metricsHistory.length === 0) {
      return {
        scenario: scenario.name,
        timestamp: Date.now(),
        duration,
        metrics: {
          inputLatency: 0,
          fps: 0,
          memoryUsage: 0,
          performanceScore: 0,
        },
        targetMet: false,
        details: {
          avgInputLatency: 0,
          avgFPS: 0,
          maxMemory: 0,
          minFPS: 0,
          maxInputLatency: 0,
          p95InputLatency: 0,
          p95FPS: 0,
        },
      };
    }

    // 메트릭 계산
    const latencies = this.metricsHistory.map(m => m.inputLatency).filter(l => l > 0);
    const fpsList = this.metricsHistory.map(m => m.fps);
    const memories = this.metricsHistory.map(m => m.memoryUsage);

    const avgInputLatency = this.average(latencies);
    const avgFPS = this.average(fpsList);
    const maxMemory = Math.max(...memories);
    const minFPS = Math.min(...fpsList);
    const maxInputLatency = Math.max(...latencies);
    const p95InputLatency = this.percentile(latencies, 95);
    const p95FPS = this.percentile(fpsList, 95);

    // 목표 달성 여부 확인
    let targetMet = true;
    if (scenario.targetMetrics.inputLatency && avgInputLatency > scenario.targetMetrics.inputLatency) {
      targetMet = false;
    }
    if (scenario.targetMetrics.fps && avgFPS < scenario.targetMetrics.fps) {
      targetMet = false;
    }
    if (scenario.targetMetrics.memoryUsage && maxMemory > scenario.targetMetrics.memoryUsage) {
      targetMet = false;
    }
    if (scenario.targetMetrics.duration && duration > scenario.targetMetrics.duration) {
      targetMet = false;
    }

    // 성능 점수 계산
    const performanceScore = this.calculatePerformanceScore(avgInputLatency, avgFPS, maxMemory);

    return {
      scenario: scenario.name,
      timestamp: Date.now(),
      duration,
      metrics: {
        inputLatency: avgInputLatency,
        fps: avgFPS,
        memoryUsage: maxMemory,
        performanceScore,
      },
      targetMet,
      details: {
        avgInputLatency,
        avgFPS,
        maxMemory,
        minFPS,
        maxInputLatency,
        p95InputLatency,
        p95FPS,
      },
    };
  }

  /**
   * 전체 벤치마크 실행
   */
  async runBenchmarkSuite(scenarios: BenchmarkScenario[]): Promise<BenchmarkReport> {
    console.log('🚀 Starting performance benchmark suite...');
    
    const results: BenchmarkResult[] = [];
    
    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario);
      results.push(result);
      await this.wait(1000); // 시나리오 간 대기
    }

    return this.generateReport(results);
  }

  /**
   * 리포트 생성
   */
  private generateReport(results: BenchmarkResult[]): BenchmarkReport {
    const passedScenarios = results.filter(r => r.targetMet).length;
    const failedScenarios = results.length - passedScenarios;
    const overallScore = this.calculateOverallScore(results);
    const recommendations = this.generateRecommendations(results);

    return {
      timestamp: Date.now(),
      environment: this.getEnvironmentInfo(),
      results,
      summary: {
        totalScenarios: results.length,
        passedScenarios,
        failedScenarios,
        overallScore,
        recommendations,
      },
    };
  }

  /**
   * 환경 정보 수집
   */
  private getEnvironmentInfo(): BenchmarkReport['environment'] {
    const nav = navigator as any;
    
    return {
      userAgent: navigator.userAgent,
      deviceMemory: nav.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      connectionType: nav.connection?.effectiveType,
    };
  }

  /**
   * 전체 성능 점수 계산
   */
  private calculateOverallScore(results: BenchmarkResult[]): number {
    if (results.length === 0) return 0;
    
    const scores = results.map(r => r.metrics.performanceScore);
    const avgScore = this.average(scores);
    const passRate = (results.filter(r => r.targetMet).length / results.length) * 100;
    
    // 평균 점수 70%, 통과율 30%
    return Math.round(avgScore * 0.7 + passRate * 0.3);
  }

  /**
   * 성능 점수 계산 (0-100)
   */
  private calculatePerformanceScore(inputLatency: number, fps: number, memoryUsage: number): number {
    // 입력 지연시간 점수 (목표: <16ms)
    let latencyScore = 100;
    if (inputLatency > 16) latencyScore = Math.max(0, 100 - (inputLatency - 16) * 3);
    
    // FPS 점수 (목표: 60fps)
    let fpsScore = (fps / 60) * 100;
    fpsScore = Math.min(100, fpsScore);
    
    // 메모리 점수 (목표: <500MB)
    let memoryScore = 100;
    if (memoryUsage > 500) memoryScore = Math.max(0, 100 - ((memoryUsage - 500) / 10));
    
    // 가중 평균 (입력 지연 40%, FPS 40%, 메모리 20%)
    return Math.round(latencyScore * 0.4 + fpsScore * 0.4 + memoryScore * 0.2);
  }

  /**
   * 개선 권장사항 생성
   */
  private generateRecommendations(results: BenchmarkResult[]): string[] {
    const recommendations: string[] = [];
    
    // 입력 지연시간 분석
    const avgLatencies = results.map(r => r.details.avgInputLatency);
    const overallAvgLatency = this.average(avgLatencies);
    
    if (overallAvgLatency > 16) {
      recommendations.push(`⚠️ 입력 지연시간이 목표(16ms)를 초과합니다. 현재: ${overallAvgLatency.toFixed(1)}ms`);
      if (overallAvgLatency > 33) {
        recommendations.push('  → Pointer Event Coalescing이 제대로 작동하는지 확인하세요.');
      }
      recommendations.push('  → requestAnimationFrame 최적화를 검토하세요.');
    }

    // FPS 분석
    const minFPSValues = results.map(r => r.details.minFPS);
    const worstFPS = Math.min(...minFPSValues);
    
    if (worstFPS < 30) {
      recommendations.push(`⚠️ 최저 FPS가 30 미만입니다. 현재: ${worstFPS.toFixed(1)}fps`);
      recommendations.push('  → Canvas 레이어 최적화를 검토하세요.');
      recommendations.push('  → 불필요한 재렌더링을 제거하세요.');
    } else if (worstFPS < 55) {
      recommendations.push(`⚡ FPS 개선 여지가 있습니다. 최저: ${worstFPS.toFixed(1)}fps`);
    }

    // 메모리 분석
    const maxMemories = results.map(r => r.details.maxMemory);
    const peakMemory = Math.max(...maxMemories);
    
    if (peakMemory > 500) {
      recommendations.push(`⚠️ 메모리 사용량이 높습니다. 피크: ${peakMemory.toFixed(0)}MB`);
      recommendations.push('  → 오래된 레이어 정리 로직을 확인하세요.');
      recommendations.push('  → OffscreenCanvas 사용을 고려하세요.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 모든 성능 목표를 달성했습니다!');
    }

    return recommendations;
  }

  /**
   * 유틸리티 함수들
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private percentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 리포트를 CSV로 내보내기
   */
  exportToCSV(report: BenchmarkReport): string {
    const lines: string[] = [];
    
    // 헤더
    lines.push('Gilteun System Performance Benchmark Report');
    lines.push(`Timestamp,${new Date(report.timestamp).toISOString()}`);
    lines.push(`Device,${report.environment.userAgent}`);
    lines.push(`Resolution,${report.environment.screenResolution}`);
    lines.push('');
    
    // 결과 테이블
    lines.push('Scenario,Duration(ms),Avg Input Latency(ms),Avg FPS,Max Memory(MB),Performance Score,Target Met');
    
    for (const result of report.results) {
      lines.push([
        result.scenario,
        result.duration.toFixed(0),
        result.details.avgInputLatency.toFixed(1),
        result.details.avgFPS.toFixed(1),
        result.details.maxMemory.toFixed(0),
        result.metrics.performanceScore,
        result.targetMet ? 'PASS' : 'FAIL',
      ].join(','));
    }
    
    lines.push('');
    lines.push('Summary');
    lines.push(`Overall Score,${report.summary.overallScore}/100`);
    lines.push(`Pass Rate,${report.summary.passedScenarios}/${report.summary.totalScenarios}`);
    
    return lines.join('\n');
  }
}

// 사전 정의된 벤치마크 시나리오
export const standardBenchmarkScenarios: BenchmarkScenario[] = [
  {
    name: '단순 그리기 테스트',
    description: '직선과 곡선 100회 그리기',
    operations: Array(100).fill(null).map(() => async () => {
      // 실제로는 AnnotationEngine의 drawing 메서드를 호출
      await new Promise(resolve => setTimeout(resolve, 10));
    }),
    targetMetrics: {
      inputLatency: 16,
      fps: 60,
      memoryUsage: 200,
      duration: 5000,
    },
  },
  {
    name: '복잡한 패스 테스트',
    description: '1000+ 포인트를 가진 복잡한 패스 그리기',
    operations: Array(10).fill(null).map(() => async () => {
      // 복잡한 패스 그리기 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 50));
    }),
    targetMetrics: {
      inputLatency: 20,
      fps: 45,
      memoryUsage: 300,
      duration: 3000,
    },
  },
  {
    name: '다중 레이어 테스트',
    description: '5개 레이어에서 동시 그리기',
    operations: Array(5).fill(null).map(() => async () => {
      // 다중 레이어 동시 렌더링 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 100));
    }),
    targetMetrics: {
      inputLatency: 25,
      fps: 40,
      memoryUsage: 500,
      duration: 2000,
    },
  },
  {
    name: '스트레스 테스트',
    description: '30명 동시 접속 시뮬레이션',
    operations: Array(30).fill(null).map(() => async () => {
      // 다중 사용자 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 20));
    }),
    targetMetrics: {
      inputLatency: 33,
      fps: 30,
      memoryUsage: 800,
      duration: 10000,
    },
  },
];