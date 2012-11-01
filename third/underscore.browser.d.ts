/*
   Typescipt Underscore 1.4.2-0.9 (Browser Version)
   (c) 2012 Álvaro Vilanova Vidal
   Typescipt-Underscore may be freely distributed under the MIT license.
 */

declare interface UnderscoreVoidListIterator {
    (element : any, index : number, list : any[]) : void;
}

declare interface UnderscoreMemoListIterator {
    (memo : any, element : any, index : number, list : any[]) : any;
}

declare interface UnderscoreListIterator {
    (element : any, index : number, list : any[]) : any;
}

declare interface UnderscoreVoidObjectIterator {
    (element : any, key : any, object : any) : void;
}

declare interface UnderscoreMemoObjectIterator {
    (memo : any, element : any, key : any, object : any) : any;
}

declare interface UnderscoreObjectIterator{
    (element : any, key : any, object : any) : any;
}

declare interface UnderscorePredicate {
    (value : any) : bool;
}

declare interface UnderscoreIterator {
    (value : any) : any;
}

declare interface UnderscoreTemplateSettings {
    evaluate?    : RegExp;
    interpolate? : RegExp;
    escape?      : RegExp;
}

/* Interface for use underscore in functional (chain) style.
   range, bindAll, dealy, defer, after, noConflict, times, random, mixin,
   uniqueId, chain and template have been removed because they are not very
   useful here.
 */
declare interface UnderscoreWrappedObject {
    // Collection Functions (Arrays or Objects)
    each (iterator : UnderscoreVoidListIterator, context? : any) : UnderscoreWrappedObject;
    each (iterator : UnderscoreVoidObjectIterator, context? : any) : UnderscoreWrappedObject;
    forEach (iterator : UnderscoreVoidListIterator, context? : any) : UnderscoreWrappedObject;
    forEach (iterator : UnderscoreVoidObjectIterator, context? : any) : UnderscoreWrappedObject;

    map (iterator : UnderscoreListIterator, context? : any) : UnderscoreWrappedObject;
    map (iterator : UnderscoreObjectIterator, context? : any) : UnderscoreWrappedObject;
    collect (iterator : UnderscoreListIterator, context? : any) : UnderscoreWrappedObject;
    collect (iterator : UnderscoreObjectIterator, context? : any) : UnderscoreWrappedObject;

