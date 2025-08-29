import { gzipSync, gunzipSync } from 'zlib';

/**
 * SVG 데이터 압축 유틸리티
 * - gzip 압축을 사용하여 SVG 패스 데이터 크기 최적화
 * - 실시간 협업에서 네트워크 트래픽 및 저장공간 절약
 */

/**
 * SVG 데이터 압축
 * @param data 압축할 SVG 데이터 문자열
 * @returns base64 인코딩된 압축 데이터
 */
export function compress(data: string): string {
  try {
    // 문자열을 Buffer로 변환 후 gzip 압축
    const buffer = Buffer.from(data, 'utf8');
    const compressed = gzipSync(buffer, {
      level: 9, // 최대 압축
      windowBits: 15,
      memLevel: 8,
    });

    // base64로 인코딩하여 문자열로 저장
    return compressed.toString('base64');
  } catch (error) {
    console.error('SVG 데이터 압축 오류:', error);
    // 압축 실패 시 원본 데이터 반환 (fallback)
    return data;
  }
}

/**
 * SVG 데이터 압축 해제
 * @param compressedData base64 인코딩된 압축 데이터
 * @returns 압축 해제된 원본 SVG 데이터
 */
export function decompress(compressedData: string): string {
  try {
    // base64 데이터가 아니면 원본 데이터로 간주 (하위 호환성)
    if (!isBase64(compressedData)) {
      return compressedData;
    }

    // base64 디코딩 후 gzip 압축 해제
    const buffer = Buffer.from(compressedData, 'base64');
    const decompressed = gunzipSync(buffer);

    return decompressed.toString('utf8');
  } catch (error) {
    console.error('SVG 데이터 압축 해제 오류:', error);
    // 압축 해제 실패 시 원본 데이터 반환 (fallback)
    return compressedData;
  }
}

/**
 * base64 문자열 검증
 * @param str 검증할 문자열
 * @returns base64 형식 여부
 */
function isBase64(str: string): boolean {
  try {
    // base64 정규식 패턴 확인
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;

    // 길이가 4의 배수여야 하고 패턴에 맞아야 함
    return str.length % 4 === 0 && base64Pattern.test(str);
  } catch {
    return false;
  }
}

/**
 * 압축률 계산
 * @param originalData 원본 데이터
 * @param compressedData 압축된 데이터
 * @returns 압축률 (0~1 사이의 값, 1에 가까울수록 높은 압축률)
 */
export function getCompressionRatio(originalData: string, compressedData: string): number {
  try {
    const originalSize = Buffer.byteLength(originalData, 'utf8');
    const compressedSize = Buffer.byteLength(compressedData, 'utf8');

    return Math.max(0, 1 - compressedSize / originalSize);
  } catch {
    return 0;
  }
}

/**
 * SVG 데이터 최적화 (압축 전 전처리)
 * - 불필요한 공백 제거
 * - 중복 속성 정리
 * - 소수점 정밀도 조정
 */
export function optimizeSVGData(svgData: string): string {
  try {
    return (
      svgData
        // 다중 공백을 단일 공백으로 변환
        .replace(/\s+/g, ' ')
        // 태그 사이의 공백 제거
        .replace(/>\s+</g, '><')
        // 불필요한 앞뒤 공백 제거
        .trim()
        // 소수점 정밀도를 6자리로 제한 (SVG에서 충분한 정밀도)
        .replace(/(\d+\.\d{6})\d+/g, '$1')
        // 연속된 같은 명령 최적화 (예: L 10 20 L 30 40 → L 10 20 30 40)
        .replace(/([MLHVCSQTAZ])\s*(\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?)*)\s*\1\s*/gi, '$1 $2 ')
    );
  } catch (error) {
    console.error('SVG 데이터 최적화 오류:', error);
    return svgData;
  }
}

/**
 * 압축 통계 정보
 */
export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  savedBytes: number;
  isCompressed: boolean;
}

/**
 * 압축 통계 생성
 * @param originalData 원본 데이터
 * @param compressedData 압축된 데이터 (선택적)
 * @returns 압축 통계 정보
 */
export function getCompressionStats(originalData: string, compressedData?: string): CompressionStats {
  const originalSize = Buffer.byteLength(originalData, 'utf8');

  if (!compressedData) {
    const compressed = compress(originalData);
    compressedData = compressed;
  }

  const compressedSize = Buffer.byteLength(compressedData, 'base64');
  const compressionRatio = getCompressionRatio(originalData, compressedData);
  const savedBytes = Math.max(0, originalSize - compressedSize);

  return {
    originalSize,
    compressedSize,
    compressionRatio,
    savedBytes,
    isCompressed: compressionRatio > 0,
  };
}

/**
 * 배치 압축 - 여러 SVG 데이터를 한 번에 압축
 * @param dataList SVG 데이터 배열
 * @returns 압축된 데이터 배열과 통계 정보
 */
export function batchCompress(dataList: string[]): {
  compressedData: string[];
  totalStats: CompressionStats;
} {
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;

  const compressedData = dataList.map((data) => {
    const optimized = optimizeSVGData(data);
    const compressed = compress(optimized);

    totalOriginalSize += Buffer.byteLength(data, 'utf8');
    totalCompressedSize += Buffer.byteLength(compressed, 'base64');

    return compressed;
  });

  const totalStats: CompressionStats = {
    originalSize: totalOriginalSize,
    compressedSize: totalCompressedSize,
    compressionRatio: Math.max(0, 1 - totalCompressedSize / totalOriginalSize),
    savedBytes: Math.max(0, totalOriginalSize - totalCompressedSize),
    isCompressed: totalCompressedSize < totalOriginalSize,
  };

  return {
    compressedData,
    totalStats,
  };
}
