import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import multer from 'multer';

export class FileService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }

    // 악보 전용 디렉토리
    const scoresDir = join(this.uploadDir, 'scores');
    if (!existsSync(scoresDir)) {
      mkdirSync(scoresDir, { recursive: true });
    }
  }

  // Multer 설정
  getScoreUploadConfig() {
    const storage = multer.diskStorage({
      destination: (_req, _file, cb) => {
        const scoresDir = join(this.uploadDir, 'scores');
        cb(null, scoresDir);
      },
      filename: (_req, file, cb) => {
        // 파일명: timestamp_원본명
        const timestamp = Date.now();
        const originalName = Buffer.from(file.originalname, 'latin1').toString(
          'utf8'
        );
        const filename = `${timestamp}_${originalName}`;
        cb(null, filename);
      },
    });

    const fileFilter = (_req: any, file: any, cb: any) => {
      // 이미지 파일만 허용 (JPG, PNG)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('JPG, PNG 이미지 파일만 업로드 가능합니다.'), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 제한
      },
    });
  }

  // 파일 경로 생성
  getScoreFilePath(filename: string): string {
    return join(this.uploadDir, 'scores', filename);
  }

  // 상대 경로 반환 (클라이언트용)
  getScoreRelativePath(filename: string): string {
    return `/uploads/scores/${filename}`;
  }
}
