import debug from "debug";
import { IOException } from "../../Utils/exceptions";
import UtpAlgConfiguration from "../UtpAlgConfiguration";
import OutPacketBuffer from "./OutPacketBuffer";
import fs from 'fs'

export interface StatisticLogger {
    
    currentWindow(currentWindow: number): void;
    
	ourDifference( difference: number): void;
    
	minDelay( minDelay: number): void;
    
	ourDelay( ourDelay: number): void;
    
	offTarget( offTarget: number): void;
    
	delayFactor( delayFactor: number): void;
    
	windowFactor( windowFactor: number): void;
    
	gain(gain: number): void;
    
	ackReceived(seqNrToAck: number): void;
    
	sACK(sackSeqNr: number): void;
    
	next(): void;
    
	maxWindow(maxWindow: number): void;
    
	end(bytesLength: number): void;
    
	microSecTimeStamp( logTimeStampMillisec: number): void;
    
	pktRtt( packetRtt: number): void;
    
	rttVar( rttVar: number): void;
    
	rtt( rtt: number): void;
    
	advertisedWindow(advertisedWindowSize: number): void;
    
	theirDifference(theirDifference: number): void;
    
	theirMinDelay( theirMinDelay: number): void;
    
	bytesSend(bytesSend: number): void;
    
}
export default class UtpDataLogger implements StatisticLogger {
    LOG_NAME: string;
	private  _currentWindow: number;
	private  _difference: number;
	private  _minDelay: number;
	private  _ourDelay: number;
	private  _offTarget: number;
	private  _delayFactor: number;
	private  _windowFactor: number;
	private  _gain: number;
	private  _ackReceived: number;
	private  _sACK: string | null;
	private  _maxWindow: number;
	private  _minimumTimeStamp: number;
	private  _timeStamp: number;
	private  _packetRtt: number;
	private  _rttVar: number;
	private  _rtt: number;
	private  _advertisedWindow: number;
	private  _theirDifference: number;
	private  _theirMinDelay: number;
	private  _bytesSend: number;
	private  _loggerOn: boolean = true;
	// private  _logFile: RandomAccessFile | undefined ;
	// private  _fileChannel: FileChannel | undefined;
    private _log: debug.Debugger;
    constructor() {
        this.LOG_NAME = "log.csv";
        this._currentWindow = 0;
        this._difference= 0;
        this._minDelay= 0;
        this._ourDelay= 0;
        this._offTarget= 0;
        this._delayFactor= 0;
        this._windowFactor= 0;
        this._gain= 0;
        this._ackReceived= 0;
        this._sACK = null;
        this._maxWindow= 0;
        this._minimumTimeStamp= 0;
        this._timeStamp= 0;
        this._packetRtt= 0;
        this._rttVar= 0;
        this._rtt= 0;
        this._advertisedWindow= 0;
        this._theirDifference= 0;
        this._theirMinDelay= 0;
        this._bytesSend= 0;
        // this._loggerOn = true;
        // this._logFile= undefined
        // this._fileChannel=undefined;
        this._log = debug("OutPacketBuffer")
        
            // this.openFile();
            // this.writeEntry("TimeMicros;AckRecieved;CurrentWidow_Bytes;Difference_Micros;MinDelay_Micros;OurDelay_Micros;Their_Difference_Micros;"
            //         + "Their_MinDelay_Micros;Their_Delay_Micros;OffTarget_Micros;DelayFactor;WindowFactor;Gain_Bytes;PacketRtt_Millis;"
            //         + "RttVar_Millis;Rtt_Millis;AdvertisedWindow_Bytes;MaxWindow_Bytes;BytesSend;SACK\n");
            this._minimumTimeStamp = 0;
        }
    



	
	public currentWindow( currentWindow: number): void {
		this._currentWindow = currentWindow;
	}


	
	public ourDifference( difference: number): void {
		this._difference = difference;

	}


	
	public minDelay( minDelay: number): void {
		this._minDelay = minDelay;

	}


	
	public ourDelay( ourDelay: number): void {
		this._ourDelay = ourDelay;

	}


	
	public offTarget( offTarget: number): void {
		this._offTarget = offTarget;

	}


	
	public delayFactor(delayFactor: number): void {
		this._delayFactor = delayFactor;

	}


	
	public windowFactor(windowFactor: number): void {
		this._windowFactor = windowFactor;

	}


	
	public gain( gain: number): void {
		this._gain = gain;

	}


	
	public ackReceived( seqNrToAck: number): void {
		this._ackReceived = seqNrToAck;

	}


	
	public sACK( sackSeqNr: number): void {
		if (this._sACK != null) {
			this._sACK += " " + sackSeqNr;
		} else {
			this._sACK = "" + sackSeqNr;
		}

	}



	
	public next(): void {
		if (UtpAlgConfiguration.DEBUG && this._loggerOn) {
			let logEntry = "" + (this._timeStamp - this._minimumTimeStamp) + ";";
			logEntry += this._ackReceived + ";";
			logEntry += this._currentWindow + ";";
			logEntry += this._difference + ";";
			logEntry += this._minDelay + ";";
			logEntry += this._ourDelay + ";";
			logEntry += this._theirDifference + ";";
			logEntry += this._theirMinDelay + ";";
			logEntry += (this._theirDifference - this._theirMinDelay) + ";";
			logEntry += this._offTarget + ";";
			logEntry += this._delayFactor + ";";
			logEntry += this._windowFactor + ";";
			logEntry += this._gain + ";";
			logEntry += this._packetRtt + ";";
			logEntry += this._rttVar + ";";
			logEntry += this._rtt + ";";
			logEntry += this._advertisedWindow + ";";
			logEntry += this._maxWindow + ";";
			logEntry += this._bytesSend;
			if (this._sACK != null) {
				logEntry += ";(" + this._sACK + ")\n";
			} else {
				logEntry += "\n";
			}
			this._log(logEntry);
			this._sACK = null;
		}
	}


	
	public maxWindow( maxWindow: number): void {
		this._maxWindow = maxWindow;

	}

