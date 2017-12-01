import { Memory } from './NewMemory';
import { MemoryController } from './NewMemoryController';
import * as Collections from 'typescript-collections';

export class Processor {
  private _registers: Registers;
  private _tickCounter: number;
  private _processorInstance: IterableIterator<number>;

  private _pendingInterrupt = 0;

  public get registers() {
    return this._registers;
  }

  // private _instructions: Collections.Dictionary<Opcode, Instruction>;
  private _instructions: Array<Instruction> = [];
  public get instructions() {
    return this._instructions;
  }

  public constructor(private _memoryCtrl: MemoryController) {
    this._registers = new Registers();
    // this._tickCounter = 0;
    // this._processorInstance = this.processor();
    this.reset();
    // this._instructions = new Collections.Dictionary<Opcode, Instruction>(); THIS IS TOO SLOW
    // instructions.forEach(instruction => this._instructions.setValue(instruction.opcode, instruction));
    instructions.forEach(instruction => this._instructions[instruction.opcode] = instruction);
    this._instructions[Opcode.nopi].execute(this._registers, this._memoryCtrl); // Quick hack
  }

  public process(tick: number) {
    this._tickCounter += tick;
    while (this._tickCounter > 0)
      this._tickCounter -= this._processorInstance.next().value;
  }

  public reset() {
    this.registers.reset();
    this._tickCounter = 0;
    this._processorInstance = this.processor();
  }

  public interrupt(address: number): boolean {
    if (this._pendingInterrupt <= 0) {
      this._pendingInterrupt = address;
      return true;
    }
    return false;
  }

  private *processor() {
    while (true) {
      const opcode: Opcode = getUint8(this._registers, this._memoryCtrl);
      let instruction: Instruction;
      // switch (opcode) {
      //   case Opcode.add8: instruction = add8; break;
      //   case Opcode.lui16: instruction = lui16; break;
      //   case Opcode.lm8: instruction = lm8; break;
      //   case Opcode.sm8: instruction = sm8; break;
      //   case Opcode.jmp: instruction = jmp; break;
      //   default: instruction = undefined; break;
      // }
      instruction = this._instructions[opcode];
      // const instruction = this._instructions.getValue(opcode);
      if (instruction === undefined) {
        yield 1;
        incrementPC(this._registers, this._memoryCtrl);
        continue;
      }
      yield instruction.cycleCost;
      instruction.execute(this._registers, this._memoryCtrl);
      incrementPC(this._registers, this._memoryCtrl);

      // Check for pending interrupts
      if (this._pendingInterrupt > 0) {
        // console.log(this._pendingInterrupt);
        this.registers.int = this.registers.pc;
        this.registers.pc = this._pendingInterrupt;
        this._pendingInterrupt = 0;
      }
    }
  }
}

/**
 * Registers:
 *
 * 0        => (32-bit) the value 0
 * pc       => (16-bit) program counter - points to the next address to process
 * mem      => (16-bit) memory address - user set address that points at memory
 * ret      => (16-bit) return address - ret = pc+1 when call is executed. pc = ret when return is executed
 * int      => (16-bit) return address for interrupt handlers
 * r0..r15  => (8-bit) registers
 */
class Registers {
  private memory: ArrayBuffer;
  private int8: Int8Array;
  private uint8: Uint8Array;
  private int16: Int16Array;
  private uint16: Uint16Array;
  private int32: Int32Array;
  private uint32: Uint32Array;
  private view: DataView;

  public constructor() {
    this.memory = new ArrayBuffer(28);
    this.int8 = new Int8Array(this.memory);
    this.uint8 = new Uint8Array(this.memory);
    this.int16 = new Int16Array(this.memory);
    this.uint16 = new Uint16Array(this.memory);
    this.int32 = new Int32Array(this.memory);
    this.uint32 = new Uint32Array(this.memory);
    this.view = new DataView(this.memory);

    this.reset();

    // this.pc = -1;
  }

  public reset() {
    for (let i = 0; i < this.memory.byteLength; ++i) {
      this.uint8[i] = 0;
    }
  }

  public get zero8() {
    return this.int8[0];
  }

  public get zero16() {
    return this.int16[0];
  }

  public get zero32() {
    return this.int32[0];
  }

  public get pc() {
    return this.uint16[2];
  }

  public set pc(val: number) {
    this.uint16[2] = val;
  }

  public get mem() {
    return this.uint16[3];
  }

  public set mem(val: number) {
    this.uint16[3] = val;
  }

  public get ret() {
    return this.uint16[4];
  }

  public set ret(val: number) {
    this.uint16[4] = val;
  }

  public get int() {
    return this.uint16[5];
  }

  public set int(val: number) {
    this.uint16[5] = val;
  }

  public rget8(index: RegisterCode): number {
    return this.int8[12 + (index - RegisterCode.r0)];
  }

  public rset8(index: RegisterCode, val: number) {
    this.int8[12 + (index - RegisterCode.r0)] = val;
  }

  public rget8u(index: RegisterCode): number {
    return this.uint8[12 + (index - RegisterCode.r0)];
  }

  public rset8u(index: RegisterCode, val: number) {
    this.uint8[12 + (index - RegisterCode.r0)] = val;
  }

  public rget16(index: RegisterCode): number {
    return this.int16[6 + Math.floor((index - RegisterCode.r0) / 2)];
  }

