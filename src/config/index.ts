import { ISessionConfig } from "../session";
import { ILookupConfig } from "../kademlia";

export type IDiscv5Config = ISessionConfig &
  ILookupConfig & {
    /**
     * The time between pings to ensure connectivity amongst connected nodes
     * defined in milliseconds
     */
    pingInterval: number;
    /**
     * Whether to enable enr auto-updating
     */
    enrUpdate: boolean;
  };

export const defaultConfig: IDiscv5Config = {
  requestTimeout: 1 * 1000,
  requestRetries: 1,
  sessionTimeout: 86400 * 1000, // 1 day
  sessionEstablishTimeout: 15 * 1000,
  lookupParallelism: 3,
  lookupNumResults: 16,
  pingInterval: 300 * 1000,
  enrUpdate: true,
};
