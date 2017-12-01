import { Observable, Subject } from 'rxjs/Rx';
import { Clock } from './Clock';
import { Memory } from './NewMemory';

export interface VideoControllerSettings {
  readonly displayWidth: number;
  readonly displayHeight: number;
  // readonly bitsPerPixel: number; // We are just gonna asume 1 bpp since the compo theme is 1-bit display
  readonly blockSize: number;
  readonly characterSize: number;
  readonly characterHPixelOffset: number;
  readonly blockMapSize: number;
  readonly numberOfBlockMaps: number;
  readonly blockMapAddress: number;
  readonly displayAddress: number;
}

export class VideoController {
  public static readonly FPS = 30;

  // Addresses for video controller settings
  public static readonly VIDEO_MODE = 0;
  public static readonly PALETTE_BG = 1;
  public static readonly PALETTE_FG = 4;
  public static readonly CURRENT_BLOCK_MAP = 7;
  public static readonly SYNC_INTERRUPT = 8;
  public static readonly HBLANK_INTERRUPT = 10;
  public static readonly VBLANK_INTERRUPT = 12;

  // Video Controller constants
  public static readonly BLOCK_MODE = 0;
  public static readonly CHARACTER_MODE = 1;

  private readonly vcs: VideoControllerSettings;

  private readonly blockWidth;
  private readonly blockHeight;
  private readonly blockByteLength;
  private readonly characterWidth;

  private display: ArrayBuffer;
  private readonly bufferLength: number;
  public readonly output: Uint8ClampedArray;
  public readonly output32: Uint32Array;

  private readonly cyclesPerFrame: number;
  private readonly totalPixels: number;
  private readonly cyclesPerPixel: number;
  private readonly cyclesPerHBlank: number;
  private readonly cyclesPerVBlank: number;
  private readonly cyclesPerFPSSync: number;

  private tickCounter: number;
  private frameUpdaterInstance: IterableIterator<number>;

  public frameCounter: number;

  private readonly _syncSignal: Subject<number>;
  private readonly _hblankSignal: Subject<number>;
  private readonly _vblankSignal: Subject<number>;

  public get syncSignal(): Observable<number> {
    return this._syncSignal.asObservable();
  }

  public get hblankSignal(): Observable<number> {
    return this._hblankSignal.asObservable();
  }

  public get vblankSignal(): Observable<number> {
    return this._vblankSignal.asObservable();
  }

  public constructor(videoControllerSettings: VideoControllerSettings, private readonly vram: Memory, private readonly clock: Clock) {
    this.vcs = videoControllerSettings;

    this.blockWidth = this.vcs.displayWidth / this.vcs.blockSize;
    this.blockHeight = this.vcs.displayHeight / this.vcs.blockSize;
    this.blockByteLength = Math.ceil(this.vcs.blockSize ** 2 / 8);
    this.bufferLength = this.vcs.displayWidth * this.vcs.displayHeight * 4;
    this.characterWidth = Math.floor(this.vcs.displayWidth / this.vcs.characterSize);

    this.display = new ArrayBuffer(this.bufferLength);
    this.output = new Uint8ClampedArray(this.display);
    this.output32 = new Uint32Array(this.display);

    this.cyclesPerFrame = Math.floor(this.clock.clockSettings.clockSpeed / VideoController.FPS);
    this.totalPixels = this.vcs.displayWidth * this.vcs.displayHeight;
    this.cyclesPerPixel = 2;
    this.cyclesPerHBlank = 12;
    this.cyclesPerVBlank = this.cyclesPerFrame - this.totalPixels * this.cyclesPerPixel - this.vcs.displayHeight * this.cyclesPerHBlank;
    this.cyclesPerFPSSync = this.clock.clockSettings.clockSpeed - this.cyclesPerFrame * VideoController.FPS;

    // console.log(`Cycles per frame: ${this.cyclesPerFrame}`);
    // console.log(`Total pixels: ${this.totalPixels}`);
    // console.log(`Cycles per pixel: ${this.cyclesPerPixel}`);
    // console.log(`Cycles per h-blank: ${this.cyclesPerHBlank}`);
    // console.log(`Cycles per v-blank: ${this.cyclesPerVBlank}`);
    // console.log(`Cycles per fps sync: ${this.cyclesPerFPSSync}`);
    // console.log(`Total cycles used per frame: ${this.cyclesPerPixel * this.totalPixels + this.cyclesPerHBlank * this.vcs.displayHeight + this.cyclesPerVBlank}`);

    this._syncSignal = new Subject<number>();
    this._hblankSignal = new Subject<number>();
    this._vblankSignal = new Subject<number>();

    this.frameCounter = 0;
    this.tickCounter = 0;
    this.frameUpdaterInstance = this.frameUpdater();
    // this.clock.tick.subscribe(tick => {
    //   // this.tickCounter -= tick;
    //   // if (this.tickCounter <= 0) {
    //   //   this.tickCounter = this.frameUpdaterInstance.next().value;
    //   // }
    //   this.tickCounter += tick;
    //   while (this.tickCounter > 0)
    //     this.tickCounter -= this.frameUpdaterInstance.next().value;
    // });
  }

