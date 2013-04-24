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
    INVALID_ID = 2,
    MODEL_NOT_FOUND = 3,
    DOCUMENT_NOT_FOUND = 4,
    STORAGE_ERROR = 5,
    MISSING_RIGHTS = 6,
    NO_CONNECTION = 7,
    INTERNAL_ERROR = 8
  };
  
}
