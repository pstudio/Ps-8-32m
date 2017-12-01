import * as Assets from '../assets';
import { Clock, ClockSettings } from '../FantasyConsole/Components/Clock';
import { Memory } from '../FantasyConsole/Components/Memory';
import { VideoController, VideoControllerSettings } from '../FantasyConsole/Components/VideoController';
import { Observable } from 'rxjs/Rx';
import { FC } from '../FantasyConsole/FC';
import * as PS from '../utils/PixelScale';
import * as Tools from '../Tools/Tools';
import * as dat from 'dat-gui';
import { debug } from 'util';
import { MemoryDebugger } from '../Tools/MemoryDebugger';
import { KeyCode } from 'phaser-ce';
import * as $ from 'jquery';

export default class Computer extends Phaser.State {
  private clock: Clock;
  private vram: Memory;
  private videoController: VideoController;

  private fc: FC;

  private display: Phaser.BitmapData;

  private startComputerOnResume: boolean;

  private cyclesText: JQuery<HTMLElement>;

  public init() {
    this.fc = new FC();
    this.fc.paused = true;

    this.cyclesText = $('#cycles');
    if (this.fc.paused)
      this.cyclesText.text(`Cycles: ${this.fc.tickCounter} - PAUSED`);
    else
      this.cyclesText.text(`Cycles: ${this.fc.tickCounter}`);

    // Set up display settings so the user can set scale and render crispness.
    const gui = new dat.GUI();
    const displayGui = gui.addFolder('Display settings');
    const scaleControl = displayGui.add(PS.pixelScale, 'scale', [1, 2, 3, 4, 5, 6, 7, 8]);
    scaleControl.onFinishChange((scale) => {
        PS.SetScaleAndCalculateDimensions(scale, PS.pixelScale);
        PS.UpdateGameScale(PS.pixelScale, this.game);
    });
    const crispControl = displayGui.add(PS.pixelScale, 'crisp');
    crispControl.onFinishChange((crisp) => {
        PS.pixelScale.crisp = crisp;
        PS.UpdateGameCrispness(PS.pixelScale, this.game);
    });

    // Set up Debug tools
    const debugGui = gui.addFolder('Debug');
    debugGui.add(this.fc, 'togglePause').name('pause/resume').onFinishChange(_ => {
      if (this.fc.paused)
        this.cyclesText.text(`Cycles: ${this.fc.tickCounter} - PAUSED`);
      else
        this.cyclesText.text(`Cycles: ${this.fc.tickCounter}`);
    });
    debugGui.add(this.fc, 'pauseOnInterrupt').name('pause on interrupt');
    const debugOptions = {
      steps: 1,
      step: function() {
      },
      log: function() {}
    };
    debugGui.add(debugOptions, 'steps', 1, 1000000).step(100).name('cycles');
    debugGui.add(debugOptions, 'step').name('step forward').onFinishChange(_ => {
      this.fc.advance(debugOptions.steps);
      if (this.fc.paused)
        this.cyclesText.text(`Cycles: ${this.fc.tickCounter} - PAUSED`);
      else
        this.cyclesText.text(`Cycles: ${this.fc.tickCounter}`);

      const memDebug = Tools.ToolMenu.getTool(Tools.SelectedTool.MemoryDebugger) as MemoryDebugger;
      memDebug.updateMemoryWindow();
    });
    debugGui.add(debugOptions, 'log').name('log memory').onFinishChange(_ => console.log(this.fc));

    // Set up Bitmap Encoder tool
    Tools.ToolMenu.init(this.fc);
    const toolGui = gui.addFolder('Tools menu');
    toolGui.add(Tools.ToolMenu.selectedTool, 'selectedTool', {
        None: Tools.SelectedTool.None,
        BitmapEncoder: Tools.SelectedTool.BitmapEncoder,
        MemoryDebugger: Tools.SelectedTool.MemoryDebugger,
        Compiler: Tools.SelectedTool.Compiler,
    }).name('tool');
    toolGui.add(Tools.ToolMenu, 'refreshSelectedTool').name('select tool');

    gui.open();
    displayGui.open();
    debugGui.open();
    toolGui.open();
}

  public create(): void {
    this.game.input.keyboard.addCallbacks(this, this.keyDown, this.keyUp);
    // this.fc.clock.tick.bufferTime(1000).subscribe(t => console.log(t.length));
    // this.fc.clock.tick.bufferCount(33333).subscribe(_ => this.updateScreen());
    this.fc.videoCtrl.vblankSignal.subscribe(_ => this.updateScreen());
    this.fc.videoCtrl.syncSignal.subscribe(_ => {
      if (this.fc.paused)
        this.cyclesText.text(`Cycles: ${this.fc.tickCounter} - PAUSED`);
      else
        this.cyclesText.text(`Cycles: ${this.fc.tickCounter}`);
    });
    let timer = new Date();
    // this.fc.videoCtrl.syncSignal.subscribe(_ => {
    //   let endTime = new Date();
    //   let time = endTime.getTime() - timer.getTime();
    //   time /= 1000;
    //   console.log(time);
    //   timer = endTime;
    //   // console.log(this.fc.vram.uint8[1]);
    // });
    let totalTicks = 0;
    this.fc.clock.tick.subscribe(ticks => {
      totalTicks += ticks;
      if (totalTicks < this.fc.clockSettings.clockSpeed) return;

      totalTicks -= this.fc.clockSettings.clockSpeed;
      let endTime = new Date();
      let time = endTime.getTime() - timer.getTime();
      time /= 1000;
      // console.log(time);
      timer = endTime;
    });

    this.display = this.game.make.bitmapData(160, 96);
    this.display.addToWorld(0, 0, 0, 0, 1, 1);

    this.game.camera.flash(0x000000, 1000);
  }

