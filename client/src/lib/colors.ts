export interface ColorOption {
  name: string;
  bg: string;
  badge: string;
  text: string;
}

export const COLOR_OPTIONS: ColorOption[] = [
  { name: 'blue', bg: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-500' },
  { name: 'purple', bg: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700', text: 'text-purple-500' },
  { name: 'green', bg: 'bg-green-500', badge: 'bg-green-100 text-green-700', text: 'text-green-500' },
  { name: 'orange', bg: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', text: 'text-orange-500' },
  { name: 'pink', bg: 'bg-pink-500', badge: 'bg-pink-100 text-pink-700', text: 'text-pink-500' },
  { name: 'red', bg: 'bg-red-500', badge: 'bg-red-100 text-red-700', text: 'text-red-500' },
  { name: 'indigo', bg: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700', text: 'text-indigo-500' },
  { name: 'teal', bg: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700', text: 'text-teal-500' },
  { name: 'amber', bg: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-500' },
  { name: 'slate', bg: 'bg-slate-500', badge: 'bg-slate-100 text-slate-700', text: 'text-slate-500' },
];

export const PROFILE_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-amber-500',
];

export function getColorOption(colorName: string): ColorOption | undefined {
  return COLOR_OPTIONS.find((c) => c.name === colorName);
}
