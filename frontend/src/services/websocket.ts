type MessageHandler = (data: unknown) => void

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws'

class WebSocketService {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<MessageHandler>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private isConnecting = false
  private token: string | null = null

  connect(token: string) {
    this.token = token
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return
    this.isConnecting = true

    this.ws = new WebSocket(`${WS_URL}?token=${token}`)

    this.ws.onopen = () => {
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.emit('connection', { status: 'connected' })
    }

    this.ws.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data)
        this.emit(type, data)
      } catch {
        // Ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      this.isConnecting = false
      this.emit('connection', { status: 'disconnected' })
      this.tryReconnect()
    }

    this.ws.onerror = () => {
      this.isConnecting = false
    }
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts
    this.ws?.close()
    this.ws = null
  }

  private tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.token) return
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    setTimeout(() => this.connect(this.token!), delay)
  }

  subscribe(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'subscribe', channel: type }))
    }

    return () => {
      this.handlers.get(type)?.delete(handler)
      if (this.handlers.get(type)?.size === 0) {
        this.handlers.delete(type)
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ action: 'unsubscribe', channel: type }))
        }
      }
    }
  }

  private emit(type: string, data: unknown) {
    this.handlers.get(type)?.forEach(handler => handler(data))
  }

  send(action: string, data?: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, data }))
    }
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const wsService = new WebSocketService()
export default wsService