  process(tick: number) {
    this.tickCounter += tick;
    while (this.tickCounter > 0)
      this.tickCounter -= this.frameUpdaterInstance.next().value;
  }

  /**
   * 30 fps display
   * 1MHz clock ~= 33333 cycles per frame
   * 160*96 = 15360 pixels
   * 2 cycles per pixel => 2613 cycles left of the frame
   * 12 cycles per h blank = 1152 cycles
   * 1461 cycles left for v blank
   * 10 cycles delay after every 30 v blanks to perfectly sync up
   */

  *frameUpdater() {
    while (true) {
      if (this.frameCounter === VideoController.FPS) {
        this.frameCounter = 0;
        const syncAddress = this.vram.dataView.getUint16(VideoController.SYNC_INTERRUPT, true);
        this._syncSignal.next(syncAddress);
        yield this.cyclesPerFPSSync;
      }

      for (let y = 0; y < this.vcs.displayHeight; y++) {
        const blockY = Math.floor(y / this.vcs.blockSize);
        const blockPixelY = y - blockY * this.vcs.blockSize;
        for (let x = 0; x < this.vcs.displayWidth; x++) {
          let blockSize, hPixelOffset: number;
          switch (this.vram.uint8Clamped[VideoController.VIDEO_MODE]) {
            case VideoController.BLOCK_MODE:
              blockSize = this.vcs.blockSize;
              hPixelOffset = 0;
              break;
            case VideoController.CHARACTER_MODE:
              blockSize = this.vcs.characterSize;
              hPixelOffset = this.vcs.characterHPixelOffset;
              break;
            default: blockSize = this.vcs.blockSize; break;
          }
          let pixel = false;
          if (x >= hPixelOffset && x <= this.vcs.displayWidth - hPixelOffset) {
            const blockX = Math.floor((x - hPixelOffset) / blockSize);
            const blockWidth = Math.floor(this.vcs.displayWidth / blockSize);
            const blockId = this.vram.uint8Clamped[this.vcs.displayAddress + blockY * blockWidth + blockX];
            const blockPixelX = (x - hPixelOffset) - blockX * blockSize;
            pixel = this.getBlockPixel(blockPixelX, blockPixelY, blockId);
          }
          const palleteAddress = pixel ? VideoController.PALETTE_FG : VideoController.PALETTE_BG;
          const displayAddress = (y * this.vcs.displayWidth + x) * 4;

          for (let i = 0; i < 3; ++i) {
            this.output[displayAddress + i] = this.vram.uint8Clamped[palleteAddress + i];
          }
          this.output[displayAddress + 3] = 255;
          yield this.cyclesPerPixel;
        }
        const hblankAddress = this.vram.dataView.getUint16(VideoController.HBLANK_INTERRUPT, true);
        this._hblankSignal.next(hblankAddress);
        yield this.cyclesPerHBlank;
      }

      ++this.frameCounter;
      const vblankAddress = this.vram.dataView.getUint16(VideoController.VBLANK_INTERRUPT, true);
      this._vblankSignal.next(vblankAddress);
      yield this.cyclesPerVBlank;
    }
  }

  // *frameUpdater() { // TODO: implement character mode
  //   while (true) {
  //     if (this.frameCounter === VideoController.FPS) {
  //       this.frameCounter = 0;
  //       this._syncSignal.next(this.cyclesPerFPSSync);
  //       yield this.cyclesPerFPSSync;
  //     }

  //     for (let y = 0; y < this.vcs.displayHeight; y++) {
  //       const blockY = Math.floor(y / this.vcs.blockSize);
  //       const blockPixelY = y - blockY * this.vcs.blockSize;
  //       for (let x = 0; x < this.vcs.displayWidth; x++) {
  //         let blockSize, hPixelOffset: number;
  //         switch (this.vram[VideoController.VIDEO_MODE]) {
  //           case VideoController.BLOCK_MODE:
  //             blockSize = this.vcs.blockSize;
  //             hPixelOffset = 0;
  //             break;
  //           case VideoController.CHARACTER_MODE:
  //             blockSize = this.vcs.characterSize;
  //             hPixelOffset = this.vcs.characterHPixelOffset;
  //             break;
  //           default: blockSize = this.vcs.blockSize; break;
  //         }
  //         const blockX = Math.floor((x - hPixelOffset) / blockSize);
  //         const blockWidth = this.vcs.displayWidth / blockSize;
  //         const blockId = this.vram[this.vcs.displayAddress + blockY * blockWidth + blockX];
  //         const blockPixelX = (x - hPixelOffset) - blockX * blockSize;
  //         const pixel = this.getBlockPixel(blockPixelX, blockPixelY, blockId);
  //         const palleteAddress = pixel ? VideoController.PALETTE_FG : VideoController.PALETTE_BG;
  //         const displayAddress = (y * this.vcs.displayWidth + x) * 4;

