import { Upload } from "lucide-react";
import type { Sheet } from "@/types";

interface SheetPagePreviewProps {
  sheet: Sheet | null;
}

export default function SheetPagePreview({ sheet }: SheetPagePreviewProps) {
  const imageUrl = sheet?.imagePath ? `/uploads/${sheet.imagePath}` : null;

  return (
    <div className="w-full h-full bg-white rounded-2xl overflow-hidden">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={sheet?.title ?? "악보 미리보기"}
          className="w-full h-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-100">
          <div className="text-center">
            <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">악보를 업로드하세요</p>
          </div>
        </div>
      )}
    </div>
  );
}
