/**
  Ground Web Framework. Session Management. (c) OptimalBits 2013.
*/

module Gnd
{
  
/**
  A session storage interface. This interface can be implemented using any
  available storage in the server.
  
  @class ISessionStore
*/
export interface ISessionStore
{
  /**
  
    @method save
    @param sessionId {String} the session id.
    @param session {Object} plain object with the session data.
    @param cb {Function} nodejs style callback with the save result.
  */
  save(sessionId: string, session: {}, cb: (err?: Error) => void);
  
  /**
  
    @method load
    @param sessionId {String} the session id.
    @param cb {Function} nodejs style callback with load result.
  */
  load(sessionId: string, cb: (err?: Error, session?: {}) => void);
  
  /**
  
    @method remove
    @param sessionId {String} the session id.
    @param cb {Function} nodejs style callback with the remove result.
  */
  remove(sessionId: string, cb: (err?: Error) => void);
}

/**
  This class provides a server side manager for user sessions.

  @class SessionManager
  @constructor
  @param [cookieId] {String} cookie id to use by this manager.
  @param [cookieParser] {Function} (cookie: string) => {} a function that
  can parse a cookie string and return a object with pairs of cookieIds and
  values.
  @param [store] {ISessionStore} a session storage.
*/
export class SessionManager
{
  private expire: number;
  private cookieId: string;
  private cookieParser: (cookie: string) => {};
  private sessionStore: ISessionStore;
  private useSessions: bool;
  
  constructor();
  constructor(cookieId: string, cookieParser: (cookie: string) => {}, store?: ISessionStore);
  constructor(cookieId?: string, cookieParser?: (cookie: string) => {}, store?: ISessionStore)
  {
    this.cookieId = cookieId;
    this.cookieParser = cookieParser;
    this.sessionStore = store || new MemorySessionStore();
    
    this.useSessions = !!cookieId && !!cookieParser;
  }
  
  setSession(sessionId: string, session: {}, cb: (err?: Error) => void)
  {
    //
    // TODO: Registers listeners for this session (session.on('userId', function(){...}))
    //
    
    this.sessionStore.save(sessionId, session, cb);
  }
  
  getSession(cookie: string, cb: (err?: Error, session?: any) => void)
  {
    if(this.useSessions){
      var sessionId = this.getSessionId(cookie);
      if(sessionId){
        return this.sessionStore.load(sessionId, cb);
      }
    
      cb(new Error("No sessionId available in cookies"));
    }else{
      cb(null, {userId: 'guest'});
    }
  }
  
  removeSession(cookie: string, cb: (err?: Error)=>void)
  {
    if(this.useSessions){  
      var sessionId = this.getSessionId(cookie);
      if(sessionId){
        return this.sessionStore.remove(sessionId, cb);
      }
    
      cb(new Error("No sessionId available in cookies"));
    }else{
      cb();
    }
  }
  
  getSessionId(cookie: string)
  {
    var cookies = this.cookieParser(cookie);
    if(cookies){
       return cookies[this.cookieId];
    }
    return;
  }
}

/**
  A Memory based implementation of the ISessionStore interface.

  @class MemorySessionStore
  @extends ISessionStore
  @constructor
  @param [expireTime=1000*60*69] expiration time of the session in milliseconds.
*/
export class MemorySessionStore implements ISessionStore
{
  private sessions = {};
  private expires = {};
  private expireTime = 1000*60*60; // One hour default expiration time
  
  constructor(expireTime?: number)
  {
    this.expireTime = expireTime || this.expireTime;
  }
  
  save(sessionId: string, session: {}, cb: (err?: Error) => void)
  {
    this.touch(sessionId);
    this.sessions[sessionId] = session;
    cb();
  }
  
  load(sessionId: string, cb: (err?: Error, session?: {}) => void)
  {
    var session = this.sessions[sessionId];
    if(session){
      this.touch(sessionId);
      cb(null, session);
    }else{
      cb(new Error("Session not available"));
    }
  }
  
  remove(sessionId: string, cb: (err?: Error) => void)
  {
    delete this.sessions[sessionId];
    clearTimeout(this.expires[sessionId]);
    cb();
  }
  
  private touch(sessionId: string){
    if(this.expires[sessionId]){
      clearTimeout(this.expires[sessionId]);
    }
    this.expires[sessionId] = setTimeout(()=>{
      delete this.sessions[sessionId];
    }, this.expireTime);
  }
}

}
