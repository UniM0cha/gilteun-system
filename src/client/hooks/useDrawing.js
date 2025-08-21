import { useCallback, useEffect, useState } from 'react';
import { getSocketService } from '@/services/socket';
export const useDrawing = ({ scoreId, currentPage, userId, isConnected }) => {
    const [drawingEvents, setDrawingEvents] = useState([]);
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [toolSettings, setToolSettings] = useState({
        tool: 'pen',
        color: '#000000',
        strokeWidth: 2,
        opacity: 1,
    });
    const [viewport, setViewport] = useState({
        scoreId,
        pageNumber: currentPage,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
    });
    const socketService = getSocketService();
    // 뷰포트 업데이트 시 scoreId와 pageNumber 동기화
    useEffect(() => {
        setViewport((prev) => ({
            ...prev,
            scoreId,
            pageNumber: currentPage,
        }));
    }, [scoreId, currentPage]);
    // 드로잉 이벤트 수신 처리
    const handleDrawingReceived = useCallback((event) => {
        // 자신이 그린 것은 무시 (이미 로컬에서 처리됨)
        if (event.userId === userId)
            return;
        setDrawingEvents((prev) => {
            const existingIndex = prev.findIndex((e) => e.id === event.id);
            if (existingIndex >= 0) {
                // 기존 이벤트 업데이트
                const updated = [...prev];
                updated[existingIndex] = event;
                return updated;
            }
            else {
                // 새로운 이벤트 추가
                return [...prev, event];
            }
        });
    }, [userId]);
    // Socket 이벤트 리스너 등록
    useEffect(() => {
        if (!isConnected)
            return;
        socketService.onDrawingReceived(handleDrawingReceived);
        return () => {
            socketService.offDrawingReceived(handleDrawingReceived);
        };
    }, [isConnected, handleDrawingReceived, socketService]);
    // 드로잉 이벤트 전송
    const sendDrawingEvent = useCallback((event) => {
        if (!isConnected)
            return;
        // 로컬 상태 업데이트
        setDrawingEvents((prev) => {
            const existingIndex = prev.findIndex((e) => e.id === event.id);
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = event;
                return updated;
            }
            else {
                return [...prev, event];
            }
        });
        // 서버로 전송
        socketService.sendDrawingEvent(event);
    }, [isConnected, socketService]);
    // 페이지가 변경될 때 드로잉 이벤트 필터링
    const getCurrentPageDrawings = useCallback(() => {
        return drawingEvents.filter((event) => event.scoreId === scoreId && event.pageNumber === currentPage);
    }, [drawingEvents, scoreId, currentPage]);
    // 드로잉 모드 토글
    const toggleDrawingMode = useCallback((enabled) => {
        setIsDrawingMode((prev) => (enabled !== undefined ? enabled : !prev));
    }, []);
    // 도구 설정 업데이트
    const updateToolSettings = useCallback((settings) => {
        setToolSettings((prev) => ({ ...prev, ...settings }));
    }, []);
    // 뷰포트 업데이트
    const updateViewport = useCallback((newViewport) => {
        setViewport((prev) => ({ ...prev, ...newViewport }));
    }, []);
    // 드로잉 데이터 초기화 (페이지 변경 시)
    const clearCurrentPageDrawings = useCallback(() => {
        setDrawingEvents((prev) => prev.filter((event) => !(event.scoreId === scoreId && event.pageNumber === currentPage)));
    }, [scoreId, currentPage]);
    // 특정 드로잉 이벤트 삭제
    const removeDrawingEvent = useCallback((eventId) => {
        setDrawingEvents((prev) => prev.filter((event) => event.id !== eventId));
    }, []);
    return {
        // State
        drawingEvents: getCurrentPageDrawings(),
        allDrawingEvents: drawingEvents,
        isDrawingMode,
        toolSettings,
        viewport,
        // Actions
        sendDrawingEvent,
        toggleDrawingMode,
        updateToolSettings,
        updateViewport,
        clearCurrentPageDrawings,
        removeDrawingEvent,
        // Helpers
        getCurrentPageDrawings,
    };
};
