import { Clock, ClockSettings } from './Components/Clock';
import { Memory } from './Components/NewMemory';
import { MemoryController, MemoryControllerSettings, MemoryControllerSettingsProperty } from './Components/NewMemoryController';
import { Processor, Opcode, RegisterCode } from './Components/Processor';
import { VideoController, VideoControllerSettings } from './Components/VideoController';
import { KeyboardController } from './Components/KeyboardController';
import { Observable, Subscription } from 'rxjs/Rx';

export class FC {
  private _clock: Clock;
  private _memoryCtrl: MemoryController;
  private _processor: Processor;
  private _videoCtrl: VideoController;
  private _keyCtrl: KeyboardController;

  private _ram: Memory;
  private _vram: Memory;
  private _keyram: Memory;

  private _timer: Subscription = null;

  private _interruptQueue: Array<number> = []; // The queue should be quite small so it should be fine to use an array

  private _paused: boolean;
  public get paused(): boolean {
    return this._paused;
  }
  public set paused(val: boolean) {
    if (val === this.paused) return;
    this._paused = val;
    if (val)
      this.pauseTimer();
    else
      this.startTimer();
  }


  public get clock(): Clock {
    return this._clock;
  }

  public get memoryCtrl(): MemoryController {
    return this._memoryCtrl;
  }

  public get processor(): Processor {
    return this._processor;
  }

  public get videoCtrl(): VideoController {
    return this._videoCtrl;
  }

  public get keyCtrl(): KeyboardController {
    return this._keyCtrl;
  }

  public get ram(): Memory {
    return this._ram;
  }

  public get vram(): Memory {
    return this._vram;
  }

  public get keyram(): Memory {
    return this._keyram;
  }

  public constructor() {
    this._clock = new Clock(this.clockSettings);

    this.setupMemory();

    this._processor = new Processor(this.memoryCtrl);
    this._videoCtrl = new VideoController(this.videoCtrlSettings, this.vram, this.clock);
    this._keyCtrl = new KeyboardController(this.keyram);

    this.setupInterrupts();

    this.startTimer();
  }

  public pauseOnInterrupt = false;

  private _ticks = 0;
  private _tickCounter = 0;
  public get tickCounter(): number {
    return this._tickCounter;
  }

  public advance(ticks: number) {
    this._ticks = ticks;
    while (this._ticks > 0) {
      this.keyCtrl.process(1);
      this.processor.process(1);
      this.videoCtrl.process(1);
      // --ticks;
      if (this._interruptQueue.length > 0) {
        const address = this._interruptQueue[0];
        if (this.processor.interrupt(address)) {
          this._interruptQueue.shift();
          if (this.pauseOnInterrupt)
            this.paused = true;
          // console.log(address);
        }
      }

      this._tickCounter += 1;

      this._ticks -= 1;
    }
  }

  public togglePause() {
    this.paused = !this.paused;
  }

  public reboot() {
    this.paused = true;
    this.resetMemory();
    this.processor.reset();
    this._tickCounter = 0;
    this.paused = false;
  }

  public loadProgram(byteCode: Array<number>, address = 0) {
    this.paused = true;
    this.memoryCtrl.LoadFromArray(address, byteCode);
    this.processor.reset();
    this.processor.registers.pc = address;
    this.paused = false;
  }

  private pauseTimer() {
    this._timer.unsubscribe();
    this._timer = null;
    this._ticks = 0;
  }

  private startTimer() {
    if (this._timer !== null) return;
    this._timer = this.clock.tick.subscribe(ticks => {
      this.advance(ticks);
    });
  }

  private setupInterrupts() {
    this.videoCtrl.syncSignal.subscribe(address => this.handleInterrupt(address, this));
    this.videoCtrl.hblankSignal.subscribe(address => this.handleInterrupt(address, this));
    this.videoCtrl.vblankSignal.subscribe(address => this.handleInterrupt(address, this));
    this._keyCtrl.keySignal.subscribe(address => this.handleInterrupt(address, this));
  }

  private handleInterrupt(interruptAddress: number, fc: FC) {
    if (interruptAddress > 0)
      fc._interruptQueue.push(interruptAddress);
  }

