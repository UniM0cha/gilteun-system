import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Server as HttpServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { io as ioc, Socket as ClientSocket } from 'socket.io-client'
import { setupSocketHandlers } from '../socket-handlers'

describe('Socket Handlers', () => {
  let httpServer: HttpServer
  let socketServer: SocketServer
  let clientSocket: ClientSocket
  let serverSocket: any

  beforeEach((done) => {
    httpServer = new HttpServer()
    socketServer = new SocketServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })

    setupSocketHandlers(socketServer)

    httpServer.listen(() => {
      const port = (httpServer.address() as any).port
      clientSocket = ioc(`http://localhost:${port}`)
      
      socketServer.on('connection', (socket) => {
        serverSocket = socket
      })

      clientSocket.on('connect', done)
    })
  })

  afterEach(() => {
    socketServer.close()
    clientSocket.close()
    httpServer.close()
  })

  describe('User Join Event', () => {
    it('handles user join correctly', (done) => {
      const userData = {
        id: 'user-1',
        name: '테스트 사용자',
        role: 'session' as const,
        instrument: 'piano',
      }

      // 서버에서 users:update 이벤트 수신 확인
      clientSocket.on('users:update', (users) => {
        expect(users).toContainEqual({
          ...userData,
          socketId: expect.any(String),
        })
        done()
      })

      // 사용자 참여 이벤트 전송
      clientSocket.emit('user:join', userData)
    })

    it('validates user data on join', (done) => {
      const invalidUserData = {
        // name field missing
        role: 'session' as const,
        instrument: 'piano',
      }

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('Invalid user data')
        done()
      })

      clientSocket.emit('user:join', invalidUserData)
    })
  })

  describe('Score Synchronization', () => {
    it('synchronizes score page changes', (done) => {
      const scoreData = {
        worshipId: 'worship-1',
        scoreId: 'score-1',
        page: 2,
        userId: 'user-1',
      }

      // 다른 클라이언트도 연결
      const secondClient = ioc(`http://localhost:${(httpServer.address() as any).port}`)

      secondClient.on('score:sync', (data) => {
        expect(data.page).toBe(2)
        expect(data.scoreId).toBe('score-1')
        secondClient.close()
        done()
      })

      // 첫 번째 클라이언트에서 페이지 변경
      clientSocket.emit('score:page-change', scoreData)
    })

    it('handles drawing data synchronization', (done) => {
      const drawingData = {
        scoreId: 'score-1',
        page: 1,
        drawing: {
          strokes: [
            { x: 100, y: 200, color: '#ff0000', width: 2 }
          ]
        },
        userId: 'user-1',
      }

      // 다른 클라이언트에서 드로잉 데이터 수신
      const secondClient = ioc(`http://localhost:${(httpServer.address() as any).port}`)

      secondClient.on('score:drawing-update', (data) => {
        expect(data.drawing.strokes).toHaveLength(1)
        expect(data.drawing.strokes[0].color).toBe('#ff0000')
        secondClient.close()
        done()
      })

      clientSocket.emit('score:drawing', drawingData)
    })
  })

  describe('Command System', () => {
    it('broadcasts commands to appropriate targets', (done) => {
      // 인도자 사용자 설정
      const leaderUser = {
        id: 'leader-1',
        name: '인도자',
        role: 'leader' as const,
        instrument: 'piano',
      }

      clientSocket.emit('user:join', leaderUser)

      const commandData = {
        content: '다음 곡으로 넘어갑니다',
        target: 'all' as const,
        icon: '▶️',
        senderName: '인도자',
        senderInstrument: 'piano',
      }

      clientSocket.on('command:received', (command) => {
        expect(command.content).toBe('다음 곡으로 넘어갑니다')
        expect(command.senderName).toBe('인도자')
        expect(command.id).toBeTruthy()
        expect(command.timestamp).toBeTruthy()
        done()
      })

      clientSocket.emit('command:send', commandData)
    })

    it('restricts command sending to authorized users', (done) => {
      // 일반 세션 사용자 설정
      const sessionUser = {
        id: 'session-1',
        name: '세션',
        role: 'session' as const,
        instrument: 'guitar',
      }

      clientSocket.emit('user:join', sessionUser)

      const commandData = {
        content: '권한없는 명령',
        target: 'all' as const,
        icon: '❌',
        senderName: '세션',
      }

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('권한이 없습니다')
        done()
      })

      clientSocket.emit('command:send', commandData)
    })

    it('handles targeted commands correctly', (done) => {
      // 인도자 설정
      const leaderUser = {
        id: 'leader-1',
        name: '인도자',
        role: 'leader' as const,
        instrument: 'piano',
      }

      clientSocket.emit('user:join', leaderUser)

      // 세션만 대상으로 하는 명령
      const targetedCommand = {
        content: '세션만 들어주세요',
        target: 'sessions' as const,
        icon: '📢',
        senderName: '인도자',
      }

      // 다른 세션 클라이언트 연결
      const sessionClient = ioc(`http://localhost:${(httpServer.address() as any).port}`)
      
      sessionClient.emit('user:join', {
        id: 'session-1',
        name: '세션',
        role: 'session' as const,
        instrument: 'guitar',
      })

      sessionClient.on('command:received', (command) => {
        expect(command.content).toBe('세션만 들어주세요')
        sessionClient.close()
        done()
      })

      clientSocket.emit('command:send', targetedCommand)
    })
  })

  describe('Connection Management', () => {
    it('handles user disconnection correctly', (done) => {
      const userData = {
        id: 'user-1',
        name: '테스트 사용자',
        role: 'session' as const,
        instrument: 'piano',
      }

      // 두 번째 클라이언트로 사용자 목록 변경 감지
      const secondClient = ioc(`http://localhost:${(httpServer.address() as any).port}`)

      let joinReceived = false

      secondClient.on('users:update', (users) => {
        if (!joinReceived) {
          // 사용자 참여 시
          joinReceived = true
          expect(users).toHaveLength(1)
          // 첫 번째 클라이언트 연결 해제
          clientSocket.disconnect()
        } else {
          // 사용자 떠날 때
          expect(users).toHaveLength(0)
          secondClient.close()
          done()
        }
      })

      clientSocket.emit('user:join', userData)
    })

    it('handles reconnection gracefully', (done) => {
      const userData = {
        id: 'user-1',
        name: '재연결 사용자',
        role: 'session' as const,
        instrument: 'piano',
      }

      clientSocket.emit('user:join', userData)

      // 연결 해제 후 재연결
      clientSocket.disconnect()

      setTimeout(() => {
        clientSocket.connect()
        
        clientSocket.on('connect', () => {
          // 재연결 후 다시 참여
          clientSocket.emit('user:join', userData)
          
          clientSocket.on('users:update', (users) => {
            expect(users).toContainEqual({
              ...userData,
              socketId: expect.any(String),
            })
            done()
          })
        })
      }, 100)
    })
  })

  describe('Error Handling', () => {
    it('handles malformed data gracefully', (done) => {
      // 잘못된 형식의 데이터 전송
      clientSocket.emit('score:page-change', 'invalid-data')

      clientSocket.on('error', (error) => {
        expect(error.message).toBeTruthy()
        done()
      })
    })

    it('handles rate limiting for commands', (done) => {
      const leaderUser = {
        id: 'leader-1',
        name: '인도자',
        role: 'leader' as const,
        instrument: 'piano',
      }

      clientSocket.emit('user:join', leaderUser)

      // 빠른 연속 명령 전송 (스팸 방지 테스트)
      const commandData = {
        content: '스팸 명령',
        target: 'all' as const,
        icon: '⚠️',
        senderName: '인도자',
      }

      let commandCount = 0
      let errorReceived = false

      clientSocket.on('command:received', () => {
        commandCount++
      })

      clientSocket.on('error', (error) => {
        if (error.message.includes('rate limit')) {
          errorReceived = true
        }
      })

      // 10개의 명령을 빠르게 전송
      for (let i = 0; i < 10; i++) {
        clientSocket.emit('command:send', { ...commandData, content: `스팸 명령 ${i}` })
      }

      setTimeout(() => {
        // 모든 명령이 처리되지 않거나 에러가 발생해야 함
        expect(commandCount < 10 || errorReceived).toBe(true)
        done()
      }, 500)
    })
  })
})