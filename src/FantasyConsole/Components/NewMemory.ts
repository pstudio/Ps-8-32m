/**
 * Memory represents a memory module whose capacity is defined in number of bytes.
 */
export class Memory {
    private _memory: ArrayBuffer;
    readonly uint8Clamped: Uint8ClampedArray;
    readonly int8: Int8Array;
    readonly uint8: Uint8Array;
    readonly int16: Int16Array;
    readonly uint16: Uint16Array;
    readonly int32: Int32Array;
    readonly uint32: Uint32Array;
    readonly dataView: DataView;
    readonly dataViewOff1: DataView;
    readonly dataViewOff2: DataView;
    readonly dataViewOff3: DataView;

    /**
     * Creates a memory module.
     * @param memoryCapacity The capacity for this memory module.
     * @param data Initializes the memory with data if defined. Length of data must equal the given memory capacity.
     * @param isReadOnly Defines if the memory is read-only or writable.
     */
    public constructor(readonly memoryCapacity: number, readonly startAddress: number, memory: ArrayBuffer, readonly isReadOnly: boolean = false) {
      this._memory = memory;

      this.uint8Clamped = new Uint8ClampedArray(this._memory, startAddress, memoryCapacity);
      this.int8 = new Int8Array(this._memory, startAddress, memoryCapacity);
      this.uint8 = new Uint8Array(this._memory, startAddress, memoryCapacity);
      this.int16 = new Int16Array(this._memory, startAddress, Math.floor(memoryCapacity / 2));
      this.uint16 = new Uint16Array(this._memory, startAddress, Math.floor(memoryCapacity / 2));
      this.int32 = new Int32Array(this._memory, startAddress, Math.floor(memoryCapacity / 4));
      this.uint32 = new Uint32Array(this._memory, startAddress, Math.floor(memoryCapacity / 4));
      this.dataView = new DataView(this._memory, startAddress, memoryCapacity);
      this.dataViewOff1 = new DataView(this._memory, startAddress + 1, memoryCapacity - 1);
      this.dataViewOff2 = new DataView(this._memory, startAddress + 2, memoryCapacity - 2);
      this.dataViewOff3 = new DataView(this._memory, startAddress + 3, memoryCapacity - 3);
    }
  }