  private keyDown(event: KeyboardEvent) {
    const key = this.fc.keyCtrl.charToKeyCode(event.key);
    if (key !== 239)
      this.fc.keyCtrl.setKey(key, true);
  }

  private keyUp(event: KeyboardEvent) {
    const key = this.fc.keyCtrl.charToKeyCode(event.key);
    if (key !== 239)
      this.fc.keyCtrl.setKey(key, false);
  }
  public paused(game: Phaser.Game) {
    this.startComputerOnResume = !this.fc.paused;
    this.fc.paused = true;
  }

  public resumed(game: Phaser.Game) {
    if (this.startComputerOnResume)
      this.fc.paused = false;
  }

  private static counter = 0;

  public updateScreen() {
    // Computer.counter += game.time.elapsedMS;
    // if (Computer.counter >= 1000)
    //   Computer.counter -= 1000;
    // else
    //   return;

    // for (let i = 0; i < this.display.pixels.length; ++i) {
    //   this.display.pixels[i] = this.videoController.output32[i];
    // }

    // this.fc.videoCtrl.updateDisplay();

    // this.fc.vram.uint8Clamped[16] = 0xFF - this.fc.vram.uint8Clamped[16];
    // this.fc.vram.uint8Clamped[17] = 0xFF - this.fc.vram.uint8Clamped[17];
    // this.fc.vram.uint8Clamped[18] = 0xFF - this.fc.vram.uint8Clamped[18];
    // this.fc.vram.uint8Clamped[19] = 0xFF - this.fc.vram.uint8Clamped[19];
    // this.fc.vram.uint8Clamped[20] = 0xFF - this.fc.vram.uint8Clamped[20];
    // this.fc.vram.uint8Clamped[21] = 0xFF - this.fc.vram.uint8Clamped[21];
    // this.fc.vram.uint8Clamped[22] = 0xFF - this.fc.vram.uint8Clamped[22];
    // this.fc.vram.uint8Clamped[23] = 0xFF - this.fc.vram.uint8Clamped[23];

    for (let y = 0; y < 96; ++y) {
      for (let x = 0; x < 160; ++x) {
        const pixelAddress = (y * 160 + x) * 4;
        const red = this.fc.videoCtrl.output[pixelAddress];
        const green = this.fc.videoCtrl.output[pixelAddress + 1];
        const blue = this.fc.videoCtrl.output[pixelAddress + 2];
        const alpha = this.fc.videoCtrl.output[pixelAddress + 3];

        this.display.setPixel32(x, y, red, green, blue, alpha, false);
      }
    }

    this.display.context.putImageData(this.display.imageData, 0, 0);
    this.display.dirty = true;
  }

  // private setupComputer() {
  //   const clockSettings: ClockSettings = { clockSpeed: 400 };
  //   this.clock = new Clock(clockSettings);
  //   // let tickCounter = 0;
  //   // this.clock.tick.subscribe(cycles => this.googleFontText.text =  `${cycles} - ${tickCounter++}`);

  //   // this.vram = new Memory(288);
  //   this.vram = new Memory(6088);
  //   this.vram.uint8Clamped[VideoController.PALETTE_BG] = 0x37;
  //   this.vram.uint8Clamped[VideoController.PALETTE_BG + 1] = 0x47;
  //   this.vram.uint8Clamped[VideoController.PALETTE_BG + 2] = 0x4F;
  //   this.vram.uint8Clamped[VideoController.PALETTE_FG] = 0xBB;
  //   this.vram.uint8Clamped[VideoController.PALETTE_FG + 1] = 0xD0;
  //   this.vram.uint8Clamped[VideoController.PALETTE_FG + 2] = 0xF8;
  //   this.vram.uint8Clamped[VideoController.VIDEO_MODE] = VideoController.CHARACTER_MODE;
  //   this.vram.uint8Clamped[16] = 0xFF;
  //   this.vram.uint8Clamped[17] = 0x81;
  //   this.vram.uint8Clamped[18] = 0x81;
  //   this.vram.uint8Clamped[19] = 0x81;
  //   this.vram.uint8Clamped[20] = 0x81;
  //   this.vram.uint8Clamped[21] = 0x81;
  //   this.vram.uint8Clamped[22] = 0x81;
  //   this.vram.uint8Clamped[23] = 0xFF;
  //   this.vram.uint8Clamped[25] = 0xFF;
  //   this.vram.uint8Clamped[34] = 0xFF;
  //   this.vram.uint8Clamped[44] = 0xFF;

  //   this.vram.uint8Clamped[49] = 1;
  //   this.vram.uint8Clamped[50] = 2;
  //   this.vram.uint8Clamped[51] = 3;

  //   for (let i = 0; i < FC.CHARACTER_BLOCK_MAP.length; ++i) {
  //     this.vram.uint8Clamped[16 + i] = FC.CHARACTER_BLOCK_MAP[i];
  //   }

  //   for (let i = 0; i < 240; ++i) {
  //     this.vram.uint8Clamped[5776 + i] = i;
  //   }

  //   const videoControllerSettings: VideoControllerSettings = {
  //     displayWidth: 160,
  //     displayHeight: 96,
  //     blockSize: 8,
  //     characterSize: 6,
  //     characterHPixelOffset: 2,
  //     // blockMapSize: 4,
  //     blockMapSize: 1920,
  //     numberOfBlockMaps: 3,
  //     blockMapAddress: 16,
  //     // displayAddress: 48
  //     displayAddress: 5776
  //   };

  //   this.videoController = new VideoController(videoControllerSettings, this.vram, this.clock);
  // }
}