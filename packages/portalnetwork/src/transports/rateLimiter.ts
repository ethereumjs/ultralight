type IPAddress = string

export interface IRateLimiter {
  allowEncodedPacket(ip: IPAddress): boolean
  addExpectedResponse(ip: IPAddress): void
  removeExpectedResponse(ip: IPAddress): void
}

const DEFAULT_BLACKLIST_DURATION = 1000 * 60 * 10 // 10 minutes

export class RateLimiter implements IRateLimiter {
  private blackListed: Set<IPAddress> = new Set<IPAddress>()
  private blackListTimeouts: Map<IPAddress, ReturnType<typeof setTimeout>> = new Map<
    IPAddress,
    ReturnType<typeof setTimeout>
  >()
  constructor() {}

  public allowEncodedPacket(ip: IPAddress): boolean {
    return !this.blackListed.has(ip)
  }

  public addExpectedResponse(_ip: IPAddress): void {
    return
  }

  public removeExpectedResponse(_ip: IPAddress): void {
    return
  }

  public addToBlackList(ip: IPAddress): void {
    this.blackListed.add(ip)
    this.blackListTimeouts.set(
      ip,
      setTimeout(() => {
        this.blackListed.delete(ip)
        this.blackListTimeouts.delete(ip)
      }, DEFAULT_BLACKLIST_DURATION),
    )
  }

  public removeFromBlackList(ip: IPAddress): void {
    clearTimeout(this.blackListTimeouts.get(ip))
    this.blackListTimeouts.delete(ip)
    this.blackListed.delete(ip)
  }

  public isBlackListed(ip: IPAddress): boolean {
    return this.blackListed.has(ip)
  }
}
