import * as $ from 'jquery';
import { IToolWindow } from './IToolWindow';
import { Opcode, RegisterCode } from '../FantasyConsole/Components/Processor';
import { FC } from '../FantasyConsole/FC';
import { forEach } from 'typescript-collections/dist/lib/arrays';

export class Compiler implements IToolWindow {
  private ui: JQuery<HTMLElement>;
  private codeEditor: JQuery<HTMLElement>;
  private codeOutput: JQuery<HTMLElement>;
  private compileButton: JQuery<HTMLButtonElement>;
  private executeButton: JQuery<HTMLButtonElement>;
  private codePresetsSelect: JQuery<HTMLSelectElement>;

  static readonly RegId = '$';
  static readonly HexId = 'x';
  static readonly DatId = '@';
  static readonly LabId = ':';
  static readonly NumId = '!';

  private byteCode: Array<number> = [];

  public constructor(private fc: FC) {
    this.ui = $('.compiler');
    this.codeEditor = $('.code-editor');
    this.codeOutput = $('.code-output');
    this.compileButton = <JQuery<HTMLButtonElement>>$('#compile-button');
    this.executeButton = <JQuery<HTMLButtonElement>>$('#execute-button');
    this.codePresetsSelect = <JQuery<HTMLSelectElement>>$('#code-presets');

    this.executeButton.hide();

    codeExamples.forEach((example, index) =>
      this.codePresetsSelect.append(`<option value="${index}">${example[0]}</option>`));

    this.codePresetsSelect.change(() => {
      this.loadCode(codeExamples[parseInt(<string>this.codePresetsSelect.val())][1]);
      this.executeButton.hide();
    });

    this.codeEditor.on('paste', (e) => {
      // THIS SUCKS - LESSON LEARNED - CONTENTEDITABLE IS NO FUN
      // https://stackoverflow.com/a/6804718
      e.stopPropagation();
      e.preventDefault();

      const clipEvent: ClipboardEvent = <ClipboardEvent>e.originalEvent;
      const clipBoardData = clipEvent.clipboardData; // || window.clipboardData;
      const pastedData = clipBoardData.getData('Text');

      const lines = pastedData.split('\n');
      let insertAfter: JQuery<HTMLElement>;
      let insertPos: number = 0;
      const selection = window.getSelection();
      if (selection && selection.getRangeAt) {
        insertPos = selection.getRangeAt(0).startOffset;
        // console.log(insertPos);
        insertAfter = this.codeEditor.find(selection.getRangeAt(0).startContainer.parentElement).first(); // .eq(selection.getRangeAt(0).startOffset - 1);
      } else
        insertAfter = this.codeEditor.children().last();
      // console.log(insertAfter);
      lines.forEach((line, index) => {
        const preString = insertAfter.text().slice(0, insertPos);
        const postString = insertAfter.text().slice(insertPos);
        if (index < lines.length - 1) {
          insertAfter.text(`${preString}${line}`);
          insertPos = 0;
          insertAfter.after(`<div>${postString}</div>`);
          insertAfter = insertAfter.next();
        } else
          insertAfter.text(`${preString}${line}${postString}`);
      });
    });

    this.compileButton.click(() => {
      const code = this.getCode();
      this.byteCode = this.compile(code);
      const output = this.formatByteCode(this.byteCode);
      this.codeOutput.html(output);
      this.executeButton.show();
    });

    this.executeButton.click(() => {
      const paused = this.fc.paused;
      this.fc.reboot();
      this.fc.loadProgram(this.byteCode, 0);
      this.fc.paused = paused;
    });
  }

  visible(show: boolean) {
    if (show)
      this.ui.show();
    else
      this.ui.hide();
  }

  private loadCode(code: string) {
    const lines = code.split('\n');
    this.codeEditor.empty();
    lines.forEach(line => this.codeEditor.append(`<div>${line}</div>`));
  }

  private getCode(): Array<string> {
    let code: Array<string> = [];
    this.codeEditor.find('*').each((index, element) => {
      code.push(element.textContent.trim());
    });
    return code.filter(line => line.length > 0);
  }

  private formatByteCode(byteCode: Array<number>): string {
    let formatted: Array<string> = ['<div>'];
    for (let i = 0; i < byteCode.length; ++i) {
      if (byteCode[i] < 0)
        formatted.push(`<span style="color:#aa1515;background:#301010;">${byteCode[i]}, </span>`);
      else
        formatted.push(`<span>${this.toHex(byteCode[i])}, </span>`);
    }
    formatted.push('</div>');
    return formatted.join('');
  }

