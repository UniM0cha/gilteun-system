import type { ComponentType, SVGProps } from "react";
import {
  AudioLines,
  Bell,
  BookOpenText,
  Camera,
  Church,
  Crown,
  Disc3,
  Drum,
  HandHeart,
  Headphones,
  KeyboardMusic,
  Lectern,
  Megaphone,
  Metronome,
  Mic,
  MicVocal,
  Monitor,
  Music,
  Piano,
  Radio,
  SlidersVertical,
  Sparkles,
  Speaker,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Lucide 24×24 선 규격에 맞춘 어쿠스틱 기타 아이콘 (원형 사운드홀·브릿지). */
function AcousticGuitarIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="m14.8 9.2 4.9-4.9" />
      <path d="M18.5 3 21 5.5l-1.3 1.3-2.5-2.5z" />
      <path d="M11.6 7.4a3.3 3.3 0 0 1 4.9 4.9l-.6.6a2 2 0 0 0-.3 2.4A4.6 4.6 0 0 1 9 20.6a5.4 5.4 0 0 1-5.6-5.6 4.6 4.6 0 0 1 5.3-6.6 2 2 0 0 0 2.4-.3z" />
      <circle cx="11.2" cy="12.8" r="1.6" />
      <path d="m7.2 15.2 1.6 1.6" />
    </svg>
  );
}

/** 더블 컷어웨이 뿔 바디와 픽업 2줄이 있는 일렉 기타 아이콘. */
function ElectricGuitarIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="m13.5 10.5 5.5-5.5" />
      <path d="M18.5 3.5 21.5 2.5 20.5 5.5 18.8 5.2z" />
      <path d="M12.2 6.8c-1.4-.9-2.8-.2-2.7 1.3.1.9-.6 1.6-1.5 1.7-2.8.3-5 2.7-4.8 5.7.2 2.9 2.6 5.3 5.5 5.5 3 .2 5.4-2 5.7-4.8.1-.9.8-1.6 1.7-1.5 1.5.1 2.2-1.3 1.3-2.7" />
      <path d="m9.5 11.8 2.7 2.7" />
      <path d="m7.3 14 2.7 2.7" />
    </svg>
  );
}

/** 긴 넥과 4개 튜너 페그가 드러나는 베이스 기타 아이콘. */
function BassGuitarIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="m12.5 11.5 6.8-6.8" />
      <path d="M17.2 3.2v1.4M19 2v1.6M20.8 4.8h1.4M22 6.6h-1.6" />
      <path d="M11 7.2c-1.7-1-3.3.1-3.1 1.9.1.9-.6 1.6-1.5 1.8-2.6.5-4.3 3-3.7 5.8.6 2.8 3.2 4.6 6 4.2 2.8-.4 4.8-2.8 4.8-5.6 0-.9.8-1.6 1.8-1.5 1.8.2 2.7-1.6 1.6-3.1" />
      <path d="m8.2 13 2.8 2.8" />
    </svg>
  );
}

/** 작은 배지 크기에서도 한눈에 구분되는 낮은음자리표(베이스) 아이콘. */
function BassClefIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M5 19c5.2-1.8 10-5.4 10-10.2A4.8 4.8 0 0 0 10.2 4C7.5 4 5.5 6 5.5 8.5a2 2 0 1 0 2 2" />
      <circle cx="18.5" cy="7" r="1" />
      <circle cx="18.5" cy="11.5" r="1" />
    </svg>
  );
}

/** 수직 C-바우트 허리와 브릿지·테일피스를 갖춘 바이올린 아이콘. */
function ViolinIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 2v5" />
      <path d="M10.5 3.5h3" />
      <path d="M12 7c-2.2 0-3.5 1.4-3.5 3.2 0 1 .7 1.6 1.2 2.1.5.5.5 1.1 0 1.6-.8.7-1.7 1.6-1.7 3 0 2.3 1.7 4.1 4 4.1s4-1.8 4-4.1c0-1.4-.9-2.3-1.7-3-.5-.5-.5-1.1 0-1.6.5-.5 1.2-1.1 1.2-2.1C15.5 8.4 14.2 7 12 7z" />
      <path d="M10.5 14.5h3" />
      <path d="M12 18v3" />
    </svg>
  );
}

export const ROLE_ICON_CATEGORIES = ["악기", "인도·보컬", "음향·방송", "예배·기타"] as const;
export type RoleIconCategory = (typeof ROLE_ICON_CATEGORIES)[number];

