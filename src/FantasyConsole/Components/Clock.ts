import { Subject, Observable } from 'rxjs/Rx';
import { IDisposable } from '../Utils/IDisposable';

/**
 * Settings for a Clock object.
 */
export interface ClockSettings {

  /**
   * Clock speed defines how many clock cycles are execyted in a second. E.g. 1,000,000 clock speed is a 1 MHz clock.
   */
  readonly clockSpeed: number;

  /**
   * Update speed defines at which interval in milliseconds the clock will update and emit clock cycles.
   * If the update speed is not defined the clock will defaut to 60 ticks per second.
   */
  readonly updateSpeed?: number;
}

/**
 * The clock is the heart beat of our fantasy console.
 * It continuously emits a signal that lets the other system component know when to process data.
 */
export class Clock implements IDisposable {

  private _tick: Subject<number>;

  public readonly updateSpeed: number;

  /**
   * An observable that will emit how many clock cycles has passed since last tick.
   */
  public get tick(): Observable<number> {
    return this._tick.asObservable();
  }

  /**
   * Creates a new Clock.
   * @param clockSettings Clock settings for how our clock will run.
   */
  public constructor(public readonly clockSettings: ClockSettings) {
    this._tick = new Subject<number>();

    if (clockSettings.updateSpeed && clockSettings.updateSpeed > 0)
      this.updateSpeed = clockSettings.updateSpeed;
    else
      this.updateSpeed = 16; // 16 milliseconds ~= 60 ticks per second

    const update = Observable.interval(this.updateSpeed);
    const cyclesPerUpdate = Math.floor(clockSettings.clockSpeed / (1000 / this.updateSpeed));

    update.subscribe(ticks => {
      this._tick.next(cyclesPerUpdate);
    });
  }

  public dispose() {
    this._tick.complete();
  }
}