    reduce (iterator : UnderscoreMemoListIterator, memo : any, context? : any) : UnderscoreWrappedObject;
    reduce (iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : UnderscoreWrappedObject;
    inject (iterator : UnderscoreMemoListIterator, memo : any, context? : any) : UnderscoreWrappedObject;
    inject (iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : UnderscoreWrappedObject;
    foldl (iterator : UnderscoreMemoListIterator, memo : any, context? : any) : UnderscoreWrappedObject;
    foldl (iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : UnderscoreWrappedObject;

    reduceRight (iterator : UnderscoreMemoListIterator, memo : any, context? : any) : UnderscoreWrappedObject;
    reduceRight (iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : UnderscoreWrappedObject;
    foldr (iterator : UnderscoreMemoListIterator, memo : any, context? : any) : UnderscoreWrappedObject;
    foldr (iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : UnderscoreWrappedObject;

    find (predicate : UnderscorePredicate, context? : any) : UnderscoreWrappedObject;
    detect (predicate : UnderscorePredicate, context? : any) : UnderscoreWrappedObject;

    filter (predicate : UnderscorePredicate, context? : any) : UnderscoreWrappedObject;
    select (predicate : UnderscorePredicate, context? : any) : UnderscoreWrappedObject;

    where (properties : any) : UnderscoreWrappedObject;

    reject (predicate : UnderscorePredicate, context? : any) : UnderscoreWrappedObject;

    all (predicate : UnderscorePredicate, context? : any) : UnderscoreWrappedObject;
    every (predicate : UnderscorePredicate, context? : any) : UnderscoreWrappedObject;

    any (predicate? : UnderscorePredicate, context? : any) : UnderscoreWrappedObject;
    some (predicate? : UnderscorePredicate, context? : any) : UnderscoreWrappedObject;

    contains (value : any) : UnderscoreWrappedObject;
    include (value : any) : UnderscoreWrappedObject;

    invoke (methodName : string, ...arguments: any[]) : UnderscoreWrappedObject;

    pluck (propertyName : string) : UnderscoreWrappedObject;

    max (iterator? : UnderscoreIterator, context? : any) : UnderscoreWrappedObject;

    min (iterator? : UnderscoreIterator, context? : any) : UnderscoreWrappedObject;

    sortBy (property? : string, context? : any) : UnderscoreWrappedObject;
    sortBy (iterator? : UnderscoreIterator, context? : any) : UnderscoreWrappedObject;

    groupBy (property : string) : UnderscoreWrappedObject;
    groupBy (iterator : UnderscoreIterator) : UnderscoreWrappedObject;

    countBy (property : string) : UnderscoreWrappedObject;
    countBy (iterator : UnderscoreIterator) : UnderscoreWrappedObject;

    shuffle () : UnderscoreWrappedObject;

    toArray () : UnderscoreWrappedObject;

    size () : UnderscoreWrappedObject;


    // Array Functions
    first (n? : number) : UnderscoreWrappedObject;
    head (n? : number) : UnderscoreWrappedObject;
    take (n? : number) : UnderscoreWrappedObject;

    initial (n? : number) : UnderscoreWrappedObject;

    last (n? : number) : UnderscoreWrappedObject;

    rest (index? : number) : UnderscoreWrappedObject;
    tail (index? : number) : UnderscoreWrappedObject;
    drop (index? : number) : UnderscoreWrappedObject;

    compact () : UnderscoreWrappedObject;

    flatten (shallow? : bool) : UnderscoreWrappedObject;

    without (...values : any[]) : UnderscoreWrappedObject;

    union (...arrays : any[][]) : UnderscoreWrappedObject;

    intersection (...arrays : any[][]) : UnderscoreWrappedObject;

    difference (...arrays : any[][]) : UnderscoreWrappedObject;

    uniq (isSorted? : bool, UnderscoreIterator? : UnderscoreIterator) : UnderscoreWrappedObject;
    unique (isSorted? : bool, UnderscoreIterator? : UnderscoreIterator) : UnderscoreWrappedObject;

    zip (...arrays : any[][]) : UnderscoreWrappedObject;

    object (value? : any) : UnderscoreWrappedObject;

    indexOf (value : any, isSorted? : bool) : UnderscoreWrappedObject;

    lastIndexOf (value : any, fromIndex? : number) : UnderscoreWrappedObject;

    sortedIndex (value : any, UnderscoreIterator? : UnderscoreIterator) : UnderscoreWrappedObject;


    // Function (uh, ahem) Functions
    bind (object : any, ...arguments : any[]) : UnderscoreWrappedObject;

    memoize (hashFunction? : (value : any) => any) : UnderscoreWrappedObject;

    delay ( wait : number, ...arguments : any[]) : UnderscoreWrappedObject;

    defer (...arguments : any[]) : UnderscoreWrappedObject;

    throttle (wait : number) : UnderscoreWrappedObject;

    debounce (wait : number, immediate? : bool) : UnderscoreWrappedObject;

    once () : UnderscoreWrappedObject;

    after (fn : (...args : any[]) => any) : UnderscoreWrappedObject;

    wrap (wrapper : (...args : any[]) => any) : UnderscoreWrappedObject;

    compose (...fns : Function[]) : UnderscoreWrappedObject;


    // Object Functions
    keys () : UnderscoreWrappedObject;

    values () : UnderscoreWrappedObject;

    pairs () : UnderscoreWrappedObject;

    invert () : UnderscoreWrappedObject;

    functions () : UnderscoreWrappedObject;
    methods () : UnderscoreWrappedObject;

    extend (...sources : any[]) : UnderscoreWrappedObject;

    pick (...keys : string[]) : UnderscoreWrappedObject;

    omit (...keys : string[]) : UnderscoreWrappedObject;

    defaults (...defaults : any[]) : UnderscoreWrappedObject;

    clone () : UnderscoreWrappedObject;

    tap (interceptor : (...as : any[]) => any) : UnderscoreWrappedObject;

    has (key : any) : UnderscoreWrappedObject;

    isEqual (other : any) : UnderscoreWrappedObject;

    isEmpty () : UnderscoreWrappedObject;

    isElement () : UnderscoreWrappedObject;

    isArray () : UnderscoreWrappedObject;

    isObject () : UnderscoreWrappedObject;

    isArguments () : UnderscoreWrappedObject;

    isFunction () : UnderscoreWrappedObject;

    isString () : UnderscoreWrappedObject;

    isNumber () : UnderscoreWrappedObject;

    isFinite () : UnderscoreWrappedObject;

    isBoolean () : UnderscoreWrappedObject;

    isDate () : UnderscoreWrappedObject;

    isRegExp () : UnderscoreWrappedObject;

    isNaN () : UnderscoreWrappedObject;

    isNull () : UnderscoreWrappedObject;

    isUndefined () : UnderscoreWrappedObject;


    // Utility Functions
    identity () : UnderscoreWrappedObject;

    escape () : UnderscoreWrappedObject;

    result (property : string) : UnderscoreWrappedObject;

    template (data? : any, settings? : any) : (...as : any[]) => UnderscoreWrappedObject;

    value () : any;
}

/* Interface that enables the use of underscore in a OO Style.
   range, bindAll, dealy, defer, after, noConflict, times, random, mixin and
   uniqueId have been removed because they are not very useful here.
 */
declare interface UnderscoreOOStatic {
    // Collection Functions (Arrays or Objects)
    each (iterator : UnderscoreVoidListIterator, context? : any) : void;
    each (iterator : UnderscoreVoidObjectIterator, context? : any) : void;
    forEach (iterator : UnderscoreVoidListIterator, context? : any) : void;
    forEach (iterator : UnderscoreVoidObjectIterator, context? : any) : void;

    map (iterator : UnderscoreListIterator, context? : any) : any[];
    map (iterator : UnderscoreObjectIterator, context? : any) : any[];
    collect (iterator : UnderscoreListIterator, context? : any) : any[];
    collect (iterator : UnderscoreObjectIterator, context? : any) : any[];

    reduce (iterator : UnderscoreMemoListIterator, memo : any, context? : any) : any;
    reduce (iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : any;
    inject (iterator : UnderscoreMemoListIterator, memo : any, context? : any) : any;
    inject (iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : any;
    foldl (iterator : UnderscoreMemoListIterator, memo : any, context? : any) : any;
    foldl (iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : any;

    reduceRight (iterator : UnderscoreMemoListIterator, memo : any, context? : any) : any;
    reduceRight (iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : any;
    foldr (iterator : UnderscoreMemoListIterator, memo : any, context? : any) : any;
    foldr (iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : any;

    find (predicate : UnderscorePredicate, context? : any) : any;
    detect (predicate : UnderscorePredicate, context? : any) : any;

    filter (predicate : UnderscorePredicate, context? : any) : any;
    select (predicate : UnderscorePredicate, context? : any) : any;

    where (properties : any) : any;

    reject (predicate : UnderscorePredicate, context? : any) : any;

    all (predicate : UnderscorePredicate, context? : any) : any;
    every (predicate : UnderscorePredicate, context? : any) : any;

    any (predicate? : UnderscorePredicate, context? : any) : any;
    some (predicate? : UnderscorePredicate, context? : any) : any;

    contains (value : any) : bool;
    include (value : any) : bool;

    invoke (methodName : string, ...arguments: any[]) : any;

    pluck (propertyName : string) : any;

    max (iterator? : UnderscoreIterator, context? : any) : any;

    min (iterator? : UnderscoreIterator, context? : any) : any;

    sortBy (property? : string, context? : any) : any;
    sortBy (iterator? : UnderscoreIterator, context? : any) : any;

    groupBy (property : string) : any;
    groupBy (iterator : UnderscoreIterator) : any;

    countBy (property : string) : any;
    countBy (iterator : UnderscoreIterator) : any;

    shuffle () : any;

    toArray () : any[];

    size () : number;


    // Array Functions
    first (n? : number) : any;
    head (n? : number) : any;
    take (n? : number) : any;

    initial (n? : number) : any[];

    last (n? : number) : any;

    rest (index? : number) : any[];
    tail (index? : number) : any[];
    drop (index? : number) : any[];

    compact () : any[];

    flatten (shallow? : bool) : any[];

    without (...values : any[]) : any[];

    union (...arrays : any[][]) : any[];

    intersection (...arrays : any[][]) : any[];

    difference (...arrays : any[][]) : any[];

    uniq (isSorted? : bool, UnderscoreIterator? : UnderscoreIterator) : any[];
    unique (isSorted? : bool, UnderscoreIterator? : UnderscoreIterator) : any[];

    zip (...arrays : any[][]) : any[];

    object (value? : any) : any;

    indexOf (value : any, isSorted? : bool) : number;

    lastIndexOf (value : any, fromIndex? : number) : number;

    sortedIndex (value : any, UnderscoreIterator? : UnderscoreIterator) : any;


    // Function (uh, ahem) Functions
    bind (object : any, ...arguments : any[]) : (...args : any[]) => any;

    memoize (hashFunction? : (value : any) => any) : (...args : any[]) => any;

    delay ( wait : number, ...arguments : any[]) : void;

    defer (...arguments : any[]) : void;

    throttle (wait : number) : (...args : any[]) => any;

    debounce (wait : number, immediate? : bool) : (...args : any[]) => any;

    once () : (...args : any[]) => any;

    after (fn : (...args : any[]) => any) : (...args : any[]) => any;

    wrap (wrapper : (...args : any[]) => any) : (...args : any[]) => any;

    compose (...fns : Function[]) : (...args : any[]) => any;


    // Object Functions
    keys () : string[];

    values () : any[];

    pairs () : any[];

    invert () : any;

    functions () : string[];
    methods () : string[];

    extend (...sources : any[]) : any;

    pick (...keys : string[]) : any;

    omit (...keys : string[]) : any;

    defaults (...defaults : any[]) : any;

    clone () : any;

    tap (interceptor : (...as : any[]) => any) : any;

    has (key : any) : bool;

    isEqual (other : any) : bool;

    isEmpty () : bool;

    isElement () : bool;

    isArray () : bool;

    isObject () : bool;

    isArguments () : bool;

    isFunction () : bool;

    isString () : bool;

    isNumber () : bool;

    isFinite () : bool;

    isBoolean () : bool;

    isDate () : bool;

    isRegExp () : bool;

    isNaN () : bool;

    isNull () : bool;

    isUndefined () : bool;


    // Utility Functions
    identity () : any;

    escape () : string;

    result (property : string) : any;

    template (data? : any, settings? : UnderscoreTemplateSettings) : (...as : any[]) => string;

    chain () : UnderscoreWrappedObject;
}

declare interface UnderscoreStatic extends Function {
    // OO-style
    (arg : any) : UnderscoreOOStatic;

    // Collection Functions (Arrays or Objects)
    each (list : any[], iterator : UnderscoreVoidListIterator, context? : any) : void;
    each (object : any, iterator : UnderscoreVoidObjectIterator, context? : any) : void;
    forEach (list : any[], iterator : UnderscoreVoidListIterator, context? : any) : void;
    forEach (object : any, iterator : UnderscoreVoidObjectIterator, context? : any) : void;

    map (list : any[], iterator : UnderscoreListIterator, context? : any) : any[];
    map (object : any, iterator : UnderscoreObjectIterator, context? : any) : any[];
    collect (list : any[], iterator : UnderscoreListIterator, context? : any) : any[];
    collect (object : any, iterator : UnderscoreObjectIterator, context? : any) : any[];


    reduce (list : any[], iterator : UnderscoreMemoListIterator, memo : any, context? : any) : any;
    reduce (list : any, iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : any;
    inject (list : any[], iterator : UnderscoreMemoListIterator, memo : any, context? : any) : any;
    inject (list : any, iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : any;
    foldl (list : any[], iterator : UnderscoreMemoListIterator, memo : any, context? : any) : any;
    foldl (list : any, iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : any;


    reduceRight (list : any[], iterator : UnderscoreMemoListIterator, memo : any, context? : any) : any;
    reduceRight (list : any, iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : any;
    foldr (list : any[], iterator : UnderscoreMemoListIterator, memo : any, context? : any) : any;
    foldr (list : any, iterator : UnderscoreMemoObjectIterator, memo : any, context? : any) : any;

    find (list : any, predicate : UnderscorePredicate, context? : any) : any;
    detect (list : any, predicate : UnderscorePredicate, context? : any) : any;

    filter (list : any, predicate : UnderscorePredicate, context? : any) : any;
    select (list : any, predicate : UnderscorePredicate, context? : any) : any;

    where (list : any, properties : any) : any;

    reject (list : any, predicate : UnderscorePredicate, context? : any) : any;

    all (list : any, predicate : UnderscorePredicate, context? : any) : any;
    every (list : any, predicate : UnderscorePredicate, context? : any) : any;

    any (list : any, predicate? : UnderscorePredicate, context? : any) : any;
    some (list : any, predicate? : UnderscorePredicate, context? : any) : any;

    contains (list : any, value : any) : bool;
    include (list : any, value : any) : bool;

    invoke (list : any, methodName : string, ...arguments: any[]) : any;

    pluck (list : any, propertyName : string) : any;

    max (list : any, UnderscoreIterator? : UnderscoreIterator, context? : any) : any;

    min (list : any, UnderscoreIterator? : UnderscoreIterator, context? : any) : any;

    sortBy (list : any, property? : string, context? : any) : any;
    sortBy (list : any, UnderscoreIterator? : UnderscoreIterator, context? : any) : any;

    groupBy (list : any, property : string) : any;
    groupBy (list : any, iterator : UnderscoreIterator) : any;

    countBy (list : any, iterator : UnderscoreIterator) : any;

    shuffle (list : any) : any;

    toArray (list : any) : any[];

    size (list : any) : number;


    // Array Functions

    first (array : any[], n? : number) : any;
    head (array : any[], n? : number) : any;
    take (array : any[], n? : number) : any;

    initial (array : any[], n? : number) : any[];

    last (array : any[], n? : number) : any;

    rest (array : any[], index? : number) : any[];
    tail (array : any[], index? : number) : any[];
    drop (array : any[], index? : number) : any[];

    compact (array : any[]) : any[];

    flatten (array : any[], shallow? : bool) : any[];

    without (array : any[], ...values : any[]) : any[];

    union (...arrays : any[][]) : any[];

    intersection (...arrays : any[][]) : any[];

    difference (...arrays : any[][]) : any[];

    uniq (array : any[], isSorted? : bool, UnderscoreIterator? : UnderscoreIterator) : any[];
    unique (array : any[], isSorted? : bool, UnderscoreIterator? : UnderscoreIterator) : any[];

    zip (...arrays : any[][]) : any[];

    object (list : any, value? : any) : any;

    indexOf (array : any[], value : any, isSorted? : bool) : number;

    lastIndexOf (array : any[], value : any, fromIndex? : number) : number;

    sortedIndex (list : any, value : any, UnderscoreIterator? : UnderscoreIterator) : any;

    range (stop : number) : number[];
    range (start: number, stop : number, step? : number) : number[];


    // Function (uh, ahem) Functions

    bind (fn : (...args : any[]) => any, object : any, ...arguments : any[]) : (...args : any[]) => any;

    bindAll (object : any, ...methodNames : string[]) : void;

    memoize (fn : (...args : any[]) => any, hashFunction? : (value : any) => any) : (...args : any[]) => any;

    delay (fn : (...args : any[]) => any, wait : number, ...arguments : any[]) : void;

    defer (fn : (...args : any[]) => any, ...arguments : any[]) : void;

    throttle (fn : (...args : any[]) => any, wait : number) : (...args : any[]) => any;

    debounce (fn : (...args : any[]) => any, wait : number, immediate? : bool) : (...args : any[]) => any;

    once (fn : (...args : any[]) => any) : (...args : any[]) => any;

    after (count : number, fn : (...args : any[]) => any) : (...args : any[]) => any;

    wrap (fn : (...args : any[]) => any, wrapper : (...args : any[]) => any) : (...args : any[]) => any;

    compose (...fns : Function[]) : (...args : any[]) => any;


    // Object Functions

    keys (object : any) : string[];

    values (object : any) : any[];

    pairs (object : any) : any[];

    invert (object : any) : any;

    functions (object : any) : string[];
    methods (object : any) : string[];

    extend (destination : any, ...sources : any[]) : any;

    pick (object : any, ...keys : string[]) : any;

    omit (object : any, ...keys : string[]) : any;

    defaults (object : any, ...defaults : any[]) : any;

    clone (object : any) : any;

    tap (object : any, interceptor : (...as : any[]) => any) : any;

    has (object : any, key : any) : bool;

    isEqual (object : any, other : any) : bool;

    isEmpty (object : any) : bool;

    isElement (object : any) : bool;

    isArray (object : any) : bool;

    isObject (value : any) : bool;

    isArguments (object : any) : bool;

    isFunction (object : any) : bool;

    isString (object : any) : bool;

    isNumber (object : any) : bool;

    isFinite (object : any) : bool;

    isBoolean (object : any) : bool;

    isDate (object : any) : bool;

    isRegExp (object : any) : bool;

    isNaN (object : any) : bool;

    isNull (object : any) : bool;

    isUndefined (object : any) : bool;


    // Utility Functions

    noConflict () : any;

    identity (value : any) : any;

    times (n : number, iterator : (index : number) => void, context? : any) : void;

    random (min : number, max : number) : number;

    mixin (object : any) : void;

    uniqueId (prefix? : string) : any;

    escape (str : string) : string;

    result (object : any, property : string) : any;

    template (templateString : string, data? : any, settings? : UnderscoreTemplateSettings) : (...as : any[]) => string;
    templateSettings : UnderscoreTemplateSettings;

    chain (object : any) : UnderscoreWrappedObject;
}

declare var _ : UnderscoreStatic;