  public rset16(index: RegisterCode, val: number) {
    this.int16[6 + Math.floor((index - RegisterCode.r0) / 2)] = val;
  }

  public rget16u(index: RegisterCode): number {
    return this.uint16[6 + Math.floor((index - RegisterCode.r0) / 2)];
  }

  public rset16u(index: RegisterCode, val: number) {
    this.uint16[6 + Math.floor((index - RegisterCode.r0) / 2)] = val;
  }

  public rget32(index: RegisterCode): number {
    return this.int16[3 + Math.floor((index - RegisterCode.r0) / 4)];
  }

  public rset32(index: RegisterCode, val: number) {
    this.int16[3 + Math.floor((index - RegisterCode.r0) / 4)] = val;
  }

  public rget32u(index: RegisterCode): number {
    return this.uint16[3 + Math.floor((index - RegisterCode.r0) / 4)];
  }

  public rset32u(index: RegisterCode, val: number) {
    this.uint16[3 + Math.floor((index - RegisterCode.r0) / 4)] = val;
  }
}

export enum RegisterCode {
  nil,
  pc,
  mem,
  ret, int,
  r0 = 0x10, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15,
}

interface Instruction {
  opcode: Opcode;
  name: string;
  argumentLength: number; // number of bytes that must be read for the arguments
  cycleCost: number; // number of cycles it costs to execute this instruction
  execute(registers: Registers, memory: MemoryController);
}

export enum Opcode {
  nop = 0, nopi, // Skipping
  and = 16, andi, or, ori, xor, xori, not, shr, shl, // Bit-wise
  add8 = 32, add16, add32, addi8, addi16, addi32, addu8, addu16, addu32, addui8, addui16, addui32, // Addition
  sub8 = 48, sub16, sub32, subi8, subi16, subi32, subu8, subu16, subu32, subui8, subui16, subui32, // Subtraction
  mul8 = 64, mul16, mul32, muli8, muli16, muli32, mulu8, mulu16, mulu32, mului8, mului16, mului32, // Multiplication
  div8 = 80, div16, div32, divi8, divi16, divi32, divu8, divu16, divu32, divui8, divui16, divui32, // Division
  li8 = 96, li16, li32, lui8, lui16, lui32, lm8, lm16, lm32, sm8, sm16, sm32, mov8, mov16, mov32, mvm, clm, // Memory
  beq8 = 128, beq16, beq32, blt8, blt16, blt32, ble8, ble16, ble32, bgt8, bgt16, bgt32, bge8, bge16, bge32, bne8, bne16, bne32, // Branching
  jmp = 144, call, ret, rint, // Jumping
}

function incrementPC(registers: Registers, memory: MemoryController) {
  registers.pc++;
  registers.pc %= memory._totalCapacity;
}

function getUint8(registers: Registers, memory: MemoryController): number {
  return memory.GetUint8ClampedFromAddress(registers.pc);
}

function getNextInt8(registers: Registers, memory: MemoryController): number {
  incrementPC(registers, memory);
  return memory.GetInt8FromAddress(registers.pc);
}

function getNextUint8(registers: Registers, memory: MemoryController): number {
  incrementPC(registers, memory);
  return memory.GetUint8ClampedFromAddress(registers.pc);
}

function getNextInt16(registers: Registers, memory: MemoryController): number {
  incrementPC(registers, memory);
  let result = memory.GetInt16FromAddress(registers.pc);
  incrementPC(registers, memory);
  return result;
}

function getNextUint16(registers: Registers, memory: MemoryController): number {
  incrementPC(registers, memory);
  let result = memory.GetUint16FromAddress(registers.pc);
  incrementPC(registers, memory);
  return result;
}

function getNextInt32(registers: Registers, memory: MemoryController): number {
  incrementPC(registers, memory);
  let result = memory.GetInt32FromAddress(registers.pc);
  incrementPC(registers, memory);
  incrementPC(registers, memory);
  incrementPC(registers, memory);
  return result;
}

function getNextUint32(registers: Registers, memory: MemoryController): number {
  incrementPC(registers, memory);
  let result = memory.GetUint32FromAddress(registers.pc);
  incrementPC(registers, memory);
  incrementPC(registers, memory);
  incrementPC(registers, memory);
  return result;
}

function isUserRegister(value: number): boolean {
  return (value >= RegisterCode.r0 && value <= RegisterCode.r15);
}

function isUserRegisterOrMem(value: number) {
  return isUserRegister(value) || value === RegisterCode.mem;
}

function isUserRegisterOrNil(value: number): boolean {
  return isUserRegister(value) || value === RegisterCode.nil;
}

function isReadable16BitValueRegister(value: number): boolean {
  return isUserRegisterOrNil(value) || value === RegisterCode.mem
    || value === RegisterCode.int || value === RegisterCode.ret
    || value === RegisterCode.pc;
}

function get16BitValueFromRegister(reg: number, registers: Registers): number {
  if (reg === RegisterCode.mem)
    return registers.mem;
  else if (reg === RegisterCode.int)
    return registers.int;
  else if (reg === RegisterCode.ret)
    return registers.ret;
  else if (reg === RegisterCode.pc)
    return registers.pc;
  else if (reg === RegisterCode.nil)
    return registers.zero16;
  else
    return registers.rget16(reg);
}

