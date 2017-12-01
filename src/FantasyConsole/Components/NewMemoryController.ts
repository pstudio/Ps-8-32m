import { Memory } from './NewMemory';

export interface MemoryControllerSettingsProperty {
  readonly startAddress: number;
  readonly capacity: number;
  readonly isReadonly?: boolean;
}

export interface MemoryControllerSettings {
  readonly memoryModules: Array<MemoryControllerSettingsProperty>;
}

export class MemoryController {

  private _memoryBuffer: ArrayBuffer;
  private _memory: Memory;
  private _memoryModules: Array<Memory>;
  private _memoryAddress: number;
  private _memoryValue: number;

  public readonly _totalCapacity: number;

  public get memoryAddress(): number {
    return this._memoryAddress;
  }

  public set memoryAddress(newAddress: number) {
    if (this.isValidAddress(newAddress)) {
      this._memoryAddress = newAddress;
    }
  }

  public get memoryValue(): number {
    return this._memory.int8[this.memoryAddress];
  }

  public set memoryValue(newValue: number) {
    this._memory.int8[this.memoryAddress] = newValue;
  }

  public get memoryValue16(): number {
    return this._memory.dataView.getInt16(this.memoryAddress, this.littleEndian);
  }

  public set memoryValue16(newValue: number) {
    this._memory.dataView.setInt16(this.memoryAddress, newValue, this.littleEndian);
  }

  public get memoryValue32(): number {
    return this._memory.dataView.getInt32(this.memoryAddress, this.littleEndian);
  }

  public set memoryValue32(newValue: number) {
    this._memory.dataView.setInt32(this.memoryAddress, newValue, this.littleEndian);
  }

  public get memoryValueUnsigned(): number {
    return this._memory.uint8[this.memoryAddress];
  }

  public set memoryValueUnsigned(newValue: number) {
    this._memory.uint8[this.memoryAddress] = newValue;
  }

  public constructor(memoryControllerSettings: MemoryControllerSettings) {
    if (memoryControllerSettings.memoryModules.length === 0)
      throw new RangeError('Memory controller must contain at least one memory module');

    this._totalCapacity = memoryControllerSettings.memoryModules.map(mm => mm.capacity).reduce((prev, current) => prev + current);
    this._memoryBuffer = new ArrayBuffer(this._totalCapacity);
    this._memory = new Memory(this._totalCapacity, 0, this._memoryBuffer, false);
    this._memoryModules = [];

    for (let memoryProp of memoryControllerSettings.memoryModules) {
      if (memoryProp.capacity % 4 !== 0 || memoryProp.startAddress % 4 !== 0)
        throw new RangeError('A memory module must have 4 bytes aligned memory capacity and adressing.');

      const memory = new Memory(memoryProp.capacity, memoryProp.startAddress, this._memoryBuffer, memoryProp.isReadonly);
      this._memoryModules.push(memory);
    }
  }

  public LoadFromArray(offset: number, arr: Array<number>) {
    for (let i = offset, o = 0; o < arr.length; ++i, ++o)
      this._memory.uint8[i] = arr[o];
  }

  /**
   * Allows to copy a large amount of memory from one place to another place.
   * This method requires a few conditions in order to work:
   * The memory block that is copied must reside in a single memory module.
   * The memory block must be able to fit in the destination module at the destination address.
   * Both source and destination addresses must be valid.
   * If conditions are not met the result is deemed undefined officially.
   * @param sourceAddress The source address to copy from.
   * @param destAddress The destination address to copy to.
   * @param blockSize The amount of memory that must be copied.
   */
  public FastCopyMemoryBlock(sourceAddress: number, destAddress: number, blockSize: number) {
    // Undefined behaviour 1: if the given addresses are invalid we simply do nothing
    if (!this.isValidAddress(sourceAddress) && !this.isValidAddress(destAddress))
      return;

    // Undefined behaviour 2: if a mem module is not large enough to contain the block size we just copy as much as we can.
    // This could open up for some interesting side effects/hacks :)
    if (blockSize > this._memory.memoryCapacity - sourceAddress)
      blockSize = this._memory.memoryCapacity - sourceAddress;
    if (blockSize > this._memory.memoryCapacity - destAddress)
      blockSize = this._memory.memoryCapacity - destAddress;

    this._memory.uint8Clamped.copyWithin(destAddress, sourceAddress, sourceAddress + blockSize);
    // for (let i = 0; i < blockSize; ++i) {
    //   destMemMap.memory.uint8Clamped[i + destAddress - destMemMap.startAddress] = sourceMemMap.memory.uint8Clamped[i + sourceAddress - sourceMemMap.startAddress];
    // }
  }