  private toHex(n: number): string {
    return '0x' + n.toString(16);
  }

  compile(code: Array<string>): Array<number> {
    let byteCode: Array<number> = [];
    let labels = {}, data = {};
    let dataArrays: Array<string> = [];
    let labelsToHandle: Array<[string, number]> = [];
    let dataToHandle: Array<[string, number]> = [];

    // Go through each line and translate as neccessary
    for (let i = 0; i < code.length; ++i) {
      let line = code[i];

      if (this.isComment(line))
        continue;
      else if (this.isLabel(line)) {
        const label = this.getLabel(line);
        labels[label] = byteCode.length;
      } else if (this.isData(line)) {
        // const dataLabel = this.getDataLabel(line);
        // data[dataLabel] = line; // Data arrays are resolved at the end
        dataArrays.push(line);
      } else {
        let symbols = line.split(' ');
        byteCode.push(this.findOpcode(symbols[0])); // First symbol should be an opcode

        for (let o = 1; o < symbols.length; ++o) { // Go through any remaining symbols on the line
          const symbol = symbols[o];
          if (this.isComment(symbol))
            break;
          else if (this.isRegister(symbol))
            byteCode.push(this.getRegister(symbol));
          else if (this.isLabel(symbol)) { // Labels are translated at the end
            const label = this.getLabel(symbol);
            labelsToHandle.push([label, byteCode.length]);
            byteCode.push(-3);
            byteCode.push(-3);
          } else if (this.isData(symbol)) { // Same for data
            const data = this.getDataLabel(symbol);
            dataToHandle.push([data, byteCode.length]);
            byteCode.push(-4);
            byteCode.push(-4);
          }
          else if (this.isHex8(symbol)) {
            const hexNum = parseInt(this.getNumber(symbol), 16);
            byteCode = byteCode.concat(this.parseNumber(hexNum));
          }
          else if (this.isHex16(symbol)) {
            const hexNum = parseInt(this.getNumber(symbol), 16);
            byteCode = byteCode.concat(this.parseNumber(hexNum, 2));
          }
          else if (this.isHex32(symbol)) {
            const hexNum = parseInt(this.getNumber(symbol), 16);
            byteCode = byteCode.concat(this.parseNumber(hexNum, 4));
          }
          else if (this.isNumber8(symbol)) {
            const numSym = this.getNumber(symbol);
            const num = parseInt(numSym);
            byteCode = byteCode.concat(this.parseNumber(num));
          } else if (this.isNumber16(symbol)) {
            const numSym = this.getNumber(symbol);
            const num = parseInt(numSym);
            byteCode = byteCode.concat(this.parseNumber(num, 2));
          } else if (this.isNumber32(symbol)) {
            const numSym = this.getNumber(symbol);
            const num = parseInt(numSym);
            byteCode = byteCode.concat(this.parseNumber(num, 4));
          } else // If none of the above it must be garbage
            byteCode.push(-255);
        }
      }
    }

    // Add data arrays at the end
    dataArrays.forEach(dataString => {
      const symbols = dataString.split(' ');
      const datLabel = this.getDataLabel(symbols[0]);
      data[datLabel] = byteCode.length;
      for (let i = 1; i < symbols.length; ++i) {
        const symbol = symbols[i];
        if (this.isHex8(symbol)) {
          const hexNum = parseInt(this.getNumber(symbol), 16);
          byteCode = byteCode.concat(this.parseNumber(hexNum));
        }
        else if (this.isHex16(symbol)) {
          const hexNum = parseInt(this.getNumber(symbol), 16);
          byteCode = byteCode.concat(this.parseNumber(hexNum, 2));
        }
        else if (this.isHex32(symbol)) {
          const hexNum = parseInt(this.getNumber(symbol), 16);
          byteCode = byteCode.concat(this.parseNumber(hexNum, 4));
        }
        else if (this.isNumber8(symbol)) {
          const numSym = this.getNumber(symbol);
          const num = parseInt(numSym);
          byteCode = byteCode.concat(this.parseNumber(num));
        } else if (this.isNumber16(symbol)) {
          const numSym = this.getNumber(symbol);
          const num = parseInt(numSym);
          byteCode = byteCode.concat(this.parseNumber(num, 2));
        } else if (this.isNumber32(symbol)) {
          const numSym = this.getNumber(symbol);
          const num = parseInt(numSym);
          byteCode = byteCode.concat(this.parseNumber(num, 4));
        } else // If none of the above it must be garbage
          byteCode.push(-255);
      }
    });

    // Resolve labels
    labelsToHandle.forEach(lab => {
      let arr = this.parseNumber(labels[lab[0]], 2);
      byteCode[lab[1]] = arr[0];
      byteCode[lab[1] + 1] = arr[1];
    });

    // Resolve data labels
    dataToHandle.forEach(dat => {
      let arr = this.parseNumber(data[dat[0]], 2);
      byteCode[dat[1]] = arr[0];
      byteCode[dat[1] + 1] = arr[1];
    });

    return byteCode;
  }