function isDestAnd2ArgsRegisters(dest: number, arg1: number, arg2: number): boolean {
  return isUserRegisterOrMem(dest) && isUserRegisterOrNil(arg1) && isUserRegisterOrNil(arg2);
}

function updateMem(val: number, registers: Registers, memory: MemoryController) {
  registers.mem = val;
  memory.memoryAddress = registers.mem;
}

//#region Bit-wise

const and: Instruction = {
  opcode: Opcode.and,
  name: 'and',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

      const result = registers.rget8u(arg1Reg) & registers.rget8u(arg2Reg);
      registers.rset8u(destReg, result);
  }
};

const andi: Instruction = {
  opcode: Opcode.andi,
  name: 'andi',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm8 = getNextUint8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

      const result = registers.rget8u(arg1Reg) & arg2Imm8;
      registers.rset8u(destReg, result);
  }
};

const or: Instruction = {
  opcode: Opcode.or,
  name: 'or',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

      const result = registers.rget8u(arg1Reg) | registers.rget8u(arg2Reg);
      registers.rset8u(destReg, result);
  }
};

const ori: Instruction = {
  opcode: Opcode.ori,
  name: 'ori',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm8 = getNextUint8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

      const result = registers.rget8u(arg1Reg) | arg2Imm8;
      registers.rset8u(destReg, result);
  }
};

const xor: Instruction = {
  opcode: Opcode.xor,
  name: 'xor',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

      const result = registers.rget8u(arg1Reg) ^ registers.rget8u(arg2Reg);
      registers.rset8u(destReg, result);
  }
};

const xori: Instruction = {
  opcode: Opcode.xori,
  name: 'xori',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm8 = getNextUint8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

      const result = registers.rget8u(arg1Reg) ^ arg2Imm8;
      registers.rset8u(destReg, result);
  }
};

const not: Instruction = {
  opcode: Opcode.not,
  name: 'not',
  argumentLength: 2,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const argReg = getNextUint8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(argReg))
      return;

    const result = ~ registers.rget8u(argReg);
    registers.rset8u(destReg, result);
  }
};

const shr: Instruction = {
  opcode: Opcode.shr,
  name: 'shr',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm8 = getNextUint8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

      const result = registers.rget8u(arg1Reg) >>> arg2Imm8;
      registers.rset8u(destReg, result);
  }
};

const shl: Instruction = {
  opcode: Opcode.shl,
  name: 'shl',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm8 = getNextUint8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

      const result = registers.rget8u(arg1Reg) << arg2Imm8;
      registers.rset8u(destReg, result);
  }
};

//#endregion

//#region Addition

const add8: Instruction = {
  opcode: Opcode.add8,
  name: 'add8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget8(arg1Reg) + registers.rget8(arg2Reg);
    registers.rset8(destReg, result);
  }
};

const add16: Instruction = {
  opcode: Opcode.add16,
  name: 'add16',
  argumentLength: 3,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget16(arg1Reg) + registers.rget16(arg2Reg);
    registers.rset16(destReg, result);
  }
};

const add32: Instruction = {
  opcode: Opcode.add32,
  name: 'add32',
  argumentLength: 3,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget32(arg1Reg) + registers.rget32(arg2Reg);
    registers.rset32(destReg, result);
  }
};

const addi8: Instruction = {
  opcode: Opcode.addi8,
  name: 'addi8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm8 = getNextInt8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget8(arg1Reg) + arg2Imm8;
    registers.rset8(destReg, result);
  }
};

const addi16: Instruction = {
  opcode: Opcode.addi16,
  name: 'addi16',
  argumentLength: 4,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm16 = getNextInt16(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget16(arg1Reg) + arg2Imm16;
    registers.rset16(destReg, result);
  }
};

const addi32: Instruction = {
  opcode: Opcode.addi32,
  name: 'addi32',
  argumentLength: 6,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm32 = getNextInt32(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget32(arg1Reg) + arg2Imm32;
    registers.rset32(destReg, result);
  }
};

const addu8: Instruction = {
  opcode: Opcode.addu8,
  name: 'addu8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget8u(arg1Reg) + registers.rget8u(arg2Reg);
    registers.rset8u(destReg, result);
  }
};

const addu16: Instruction = {
  opcode: Opcode.addu16,
  name: 'addu16',
  argumentLength: 3,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget16u(arg1Reg) + registers.rget16u(arg2Reg);
    registers.rset16u(destReg, result);
  }
};

const addu32: Instruction = {
  opcode: Opcode.addu32,
  name: 'addu32',
  argumentLength: 3,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget32u(arg1Reg) + registers.rget32u(arg2Reg);
    registers.rset32u(destReg, result);
  }
};

const addui8: Instruction = {
  opcode: Opcode.addui8,
  name: 'addui8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2UImm8 = getNextUint8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget8u(arg1Reg) + arg2UImm8;
    registers.rset8u(destReg, result);
  }
};

const addui16: Instruction = {
  opcode: Opcode.addui16,
  name: 'addui16',
  argumentLength: 4,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget16u(arg1Reg) + arg2UImm16;
    registers.rset16u(destReg, result);
  }
};

const addui32: Instruction = {
  opcode: Opcode.addui32,
  name: 'addui32',
  argumentLength: 6,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2UImm32 = getNextUint32(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget32u(arg1Reg) + arg2UImm32;
    registers.rset32u(destReg, result);
  }
};

//#endregion

//#region Subtraction

