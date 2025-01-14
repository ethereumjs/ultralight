import { parseArgs } from './config.js'
import { runPortalClient } from './portalClient.js'

export async function main() {
  try {
    const config = await parseArgs(process.argv)
    await runPortalClient(config)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main().catch(console.error)