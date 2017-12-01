/**
 * Memory represents a memory module whose capacity is defined in number of bytes.
 */
export class Memory {

  private _memory: ArrayBuffer;
  private _uint8Clamped: Uint8ClampedArray;
  readonly int8: Int8Array;
  readonly uint8: Uint8Array;
  readonly int16: Int16Array;
  readonly uint16: Uint16Array;
  // readonly int16Off1: Int16Array;
  // readonly uint16Off1: Uint16Array;
  readonly int32: Int32Array;
  readonly uint32: Uint32Array;
  // readonly int32Off1: Int32Array;
  // readonly uint32Off1: Uint32Array;
  // readonly int32Off2: Int32Array;
  // readonly uint32Off2: Uint32Array;
  // readonly int32Off3: Int32Array;
  // readonly uint32Off3: Uint32Array;
  // readonly dataView: DataView;
  readonly dataViewOff1: DataView;
  readonly dataViewOff2: DataView;
  readonly dataViewOff3: DataView;


  public get uint8Clamped(): Uint8ClampedArray {
    return this._uint8Clamped;
  }

  /**
   * Creates a memory module.
   * @param memoryCapacity The capacity for this memory module.
   * @param data Initializes the memory with data if defined. Length of data must equal the given memory capacity.
   * @param isReadOnly Defines if the memory is read-only or writable.
   */
  public constructor(readonly memoryCapacity: number, data: Array<number> = null, readonly isReadOnly: boolean = false) {
    this._memory = new ArrayBuffer(memoryCapacity);
    this._uint8Clamped = new Uint8ClampedArray(this._memory);

    this.int8 = new Int8Array(this._memory);
    this.uint8 = new Uint8Array(this._memory);
    this.int16 = new Int16Array(this._memory);
    this.uint16 = new Uint16Array(this._memory);
    // this.int16Off1 = new Int16Array(this._memory, 1);
    // this.uint16Off1 = new Uint16Array(this._memory, 1);
    this.int32 = new Int32Array(this._memory);
    this.uint32 = new Uint32Array(this._memory);
    // this.int32Off1 = new Int32Array(this._memory, 1);
    // this.uint32Off1 = new Uint32Array(this._memory, 1);
    // this.int32Off2 = new Int32Array(this._memory, 2);
    // this.uint32Off2 = new Uint32Array(this._memory, 2);
    // this.int32Off3 = new Int32Array(this._memory, 3);
    // this.uint32Off3 = new Uint32Array(this._memory, 3);
    this.dataViewOff1 = new DataView(this._memory, 1);
    this.dataViewOff2 = new DataView(this._memory, 2);
    this.dataViewOff3 = new DataView(this._memory, 3);

    if (data) {
      if (data.length !== memoryCapacity) {
        throw new RangeError('The length of the given data object does not match the memory capacity.');
        // console.error('The length of the given data object does not match the memory capacity. Data copy ignored.');
      }
      else {
        let i = memoryCapacity;
        while (i--)
          this._uint8Clamped[i] = data[i];
      }
    }
  }
}