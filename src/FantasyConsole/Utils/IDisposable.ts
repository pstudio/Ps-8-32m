/**
 * A disposable object is an object that needs to do some cleanup when the object is no longer needed.
 * The owner of the disposable object is responsible for calling the dispose() method on the disposable object.
 */
export interface IDisposable {
  dispose();
}