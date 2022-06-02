import PromClient from 'prom-client'

export const setupMetrics = () => {
  return {
    knownDiscv5Nodes: new PromClient.Gauge({
      name: 'ultralight_known_discv5_peers',
      help: 'how many peers are in discv5 routing table',
      async collect() {},
    }),
    knownHistoryNodes: new PromClient.Gauge({
      name: 'ultralight_known_history_peers',
      help: 'how many peers are in discv5 routing table',
      async collect() {},
    }),
    totalContentLookups: new PromClient.Gauge<string>({
      name: 'ultralight_total_content_lookups',
      help: 'total number of content lookups initiated',
    }),
    successfulContentLookups: new PromClient.Counter({
      name: 'ultralight_successful_content_lookups',
      help: 'how many content lookups successfully returned content',
    }),
    failedContentLookups: new PromClient.Counter({
      name: 'ultralight_failed_content_lookups',
      help: 'how many content lookups failed to return content',
    }),
    offerMessagesSent: new PromClient.Counter({
      name: 'ultralight_offer_messages_sent',
      help: 'how many offer messages have been sent',
    }),
    offerMessagesReceived: new PromClient.Counter({
      name: 'ultralight_offer_messages_received',
      help: 'how many offer messages have been received',
    }),
    acceptMessagesSent: new PromClient.Counter({
      name: 'ultralight_accept_messages_sent',
      help: 'how many accept messages have been sent',
    }),
    acceptMessagesReceived: new PromClient.Counter({
      name: 'ultralight_accept_messages_received',
      help: 'how many accept messages have been received',
    }),
    findContentMessagesSent: new PromClient.Counter({
      name: 'ultralight_findContent_messages_sent',
      help: 'how many findContent messages have been sent',
    }),
    findContentMessagesReceived: new PromClient.Counter({
      name: 'ultralight_findContent_messages_received',
      help: 'how many findContent messages have been received',
    }),
    contentMessagesSent: new PromClient.Counter({
      name: 'ultralight_content_messages_sent',
      help: 'how many content messages have been sent',
    }),
    contentMessagesReceived: new PromClient.Counter({
      name: 'ultralight_content_messages_received',
      help: 'how many content messages have been received',
    }),
    findNodesMessagesSent: new PromClient.Counter({
      name: 'ultralight_findNodes_messages_sent',
      help: 'how many findNodes messages have been sent',
    }),
    findNodesMessagesReceived: new PromClient.Counter({
      name: 'ultralight_findNodes_messages_received',
      help: 'how many findNodes messages have been received',
    }),
    nodesMessagesSent: new PromClient.Counter({
      name: 'ultralight_nodes_messages_sent',
      help: 'how many nodes messages have been sent',
    }),
    nodesMessagesReceived: new PromClient.Counter({
      name: 'ultralight_nodes_messages_received',
      help: 'how many nodes messages have been received',
    }),
    totalBytesReceived: new PromClient.Counter({
      name: 'ultralight_total_bytes_received',
      help: 'how many bytes have been received in Portal Network message payloads',
    }),
    totalBytesSent: new PromClient.Counter({
      name: 'ultralight_total_bytes_sent',
      help: 'how many bytes have been sent in Portal Network message payloads',
    }),
    currentDBSize: new PromClient.Gauge({
      name: 'ultralight_db_size',
      help: 'how many MBs are currently stored in the db',
    }),
  }
}
