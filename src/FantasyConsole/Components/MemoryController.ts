import { Memory } from './Memory';

export interface MemoryControllerSettingsProperty {
  readonly capacity: number;
  readonly isReadonly?: boolean;
  readonly data?: Array<number>;
}

export interface MemoryControllerSettings {
  readonly memoryModules: Array<MemoryControllerSettingsProperty>;
}

interface MemoryMap {
  readonly memory: Memory;
  readonly startAddress: number;
  readonly endAddress: number;
}

export class MemoryController {

  private _memory: Array<MemoryMap>;
  private _memoryAddress: number;
  private _memoryValue: number;
  private _cachedMemoryMap: MemoryMap;

  public readonly _totalCapacity: number;

  public get memoryAddress(): number {
    return this._memoryAddress;
  }

  public set memoryAddress(newAddress: number) {
    if (this.isValidAddress(newAddress)) {
      this.memoryAddress = newAddress;
      this.updateCachedMemoryPointerIfNeeded();
    }
  }

  public get memoryValue(): number {
    return this._cachedMemoryMap.memory.uint8Clamped[this.memoryAddress - this._cachedMemoryMap.endAddress];
  }

  public set memoryValue(newValue: number) {
    if (this._cachedMemoryMap.memory.isReadOnly)
      return;

    this._cachedMemoryMap.memory.uint8Clamped[this.memoryAddress - this._cachedMemoryMap.endAddress] = newValue;
  }

  public constructor(memoryControllerSettings: MemoryControllerSettings) {
    if (memoryControllerSettings.memoryModules.length === 0)
      throw new RangeError('Memory controller must contain at least one memory module');

    this._totalCapacity = 0;
    this._memory = [];

    for (let memoryProp of memoryControllerSettings.memoryModules) {
      const memory = new Memory(memoryProp.capacity, memoryProp.data, memoryProp.isReadonly);
      const memoryMap: MemoryMap = { memory: memory, startAddress: this._totalCapacity, endAddress: this._totalCapacity + memoryProp.capacity - 1 };
      this._memory.push(memoryMap);
      this._totalCapacity += memoryProp.capacity;
    }

    this._cachedMemoryMap = this._memory[0];
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

    const sourceMemMap = this.getMemoryMapFromAddress(sourceAddress);
    const destMemMap = this.getMemoryMapFromAddress(destAddress);

    // Undefined behaviour 2: if a mem module is not large enough to contain the block size we just copy as much as we can.
    // This could open up for some interesting side effects/hacks :)
    if (blockSize > sourceMemMap.endAddress - sourceAddress)
      blockSize = sourceMemMap.endAddress - sourceAddress;
    if (blockSize > destMemMap.endAddress - destAddress)
      blockSize = destMemMap.endAddress - destAddress;

    for (let i = 0; i < blockSize; ++i) {
      destMemMap.memory.uint8Clamped[i + destAddress - destMemMap.startAddress] = sourceMemMap.memory.uint8Clamped[i + sourceAddress - sourceMemMap.startAddress];
    }
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

    const memMap = this.getMemoryMapFromAddress(startAddress);

    if (blockSize > memMap.endAddress - startAddress)
      blockSize = memMap.endAddress - startAddress;

    for (let i = 0; i < blockSize; ++i) {
      memMap.memory[i + startAddress - memMap.startAddress] = value;
    }
  }

  /**
   * Returns a memory module for the given address.
   * If the given address is not valid the default memory module is returned.
   * @param address An address associated with a memory module.
   */
  public GetMemoryModuleFromAddress(address: number): Memory {
    if (!this.isValidAddress(address))
      address = 0;
    return this.getMemoryMapFromAddress(address).memory;
  }

  public GetUint8ClampedFromAddress(address: number): number {
    let memoryMap = this.getMemoryMapFromAddress(address);
    return memoryMap.memory.uint8Clamped[address - memoryMap.startAddress];
  }

  public GetInt8FromAddress(address: number): number {
    let memoryMap = this.getMemoryMapFromAddress(address);
    return memoryMap.memory.int8[address - memoryMap.startAddress];
  }

  public GetUint8FromAddress(address: number): number {
    let memoryMap = this.getMemoryMapFromAddress(address);
    return memoryMap.memory.uint8[address - memoryMap.startAddress];
  }

  public GetInt16FromAddress(address: number): number {
    let memoryMap = this.getMemoryMapFromAddress(address);
    if (address % 2 === 0)
      return memoryMap.memory.int16[(address - memoryMap.startAddress) / 2];
    else
      return memoryMap.memory.dataViewOff1.getInt16((address - memoryMap.startAddress), true);
  }

  public GetUint16FromAddress(address: number): number {
    let memoryMap = this.getMemoryMapFromAddress(address);
    if (address % 2 === 0)
      return memoryMap.memory.uint16[(address - memoryMap.startAddress) / 2];
    else
      return memoryMap.memory.dataViewOff1.getUint16((address - memoryMap.startAddress), true);
  }

  public GetInt32FromAddress(address: number): number {
    let memoryMap = this.getMemoryMapFromAddress(address);
    switch (address % 4) {
      case 0: return memoryMap.memory.int32[(address - memoryMap.startAddress) / 4];
      case 1: return memoryMap.memory.dataViewOff1.getInt32((address - memoryMap.startAddress), true);
      case 2: return memoryMap.memory.dataViewOff2.getInt32((address - memoryMap.startAddress), true);
      case 3: return memoryMap.memory.dataViewOff3.getInt32((address - memoryMap.startAddress), true);
      default: console.warn('Someting terrible has gone wrong and math no longer works in this world.');
    }
  }

  public GetUint32FromAddress(address: number): number {
    let memoryMap = this.getMemoryMapFromAddress(address);
    switch (address % 4) {
      case 0: return memoryMap.memory.uint32[(address - memoryMap.startAddress) / 4];
      case 1: return memoryMap.memory.dataViewOff1.getUint32((address - memoryMap.startAddress), true);
      case 2: return memoryMap.memory.dataViewOff2.getUint32((address - memoryMap.startAddress), true);
      case 3: return memoryMap.memory.dataViewOff3.getUint32((address - memoryMap.startAddress), true);
      default: console.warn('Someting terrible has gone wrong and math no longer works in this world.');
    }
  }

  private isValidAddress(address): boolean {
    return address >= 0 && address < this._totalCapacity;
  }

  private updateCachedMemoryPointerIfNeeded() {
    if (this.isAddressInMemoryRange(this._memoryAddress, this._cachedMemoryMap))
      return;

    this._cachedMemoryMap = this.getMemoryMapFromAddress(this._memoryAddress);
  }

  private getMemoryMapFromAddress(address: number): MemoryMap {
    return this._memory.find(memoryMap => this.isAddressInMemoryRange(address, memoryMap));
  }

  private isAddressInMemoryRange(address: number, memoryMap: MemoryMap): boolean {
    return address >= memoryMap.startAddress && address <= memoryMap.endAddress;
  }
}