	// private openFile(): void {
	// 	if (UtpAlgConfiguration.DEBUG && this._loggerOn) {
	// 		try {
	// 			this._logFile = fs. writeFileSync("testData/" + this.LOG_NAME, "rw") ;
	// 			this._fileChannel = this._logFile.getChannel();
	// 			this._fileChannel.truncate(0);
	// 		} catch (e: any) {
	// 			e.prStackTrace();
	// 		}
	// 	}
	// }

	// private closeFile(): void {
	// 	if (UtpAlgConfiguration.DEBUG && this._loggerOn) {
	// 		try {
	// 			this._logFile.close();
	// 			this._fileChannel.close();
	// 		} catch ( exp: any) {
	// 			exp.prStackTrace();
	// 		}
	// 	}
	// }


	
	public end( bytesLength: number): void {
		if (UtpAlgConfiguration.DEBUG && this._loggerOn) {
			// this.closeFile();
			let seconds = (this._timeStamp - this._minimumTimeStamp) / 1000000;
			 let sendRate = 0;
			if (seconds != 0) {
				sendRate = (bytesLength / 1024) / seconds;
			}
			console.debug("SENDRATE: " + sendRate + "kB/sec");
		}
	}

	// private writeEntry(entry: string): void {
	// 	if (UtpAlgConfiguration.DEBUG && this._loggerOn && entry != null) {
	// 		let bbuffer: Buffer = Buffer.alloc(entry.length)
    //         bbuffer.write(entry)
	// 		bbuffer.reverse()
	// 		try {
	// 				this._fileChannel.write(bbuffer);
	// 		} catch ( e) {
	// 			console.error("failed to write: " + entry);
	// 		}
	// 	}
	// }


	
	public microSecTimeStamp( logTimeStampMillisec: number): void {
		if (this._minimumTimeStamp == 0) {
			this._minimumTimeStamp = logTimeStampMillisec;
		}
		this._timeStamp = logTimeStampMillisec;

	}


	
	public pktRtt( packetRtt: number): void {
		this._packetRtt = packetRtt;

	}


	
	public rttVar( rttVar: number): void {
		this._rttVar = rttVar;

	}


	
	public rtt( rtt: number): void {
		this._rtt = rtt;

	}


	
	public advertisedWindow( advertisedWindowSize: number): void {
		this._advertisedWindow = advertisedWindowSize;

	}


	
	public theirDifference( theirDifference: number): void {
		this._theirDifference = theirDifference;

	}


	
	public theirMinDelay( theirMinDelay: number): void {
		this._theirMinDelay = theirMinDelay;

	}
	

	
	public bytesSend( bytesSend: number): void {
		this._bytesSend = bytesSend;
	}


}