const sub8: Instruction = {
  opcode: Opcode.sub8,
  name: 'sub8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget8(arg1Reg) - registers.rget8(arg2Reg);
    registers.rset8(destReg, result);
  }
};

const sub16: Instruction = {
  opcode: Opcode.sub16,
  name: 'sub16',
  argumentLength: 3,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget16(arg1Reg) - registers.rget16(arg2Reg);
    registers.rset16(destReg, result);
  }
};

const sub32: Instruction = {
  opcode: Opcode.sub32,
  name: 'sub32',
  argumentLength: 3,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget32(arg1Reg) - registers.rget32(arg2Reg);
    registers.rset32(destReg, result);
  }
};

const subi8: Instruction = {
  opcode: Opcode.subi8,
  name: 'subi8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm8 = getNextInt8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget8(arg1Reg) - arg2Imm8;
    registers.rset8(destReg, result);
  }
};

const subi16: Instruction = {
  opcode: Opcode.subi16,
  name: 'subi16',
  argumentLength: 4,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm16 = getNextInt16(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget16(arg1Reg) - arg2Imm16;
    registers.rset16(destReg, result);
  }
};

const subi32: Instruction = {
  opcode: Opcode.subi32,
  name: 'subi32',
  argumentLength: 6,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm32 = getNextInt32(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget32(arg1Reg) - arg2Imm32;
    registers.rset32(destReg, result);
  }
};

const subu8: Instruction = {
  opcode: Opcode.subu8,
  name: 'subu8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget8u(arg1Reg) - registers.rget8u(arg2Reg);
    registers.rset8u(destReg, result);
  }
};

const subu16: Instruction = {
  opcode: Opcode.subu16,
  name: 'subu16',
  argumentLength: 3,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget16u(arg1Reg) - registers.rget16u(arg2Reg);
    registers.rset16u(destReg, result);
  }
};

const subu32: Instruction = {
  opcode: Opcode.subu32,
  name: 'subu32',
  argumentLength: 3,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget32u(arg1Reg) - registers.rget32u(arg2Reg);
    registers.rset32u(destReg, result);
  }
};

const subui8: Instruction = {
  opcode: Opcode.subui8,
  name: 'subui8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2UImm8 = getNextUint8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget8u(arg1Reg) - arg2UImm8;
    registers.rset8u(destReg, result);
  }
};

const subui16: Instruction = {
  opcode: Opcode.subui16,
  name: 'subui16',
  argumentLength: 4,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget16u(arg1Reg) - arg2UImm16;
    registers.rset16u(destReg, result);
  }
};

const subui32: Instruction = {
  opcode: Opcode.subui32,
  name: 'subui32',
  argumentLength: 6,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2UImm32 = getNextUint32(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget32u(arg1Reg) - arg2UImm32;
    registers.rset32u(destReg, result);
  }
};

//#endregion

//#region Multiplication

const mul8: Instruction = {
  opcode: Opcode.mul8,
  name: 'mul8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget8(arg1Reg) * registers.rget8(arg2Reg);
    registers.rset8(destReg, result);
  }
};

const mul16: Instruction = {
  opcode: Opcode.mul16,
  name: 'mul16',
  argumentLength: 3,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget16(arg1Reg) * registers.rget16(arg2Reg);
    registers.rset16(destReg, result);
  }
};

const mul32: Instruction = {
  opcode: Opcode.mul32,
  name: 'mul32',
  argumentLength: 3,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget32(arg1Reg) * registers.rget32(arg2Reg);
    registers.rset32(destReg, result);
  }
};

const muli8: Instruction = {
  opcode: Opcode.muli8,
  name: 'muli8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm8 = getNextInt8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget8(arg1Reg) * arg2Imm8;
    registers.rset8(destReg, result);
  }
};

const muli16: Instruction = {
  opcode: Opcode.muli16,
  name: 'muli16',
  argumentLength: 4,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm16 = getNextInt16(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget16(arg1Reg) * arg2Imm16;
    registers.rset16(destReg, result);
  }
};

const muli32: Instruction = {
  opcode: Opcode.muli32,
  name: 'muli32',
  argumentLength: 6,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm32 = getNextInt32(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget32(arg1Reg) * arg2Imm32;
    registers.rset32(destReg, result);
  }
};

const mulu8: Instruction = {
  opcode: Opcode.mulu8,
  name: 'mulu8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget8u(arg1Reg) * registers.rget8u(arg2Reg);
    registers.rset8u(destReg, result);
  }
};

const mulu16: Instruction = {
  opcode: Opcode.mulu16,
  name: 'mulu16',
  argumentLength: 3,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget16u(arg1Reg) * registers.rget16u(arg2Reg);
    registers.rset16u(destReg, result);
  }
};

const mulu32: Instruction = {
  opcode: Opcode.mulu32,
  name: 'mulu32',
  argumentLength: 3,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = registers.rget32u(arg1Reg) * registers.rget32u(arg2Reg);
    registers.rset32u(destReg, result);
  }
};

const mului8: Instruction = {
  opcode: Opcode.mului8,
  name: 'mului8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2UImm8 = getNextUint8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget8u(arg1Reg) * arg2UImm8;
    registers.rset8u(destReg, result);
  }
};

const mului16: Instruction = {
  opcode: Opcode.mului16,
  name: 'mului16',
  argumentLength: 4,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget16u(arg1Reg) * arg2UImm16;
    registers.rset16u(destReg, result);
  }
};

