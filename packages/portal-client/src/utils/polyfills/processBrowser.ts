const startTime = Date.now()

export const processBrowser = {
  env: {},
  browser: true,
  uptime: () => (Date.now() - startTime) / 1000,
  hrtime: () => [0, 0],
  memoryUsage: () => ({
    heapTotal: 0,
    heapUsed: 0,
    external: 0,
    rss: 0,
  }),
  cpuUsage: () => ({
    user: 0,
    system: 0,
  }),

  version: 'v18.0.0',
  versions: {
    node: '20.0.0',
    v8: '8.0.0',
    modules: '88',
  },
}

export default processBrowser
