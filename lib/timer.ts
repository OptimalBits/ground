/**
  Ground Web Framework (c) 2013 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  Util Module. Include utility functions used in several parts of
  the framework.
*/

/// <reference path="base.ts" />

module Gnd {

/**
  Timer
  
  Self-correcting Accurate Timer (+/- 1ms accuracy).
  
  Listen to 'time' property for getting the current time at the given
  resolution.
  
  The timer will emit a ended: event when the timer has reached its duration,
  and 'stopped:' if the timer was stopped by the user.
  
  @class Timer
  @extends Base
  @constructor
  @param resolution {Numbers}
*/
export class Timer extends Base
{
  public time: number;
  
  private resolution: number;
  private timer;
  private baseline: number;
  private duration: number;

  constructor(resolution: number)
  {
    super();
    
    this.time = 0;
    this.timer = null;
    this.resolution = resolution;
  }

  destroy()
  {
    this.stop();
    super.destroy();
  }
  
  /**  
    Starts the timer with the given optionally duration in milliseconds.
    
    @method start
    @param duration {Number}
  */
  start(duration: number)
  {
    clearTimeout(this.timer);
    if(duration){
      this.duration = duration;
      this.baseline = Date.now();
    }
    this.duration && this.iter();
  }
  
  /**  
    Checks if the timer is currently running.
    
    @method isRunning
    @return {Boolean}
  */
  isRunning(): boolean
  {
    return (this.timer !== null);
  }
  
  /**  
    Stops the current timer.
    
    @method start
    @param duration {Number}
  */
  stop()
  {
    clearTimeout(this.timer);
    this.timer = null;
    this.emit('stopped:', this.baseline);
  }
  
  private iter()
  {
    var error = Date.now() - this.baseline;
  
    if(this.time >= this.duration){
      this.stop();
      this.emit('ended:', this.baseline);
    }else{
      var nextTick = this.resolution - error;
      this.timer = setTimeout(() => {
        this.set('time', this.time + this.resolution);
        this.baseline += this.resolution;
        this.iter();
      }, nextTick>=0 ? nextTick:0);
    }
  }
}

}