  private setupMemory() {
    this._memoryCtrl = new MemoryController(this.memoryCtrlSettings);
    this._ram = this.memoryCtrl.GetMemoryModuleFromAddress(this.ramSettings.startAddress);
    this._vram = this.memoryCtrl.GetMemoryModuleFromAddress(this.vramSettings.startAddress);
    this._keyram = this.memoryCtrl.GetMemoryModuleFromAddress(this.keyboardSettings.startAddress);
    this.resetMemory();
  }

  private resetMemory() {
    /**
     * lui16 $mem 16!32769
     * lui16 $r1 16!511
     * lm8 $r0
     * :label
     * add8 $r0 $r0 $r1
     * sm8 $r0
     * jmp :label
     */
    // // Reset ram.
    // this.ram.uint8Clamped[0]  = Opcode.lui16;
    // this.ram.uint8Clamped[1]  = RegisterCode.mem;
    // this.ram.uint8Clamped[2]  = 0x01; // 32769
    // this.ram.uint8Clamped[3]  = 0x80;
    // // console.log(this.memoryCtrl.GetUint16FromAddress(2));
    // this.ram.uint8Clamped[4]  = Opcode.lui16;
    // this.ram.uint8Clamped[5]  = RegisterCode.r1; // writes to r0r1
    // this.ram.uint8Clamped[6]  = 0xff; // this will be written to r0 but we don't care since it will be overwritten
    // this.ram.uint8Clamped[7]  = 0x01; // 1
    // // console.log(this.memoryCtrl.GetUint16FromAddress(6));
    // this.ram.uint8Clamped[8]  = Opcode.lm8;
    // this.ram.uint8Clamped[9]  = RegisterCode.r0;
    // this.ram.uint8Clamped[10] = Opcode.add8;
    // this.ram.uint8Clamped[11] = RegisterCode.r0;
    // this.ram.uint8Clamped[12] = RegisterCode.r0;
    // this.ram.uint8Clamped[13] = RegisterCode.r1;
    // this.ram.uint8Clamped[14] = Opcode.sm8;
    // this.ram.uint8Clamped[15] = RegisterCode.r0;
    // this.ram.uint8Clamped[16] = Opcode.jmp;
    // this.ram.uint8Clamped[17] = 0x0a; // 10
    // this.ram.uint8Clamped[18] = 0x00;
    // console.log(this.memoryCtrl.GetUint16FromAddress(17));

    // Clear everything first
    this.memoryCtrl.FastClearMemoryBlock(0, 0, this.memoryCtrl._totalCapacity - 1);

    // Reset vram.
    this.vram.uint8Clamped[VideoController.VIDEO_MODE] = VideoController.BLOCK_MODE;
    this.vram.uint8Clamped[VideoController.PALETTE_BG] = 0x37;
    this.vram.uint8Clamped[VideoController.PALETTE_BG + 1] = 0x47;
    this.vram.uint8Clamped[VideoController.PALETTE_BG + 2] = 0x4F;
    this.vram.uint8Clamped[VideoController.PALETTE_FG] = 0xBB;
    this.vram.uint8Clamped[VideoController.PALETTE_FG + 1] = 0xD0;
    this.vram.uint8Clamped[VideoController.PALETTE_FG + 2] = 0xF8;

    // Load characters
    for (let i = 0; i < FC.CHARACTER_BLOCK_MAP.length; ++i) {
      this.vram.uint8Clamped[16 + i] = FC.CHARACTER_BLOCK_MAP[i];
    }

    // for (let i = 0; i < 240; ++i) { // TODO: remove this since we want display ram to be clear by default
    //   this.vram.uint8Clamped[5776 + i] = i;
    // }
  }

  readonly clockSettings: ClockSettings = {
    clockSpeed: 1000000,
    // clockSpeed: 500000,
    updateSpeed: 33
    // updateSpeed: 16
    // updateSpeed: 100
  };

  readonly ramSettings: MemoryControllerSettingsProperty = {
    startAddress: 0,
    capacity: 32768, // 32k memory
    isReadonly: false
  };

  readonly vramSettings: MemoryControllerSettingsProperty = {
    startAddress: 32768,
    capacity: 6088,
    isReadonly: false,
  };

  readonly keyboardSettings: MemoryControllerSettingsProperty = {
    startAddress: 38856,
    capacity: 256,
    isReadonly: false,
  };