  private isComment(line: string): boolean {
    return line[0] === '/' && line[1] === '/';
  }

  private isData(line: string): boolean {
    return line[0] === Compiler.DatId;
  }

  private isLabel(line: string): boolean {
    return line[0] === Compiler.LabId;
  }

  private isNumber(line: string): boolean {
    return this.isNumber8(line) || this.isNumber16(line) || this.isNumber32(line);
  }

  private isNumber8(line: string): boolean {
    return line[0] === '1' && line[1] === Compiler.NumId;
  }

  private isNumber16(line: string): boolean {
    return line[0] === '2' && line[1] === Compiler.NumId;
  }

  private isNumber32(line: string): boolean {
    return line[0] === '4' && line[1] === Compiler.NumId;
  }

  private isRegister(line: string): boolean {
    return line[0] === Compiler.RegId;
  }

  private isHex(line: string): boolean {
    return this.isHex8(line) || this.isHex16(line) || this.isHex32(line);
  }

  private isHex8(line: string): boolean {
    return line[0] === '1' && line[1] === Compiler.HexId;
  }

  private isHex16(line: string): boolean {
    return line[0] === '2' && line[1] === Compiler.HexId;
  }

  private isHex32(line: string): boolean {
    return line[0] === '4' && line[1] === Compiler.HexId;
  }

  private getLabel(line: string): string {
    return line.split(' ')[0].substring(1);
  }

  private getDataLabel(line: string): string {
    return line.split(' ')[0].substring(1);
  }

  private getNumber(line: string): string {
    return line.split(' ')[0].substring(2);
  }

  private getRegister(symbol: string): number {
    switch (symbol) {
      case '$nil': return RegisterCode.nil;
      case '$pc': return RegisterCode.pc;
      case '$mem': return RegisterCode.mem;
      case '$int': return RegisterCode.int;
      case '$ret': return RegisterCode.ret;
      case '$r0': return RegisterCode.r0;
      case '$r1': return RegisterCode.r1;
      case '$r2': return RegisterCode.r2;
      case '$r3': return RegisterCode.r3;
      case '$r4': return RegisterCode.r4;
      case '$r5': return RegisterCode.r5;
      case '$r6': return RegisterCode.r6;
      case '$r7': return RegisterCode.r7;
      case '$r8': return RegisterCode.r8;
      case '$r9': return RegisterCode.r9;
      case '$r10': return RegisterCode.r10;
      case '$r11': return RegisterCode.r11;
      case '$r12': return RegisterCode.r12;
      case '$r13': return RegisterCode.r13;
      case '$r14': return RegisterCode.r14;
      case '$r15': return RegisterCode.r15;
      default: return -2;
    }
  }

  private findOpcode(word: string): number  {
    let instruction = this.fc.processor.instructions.find(ins => ins !== undefined && ins.name === word);
    return instruction === undefined ? -1 : instruction.opcode;
  }

  private parseNumber(num: number, bytes: number = 1): Array<number> {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    if (bytes === 4)
      view.setUint32(0, num, true);
    if (bytes === 2)
      view.setUint16(0, num, true);
    if (bytes === 1)
      view.setUint8(0, num);
    const arr = new Array(bytes);
    for (let i = 0; i < bytes; ++i)
      arr[i] = view.getUint8(i);
    return arr;
  }
}