const mului32: Instruction = {
  opcode: Opcode.mului32,
  name: 'mului32',
  argumentLength: 6,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2UImm32 = getNextUint32(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = registers.rget32u(arg1Reg) * arg2UImm32;
    registers.rset32u(destReg, result);
  }
};

//#endregion

//#region Division

const div8: Instruction = {
  opcode: Opcode.div8,
  name: 'div8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = Math.trunc(registers.rget8(arg1Reg) / registers.rget8(arg2Reg));
    registers.rset8(destReg, result);
  }
};

const div16: Instruction = {
  opcode: Opcode.div16,
  name: 'div16',
  argumentLength: 3,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = Math.trunc(registers.rget16(arg1Reg) / registers.rget16(arg2Reg));
    registers.rset16(destReg, result);
  }
};

const div32: Instruction = {
  opcode: Opcode.div32,
  name: 'div32',
  argumentLength: 3,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = Math.trunc(registers.rget32(arg1Reg) / registers.rget32(arg2Reg));
    registers.rset32(destReg, result);
  }
};

const divi8: Instruction = {
  opcode: Opcode.divi8,
  name: 'divi8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm8 = getNextInt8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = Math.trunc(registers.rget8(arg1Reg) / arg2Imm8);
    registers.rset8(destReg, result);
  }
};

const divi16: Instruction = {
  opcode: Opcode.divi16,
  name: 'divi16',
  argumentLength: 4,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm16 = getNextInt16(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = Math.trunc(registers.rget16(arg1Reg) / arg2Imm16);
    registers.rset16(destReg, result);
  }
};

const divi32: Instruction = {
  opcode: Opcode.divi32,
  name: 'divi32',
  argumentLength: 6,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Imm32 = getNextInt32(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = Math.trunc(registers.rget32(arg1Reg) / arg2Imm32);
    registers.rset32(destReg, result);
  }
};

const divu8: Instruction = {
  opcode: Opcode.divu8,
  name: 'divu8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = Math.trunc(registers.rget8u(arg1Reg) / registers.rget8u(arg2Reg));
    registers.rset8u(destReg, result);
  }
};

const divu16: Instruction = {
  opcode: Opcode.divu16,
  name: 'divu16',
  argumentLength: 3,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = Math.trunc(registers.rget16u(arg1Reg) / registers.rget16u(arg2Reg));
    registers.rset16u(destReg, result);
  }
};

const divu32: Instruction = {
  opcode: Opcode.divu32,
  name: 'divu32',
  argumentLength: 3,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);

    if (!isDestAnd2ArgsRegisters(destReg, arg1Reg, arg2Reg))
      return;

    const result = Math.trunc(registers.rget32u(arg1Reg) / registers.rget32u(arg2Reg));
    registers.rset32u(destReg, result);
  }
};

const divui8: Instruction = {
  opcode: Opcode.divui8,
  name: 'divui8',
  argumentLength: 3,
  cycleCost: 4,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2UImm8 = getNextUint8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = Math.trunc(registers.rget8u(arg1Reg) / arg2UImm8);
    registers.rset8u(destReg, result);
  }
};

const divui16: Instruction = {
  opcode: Opcode.divui16,
  name: 'divui16',
  argumentLength: 4,
  cycleCost: 6,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = Math.trunc(registers.rget16u(arg1Reg) + arg2UImm16);
    registers.rset16u(destReg, result);
  }
};

const divui32: Instruction = {
  opcode: Opcode.divui32,
  name: 'divui32',
  argumentLength: 6,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const arg1Reg = getNextUint8(registers, memory);
    const arg2UImm32 = getNextUint32(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(arg1Reg))
      return;

    const result = Math.trunc(registers.rget32u(arg1Reg) + arg2UImm32);
    registers.rset32u(destReg, result);
  }
};

//#endregion

//#region Memory

const li8: Instruction = {
  opcode: Opcode.li8,
  name: 'li8',
  argumentLength: 2,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const argImm8 = getNextInt8(registers, memory);

    if (!isUserRegisterOrMem(destReg))
      return;

    if (destReg === RegisterCode.mem)
      updateMem(argImm8, registers, memory);
    else
      registers.rset8(destReg, argImm8);
  }
};

const li16: Instruction = {
  opcode: Opcode.li16,
  name: 'li16',
  argumentLength: 3,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const argImm16 = getNextInt16(registers, memory);

    if (!isUserRegisterOrMem(destReg))
      return;

    if (destReg === RegisterCode.mem)
      updateMem(argImm16, registers, memory);
    else
      registers.rset16(destReg, argImm16);
  }
};

const li32: Instruction = {
  opcode: Opcode.li32,
  name: 'li32',
  argumentLength: 5,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const argImm32 = getNextInt32(registers, memory);

    if (!isUserRegisterOrMem(destReg))
      return;

    if (destReg === RegisterCode.mem)
      updateMem(argImm32, registers, memory);
    else
      registers.rset32(destReg, argImm32);
  }
};

const lui8: Instruction = {
  opcode: Opcode.lui8,
  name: 'lui8',
  argumentLength: 2,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const argUImm8 = getNextUint8(registers, memory);

    if (!isUserRegisterOrMem(destReg))
      return;

    if (destReg === RegisterCode.mem)
      updateMem(argUImm8, registers, memory);
    else
      registers.rset8u(destReg, argUImm8);
  }
};

