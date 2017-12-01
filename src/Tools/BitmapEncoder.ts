import * as $ from 'jquery';
import { IToolWindow } from './IToolWindow';

export class BitmapEncoderUI implements IToolWindow {
  private ui: JQuery<HTMLElement>;
  private file: JQuery<HTMLInputElement>;
  private img: JQuery<HTMLImageElement>;
  private textarea: JQuery<HTMLTextAreaElement>;

  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  public constructor() {
    this.ui = $('.bitmap-encoder');
    this.file = <JQuery<HTMLInputElement>>this.ui.children('#bitmap-encoder-file');
    this.img = <JQuery<HTMLImageElement>>this.ui.children('#bitmap-encoder-image');
    this.textarea = <JQuery<HTMLTextAreaElement>>this.ui.children('#bitmap-encoder-text');
    this.ui.hide();

    this.file.change((e) => {
      this.loadImage(e.target.files[0]);
    });

    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
  }

  public visible(show: boolean) {
    if (show)
      this.ui.show();
    else
      this.ui.hide();
  }

  private loadImage(file: File) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    this.img.attr('src', url);
    image.onload = (() => {
      this.canvas.width = image.width;
      this.canvas.height = image.height;
      this.context.drawImage(image, 0, 0);
      this.textarea.text(EncodeBitmap(this.context.getImageData(0, 0, image.width, image.height)));
    });
  }
}

function EncodeBitmap(image: ImageData): string {
  console.log(`width: ${image.width}\nheight: ${image.height}\nbytes: ${image.width * image.height / 8}`);
  let encoding: Array<string> = [];
  encoding.push('const data = [');

  for (let y = 0; y < image.height - 7; y += 8) {
    for (let x = 0; x < image.width - 7; x += 8) {
      for (let i = 0; i < 8; ++i) {
        const index = (y + i) * image.width * 4 + x * 4;
        const byte = EightColorBytesToOneByte(
          image.data[index],
          image.data[index + 4],
          image.data[index + 8],
          image.data[index + 12],
          image.data[index + 16],
          image.data[index + 20],
          image.data[index + 24],
          image.data[index + 28],
        );
        encoding.push(` 0x${N2H(byte)},`);
      }
    }
    encoding.push('\n');
  }
  encoding.push(' ];');
  return encoding.join('');
}

function EightColorBytesToOneByte(b0: number, b1: number, b2: number, b3: number, b4: number, b5: number, b6: number, b7: number): number {
  const binary = `${B2b(b7)}${B2b(b6)}${B2b(b5)}${B2b(b4)}${B2b(b3)}${B2b(b2)}${B2b(b1)}${B2b(b0)}`;
  return parseInt(binary, 2);
}

/**
 * byte to bit
 * @param B byte
 */
function B2b(B: number): string {
  return (B < 128) ? '1' : '0';
}

/**
 * number to hex string
 * @param n number
 */
function N2H(n: number): string {
  return n.toString(16);
}