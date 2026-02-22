export const colorOptions = [
  { value: 'blue', label: '파랑', text: 'text-blue-600', bg: 'bg-blue-100', badge: 'bg-blue-100 text-blue-700', gradient: 'from-blue-500 to-blue-600' },
  { value: 'purple', label: '보라', text: 'text-purple-600', bg: 'bg-purple-100', badge: 'bg-purple-100 text-purple-700', gradient: 'from-purple-500 to-purple-600' },
  { value: 'green', label: '초록', text: 'text-green-600', bg: 'bg-green-100', badge: 'bg-green-100 text-green-700', gradient: 'from-green-500 to-green-600' },
  { value: 'orange', label: '주황', text: 'text-orange-600', bg: 'bg-orange-100', badge: 'bg-orange-100 text-orange-700', gradient: 'from-orange-500 to-orange-600' },
  { value: 'pink', label: '분홍', text: 'text-pink-600', bg: 'bg-pink-100', badge: 'bg-pink-100 text-pink-700', gradient: 'from-pink-500 to-pink-600' },
  { value: 'red', label: '빨강', text: 'text-red-600', bg: 'bg-red-100', badge: 'bg-red-100 text-red-700', gradient: 'from-red-500 to-red-600' },
  { value: 'yellow', label: '노랑', text: 'text-yellow-600', bg: 'bg-yellow-100', badge: 'bg-yellow-100 text-yellow-700', gradient: 'from-yellow-500 to-yellow-600' },
  { value: 'indigo', label: '남색', text: 'text-indigo-600', bg: 'bg-indigo-100', badge: 'bg-indigo-100 text-indigo-700', gradient: 'from-indigo-500 to-indigo-600' },
  { value: 'teal', label: '청록', text: 'text-teal-600', bg: 'bg-teal-100', badge: 'bg-teal-100 text-teal-700', gradient: 'from-teal-500 to-teal-600' },
  { value: 'cyan', label: '하늘', text: 'text-cyan-600', bg: 'bg-cyan-100', badge: 'bg-cyan-100 text-cyan-700', gradient: 'from-cyan-500 to-cyan-600' },
];

export const getColorOption = (color: string) => {
  return colorOptions.find(c => c.value === color) || colorOptions[0];
};