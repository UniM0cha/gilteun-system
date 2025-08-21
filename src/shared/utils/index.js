// ID 생성 유틸리티
export const generateId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
// 날짜 포매팅 유틸리티
export const formatDate = (date) => {
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
};
// 시간 포매팅 유틸리티
export const formatTime = (date) => {
    return new Intl.DateTimeFormat('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};
// 파일 크기 포매팅 유틸리티
export const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
// 디바운스 유틸리티
export const debounce = (func, wait) => {
    let timeout;
    return ((...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    });
};
