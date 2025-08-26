// 길튼 시스템 Service Worker
const CACHE_NAME = 'gilteun-v1';
const OFFLINE_URL = '/offline.html';

// 캐시할 정적 리소스
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// 설치 이벤트 - 정적 리소스 캐시
self.addEventListener('install', (event) => {
  console.log('Service Worker 설치');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('정적 리소스 캐싱');
        return cache.addAll(STATIC_CACHE_URLS);
      }),
  );

  // 즉시 활성화
  self.skipWaiting();
});

// 활성화 이벤트 - 이전 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('Service Worker 활성화');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );

  // 즉시 제어 시작
  self.clients.claim();
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  // GET 요청만 처리
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // 캐싱 전략 적용
  if (requestUrl.pathname.startsWith('/api/')) {
    // API 요청: Network First (실시간 데이터 우선)
    event.respondWith(networkFirstStrategy(event.request));
  } else if (requestUrl.pathname.endsWith('.jpg') ||
    requestUrl.pathname.endsWith('.png') ||
    requestUrl.pathname.endsWith('.jpeg')) {
    // 이미지: Cache First (악보 이미지)
    event.respondWith(cacheFirstStrategy(event.request));
  } else {
    // 기타 리소스: Stale While Revalidate
    event.respondWith(staleWhileRevalidateStrategy(event.request));
  }
});

// Network First 전략 (API 데이터)
async function networkFirstStrategy(request) {
  try {
    // 네트워크 우선 시도
    const response = await fetch(request);

    // 성공하면 캐시에 저장
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // 네트워크 실패 시 캐시에서 반환
    console.log('네트워크 실패, 캐시 사용:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // 캐시도 없으면 오프라인 페이지
    if (request.destination === 'document') {
      return caches.match(OFFLINE_URL);
    }

    throw error;
  }
}

// Cache First 전략 (이미지)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('이미지 로드 실패:', request.url);
    throw error;
  }
}

// Stale While Revalidate 전략 (앱 셸)
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);

  // 백그라운드에서 업데이트
  const fetchPromise = fetch(request).then((response) => {
    if (response.status === 200) {
      const cache = caches.open(CACHE_NAME);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => {
    console.log('백그라운드 업데이트 실패:', request.url);
  });

  // 캐시된 버전이 있으면 즉시 반환
  if (cachedResponse) {
    return cachedResponse;
  }

  // 캐시가 없으면 네트워크 응답 기다림
  return fetchPromise;
}

// 백그라운드 동기화 (향후 구현)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('백그라운드 동기화 시작');
    // Phase 2에서 구현: 오프라인 중 생성된 주석 데이터 동기화
  }
});

// 푸시 알림 (향후 구현)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('푸시 메시지 수신:', data);

    // Phase 2에서 구현: 명령 알림 표시
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'gilteun-command',
        requireInteraction: true,
      }),
    );
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('알림 클릭:', event.notification.tag);

  event.notification.close();

  event.waitUntil(
    clients.openWindow('/'),
  );
});
