/**
  Ground Web Framework. Session Management. (c) OptimalBits 2013.
*/
/**
  Session Management
  
  Features:
    - Persistent browser sessions.
    - Automatic outlogging (by timeout). (http://www.nczonline.net/blog/2009/06/02/detecting-if-the-user-is-idle-with-javascript-and-yui-3/)
    - Switch users.
    - Passport enabled.
*/

/// <reference path="../base.ts" />
/// <reference path="../dom.ts" />
/// <reference path="../promise.ts" />

// var c = io.connect('http://216.157.91.131:8080/', { query: "foo=bar" });

module Gnd
{

  /**
    Static class that keeps a session with the server and provide
    methods for login, 
  
    @class Session
    @static
  */
export class Session extends Base
{
  userId: string;
  
  static sessionId: string;
  timeout: number;
  
  /**
    url pointing to the backend session REST interface.
  
    @property url
    @type String
    @static
    @default '/sessions/'
  */
  static url = '/sessions/';
  
  /**
    The login Id of the current logged user.
  
    @property loginId
    @type String
    @readOnly
  */
  static loginId: string;
  
  /**
    Tries to login into the server
  
    @method login
  */
  static login(loginId: string, passwd: string): Promise<any>
  {
    this.loginId = loginId;
    return Ajax.post(Session.url, {username: loginId, password: passwd});
  }
  
  /**
    Swaps the current user
    Do we need this method?
  */
  /*
  static swap(loginId: string, passwd: string)
  {
    this.loginId = loginId;
    return Ajax.put(Session.url, {username: loginId, password:passwd});
  }
  */
  
  /**
    Logs out from ths erver.
    
    @return {Promise} promise resolved when the logout has been completed.
  */
  static logout(): Promise<any>
  {
    return Ajax.del(Session.url);
  }
  
  /**
    Checks if the user has been authenticated.
    
    @return {Promise} a promise resolved if authenticated, rejected otherwise.
  */
  static authenticated(): Promise<any>
  {
    return Ajax.get(Session.url);
  }
}

}
