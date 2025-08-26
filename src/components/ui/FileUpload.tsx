import React, { useCallback, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, FileImage, Upload, X } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

export interface FileUploadFile extends File {
  id: string;
  preview?: string;
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface FileUploadProps {
  /** 허용할 파일 타입 (MIME type) */
  accept?: string;
  /** 최대 파일 개수 */
  maxFiles?: number;
  /** 최대 파일 크기 (bytes) */
  maxSize?: number;
  /** 파일이 추가되었을 때 호출되는 콜백 */
  onFilesChange?: (files: FileUploadFile[]) => void;
  /** 파일 업로드 함수 */
  onUpload?: (file: FileUploadFile) => Promise<string>;
  /** 업로드된 파일 목록 */
  files?: FileUploadFile[];
  /** 로딩 상태 */
  loading?: boolean;
  /** 비활성화 상태 */
  disabled?: boolean;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 클래스명 */
  className?: string;
}

/**
 * 파일 업로드 컴포넌트
 * - HTML5 드래그앤드롭 지원
 * - iPad 터치 최적화 (44px 최소 터치 영역)
 * - 파일 미리보기 및 진행률 표시
 * - 파일 타입 및 크기 검증
 */
export const FileUpload: React.FC<FileUploadProps> = ({
                                                        accept = 'image/*',
                                                        maxFiles = 5,
                                                        maxSize = 10 * 1024 * 1024, // 10MB
                                                        onFilesChange,
                                                        onUpload,
                                                        files = [],
                                                        loading = false,
                                                        disabled = false,
                                                        placeholder = '이미지를 드래그하거나 클릭하여 업로드하세요',
                                                        className = '',
                                                      }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 ID 생성
  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 파일 검증
  const validateFile = useCallback((file: File): string | undefined => {
    // 파일 타입 검증
    if (accept && accept !== '*') {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const isAccepted = acceptedTypes.some(acceptedType => {
        if (acceptedType.startsWith('.')) {
          // 확장자 기반 검증
          return file.name.toLowerCase().endsWith(acceptedType.toLowerCase());
        } else {
          // MIME 타입 기반 검증
          return file.type.match(acceptedType.replace('*', '.*'));
        }
      });

      if (!isAccepted) {
        return `허용되지 않는 파일 타입입니다. (${accept})`;
      }
    }

    // 파일 크기 검증
    if (file.size > maxSize) {
      const sizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return `파일 크기가 너무 큽니다. (최대 ${sizeMB}MB)`;
    }

    return undefined;
  }, [accept, maxSize]);

  // 파일 처리
  const processFiles = useCallback((fileList: FileList) => {
    if (!onFilesChange || disabled) return;

    const newFiles: FileUploadFile[] = [];
    const currentFileCount = files.length;

    for (let i = 0; i < fileList.length && newFiles.length + currentFileCount < maxFiles; i++) {
      const file = fileList[i];
      const error = validateFile(file);

      const fileWithId: FileUploadFile = Object.assign(file, {
        id: generateFileId(),
        uploadStatus: error ? 'error' as const : 'pending' as const,
        uploadProgress: 0,
        error,
      });

      // 이미지 파일인 경우 미리보기 생성
      if (file.type.startsWith('image/') && !error) {
        fileWithId.preview = URL.createObjectURL(file);
      }

      newFiles.push(fileWithId);
    }

    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles]);
    }
  }, [files, maxFiles, onFilesChange, validateFile, disabled]);

  // 드래그 이벤트 핸들러
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);

    if (dragCounter <= 1) {
      setIsDragActive(false);
    }
  }, [dragCounter]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragActive(false);
    setDragCounter(0);

    if (disabled) return;

    const { files: droppedFiles } = e.dataTransfer;
    if (droppedFiles && droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [disabled, processFiles]);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(() => {
    if (disabled || !fileInputRef.current) return;
    fileInputRef.current.click();
  }, [disabled]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // input value 초기화 (같은 파일 재선택 가능하도록)
    e.target.value = '';
  }, [processFiles]);

  // 파일 제거
  const removeFile = useCallback((fileId: string) => {
    if (!onFilesChange) return;

    const updatedFiles = files.filter(file => {
      if (file.id === fileId) {
        // 미리보기 URL 정리
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
        return false;
      }
      return true;
    });

    onFilesChange(updatedFiles);
  }, [files, onFilesChange]);

  // 파일 업로드
  const uploadFile = useCallback(async (fileId: string) => {
    if (!onUpload || !onFilesChange) return;

    const fileIndex = files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) return;

    const file = files[fileIndex];

    // 업로드 상태 변경
    const updatedFiles = [...files];
    updatedFiles[fileIndex] = {
      ...file,
      uploadStatus: 'uploading',
      uploadProgress: 0,
    };
    onFilesChange(updatedFiles);

    try {
      await onUpload(file);

      // 성공 상태 변경
      updatedFiles[fileIndex] = {
        ...updatedFiles[fileIndex],
        uploadStatus: 'success',
        uploadProgress: 100,
      };
      onFilesChange(updatedFiles);
    } catch (error) {
      // 에러 상태 변경
      updatedFiles[fileIndex] = {
        ...updatedFiles[fileIndex],
        uploadStatus: 'error',
        uploadProgress: 0,
        error: error instanceof Error ? error.message : '업로드에 실패했습니다',
      };
      onFilesChange(updatedFiles);
    }
  }, [files, onUpload, onFilesChange]);

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 상태별 아이콘
  const getStatusIcon = (file: FileUploadFile) => {
    switch (file.uploadStatus) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return <FileImage className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 드래그앤드롭 영역 */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200 ease-in-out
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
          ${isDragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300'
        }
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleFileSelect}
        style={{ minHeight: '120px' }} // iPad 터치 최적화
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className={`w-8 h-8 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-sm text-gray-600">
            {isDragActive ? '파일을 여기에 놓으세요' : placeholder}
          </p>
          <p className="text-xs text-gray-500">
            최대 {maxFiles}개 파일, {formatFileSize(maxSize)} 이하
          </p>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600">처리 중...</span>
            </div>
          </div>
        )}
      </div>

      {/* 파일 목록 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">선택된 파일</h3>
          <div className="space-y-2">
            {files.map((file) => (
              <Card key={file.id} className="p-3">
                <div className="flex items-center space-x-3">
                  {/* 파일 미리보기 또는 아이콘 */}
                  <div className="flex-shrink-0">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <FileImage className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* 파일 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>

                    {/* 진행률 표시 */}
                    {file.uploadStatus === 'uploading' && (
                      <div className="mt-1">
                        <div className="bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${file.uploadProgress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* 에러 메시지 */}
                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>

                  {/* 상태 및 액션 */}
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(file)}

                    {/* 업로드 버튼 */}
                    {file.uploadStatus === 'pending' && onUpload && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          uploadFile(file.id);
                        }}
                        disabled={disabled}
                      >
                        업로드
                      </Button>
                    )}

                    {/* 제거 버튼 */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      disabled={disabled || file.uploadStatus === 'uploading'}
                      className="text-gray-500 hover:text-red-600 min-w-[44px] min-h-[44px] p-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
