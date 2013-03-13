/**
  Ground Web Framework. Session Management. (c) OptimalBits 2013.
*/

module Gnd
{
  
export interface ISessionStore
{
  save(sessionId: string, session: {}, cb: (err?: Error) => void);
  load(sessionId: string, cb: (err?: Error, session?: {}) => void);
  remove(sessionId: string, cb: (err?: Error) => void);
}

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
    console.log("SESSION="+session);
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
