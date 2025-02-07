import { TransportProvider } from './types'

interface PortalNetworkConfig {
  portalHost?: string
  portalPort?: number
  timeoutMs?: number
}

export class HTTPTransport implements TransportProvider {
  private readonly baseUrl: string
  private readonly portalHost: string
  private readonly portalPort: number
  private readonly timeoutMs: number
  private initialized: boolean = false

  constructor(baseUrl: string, config: PortalNetworkConfig = {}) {
    this.baseUrl = baseUrl
    this.portalHost = config.portalHost || '127.0.0.1'
    this.portalPort = config.portalPort || 8545
    this.timeoutMs = config.timeoutMs || 10000
  }

  async initializePortal(): Promise<void> {
    try {
      const response = await this.sendCommand({
        method: 'initialize_portal',
        params: {
          bind_port: 9090,
          udp_port: 8546,
        },
      })

      if (response.error) {
        throw new Error(response.error)
      }

      this.initialized = true
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to initialize transport: ${error.message}`)
      } else {
        throw new Error('Failed to initialize transport: Unknown error')
      }
    }
  }

  async bindUdp(): Promise<void> {
    try {
      const response = await this.sendCommand({
        method: 'initialize_udp',
        params: {
          udp_port: 8545,
        },
      })

      if (response.error) {
        throw new Error(response.error)
      }

      this.initialized = true
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to initialize transport: ${error.message}`)
      } else {
        throw new Error('Failed to initialize transport: Unknown error')
      }
    }
  }

  async sendCommand(request: { method: string; params?: any }): Promise<any> {
    if (!request.method) {
      throw new Error('Method name is required')
    }

    // if (!this.initialized && request.method !== 'initialize_socket') {
    //   throw new Error('Transport not initialized')
    // }

    try {
      const requestBody = {
        method: request.method,
        params: request.params || {},
      }

      const safeStringify = (obj: any) =>
      JSON.stringify(obj, (_, value) => {
        if (typeof value === 'bigint') return value.toString()
          
        if (value instanceof Uint8Array) return [...value]
        return value
      })

      console.log('Sending Portal Network request:', safeStringify(requestBody))

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

      const response = await fetch(`${this.baseUrl}/api/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: safeStringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const responseText = await response.text()

      let responseData = {}
      if (responseText && responseText.trim()) {
        try {
          responseData = JSON.parse(responseText)
          console.log('Portal Network parsed response:', responseData)
        } catch (parseError) {
          return {
            result: responseText,
            textResponse: true,
          }
        }
      }

      if (!response.ok) {
        if (responseData && typeof responseData === 'object' && 'error' in responseData) {
          throw new Error(
            typeof responseData.error === 'string' ? responseData.error : 'Unknown error occurred',
          )
        }
        throw new Error(`Server error: HTTP ${response.status} ${response.statusText}`)
      }

      if (
        responseData &&
        typeof responseData === 'object' &&
        'error' in responseData &&
        responseData.error === 'Receive timeout'
      ) {
        throw new Error(
          `Portal Network node at ${this.portalHost}:${this.portalPort} did not respond within 
					${this.timeoutMs}ms. Please ensure the Portal Network node is running and accessible.`,
        )
      }

      if ('result' in responseData) {
        return responseData.result
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            error: `Request timed out after ${this.timeoutMs}ms`,
          }
        }
        return {
          error: `Request failed: ${error.message}`,
        }
      }
      return {
        error: 'Request failed: Unknown error',
      }
    }
  }

  async portalRequest(method: string, params: any[] = []): Promise<any> {
    return await this.sendCommand({
      method: 'portal_request',
      params: {
        method,
        params,
      },
    })
  }
}
