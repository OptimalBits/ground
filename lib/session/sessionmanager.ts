/**
  Ground Web Framework. Session Management. (c) OptimalBits 2013.
*/

/// <reference path="../promise.ts" />

module Gnd
{

export class Session
{
  userId: string;
}

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
  save(sessionId: string, session: Session): Promise<void>;

  /**

    @method load
    @param sessionId {String} the session id.
    @param cb {Function} nodejs style callback with load result.
  */
  load(sessionId: string): Promise<Session>;

  /**

    @method remove
    @param sessionId {String} the session id.
    @param cb {Function} nodejs style callback with the remove result.
  */
  remove(sessionId: string): Promise<void>;
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
  private cookieParser: (cookie: string) => Promise<string>;
  private sessionStore: ISessionStore;
  private useSessions: boolean;

  constructor();
  constructor(cookieParser: (rawCookies: string) => Promise<string>, store?: ISessionStore);
  constructor(cookieParser?: (rawCookies: string) => Promise<string>, store?: ISessionStore)
  {
    this.cookieParser = cookieParser;
    this.sessionStore = store || new MemorySessionStore();

    this.useSessions = !!cookieParser;
  }

  setSession(sessionId: string, session: Session): Promise<void>
  {
    //
    // TODO: Registers listeners for this session (session.on('userId', function(){...}))
    //

    return this.sessionStore.save(sessionId, session);
  }

  getSession(cookie: string): Promise<Session>
  {
    if(this.useSessions){
      return this.getSessionId(cookie).then<Session>((sessionId)=>{
        if(sessionId){
          return this.sessionStore.load(sessionId);
        }else{
          throw Error("No sessionId available in cookies");
        }
      });
    }else{
      return Promise.resolved({userId: 'guest'});
    }
  }

  removeSession(cookie: string): Promise<void>
  {
    if(this.useSessions){
      return this.getSessionId(cookie).then<void>((sessionId)=>{
        if(sessionId){
          return this.sessionStore.remove(sessionId);
        }else{
          throw Error("No sessionId available in cookies");
        }
      });
    }else{
      return Promise.resolved(void 0);
    }
  }

  getSessionId(rawCookies: string): Promise<string>
  {
    return this.cookieParser(rawCookies);
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

  save(sessionId: string, session: Session): Promise<void>
  {
    this.touch(sessionId);
    this.sessions[sessionId] = session;
    return Promise.resolved(void 0);
  }

  load(sessionId: string): Promise<Session>
  {
    var session = this.sessions[sessionId];
    if(session){
      this.touch(sessionId);
      return Promise.resolved(session);
    }else{
      return Promise.rejected(Error("Session not available"));
    }
  }

  remove(sessionId: string): Promise<void>
  {
    delete this.sessions[sessionId];
    clearTimeout(this.expires[sessionId]);
    return Promise.resolved(void 0);
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