  //         for (let i = 0; i < 3; ++i) {
  //           this.output[displayAddress + i] = this.vram[palleteAddress + i];
  //         }
  //         this.output[displayAddress + 3] = 255;
  //         yield this.cyclesPerPixel;
  //       }
  //       this._hblankSignal.next(this.cyclesPerHBlank);
  //       yield this.cyclesPerHBlank;
  //     }

  //     ++this.frameCounter;
  //     this._vblankSignal.next(this.cyclesPerVBlank);
  //     yield this.cyclesPerVBlank;
  //   }
  // }

  updateDisplay() {
    switch (this.vram.uint8Clamped[VideoController.VIDEO_MODE]) {
      case VideoController.BLOCK_MODE: this.updateBlockMode(); break;
      case VideoController.CHARACTER_MODE: this.updateCharacterMode(); break;
      default: break;
    }
  }

  updateBlockMode() {
    for (let y = 0; y < this.blockHeight; ++y) {
      for (let yy = 0; yy < this.vcs.blockSize; ++yy) {
        for (let x = 0; x < this.blockWidth; ++x) {
          const blockId = this.vram.uint8Clamped[this.vcs.displayAddress + y * this.blockWidth + x];
            for (let xx = 0; xx < this.vcs.blockSize; ++xx) {
              const pixel = this.getBlockPixel(xx, yy, blockId);
              const palleteAddress = pixel ? VideoController.PALETTE_FG : VideoController.PALETTE_BG;
              const displayAddress = ((y * this.vcs.blockSize + yy) * this.vcs.displayWidth + x * this.vcs.blockSize + xx) * 4;
              for (let i = 0; i < 3; ++i) {
                this.output[displayAddress + i] = this.vram.uint8Clamped[palleteAddress + i];
              }
              this.output[displayAddress + 3] = 255;
            }
        }
      }
    }
  }

  updateCharacterMode() {
    for (let y = 0; y < this.blockHeight; ++y) {
      for (let yy = 0; yy < this.vcs.blockSize; ++yy) {
        for (let x = 0; x < this.characterWidth; ++x) {
          const blockId = this.vram.uint8Clamped[this.vcs.displayAddress + y * this.blockWidth + x];
            for (let xx = 0; xx < this.vcs.characterSize; ++xx) {
              const pixel = this.getBlockPixel(xx, yy, blockId);
              const palleteAddress = pixel ? VideoController.PALETTE_FG : VideoController.PALETTE_BG;
              const displayAddress = ((y * this.vcs.blockSize + yy) * this.vcs.displayWidth + x * this.vcs.characterSize + xx + this.vcs.characterHPixelOffset) * 4;
              for (let i = 0; i < 3; ++i) {
                this.output[displayAddress + i] = this.vram.uint8Clamped[palleteAddress + i];
              }
              this.output[displayAddress + 3] = 255;
            }
        }
      }
    }
    for (let y = 0; y < this.vcs.displayHeight; ++y) {
      for (let x = 0; x < this.vcs.characterHPixelOffset; ++x) {
        const displayAddress = y * this.vcs.displayWidth * 4 + x * 4;
        for (let i = 0; i < 3; ++i) {
          this.output[displayAddress + i] = this.vram.uint8Clamped[VideoController.PALETTE_BG + i];
        }
        this.output[displayAddress + 3] = 255;
      }
    }
    for (let y = 0; y < this.vcs.displayHeight; ++y) {
      for (let x = this.vcs.displayWidth - this.vcs.characterHPixelOffset; x < this.vcs.displayWidth; ++x) {
        const displayAddress = y * this.vcs.displayWidth * 4 + x * 4;
        for (let i = 0; i < 3; ++i) {
          this.output[displayAddress + i] = this.vram.uint8Clamped[VideoController.PALETTE_BG + i];
        }
        this.output[displayAddress + 3] = 255;
      }
    }
  }

  private readonly BIT_MASKS = [
    0x01,
    0x02,
    0x04,
    0x08,
    0x10,
    0x20,
    0x40,
    0x80
  ];

  private getBlockPixel(x: number, y: number, blockId: number): boolean {
    const currentBlock = this.vram.uint8Clamped[VideoController.CURRENT_BLOCK_MAP];
    const blockMapAddress = this.vcs.blockMapAddress + currentBlock * this.vcs.blockMapSize * this.blockByteLength;
    const blockAddress = blockMapAddress + blockId * this.blockByteLength;
    const byteOffset = y * Math.ceil(this.vcs.blockSize / 8) + Math.floor(x / 8);
    const byte = this.vram.uint8Clamped[blockAddress + byteOffset];
    const bitIndex = x % 8;
    return ((byte & this.BIT_MASKS[bitIndex]) !== 0);
  }
}