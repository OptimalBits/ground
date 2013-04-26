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

/*
  Gnd.ActiveSession keeps an instance of the session object.
*/

/// <reference path="../base.ts" />
/// <reference path="../dom.ts" />
/// <reference path="../promise.ts" />

// var c = io.connect('http://216.157.91.131:8080/', { query: "foo=bar" });

module Gnd
{

export class Session extends Base
{
  userId: string;
  
  static sessionId: string;
  timeout: number;
  
  static url = '/sessions/';
  static loginId: string;
  
  static login(loginId: string, passwd: string): Promise
  {
    return Ajax.post(Session.url, {username: loginId, password:passwd});
  }
  
  static swap(loginId: string, passwd: string)
  {
    return Ajax.put(Session.url, {username: loginId, password:passwd});
  }
  
  static logout(): Promise
  {
    return Ajax.del(Session.url, {});
  }

  static authenticated(): Promise
  {
    return Ajax.get(Session.url, {});
  }
}

}