const lui16: Instruction = {
  opcode: Opcode.lui16,
  name: 'lui16',
  argumentLength: 3,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const argUImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrMem(destReg))
      return;

    if (destReg === RegisterCode.mem)
      updateMem(argUImm16, registers, memory);
    else
      registers.rset16u(destReg, argUImm16);
  }
};

const lui32: Instruction = {
  opcode: Opcode.lui32,
  name: 'lui32',
  argumentLength: 5,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const argUImm32 = getNextUint32(registers, memory);

    if (!isUserRegisterOrMem(destReg))
      return;

    if (destReg === RegisterCode.mem)
      updateMem(argUImm32, registers, memory);
    else
      registers.rset32u(destReg, argUImm32);
  }
};

const lm8: Instruction = {
  opcode: Opcode.lm8,
  name: 'lm8',
  argumentLength: 1,
  cycleCost: 2,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);

    if (!isUserRegister(destReg))
      return;

    registers.rset8(destReg, memory.memoryValue);
  }
};

const lm16: Instruction = {
  opcode: Opcode.lm16,
  name: 'lm16',
  argumentLength: 1,
  cycleCost: 2,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);

    if (!isUserRegister(destReg))
      return;

    registers.rset16(destReg, memory.memoryValue16);
  }
};

const lm32: Instruction = {
  opcode: Opcode.lm32,
  name: 'lm32',
  argumentLength: 1,
  cycleCost: 2,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);

    if (!isUserRegister(destReg))
      return;

    registers.rset32(destReg, memory.memoryValue32);
  }
};

const sm8: Instruction = {
  opcode: Opcode.sm8,
  name: 'sm8',
  argumentLength: 1,
  cycleCost: 2,
  execute(registers: Registers, memory: MemoryController) {
    const argReg = getNextUint8(registers, memory);

    if (!isUserRegisterOrNil(argReg))
      return;

    const value = argReg === RegisterCode.nil ? 0 : registers.rget8(argReg);
    memory.memoryValue = value;
  }
};

const sm16: Instruction = {
  opcode: Opcode.sm16,
  name: 'sm16',
  argumentLength: 1,
  cycleCost: 2,
  execute(registers: Registers, memory: MemoryController) {
    const argReg = getNextUint8(registers, memory);

    if (!isUserRegisterOrNil(argReg))
      return;

    const value = argReg === RegisterCode.nil ? 0 : registers.rget16(argReg);
    memory.memoryValue16 = value;
  }
};

const sm32: Instruction = {
  opcode: Opcode.sm32,
  name: 'sm32',
  argumentLength: 1,
  cycleCost: 2,
  execute(registers: Registers, memory: MemoryController) {
    const argReg = getNextUint8(registers, memory);

    if (!isUserRegisterOrNil(argReg))
      return;

    const value = argReg === RegisterCode.nil ? 0 : registers.rget32(argReg);
    memory.memoryValue32 = value;
  }
};

const mov8: Instruction = {
  opcode: Opcode.mov8,
  name: 'mov8',
  argumentLength: 2,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const argReg = getNextUint8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isUserRegisterOrNil(argReg))
      return;

    const value = argReg === RegisterCode.nil ? 0 : registers.rget8(argReg);
    if (destReg === RegisterCode.mem)
      updateMem(value, registers, memory);
    else
      registers.rset8(destReg, value);
  }
};

const mov16: Instruction = {
  opcode: Opcode.mov16,
  name: 'mov16',
  argumentLength: 2,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const argReg = getNextUint8(registers, memory);

    if (!isUserRegisterOrMem(destReg) || !isReadable16BitValueRegister(argReg))
      return;

    const value = get16BitValueFromRegister(argReg, registers);

    if (destReg === RegisterCode.mem)
      updateMem(value, registers, memory);
    else
      registers.rset16(destReg, value);
  }
};

const mov32: Instruction = {
  opcode: Opcode.mov32,
  name: 'mov32',
  argumentLength: 2,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
    const destReg = getNextUint8(registers, memory);
    const argReg = getNextUint8(registers, memory);

    if (!isUserRegister(destReg) || !isUserRegisterOrNil(argReg))
      return;

    const value = argReg === RegisterCode.nil ? 0 : registers.rget32(argReg);
    registers.rset32(destReg, value);
  }
};

const mvm: Instruction = {
  opcode: Opcode.mvm,
  name: 'mvm',
  argumentLength: 5,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const arg1UImm16 = getNextUint16(registers, memory);
    const arg2UImm16 = getNextUint16(registers, memory);
    const arg3UImm8 = getNextUint8(registers, memory);

    memory.FastCopyMemoryBlock(arg1UImm16, arg2UImm16, arg3UImm8);
  }
};

const clm: Instruction = {
  opcode: Opcode.clm,
  name: 'clm',
  argumentLength: 4,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const arg1UImm16 = getNextUint16(registers, memory);
    const arg2UImm8 = getNextUint8(registers, memory);
    const arg3UImm8 = getNextUint8(registers, memory);

    memory.FastClearMemoryBlock(arg1UImm16, arg3UImm8, arg2UImm8);
  }
};

//#endregion

//#region Branching