export interface RoleIconPreset {
  id: string;
  category: RoleIconCategory;
  label: string;
  component: IconComponent;
}

export const ROLE_ICON_PRESETS: RoleIconPreset[] = [
  // 악기
  { id: "icon:piano", category: "악기", label: "피아노", component: Piano },
  { id: "icon:keyboard-music", category: "악기", label: "신디·건반", component: KeyboardMusic },
  { id: "icon:drum", category: "악기", label: "드럼", component: Drum },
  { id: "icon:guitar-acoustic", category: "악기", label: "어쿠스틱", component: AcousticGuitarIcon },
  { id: "icon:guitar-electric", category: "악기", label: "일렉", component: ElectricGuitarIcon },
  { id: "icon:guitar-bass", category: "악기", label: "베이스 기타", component: BassGuitarIcon },
  { id: "icon:clef-bass", category: "악기", label: "베이스 음자리표", component: BassClefIcon },
  { id: "icon:violin", category: "악기", label: "바이올린", component: ViolinIcon },
  { id: "icon:metronome", category: "악기", label: "퍼커션", component: Metronome },
  { id: "icon:music", category: "악기", label: "음표", component: Music },
  { id: "icon:disc-3", category: "악기", label: "시퀀스", component: Disc3 },

  // 인도·보컬
  { id: "icon:mic", category: "인도·보컬", label: "마이크", component: Mic },
  { id: "icon:mic-vocal", category: "인도·보컬", label: "보컬", component: MicVocal },
  { id: "icon:audio-lines", category: "인도·보컬", label: "오디오", component: AudioLines },
  { id: "icon:megaphone", category: "인도·보컬", label: "인도", component: Megaphone },

  // 음향·방송
  { id: "icon:sliders-vertical", category: "음향·방송", label: "믹서", component: SlidersVertical },
  { id: "icon:headphones", category: "음향·방송", label: "모니터", component: Headphones },
  { id: "icon:speaker", category: "음향·방송", label: "스피커", component: Speaker },
  { id: "icon:monitor", category: "음향·방송", label: "자막·PPT", component: Monitor },
  { id: "icon:video", category: "음향·방송", label: "영상", component: Video },
  { id: "icon:camera", category: "음향·방송", label: "촬영", component: Camera },
  { id: "icon:radio", category: "음향·방송", label: "송출", component: Radio },

  // 예배·기타
  { id: "icon:lectern", category: "예배·기타", label: "강대상", component: Lectern },
  { id: "icon:book-open-text", category: "예배·기타", label: "말씀", component: BookOpenText },
  { id: "icon:church", category: "예배·기타", label: "교회", component: Church },
  { id: "icon:hand-heart", category: "예배·기타", label: "섬김", component: HandHeart },
  { id: "icon:users", category: "예배·기타", label: "팀원", component: Users },
  { id: "icon:crown", category: "예배·기타", label: "리더", component: Crown },
  { id: "icon:sparkles", category: "예배·기타", label: "스페셜", component: Sparkles },
  { id: "icon:bell", category: "예배·기타", label: "진행", component: Bell },
];

const ROLE_ICON_MAP = new Map<string, RoleIconPreset>(ROLE_ICON_PRESETS.map((p) => [p.id, p]));

export function isRoleIconId(value: string): boolean {
  return ROLE_ICON_MAP.has(value);
}

export function getRoleIconPreset(value: string): RoleIconPreset | undefined {
  return ROLE_ICON_MAP.get(value);
}

export function getRoleIconLabel(value: string): string | undefined {
  return ROLE_ICON_MAP.get(value)?.label;
}

interface RoleIconProps {
  icon?: string | null;
  className?: string;
  emojiClassName?: string;
}

/** 등록된 `icon:*` 키는 벡터 SVG로, 기존 이모지 문자열은 그대로 텍스트로 렌더링한다. */
export function RoleIcon({ icon, className, emojiClassName }: RoleIconProps) {
  if (!icon) return null;
  const preset = ROLE_ICON_MAP.get(icon);
  if (preset) {
    const Icon = preset.component;
    return <Icon className={cn("size-5 shrink-0", className)} aria-hidden="true" />;
  }
  return (
    <span className={cn("leading-none", emojiClassName)} aria-hidden="true">
      {icon}
    </span>
  );
}
