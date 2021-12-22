import { ISessionConfig } from "../session";
import { ILookupConfig } from "../kademlia";
export declare type IDiscv5Config = ISessionConfig & ILookupConfig & {
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
export declare const defaultConfig: IDiscv5Config;
