import { useEffect } from 'react'
import wsService from '@/services/websocket'

export function useWebSocket(channel: string, handler: (data: unknown) => void) {
  useEffect(() => {
    return wsService.subscribe(channel, handler)
  }, [channel, handler])
}
