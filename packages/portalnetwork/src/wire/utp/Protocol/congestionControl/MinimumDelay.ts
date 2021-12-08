import { MINIMUM_DIFFERENCE_TIMESTAMP_MICROSEC } from "../..";

export default class MinimumDelay {
  DELAY_SAMPLE_SIZE = 50;
  ourTimeStamp: number;
  minDelay: number;
  theirTimeStamp: number;
  theirMinDelay: number;
  ourLastDelays: number[];

  constructor() {
    this.DELAY_SAMPLE_SIZE = 50;
    this.ourTimeStamp = 0;
    this.minDelay = 0;
    this.theirTimeStamp = 0;
    this.theirMinDelay = 0;
    this.ourLastDelays = [];
  }
  getCorrectedMinDelay() {
    return this.minDelay;
  }

  /**
   * Updates the sender-to-reciever delays
   * @param difference delay
   * @param timestamp now.
   */
  updateOurDelay(difference: number, timestamp: number): void {
    if (
      timestamp - this.ourTimeStamp >= MINIMUM_DIFFERENCE_TIMESTAMP_MICROSEC ||
      (this.ourTimeStamp == 0 && this.minDelay == 0)
    ) {
      this.ourTimeStamp = timestamp;
      this.minDelay = difference;
    } else {
      if (difference < this.minDelay) {
        this.ourTimeStamp = timestamp;
        this.minDelay = difference;
      }
    }
  }
  /**
   * Updates the reciever-to-sender delays
   * @param difference delay
   * @param timestamp now.
   */
  updateTheirDelay(theirDifference: number, timeStampNow: number): void {
    if (
      timeStampNow - this.theirTimeStamp >=
        MINIMUM_DIFFERENCE_TIMESTAMP_MICROSEC ||
      (this.theirTimeStamp == 0 && this.theirMinDelay == 0)
    ) {
      this.theirMinDelay = theirDifference;
      this.theirTimeStamp = timeStampNow;
    } else {
      if (theirDifference < this.theirMinDelay) {
        this.theirTimeStamp = timeStampNow;
        this.minDelay += this.theirMinDelay - theirDifference;
        this.theirMinDelay = theirDifference;
      }
    }
  }

  getTheirMinDelay() {
    return this.theirMinDelay;
  }

  /**
   * Adds an delay sample.
   * @param ourDelay the delay
   */
  addSample(ourDelay: number): void {
    while (this.ourLastDelays.length > this.DELAY_SAMPLE_SIZE) {
      this.ourLastDelays.shift();
    }
    this.ourLastDelays.push(ourDelay);
  }

  /**
   * Calcs an average of the last delay samples.
   * @return avg delay.
   */
  getRecentAverageDelay() {
    let sum = 0;
    this.ourLastDelays.forEach((delay) => {
      sum += delay;
    });
    let sampleSize = this.ourLastDelays.length;
    if (sampleSize == 0) {
      return 0;
    } else {
      return sum / sampleSize;
    }
  }
}