const beq8: Instruction = {
  opcode: Opcode.beq8,
  name: 'beq8',
  argumentLength: 4,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget8u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget8u(arg2Reg);
    if (arg1 === arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const beq16: Instruction = {
  opcode: Opcode.beq16,
  name: 'beq16',
  argumentLength: 4,
  cycleCost: 10,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget16u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget16u(arg2Reg);
    if (arg1 === arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const beq32: Instruction = {
  opcode: Opcode.beq32,
  name: 'beq32',
  argumentLength: 4,
  cycleCost: 12,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget32u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget32u(arg2Reg);
    if (arg1 === arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const blt8: Instruction = {
  opcode: Opcode.blt8,
  name: 'blt8',
  argumentLength: 4,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget8u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget8u(arg2Reg);
    if (arg1 < arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const blt16: Instruction = {
  opcode: Opcode.blt16,
  name: 'blt16',
  argumentLength: 4,
  cycleCost: 10,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget16u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget16u(arg2Reg);
    if (arg1 < arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const blt32: Instruction = {
  opcode: Opcode.blt32,
  name: 'blt32',
  argumentLength: 4,
  cycleCost: 12,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget32u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget32u(arg2Reg);
    if (arg1 < arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const ble8: Instruction = {
  opcode: Opcode.ble8,
  name: 'ble8',
  argumentLength: 4,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget8u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget8u(arg2Reg);
    if (arg1 <= arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const ble16: Instruction = {
  opcode: Opcode.ble16,
  name: 'ble16',
  argumentLength: 4,
  cycleCost: 10,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget16u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget16u(arg2Reg);
    if (arg1 <= arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const ble32: Instruction = {
  opcode: Opcode.ble32,
  name: 'ble32',
  argumentLength: 4,
  cycleCost: 12,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget32u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget32u(arg2Reg);
    if (arg1 <= arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const bgt8: Instruction = {
  opcode: Opcode.bgt8,
  name: 'bgt8',
  argumentLength: 4,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget8u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget8u(arg2Reg);
    if (arg1 > arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const bgt16: Instruction = {
  opcode: Opcode.bgt16,
  name: 'bgt16',
  argumentLength: 4,
  cycleCost: 10,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget16u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget16u(arg2Reg);
    if (arg1 > arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const bgt32: Instruction = {
  opcode: Opcode.bgt32,
  name: 'bgt32',
  argumentLength: 4,
  cycleCost: 12,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget32u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget32u(arg2Reg);
    if (arg1 > arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const bge8: Instruction = {
  opcode: Opcode.bge8,
  name: 'bge8',
  argumentLength: 4,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget8u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget8u(arg2Reg);
    if (arg1 >= arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const bge16: Instruction = {
  opcode: Opcode.bge16,
  name: 'bge16',
  argumentLength: 4,
  cycleCost: 10,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget16u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget16u(arg2Reg);
    if (arg1 >= arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const bge32: Instruction = {
  opcode: Opcode.bge32,
  name: 'bge32',
  argumentLength: 4,
  cycleCost: 12,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget32u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget32u(arg2Reg);
    if (arg1 >= arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const bne8: Instruction = {
  opcode: Opcode.bne8,
  name: 'bne8',
  argumentLength: 4,
  cycleCost: 8,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget8u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget8u(arg2Reg);
    if (arg1 !== arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const bne16: Instruction = {
  opcode: Opcode.bne16,
  name: 'bne16',
  argumentLength: 4,
  cycleCost: 10,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget16u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget16u(arg2Reg);
    if (arg1 !== arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

const bne32: Instruction = {
  opcode: Opcode.bne32,
  name: 'bne32',
  argumentLength: 4,
  cycleCost: 12,
  execute(registers: Registers, memory: MemoryController) {
    const arg1Reg = getNextUint8(registers, memory);
    const arg2Reg = getNextUint8(registers, memory);
    const arg3UImm16 = getNextUint16(registers, memory);

    if (!isUserRegisterOrNil(arg1Reg) || !isUserRegisterOrNil(arg2Reg))
      return;

    const arg1 = arg1Reg === RegisterCode.nil ? 0 : registers.rget32u(arg1Reg);
    const arg2 = arg2Reg === RegisterCode.nil ? 0 : registers.rget32u(arg2Reg);
    if (arg1 !== arg2)
      registers.pc = arg3UImm16 - 1;
  }
};

//#endregion

//#region Jumping

const jmp: Instruction = {
  opcode: Opcode.jmp,
  name: 'jmp',
  argumentLength: 2,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
    const argImm16 = getNextUint16(registers, memory);
    // console.log(argImm16);
    registers.pc = argImm16 - 1;
  }
};

const call: Instruction = {
  opcode: Opcode.call,
  name: 'call',
  argumentLength: 2,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
    const argImm16 = getNextUint16(registers, memory);

    registers.ret = registers.pc;
    registers.pc = argImm16 - 1;
  }
};

const ret: Instruction = {
  opcode: Opcode.ret,
  name: 'ret',
  argumentLength: 0,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
    registers.pc = registers.ret - 1;
    registers.ret = 0;
  }
};

const rint: Instruction = {
  opcode: Opcode.rint,
  name: 'rint',
  argumentLength: 0,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
    registers.pc = registers.int - 1;
    registers.int = 0;
  }
};

//#endregion

//#region Skipping

const nop: Instruction = {
  opcode: Opcode.nop,
  name: 'nop',
  argumentLength: 0,
  cycleCost: 1,
  execute(registers: Registers, memory: MemoryController) {
  }
};

interface RegAndMemHolderInstruction extends Instruction {
  registers: Registers;
  memory: MemoryController;
}

const nopi: RegAndMemHolderInstruction = {
  opcode: Opcode.nopi,
  name: 'nopi',
  argumentLength: 1,
  registers: null,
  memory: null,
  get cycleCost(): number {
    return getNextUint8(this.registers, this.memory);
  },
  execute(registers: Registers, memory: MemoryController) {
    // This is really just a hack to quickly make nopi work
    this.registers = registers;
    this.memory = memory;
  }
};

//#endregion

const instructions = [
  and, andi, or, ori, xor, xori, not, shr, shl, // Bit-wise
  add8, add16, add32, addi8, addi16, addi32, addu8, addu16, addu32, addui8, addui16, addui32, // Addition
  sub8, sub16, sub32, subi8, subi16, subi32, subu8, subu16, subu32, subui8, subui16, subui32, // Subtraction
  mul8, mul16, mul32, muli8, muli16, muli32, mulu8, mulu16, mulu32, mului8, mului16, mului32, // Multiplication
  div8, div16, div32, divi8, divi16, divi32, divu8, divu16, divu32, divui8, divui16, divui32, // Division
  li8, li16, li32, lui8, lui16, lui32, lm8, lm16, lm32, sm8, sm16, sm32, mov8, mov16, mov32, mvm, clm, // Memory
  beq8, beq16, beq32, blt8, blt16, blt32, ble8, ble16, ble32, bgt8, bgt16, bgt32, bge8, bge16, bge32, bne8, bne16, bne32, // Branching
  jmp, call, ret, rint, // Jumping
  nop, nopi, // Skipping
];

/**
 * Assembly language:
 * Opcodes are 1 byte. Register addresses are also 1 byte.
 * Some instructions can use multiple registers to create 16- or 32-bit numbers.
 *
 * r* = 1 byte register
 * i, i8  = 1 byte immediate number
 * i16    = 2 bytes immediate number
 * i32    = 4 bytes immediate number
 *
 * Bit Manipulation:
 * and r0 r1 r2   =>  r0 = r1 & r2
 * andi r0 r1 i8  =>  r0 = r1 & i8
 *
 * or*
 * xor*
 * not*
 * shr*
 * shl*
 *
 * Arithmetic:
 * add r0 r1 r2   =>  r0 = r1 + r2
 * addi r0 r1 i   =>  r0 = r1 + i
 * addi8 r0 r1 i  =>  same as addi
 * add16 r2 r4    =>  r0r1 = r2r3 + r4r5
 * add32 r4 r8    =>  r0r1r2r3 = r4r5r6r7 + r8r9r10r11
 * addi16 r2 i16  =>  r0r1 = r2r3 + i16
 * addi32 r4 i32  =>  r0r1r2r3 = r4r5r6r7 + i32
 * addu*          =>  unsigned versions of all the above addition instructions
 *
 * sub*           =>  subtraction
 * mul*           =>  multiplication
 * div*           =>  integer division - remainder is placed in r12-r15
 *
 * Store/Load/Move:
 * li r0 i        =>  r0 = i
 * li8 r0 i8      =>  same as li
 * li16 r0 i16    =>  r0r1 = i16
 * li32 r0 i32    =>  r0r1r2r3 = i32
 * lui r0 i        =>  r0 = i
 * lui8 r0 i8      =>  same as lui
 * lui16 r0 i16    =>  r0r1 = i16
 * lui32 r0 i32    =>  r0r1r2r3 = i32
 * lm r0          =>  r0 = mem*
 * lm8 r0         =>  same as lm
 * lm16 r0        =>  r0r1 = mem*
 * lm32 r0        =>  r0r1r2r3 = mem*
 * sm r0          =>  mem* = r0
 * sm8 r0         =>  mem* = r0
 * sm16 r0        =>  mem* = r0r1
 * sm32 r0        =>  mem* = r0r1r2r3
 * mov8 r0 r1      =>  r0 = r1
 * mov16 r0 r2      =>  r0r1 = r2r3
 * mov32 r0 r4      =>  r0r1r2r3 = r4r5r6r7
 * mvm a16 b16 i8 =>  a16[0..i8-1] = b16[0..i8-1]
 * clm a16 i8 c8  =>  a16[0..i8-1] = c8
 *
 * Control:
 * beq r0 r1 i16  =>  pc = i16 if r0 = r1
 * beq8 r0 r1 i16 =>  pc = i16 if r0 = r1
 * beq16 r0 r2 i16=>  pc = i16 if r0r1 = r2r3
 * beq32 r0 r4 i16=>  pc = i16 if r0r1r2r3 = r4r5r6r7
 *
 * blt*           =>  branch if less than
 * ble*           =>  branch if less or equal
 * bgt*           =>  branch if greater than
 * bge*           =>  branch if greater or equeal
 * bne*           =>  branch if not equal
 *
 * jmp i16        =>  pc = i16
 * call i16       =>  ret = pc + 1, jmp i16
 * ret            =>  jmp ret, ret = 0
 * rint           =>  jmp rint, rint = 0
 *
 * nop            =>  do nothing, skip a cycle
 * nopi i8        =>  do nothing, skip i8 cycles
 */