  /**
   * Allows to clear a large amount of memory to a single value.
   * The cleared memory must reside in a single memory module.
   * @param startAddress The start address to start clearing from.
   * @param value The value to clear to.
   * @param blockSize The amount of memory to clear.
   */
  public FastClearMemoryBlock(startAddress: number, value: number, blockSize: number) {
    if (!this.isValidAddress(startAddress))
      return;

    if (blockSize > this._memory.memoryCapacity - startAddress)
      blockSize = this._memory.memoryCapacity - startAddress;

    this._memory.uint8Clamped.fill(value, startAddress, blockSize);
    // for (let i = 0; i < blockSize; ++i) {
    //   this._memory.uint8Clamped[startAddress + i] = value;
    // }
  }

  private littleEndian = true;
  /**
   * Returns a memory module for the given address.
   * If the given address is not valid the default memory module is returned.
   * @param address An address associated with a memory module.
   */
  public GetMemoryModuleFromAddress(address: number): Memory {
    if (!this.isValidAddress(address))
      address = 0;
    return this.getMemoryFromAddress(address);
  }

  public GetUint8ClampedFromAddress(address: number): number {
    return this._memory.uint8Clamped[address];
  }

  public GetInt8FromAddress(address: number): number {
    return this._memory.int8[address];
  }

  public GetUint8FromAddress(address: number): number {
    return this._memory.uint8[address];
  }

  public GetInt16FromAddress(address: number): number {
    // if (address % 2 === 0)
    //   return this._memory.int16[(address) / 2];
    // else
    //   return this._memory.dataViewOff1.getInt16((address - 1), this.littleEndian);
    return this._memory.dataView.getInt16(address, this.littleEndian);
  }

  public GetUint16FromAddress(address: number): number {
    // if (address % 2 === 0)
    //   return this._memory.uint16[(address) / 2];
    // else
    //   return this._memory.dataViewOff1.getUint16((address - 1), this.littleEndian);
    return this._memory.dataView.getUint16(address, this.littleEndian);
  }

  public GetInt32FromAddress(address: number): number {
    // switch (address % 4) {
    //   case 0: return this._memory.int32[(address) / 4];
    //   case 1: return this._memory.dataViewOff1.getInt32((address - 1), this.littleEndian);
    //   case 2: return this._memory.dataViewOff2.getInt32((address - 2), this.littleEndian);
    //   case 3: return this._memory.dataViewOff3.getInt32((address - 3), this.littleEndian);
    //   default: console.warn('Someting terrible has gone wrong and math no longer works in this world.');
    // }
    return this._memory.dataView.getInt32(address, this.littleEndian);
  }

  public GetUint32FromAddress(address: number): number {
    // switch (address % 4) {
    //   case 0: return this._memory.uint32[(address) / 4];
    //   case 1: return this._memory.dataViewOff1.getUint32((address - 1), this.littleEndian);
    //   case 2: return this._memory.dataViewOff2.getUint32((address - 2), this.littleEndian);
    //   case 3: return this._memory.dataViewOff3.getUint32((address - 3), this.littleEndian);
    //   default: console.warn('Someting terrible has gone wrong and math no longer works in this world.');
    // }
    return this._memory.dataView.getUint32(address, this.littleEndian);
  }

  private isValidAddress(address): boolean {
    return address >= 0 && address < this._totalCapacity;
  }

  private getMemoryFromAddress(address: number): Memory {
    return this._memoryModules.find(memory => this.isAddressInMemoryRange(address, memory));
  }

  private isAddressInMemoryRange(address: number, memory: Memory): boolean {
    return address >= memory.startAddress && address <= memory.startAddress + memory.memoryCapacity - 1;
  }
}