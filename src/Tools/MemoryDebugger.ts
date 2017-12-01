import * as $ from 'jquery';
import { IToolWindow } from './IToolWindow';
import { FC } from '../FantasyConsole/FC';
import { Opcode, RegisterCode } from '../FantasyConsole/Components/Processor';

export enum MemoryDebuggerDisplayMethod {
  byte,
  hex,
  code
}

export class MemoryDebugger implements IToolWindow {
  private ui: JQuery<HTMLElement>;
  private registerGrid: JQuery<HTMLElement>;
  private programGrid: JQuery<HTMLElement>;
  private userGrid: JQuery<HTMLElement>;
  private gridUpdate: JQuery<HTMLElement>;
  private displaySelect: JQuery<HTMLSelectElement>;
  private startAddress: JQuery<HTMLInputElement>;
  private presetAddresses: JQuery<HTMLSelectElement>;

  windowSize = 32;
  windowStartAddress = 32768;
  displayMethod = MemoryDebuggerDisplayMethod.code;
  displayAddressesAsHex = true;

  private codeMap: Array<boolean> = [];

  public constructor(readonly fc: FC) {
    this.ui = $('.memory-debugger');
    this.registerGrid = $('#registergrid');
    this.programGrid = $('#programgrid');
    this.userGrid = $('#usergrid');
    this.gridUpdate = $('#gridUpdate');
    this.gridUpdate.click(() => {
      this.buildCodeMap();
      this.updateMemoryWindow();
    });

    this.displaySelect = <JQuery<HTMLSelectElement>>$('select[name=displayMethod]');
    this.displaySelect.val(this.displayMethod);
    this.displaySelect.change(() => {
      this.displayMethod = parseInt(<string>this.displaySelect.val());
      if (this.displayMethod === MemoryDebuggerDisplayMethod.code)
        this.buildCodeMap();

      this.updateMemoryWindow();
    });

    this.startAddress = <JQuery<HTMLInputElement>>$('input[name=startAddress]');
    this.presetAddresses = <JQuery<HTMLSelectElement>>$('select[name=presetAddresses]');

    this.startAddress.change(() => {
      this.windowStartAddress = parseInt(<string>this.startAddress.val());
      this.updateMemoryWindow();
    });

    this.presetAddresses.change(() => {
      this.startAddress.val(this.presetAddresses.val());
      this.windowStartAddress = parseInt(<string>this.presetAddresses.val());
      this.updateMemoryWindow();
    });

    this.buildCodeMap();
    this.updateMemoryWindow();

    this.ui.hide();
  }

  visible(show: boolean) {
    if (show)
      this.ui.show();
    else
      this.ui.hide();
  }

  updateMemoryWindow() {
    this.updateRegisterGrid();

    let start = this.fc.processor.registers.pc - 8;
    if (start < 0)
      start = 0;
    let end = start + this.windowSize;
    if (end >= this.fc.memoryCtrl._totalCapacity) {
      end = this.fc.memoryCtrl._totalCapacity - 1;
      start = end - this.windowSize;
    }
    this.programGrid.html(this.getMemoryTable(start, end));

    start = this.windowStartAddress;
    if (start < 0)
      start = 0;
    end = start + this.windowSize;
    if (end >= this.fc.memoryCtrl._totalCapacity) {
      end = this.fc.memoryCtrl._totalCapacity - 1;
      start = end - this.windowSize;
    }
    this.userGrid.html(this.getMemoryTable(start, end, true));
  }

