import { useEffect } from "react";
import type { Sheet } from "@/types";

export function useAdjacentSheetPreload(sheets: Sheet[], currentPage: number) {
  useEffect(() => {
    const candidates = [sheets[currentPage - 1], sheets[currentPage + 1]].filter((sheet): sheet is Sheet =>
      Boolean(sheet),
    );

    const images = candidates
      .filter((sheet) => sheet.imagePath)
      .map((sheet) => {
        const image = new Image();
        image.src = `/uploads/${sheet.imagePath}`;
        return image;
      });

    return () => {
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [sheets, currentPage]);
}
