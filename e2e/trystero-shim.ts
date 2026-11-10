// Test-only: the real Trystero WebRTC stack, but signaling through a local relay
// instead of public Nostr relays (which the test machine cannot reach).
import { joinRoom as wsJoin } from '@trystero-p2p/ws-relay'
export const joinRoom = (config: any, roomId: string) =>
  wsJoin({ ...config, relayConfig: { urls: ['ws://localhost:8090'] } }, roomId)
export type { Room } from 'trystero'
