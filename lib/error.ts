/**
  Ground Web Framework (c) 2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Base Class.
  
  Most classes extends the base class in order to be observable,
  get property bindings and reference counting.
*/

module Gnd {
 
  export enum ServerError {
    INVALID_SESSION = 1,
    INVALID_ID,
    MODEL_NOT_FOUND,
    DOCUMENT_NOT_FOUND,
    STORAGE_ERROR,
    MISSING_RIGHTS,
    NO_CONNECTION,
    INTERNAL_ERROR
  };
  
}
