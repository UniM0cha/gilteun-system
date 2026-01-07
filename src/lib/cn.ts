// className 유틸리티 (Tailwind CSS용)

type ClassValue = string | number | boolean | undefined | null | ClassValue[];

// 클래스 이름 병합
export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat()
    .filter((x) => typeof x === 'string' && x.length > 0)
    .join(' ');
}