  readonly memoryCtrlSettings: MemoryControllerSettings = {
    memoryModules: [
      this.ramSettings,
      this.vramSettings,
      this.keyboardSettings,
    ]
  };

  readonly videoCtrlSettings: VideoControllerSettings = {
    displayWidth: 160,
    displayHeight: 96,
    blockSize: 8,
    characterSize: 6,
    characterHPixelOffset: 2,
    blockMapSize: 1920,
    numberOfBlockMaps: 3,
    blockMapAddress: 16,
    displayAddress: 5776
  };

  static readonly CHARACTER_BLOCK_MAP: ReadonlyArray<number> = [
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x8, 0x8, 0x8, 0x8, 0x8, 0x0, 0x8, 0x0, 0x14, 0x14, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x14, 0x14, 0x3e, 0x14, 0x3e, 0x14, 0x14, 0x0, 0x8, 0x3c, 0xa, 0x1c, 0x28, 0x1e, 0x8, 0x0, 0x6, 0x26, 0x10, 0x8, 0x4, 0x32, 0x30, 0x0, 0x4, 0xa, 0xa, 0x4, 0x2a, 0x12, 0x2c, 0x0, 0x8, 0x8, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x10, 0x8, 0x8, 0x8, 0x8, 0x8, 0x10, 0x0, 0x4, 0x8, 0x8, 0x8, 0x8, 0x8, 0x4, 0x0, 0x0, 0x2a, 0x1c, 0x3e, 0x1c, 0x2a, 0x0, 0x0, 0x0, 0x8, 0x8, 0x3e, 0x8, 0x8, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x8, 0x8, 0x4, 0x0, 0x0, 0x0, 0x0, 0x1c, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x8, 0x0, 0x0, 0x20, 0x10, 0x8, 0x4, 0x2, 0x0, 0x0, 0x1c, 0x22, 0x32, 0x2a, 0x26, 0x22, 0x1c, 0x0, 0x8, 0xc, 0xa, 0x8, 0x8, 0x8, 0x3e, 0x0, 0x1c, 0x22, 0x20, 0x18, 0x4, 0x2, 0x3e, 0x0, 0x1c, 0x22, 0x20, 0x18, 0x20, 0x22, 0x1c,
    0x0, 0x10, 0x18, 0x14, 0x12, 0x3e, 0x10, 0x10, 0x0, 0x3e, 0x2, 0x1e, 0x20, 0x20, 0x22, 0x1c, 0x0, 0x1c, 0x22, 0x2, 0x1e, 0x22, 0x22, 0x1c, 0x0, 0x3e, 0x20, 0x10, 0x8, 0x8, 0x8, 0x8, 0x0, 0x1c, 0x22, 0x22, 0x1c, 0x22, 0x22, 0x1c, 0x0, 0x1c, 0x22, 0x22, 0x3c, 0x20, 0x22, 0x1c, 0x0, 0x0, 0x0, 0x8, 0x0, 0x8, 0x0, 0x0, 0x0, 0x0, 0x0, 0x8, 0x0, 0x8, 0x4, 0x0, 0x0, 0x10, 0x8, 0x4, 0x2, 0x4, 0x8, 0x10, 0x0, 0x0, 0x0, 0x1c, 0x0, 0x1c, 0x0, 0x0, 0x0, 0x4, 0x8, 0x10, 0x20, 0x10, 0x8, 0x4, 0x0, 0x1c, 0x22, 0x20, 0x10, 0x8, 0x0, 0x8, 0x0, 0x1c, 0x22, 0x3a, 0x2a, 0x1a, 0x2, 0x3c, 0x0, 0x1c, 0x22, 0x22, 0x22, 0x3e, 0x22, 0x22, 0x0, 0x1e, 0x22, 0x22, 0x1e, 0x22, 0x22, 0x1e, 0x0, 0x1c, 0x22, 0x2, 0x2, 0x2, 0x22, 0x1c, 0x0, 0x1e, 0x22, 0x22, 0x22, 0x22, 0x22, 0x1e, 0x0, 0x3e, 0x2, 0x2, 0x1e, 0x2, 0x2, 0x3e, 0x0, 0x3e, 0x2, 0x2, 0x1e, 0x2, 0x2, 0x2, 0x0, 0x1c, 0x22, 0x2, 0x3a, 0x2a, 0x22, 0x1c,
    0x0, 0x22, 0x22, 0x22, 0x3e, 0x22, 0x22, 0x22, 0x0, 0x8, 0x8, 0x8, 0x8, 0x8, 0x8, 0x8, 0x0, 0x10, 0x10, 0x10, 0x10, 0x10, 0x12, 0xc, 0x0, 0x22, 0x22, 0x12, 0xe, 0x12, 0x22, 0x22, 0x0, 0x2, 0x2, 0x2, 0x2, 0x2, 0x2, 0x3e, 0x0, 0x22, 0x36, 0x2a, 0x2a, 0x22, 0x22, 0x22, 0x0, 0x22, 0x22, 0x26, 0x2a, 0x32, 0x22, 0x22, 0x0, 0x1c, 0x22, 0x22, 0x22, 0x22, 0x22, 0x1c, 0x0, 0x1e, 0x22, 0x22, 0x1e, 0x2, 0x2, 0x2, 0x0, 0x1c, 0x22, 0x22, 0x22, 0x2a, 0x32, 0x3c, 0x0, 0x1e, 0x22, 0x22, 0x1e, 0x22, 0x22, 0x22, 0x0, 0x3c, 0x2, 0x2, 0x1c, 0x20, 0x20, 0x1e, 0x0, 0x3e, 0x8, 0x8, 0x8, 0x8, 0x8, 0x8, 0x0, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x1c, 0x0, 0x22, 0x22, 0x22, 0x22, 0x22, 0x14, 0x8, 0x0, 0x22, 0x22, 0x22, 0x2a, 0x2a, 0x36, 0x22, 0x0, 0x22, 0x22, 0x14, 0x8, 0x14, 0x22, 0x22, 0x0, 0x22, 0x22, 0x14, 0x8, 0x8, 0x8, 0x8, 0x0, 0x3e, 0x20, 0x10, 0x8, 0x4, 0x2, 0x3e, 0x0, 0x18, 0x8, 0x8, 0x8, 0x8, 0x8, 0x18,
    0x0, 0x0, 0x2, 0x4, 0x8, 0x10, 0x20, 0x0, 0x0, 0xc, 0x8, 0x8, 0x8, 0x8, 0x8, 0xc, 0x0, 0x8, 0x14, 0x22, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x3e, 0x0, 0x4, 0x8, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x1c, 0x20, 0x3c, 0x22, 0x3c, 0x0, 0x2, 0x2, 0x2, 0x1e, 0x22, 0x22, 0x1e, 0x0, 0x0, 0x0, 0x1c, 0x22, 0x2, 0x22, 0x1c, 0x0, 0x20, 0x20, 0x20, 0x3c, 0x22, 0x22, 0x3c, 0x0, 0x0, 0x0, 0x1c, 0x22, 0x3e, 0x2, 0x3c, 0x0, 0x18, 0x24, 0x4, 0xe, 0x4, 0x4, 0x4, 0x0, 0x0, 0x0, 0x1c, 0x22, 0x3c, 0x20, 0x1c, 0x0, 0x2, 0x2, 0x2, 0x1e, 0x22, 0x22, 0x22, 0x0, 0x4, 0x0, 0x4, 0x4, 0x4, 0x4, 0x4, 0x0, 0x0, 0x20, 0x20, 0x20, 0x20, 0x22, 0x1c, 0x0, 0x0, 0x0, 0x12, 0x12, 0xe, 0x12, 0x12, 0x0, 0xc, 0x8, 0x8, 0x8, 0x8, 0x8, 0x1c, 0x0, 0x0, 0x0, 0x1e, 0x2a, 0x2a, 0x2a, 0x2a, 0x0, 0x0, 0x0, 0x1e, 0x22, 0x22, 0x22, 0x22, 0x0, 0x0, 0x0, 0x1c, 0x22, 0x22, 0x22, 0x1c,
    0x0, 0x0, 0x0, 0xe, 0x12, 0xe, 0x2, 0x2, 0x0, 0x0, 0x0, 0x1c, 0x22, 0x22, 0x32, 0x3c, 0x0, 0x0, 0x0, 0x1a, 0x26, 0x2, 0x2, 0x2, 0x0, 0x0, 0x0, 0x3c, 0x2, 0x1c, 0x20, 0x1e, 0x0, 0x8, 0x8, 0x1c, 0x8, 0x8, 0x8, 0x30, 0x0, 0x0, 0x0, 0x22, 0x22, 0x22, 0x32, 0x2c, 0x0, 0x0, 0x0, 0x22, 0x22, 0x22, 0x14, 0x8, 0x0, 0x0, 0x0, 0x22, 0x22, 0x2a, 0x3e, 0x2a, 0x0, 0x0, 0x0, 0x22, 0x14, 0x8, 0x14, 0x22, 0x0, 0x0, 0x0, 0x22, 0x22, 0x3c, 0x20, 0x1e, 0x0, 0x0, 0x0, 0x3e, 0x10, 0x8, 0x4, 0x3e, 0x0, 0x10, 0x8, 0x8, 0x4, 0x8, 0x8, 0x10, 0x0, 0x8, 0x8, 0x8, 0x8, 0x8, 0x8, 0x8, 0x0, 0x4, 0x8, 0x8, 0x10, 0x8, 0x8, 0x4, 0x0, 0x0, 0x0, 0x24, 0x2a, 0x12, 0x0, 0x0, 0x0, 0x1c, 0x22, 0x2, 0x4, 0xe, 0x4, 0x3e, 0x0, 0x22, 0x1c, 0x22, 0x22, 0x22, 0x1c, 0x22, 0x0, 0x0, 0x8, 0x18, 0x3e, 0x18, 0x8, 0x0, 0x0, 0x0, 0x8, 0xc, 0x3e, 0xc, 0x8, 0x0, 0x0, 0x0, 0x8, 0x1c, 0x3e, 0x8, 0x8, 0x0,
    0x0, 0x0, 0x8, 0x8, 0x3e, 0x1c, 0x8, 0x0, 0x0, 0x3e, 0x3e, 0x3e, 0x3e, 0x3e, 0x3e, 0x3e, 0x0, 0x2a, 0x14, 0x2a, 0x14, 0x2a, 0x14, 0x2a, 0x0, 0x3e, 0x0, 0x3e, 0x0, 0x3e, 0x0, 0x3e, 0x0, 0x2a, 0x2a, 0x2a, 0x2a, 0x2a, 0x2a, 0x2a, 0x0, 0x0, 0x8, 0x0, 0x3e, 0x0, 0x8, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x0, 0x0, 0x0, 0xff, 0xff, 0x0, 0x0, 0x0, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xff, 0xff, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0xff, 0xff, 0xff, 0xff, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0xff, 0xff, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0xff, 0xff,
    0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xff, 0xff, 0xff, 0xff, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0xff, 0xff, 0x3, 0x3, 0x3, 0xff, 0xff, 0x3, 0x3, 0x3, 0xc0, 0xc0, 0xc0, 0xff, 0xff, 0xc0, 0xc0, 0xc0, 0x18, 0x18, 0x18, 0xff, 0xff, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0xff, 0xff, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0xff, 0xff, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x1f, 0x1f, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0xf8, 0xf8, 0x18, 0x18, 0x18, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xff, 0x0, 0xff, 0x0, 0xff, 0x0, 0xff, 0x0, 0x0, 0xff, 0x0, 0xff, 0x0, 0xff, 0x0, 0xff, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xff, 0xff, 0x0, 0x0, 0xff, 0xff, 0x0, 0x0, 0x0, 0x0, 0xff, 0xff, 0x0, 0x0, 0xff, 0xff, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0xcc, 0xcc, 0xcc, 0xcc, 0xcc, 0xcc, 0xcc, 0xcc,
    0x3, 0x3, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0xc0, 0xc0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0xc0, 0xc0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x3, 0x3, 0xff, 0xff, 0xc3, 0xc3, 0xc3, 0xc3, 0xff, 0xff, 0x0, 0x0, 0x3c, 0x3c, 0x3c, 0x3c, 0x0, 0x0, 0x0, 0x0, 0x0, 0x7, 0xf, 0x1c, 0x18, 0x18, 0x0, 0x0, 0x0, 0xe0, 0xf0, 0x38, 0x18, 0x18, 0x18, 0x18, 0x1c, 0xf, 0x7, 0x0, 0x0, 0x0, 0x18, 0x18, 0x38, 0xf0, 0xe0, 0x0, 0x0, 0x0, 0x18, 0x24, 0x42, 0x81, 0x81, 0x42, 0x24, 0x18, 0x3c, 0x42, 0x81, 0x81, 0x81, 0x81, 0x42, 0x3c, 0x3c, 0x42, 0x81, 0xa5, 0x81, 0x99, 0x42, 0x3c, 0x3c, 0x42, 0xa5, 0x81, 0xa5, 0x99, 0x42, 0x3c, 0x3c, 0x42, 0xa5, 0x81, 0x99, 0xa5, 0x42, 0x3c, 0xff, 0xff, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0xff, 0xff, 0xff, 0xff, 0x3, 0x3, 0x3, 0x3, 0xff, 0xff, 0xff, 0xff, 0xc0, 0xc0, 0xc0, 0xc0, 0xff, 0xff, 0x0, 0x0, 0x0, 0x3, 0x3, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0xc0, 0xc0, 0x0, 0x0, 0x0, 0x18, 0x18, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x18, 0x18, 0x0, 0x0, 0x0, 0x18, 0x18, 0x0, 0x0, 0x0, 0xc0, 0xe0, 0x70, 0x38, 0x1c, 0xe, 0x7, 0x3, 0x3, 0x7, 0xe, 0x1c, 0x38, 0x70, 0xe0, 0xc0, 0x0, 0x66, 0xff, 0xff, 0x7e, 0x3c, 0x18, 0x0, 0x0, 0x18, 0x3c, 0x7e, 0xff, 0xff, 0xdb, 0x18, 0x8, 0x1c, 0x1c, 0x3e, 0x3e, 0x1c, 0x1c, 0x8, 0x18, 0x3c, 0x5a, 0xff, 0xff, 0x5a, 0x18, 0x18, 0xc3, 0xe7, 0x7e, 0x3c, 0x3c, 0x7e, 0xe7, 0xc3, 0xff, 0xff, 0xff, 0xff, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0xff, 0xff, 0xff, 0xff, 0xf, 0xf, 0xf, 0xf, 0xf, 0xf, 0xf, 0xf, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0x33, 0x33, 0xcc, 0xcc, 0x33, 0x33, 0xcc, 0xcc, 0xcc, 0xcc, 0x33, 0x33, 0xcc, 0xcc, 0x33, 0x33, 0xf, 0xf, 0xf, 0xf, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0xf, 0xf, 0xf, 0xf, 0xf, 0xf, 0xf, 0xf, 0x0, 0x0, 0x0, 0x0,
    0xf0, 0xf0, 0xf0, 0xf0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0xf0, 0xf0, 0xf0, 0xf0, 0x0, 0x0, 0x0, 0x0, 0xf, 0xf, 0xf, 0xf, 0x55, 0xff, 0x55, 0xff, 0x55, 0xff, 0x55, 0xff, 0xff, 0x55, 0xff, 0x55, 0xff, 0x55, 0xff, 0x55, 0xaa, 0xff, 0xaa, 0xff, 0xaa, 0xff, 0xaa, 0xff, 0xff, 0xaa, 0xff, 0xaa, 0xff, 0xaa, 0xff, 0xaa, 0x0, 0x10, 0x10, 0x10, 0x10, 0x1c, 0x1e, 0xc, 0x0, 0x10, 0x30, 0x10, 0x10, 0x1c, 0x1e, 0xc, 0x0, 0x10, 0x30, 0x10, 0x30, 0x1c, 0x1e, 0xc, 0x0, 0x10, 0x10, 0x10, 0x10, 0x1c, 0x12, 0xc, 0x0, 0x0, 0x0, 0x0, 0x0, 0xc, 0x12, 0xc, 0x0, 0x30, 0x10, 0x30, 0x10, 0x1c, 0x1e, 0xc, 0x0, 0x1f, 0x10, 0x1f, 0x10, 0x1c, 0x1e, 0xc, 0x0, 0x30, 0x10, 0x10, 0x10, 0x1c, 0x1e, 0xc, 0x0, 0x1f, 0x10, 0x10, 0x10, 0x1c, 0x1e, 0xc, 0x0, 0x3f, 0x10, 0x3f, 0x10, 0x1c, 0x1e, 0xc, 0x0, 0x3f, 0x10, 0x10, 0x10, 0x1c, 0x1e, 0xc, 0x0, 0x0, 0x0, 0x14, 0x3e, 0x14, 0x3e, 0x14, 0x0, 0x0, 0x2, 0x2, 0x2, 0xe, 0x12, 0xc,
    0x8, 0xc, 0xe, 0xff, 0xff, 0xe, 0xc, 0x8, 0x10, 0x30, 0x70, 0xff, 0xff, 0x70, 0x30, 0x10, 0x18, 0x3c, 0x7e, 0xff, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0xff, 0x7e, 0x3c, 0x18, 0x4, 0xc, 0x1c, 0x3c, 0x3c, 0x1c, 0xc, 0x4, 0xa, 0x1a, 0x3a, 0x7a, 0x7a, 0x3a, 0x1a, 0xa, 0x0, 0x7e, 0x7e, 0x7e, 0x7e, 0x7e, 0x7e, 0x0, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x20, 0x30, 0x38, 0x3c, 0x3c, 0x38, 0x30, 0x20, 0x50, 0x58, 0x5c, 0x5e, 0x5e, 0x5c, 0x58, 0x50, 0x18, 0x3c, 0x3c, 0x18, 0x3c, 0x3c, 0x3c, 0x18, 0x18, 0x3c, 0x3c, 0x18, 0x3c, 0x3c, 0x7e, 0x7e, 0x0, 0x8, 0xc, 0xf, 0xf, 0xc, 0x8, 0x0, 0x0, 0x48, 0x8c, 0xaf, 0xaf, 0x8c, 0x48, 0x0, 0x18, 0x18, 0x3c, 0xe7, 0xe7, 0x3c, 0x18, 0x18, 0x38, 0x98, 0xd8, 0xf8, 0x7c, 0xe, 0x7, 0x3, 0x18, 0x24, 0x42, 0xff, 0x42, 0x52, 0x52, 0x7e, 0x7e, 0x42, 0x5a, 0x42, 0x5a, 0x42, 0x42, 0x7e, 0xbc, 0xc2, 0xe1, 0x1, 0x1, 0x81, 0x42, 0x3c, 0x3d, 0x43, 0x87, 0x80, 0x80, 0x81, 0x42, 0x3c,
    0x0, 0x3c, 0x4a, 0x4a, 0x5a, 0x42, 0x3c, 0x42, 0x18, 0x66, 0x81, 0x99, 0x5a, 0x42, 0x24, 0x18, 0xd3, 0xc3, 0xff, 0x81, 0x81, 0x81, 0x81, 0xff, 0xf, 0x9, 0xff, 0x81, 0x81, 0x81, 0x81, 0xff, 0x0, 0x2, 0x6, 0xe, 0x1e, 0xe, 0x1a, 0x18, 0xff, 0x7f, 0x3f, 0x1f, 0xf, 0x7, 0x3, 0x1, 0xff, 0xfe, 0xfc, 0xf8, 0xf0, 0xe0, 0xc0, 0x80, 0x80, 0xc0, 0xe0, 0xf0, 0xf8, 0xfc, 0xfe, 0xff, 0x1, 0x3, 0x7, 0xf, 0x1f, 0x3f, 0x7f, 0xff, 0xc3, 0x81, 0x0, 0x0, 0x0, 0x0, 0x81, 0xc3, 0xe7, 0xc3, 0x81, 0x0, 0x0, 0x81, 0xc3, 0xe7, 0xe7, 0xe7, 0xe7, 0x0, 0x0, 0xe7, 0xe7, 0xe7, 0x3, 0x3, 0x3, 0x0, 0x0, 0x3, 0x3, 0x3, 0x0, 0x0, 0x18, 0x3c, 0x7e, 0xff, 0x0, 0x0, 0x0, 0x0, 0xff, 0x7e, 0x3c, 0x18, 0x0, 0x0, 0x0, 0x0, 0x18, 0x3c, 0x7e, 0x0, 0x0, 0x0, 0x0, 0x0, 0x7e, 0x3c, 0x18, 0x0, 0x0, 0x0, 0x0, 0x10, 0x18, 0x1c, 0x1c, 0x18, 0x10, 0x0, 0x0, 0x4, 0xc, 0x1c, 0x1c, 0xc, 0x4, 0x0, 0xf, 0x9, 0x9, 0x67, 0x11, 0x61, 0x81, 0x71,
  ];
}