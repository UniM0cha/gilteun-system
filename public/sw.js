const CACHE_NAME = 'gilteun-system-v1';
const OFFLINE_URL = '/offline.html';

// 캐시할 핵심 리소스
const CORE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json'
];

// API 요청 패턴
const API_PATTERNS = [
  /\/api\//,
  /socket\.io/
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        // 새 Service Worker가 즉시 활성화되도록 함
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    // 이전 버전 캐시 정리
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
    .then(() => {
      // 모든 클라이언트에서 새 SW를 즉시 사용
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 요청인지 확인
  const isApiRequest = API_PATTERNS.some(pattern => pattern.test(url.pathname));

  if (isApiRequest) {
    // API 요청: Network First 전략
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 네트워크 응답이 성공적이면 그대로 반환
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 오프라인 응답
          return new Response(
            JSON.stringify({ 
              error: '네트워크에 연결되지 않았습니다.',
              offline: true 
            }),
            {
              status: 503,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
        })
    );
  } else {
    // 정적 자원: Cache First 전략
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // 캐시된 리소스가 있으면 반환
            return cachedResponse;
          }

          // 캐시에 없으면 네트워크에서 가져오기
          return fetch(request)
            .then((response) => {
              // 유효한 응답이 아니면 그대로 반환
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // 응답을 복사해서 캐시에 저장
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });

              return response;
            })
            .catch(() => {
              // 네트워크 실패 시 HTML 요청이면 오프라인 페이지 반환
              if (request.destination === 'document') {
                return caches.match(OFFLINE_URL);
              }
              
              // 기타 요청은 실패 응답
              return new Response('오프라인 상태입니다.', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
        })
    );
  }
});

// 메시지 이벤트 (앱에서 SW로 메시지 전송)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 푸시 알림 (미래 확장용)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.openWindow('/')
  );
});