import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export interface PortalConfig {
  method: string
  params: string
  port: number
}

export const defaultConfig: PortalConfig = {
  method: '',
  params: '[]',
  port: 9090,
}

export function parseArgs(argv: string[]): Promise<PortalConfig> {
  return yargs(hideBin(argv))
    .option('method', {
      describe: 'Portal Network method to call',
      type: 'string',
      required: true,
    })
    .option('params', {
      describe: 'Parameters for the method (JSON string)',
      type: 'string',
      default: '[]',
    })
    .option('port', {
      describe: 'Port number for the node',
      type: 'number',
      default: 9090,
    })
    .example('$0 --method portal_statePing --params "[\\"enr:-...\\"]"', 'Ping a state network node')
    .strict()
    .parse() as Promise<PortalConfig>
}