  private updateRegisterGrid() {
    const newHTML = ['<table class="mem-tab"><thead><tr>'];
    newHTML.push(`<th title="${RegisterCode.nil}">nil</th>`);
    newHTML.push(`<th title="${RegisterCode.pc}">pc</th>`);
    newHTML.push(`<th title="${RegisterCode.mem}">mem</th>`);
    newHTML.push(`<th title="${RegisterCode.ret}">ret</th>`);
    newHTML.push(`<th title="${RegisterCode.int}">int</th>`);
    newHTML.push(`<th></th>`);
    newHTML.push(`<th></th>`);
    newHTML.push(`<th></th>`);
    newHTML.push('</tr></thead>');

    newHTML.push('<tbody><tr>');
    newHTML.push(`<td title="${this.fc.processor.registers.zero32}">${this.toHex(this.fc.processor.registers.zero32, 4)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.pc}">${this.toHex(this.fc.processor.registers.pc, 4)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.mem}">${this.toHex(this.fc.processor.registers.mem, 4)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.ret}">${this.toHex(this.fc.processor.registers.ret, 4)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.int}">${this.toHex(this.fc.processor.registers.int, 4)}</td>`);
    newHTML.push(`<td>-</td>`);
    newHTML.push(`<td>-</td>`);
    newHTML.push(`<td>-</td>`);

    newHTML.push(`</tr><tr>`);
    newHTML.push(`<th title="${RegisterCode.r0}">r0</th>`);
    newHTML.push(`<th title="${RegisterCode.r1}">r1</th>`);
    newHTML.push(`<th title="${RegisterCode.r2}">r2</th>`);
    newHTML.push(`<th title="${RegisterCode.r3}">r3</th>`);
    newHTML.push(`<th title="${RegisterCode.r4}">r4</th>`);
    newHTML.push(`<th title="${RegisterCode.r5}">r5</th>`);
    newHTML.push(`<th title="${RegisterCode.r6}">r6</th>`);
    newHTML.push(`<th title="${RegisterCode.r7}">r7</th>`);

    newHTML.push(`</tr><tr>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r0)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r0), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r1)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r1), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r2)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r2), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r3)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r3), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r4)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r4), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r5)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r5), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r6)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r6), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r7)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r7), 2)}</td>`);

    newHTML.push(`</tr><tr>`);
    newHTML.push(`<th title="${RegisterCode.r8}">r8</th>`);
    newHTML.push(`<th title="${RegisterCode.r9}">r9</th>`);
    newHTML.push(`<th title="${RegisterCode.r10}">r10</th>`);
    newHTML.push(`<th title="${RegisterCode.r11}">r11</th>`);
    newHTML.push(`<th title="${RegisterCode.r12}">r12</th>`);
    newHTML.push(`<th title="${RegisterCode.r13}">r13</th>`);
    newHTML.push(`<th title="${RegisterCode.r14}">r14</th>`);
    newHTML.push(`<th title="${RegisterCode.r15}">r15</th>`);

    newHTML.push(`</tr><tr>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r8)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r8), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r9)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r9), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r10)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r10), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r11)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r11), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r12)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r12), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r13)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r13), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r14)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r14), 2)}</td>`);
    newHTML.push(`<td title="${this.fc.processor.registers.rget8u(RegisterCode.r15)}">${this.toHex(this.fc.processor.registers.rget8u(RegisterCode.r15), 2)}</td>`);

    newHTML.push('</tr></tbody>');
    newHTML.push('</table>');
    this.registerGrid.html(newHTML.join(''));
  }

  private getMemoryTable(start: number, end: number, defaultToHex: boolean = false): string {
    const newHTML = ['<table class="mem-tab">'];
    let addresses = '';
    let values = '';
    for (let i = start; i < end; i++) {
      const value = this.fc.memoryCtrl.GetUint8FromAddress(i);
      if (i === this.fc.processor.registers.pc) {
        addresses += `<th class="current" title="${i}">` + this.getAddressString(i) + '</th>';
        values += `<td class="current" title="${value}">` + (defaultToHex ? this.toHex(value, 2) : this.getValueFormatted(value, i)) + '</td>';
      }
      else {
        addresses += `<th title="${i}">` + this.getAddressString(i) + '</th>';
        values += `<td title="${value}">` + (defaultToHex ? this.toHex(value, 2) : this.getValueFormatted(value, i)) + '</td>';
      }
    }
    newHTML.push('<thead><tr>');
    newHTML.push(addresses);
    newHTML.push('</tr></thead>');
    newHTML.push('<tbody><tr>');
    newHTML.push(values);
    newHTML.push('</tr></tbody>');
    newHTML.push('</table>');
    return newHTML.join('');
  }

  private getAddressString(address: number): string {
    if (this.displayAddressesAsHex)
      return this.toHex(address, 4);
    else
      return address.toString();
  }

  private getValueFormatted(value: number, index: number = -1): string {
    switch (this.displayMethod) {
      case MemoryDebuggerDisplayMethod.byte: return value.toString();
      case MemoryDebuggerDisplayMethod.hex: return this.toHex(value, 2);
      case MemoryDebuggerDisplayMethod.code: return this.toCode(value, index);
      default: console.log('def'); return value.toString();
    }
  }

  private toHex(num: number, width: number = 0): string {
    return '$' + this.zeroPad(num.toString(16), width);
  }

  private zeroPad(text: string, length: number): string {
    while (text.length < length)
      text = '0' + text;
    return text;
  }

  private buildCodeMap() {
    let nextOpcode = 0;
    for (let i = 0; i < this.fc.memoryCtrl._totalCapacity; ++i) {
      if (nextOpcode === 0) {
        const instruction = this.fc.processor.instructions[this.fc.memoryCtrl.GetUint8FromAddress(i)];
        if (instruction !== undefined) {
          this.codeMap[i] = true;
          nextOpcode += instruction.argumentLength;
        }
        else {
          this.codeMap[i] = false;
          nextOpcode = 1;
        }
      }
      else {
        this.codeMap[i] = false;
        nextOpcode--;
      }
    }
  }

  private toCode(value: number, index: number): string {
    if (this.codeMap[index]) {
      return this.fc.processor.instructions[value].name;
    }
    else
      return this.toHex(value, 2);
  }
}