const codeExamples = [
[
'New program',
`// Program by @user
// Type program below this comment...
add8 $r0 $r1 $r2`
],
[
'Hello World',
`// Hello World by pstudio
// This program demonstrates how to write text.
// A data block with keycode characters to form our string
// Data blocks are appended at the end of our program
@string 1!40 1!69 1!76 1!76 1!79 1!0 1!55 1!79 1!82 1!76 1!68 1!1
lui16 $mem 2x8000 // 2x8000 is our display mode address
lui8 $r0 1!1 // $r0 = 1
sm8 $r0 // set display mode to 1. 0 is block mode | 1 is character mode
mvm @string 2x9690 1!12 // copy 12 bytes from @string to 2x9690. 2x9690 is our display address
:loop // do nothing
nop
jmp :loop`
],
[
'Character map',
`// Character map example by pstudio
// This program displays the default characters
lui16 $r0 2!256 // $r0 = 0, $r1 = 1
lui16 $mem 2!38544 // 1st character block in our display
lui8 $r4 1!240 // there are 240 character in the default character map
lui16 $r6 2!1 // $r6r7 = 1
:forloop
sm8 $r0 // print $r0
add8 $r0 $r0 $r1 // $r0 += 1
mov16 $r2 $mem // $r2 = $mem
add16 $r2 $r2 $r6 // $r2 += 1
mov16 $mem $r2 // $mem = $r2
blt8 $r0 $r4 :forloop // if $r0 < 240 goto :forloop
:noloop // enter a loop where we do nothing
nop // do nothing for a cycle
jmp :noloop // continue the do-nothing-loop`
],
[
'Scrolling palette swap',
`// Scrolling palette swap example by pstudio
// In this example we modify the red channel of our background color so we get more than 2 colors.
lui16 $mem 2!32769 // load bg red channel into memory register
lui16 $r1 2!511 // 16 bit numbers are stored in two registers. In this case we really only care about putting 1 into $r1.
// lui16 $r0 2!511 // this line accomplishes the same as the one above
// lui8 $r1 1!1 // This also works and is the more sane way to put a byte into a register
lm8 $r0
:label
add8 $r0 $r0 $r1
sm8 $r0
jmp :label`
],
[
'Scrolling palette swap as data block',
`// Program by pstudio
// Scrolling palette represented as a data block - not the recommended way to write programs :)
@swap 1x64 1x2 1x1 1x80 1x64 1x11 1xff 1x1 1x66 1x10 1x20 1x10 1x10 1x11 1x69 1x10 1x90 1xa 1x0`
],
[
'Interrupt example',
`// Interrupt example by pstudio
// In this example we change the bg color each line by listening to hblank interrupts from the video controller
// Try changing 2x800a to 2x8008 (sync interrupt) or 2x800c (vblank interrupt)
// Print 'Hello World!' to show some text as well
@string 1!40 1!69 1!76 1!76 1!79 1!0 1!55 1!79 1!82 1!76 1!68 1!1
lui16 $mem 2x8000
lui8 $r0 1!1
sm8 $r0
mvm @string 2x9690 1!12
// Done printing text
lui16 $mem 2x800a // hblank interrupt address @ 2x800a
lui16 $r0 :hblank // label :hblank is our interrupt routine
sm16 $r0 // save :hblank address so it is executed on interrupt
lui8 $r0 1!255 // put 255 in $r0
lui16 $mem 2!32769 // background red channel palette
sm8 $r0 // sets background red channel to 255
lui16 $r2 2!32771 // background blue channel palette
mov16 $mem $r2 // set our memory address to point at bg blue channel
sm8 $nil // set bg blue to 0
lui16 $r2 2!32769 // set $r2 to bg red channe;
:label // we set up a loop doing nothing
nop
jmp :label // loop back
:hblank // our interrupt handler
sm8 $r0 // save 255 to current memory address
// swap between red and blue background channels
mov16 $r4 $mem // $r4 = $mem
mov16 $mem $r2 // $mem = $r2
sm8 $nil // set color channel to 0
mov16 $r2 $r4 // $r2 = $r4
rint // return from interrupt handler and resume normal execution`
],
[
'Keyboard input',
`// Keyboard input example by pstudio
// This displays the pressed or released character
lui16 $mem 2!38856 // load keyboard interrupt address
lui16 $r0 :keyhandler // :keyhandler is our interrupt routine
sm16 $r0
lui8 $r1 1!100 // keycodes from 0 - 100 have a visible character in our default character map
:loop // a standard do-nothing-loop
nop
jmp :loop
:keyhandler // our key interrupt routine handler
lui16 $mem 2!38858 // this address contains the last pressed or released character
lm8 $r0 // load the character to $r0
bgt8 $r0 $r1 :return // if $r0 > 100 then we don't care about the keycode and just want to return
lui16 $mem 2!38544 // the first character block in our display
sm8 $r0 // save the character so that it is displayed
:return
rint // return interrupt`
],
];