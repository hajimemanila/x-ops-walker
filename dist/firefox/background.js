"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/webextension-polyfill/dist/browser-polyfill.js
  var require_browser_polyfill = __commonJS({
    "node_modules/webextension-polyfill/dist/browser-polyfill.js"(exports, module) {
      init_browser_polyfill_entry();
      (function(global, factory) {
        if (typeof define === "function" && define.amd) {
          define("webextension-polyfill", ["module"], factory);
        } else if (typeof exports !== "undefined") {
          factory(module);
        } else {
          var mod = {
            exports: {}
          };
          factory(mod);
          global.browser = mod.exports;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : exports, function(module2) {
        "use strict";
        if (!(globalThis.chrome && globalThis.chrome.runtime && globalThis.chrome.runtime.id)) {
          throw new Error("This script should only be loaded in a browser extension.");
        }
        if (!(globalThis.browser && globalThis.browser.runtime && globalThis.browser.runtime.id)) {
          const CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE = "The message port closed before a response was received.";
          const wrapAPIs = (extensionAPIs) => {
            const apiMetadata = {
              "alarms": {
                "clear": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "clearAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "get": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "bookmarks": {
                "create": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getChildren": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getRecent": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getSubTree": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getTree": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "move": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeTree": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "search": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              },
              "browserAction": {
                "disable": {
                  "minArgs": 0,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "enable": {
                  "minArgs": 0,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "getBadgeBackgroundColor": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getBadgeText": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getPopup": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getTitle": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "openPopup": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "setBadgeBackgroundColor": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setBadgeText": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setIcon": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "setPopup": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setTitle": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                }
              },
              "browsingData": {
                "remove": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "removeCache": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeCookies": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeDownloads": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeFormData": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeHistory": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeLocalStorage": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removePasswords": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removePluginData": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "settings": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "commands": {
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "contextMenus": {
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              },
              "cookies": {
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAllCookieStores": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "set": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "devtools": {
                "inspectedWindow": {
                  "eval": {
                    "minArgs": 1,
                    "maxArgs": 2,
                    "singleCallbackArg": false
                  }
                },
                "panels": {
                  "create": {
                    "minArgs": 3,
                    "maxArgs": 3,
                    "singleCallbackArg": true
                  },
                  "elements": {
                    "createSidebarPane": {
                      "minArgs": 1,
                      "maxArgs": 1
                    }
                  }
                }
              },
              "downloads": {
                "cancel": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "download": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "erase": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getFileIcon": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "open": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "pause": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeFile": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "resume": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "search": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "show": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                }
              },
              "extension": {
                "isAllowedFileSchemeAccess": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "isAllowedIncognitoAccess": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "history": {
                "addUrl": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "deleteAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "deleteRange": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "deleteUrl": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getVisits": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "search": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "i18n": {
                "detectLanguage": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAcceptLanguages": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "identity": {
                "launchWebAuthFlow": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "idle": {
                "queryState": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "management": {
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getSelf": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "setEnabled": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "uninstallSelf": {
                  "minArgs": 0,
                  "maxArgs": 1
                }
              },
              "notifications": {
                "clear": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "create": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getPermissionLevel": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              },
              "pageAction": {
                "getPopup": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getTitle": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "hide": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setIcon": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "setPopup": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setTitle": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "show": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                }
              },
              "permissions": {
                "contains": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "request": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "runtime": {
                "getBackgroundPage": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getPlatformInfo": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "openOptionsPage": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "requestUpdateCheck": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "sendMessage": {
                  "minArgs": 1,
                  "maxArgs": 3
                },
                "sendNativeMessage": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "setUninstallURL": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "sessions": {
                "getDevices": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getRecentlyClosed": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "restore": {
                  "minArgs": 0,
                  "maxArgs": 1
                }
              },
              "storage": {
                "local": {
                  "clear": {
                    "minArgs": 0,
                    "maxArgs": 0
                  },
                  "get": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "getBytesInUse": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "remove": {
                    "minArgs": 1,
                    "maxArgs": 1
                  },
                  "set": {
                    "minArgs": 1,
                    "maxArgs": 1
                  }
                },
                "managed": {
                  "get": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "getBytesInUse": {
                    "minArgs": 0,
                    "maxArgs": 1
                  }
                },
                "sync": {
                  "clear": {
                    "minArgs": 0,
                    "maxArgs": 0
                  },
                  "get": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "getBytesInUse": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "remove": {
                    "minArgs": 1,
                    "maxArgs": 1
                  },
                  "set": {
                    "minArgs": 1,
                    "maxArgs": 1
                  }
                }
              },
              "tabs": {
                "captureVisibleTab": {
                  "minArgs": 0,
                  "maxArgs": 2
                },
                "create": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "detectLanguage": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "discard": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "duplicate": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "executeScript": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getCurrent": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getZoom": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getZoomSettings": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "goBack": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "goForward": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "highlight": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "insertCSS": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "move": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "query": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "reload": {
                  "minArgs": 0,
                  "maxArgs": 2
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeCSS": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "sendMessage": {
                  "minArgs": 2,
                  "maxArgs": 3
                },
                "setZoom": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "setZoomSettings": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "update": {
                  "minArgs": 1,
                  "maxArgs": 2
                }
              },
              "topSites": {
                "get": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "webNavigation": {
                "getAllFrames": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getFrame": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "webRequest": {
                "handlerBehaviorChanged": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "windows": {
                "create": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "get": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getCurrent": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getLastFocused": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              }
            };
            if (Object.keys(apiMetadata).length === 0) {
              throw new Error("api-metadata.json has not been included in browser-polyfill");
            }
            class DefaultWeakMap extends WeakMap {
              constructor(createItem, items = void 0) {
                super(items);
                this.createItem = createItem;
              }
              get(key) {
                if (!this.has(key)) {
                  this.set(key, this.createItem(key));
                }
                return super.get(key);
              }
            }
            const isThenable = (value) => {
              return value && typeof value === "object" && typeof value.then === "function";
            };
            const makeCallback = (promise, metadata) => {
              return (...callbackArgs) => {
                if (extensionAPIs.runtime.lastError) {
                  promise.reject(new Error(extensionAPIs.runtime.lastError.message));
                } else if (metadata.singleCallbackArg || callbackArgs.length <= 1 && metadata.singleCallbackArg !== false) {
                  promise.resolve(callbackArgs[0]);
                } else {
                  promise.resolve(callbackArgs);
                }
              };
            };
            const pluralizeArguments = (numArgs) => numArgs == 1 ? "argument" : "arguments";
            const wrapAsyncFunction = (name, metadata) => {
              return function asyncFunctionWrapper(target, ...args) {
                if (args.length < metadata.minArgs) {
                  throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
                }
                if (args.length > metadata.maxArgs) {
                  throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
                }
                return new Promise((resolve, reject) => {
                  if (metadata.fallbackToNoCallback) {
                    try {
                      target[name](...args, makeCallback({
                        resolve,
                        reject
                      }, metadata));
                    } catch (cbError) {
                      console.warn(`${name} API method doesn't seem to support the callback parameter, falling back to call it without a callback: `, cbError);
                      target[name](...args);
                      metadata.fallbackToNoCallback = false;
                      metadata.noCallback = true;
                      resolve();
                    }
                  } else if (metadata.noCallback) {
                    target[name](...args);
                    resolve();
                  } else {
                    target[name](...args, makeCallback({
                      resolve,
                      reject
                    }, metadata));
                  }
                });
              };
            };
            const wrapMethod = (target, method, wrapper) => {
              return new Proxy(method, {
                apply(targetMethod, thisObj, args) {
                  return wrapper.call(thisObj, target, ...args);
                }
              });
            };
            let hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
            const wrapObject = (target, wrappers = {}, metadata = {}) => {
              let cache = /* @__PURE__ */ Object.create(null);
              let handlers = {
                has(proxyTarget2, prop) {
                  return prop in target || prop in cache;
                },
                get(proxyTarget2, prop, receiver) {
                  if (prop in cache) {
                    return cache[prop];
                  }
                  if (!(prop in target)) {
                    return void 0;
                  }
                  let value = target[prop];
                  if (typeof value === "function") {
                    if (typeof wrappers[prop] === "function") {
                      value = wrapMethod(target, target[prop], wrappers[prop]);
                    } else if (hasOwnProperty(metadata, prop)) {
                      let wrapper = wrapAsyncFunction(prop, metadata[prop]);
                      value = wrapMethod(target, target[prop], wrapper);
                    } else {
                      value = value.bind(target);
                    }
                  } else if (typeof value === "object" && value !== null && (hasOwnProperty(wrappers, prop) || hasOwnProperty(metadata, prop))) {
                    value = wrapObject(value, wrappers[prop], metadata[prop]);
                  } else if (hasOwnProperty(metadata, "*")) {
                    value = wrapObject(value, wrappers[prop], metadata["*"]);
                  } else {
                    Object.defineProperty(cache, prop, {
                      configurable: true,
                      enumerable: true,
                      get() {
                        return target[prop];
                      },
                      set(value2) {
                        target[prop] = value2;
                      }
                    });
                    return value;
                  }
                  cache[prop] = value;
                  return value;
                },
                set(proxyTarget2, prop, value, receiver) {
                  if (prop in cache) {
                    cache[prop] = value;
                  } else {
                    target[prop] = value;
                  }
                  return true;
                },
                defineProperty(proxyTarget2, prop, desc) {
                  return Reflect.defineProperty(cache, prop, desc);
                },
                deleteProperty(proxyTarget2, prop) {
                  return Reflect.deleteProperty(cache, prop);
                }
              };
              let proxyTarget = Object.create(target);
              return new Proxy(proxyTarget, handlers);
            };
            const wrapEvent = (wrapperMap) => ({
              addListener(target, listener, ...args) {
                target.addListener(wrapperMap.get(listener), ...args);
              },
              hasListener(target, listener) {
                return target.hasListener(wrapperMap.get(listener));
              },
              removeListener(target, listener) {
                target.removeListener(wrapperMap.get(listener));
              }
            });
            const onRequestFinishedWrappers = new DefaultWeakMap((listener) => {
              if (typeof listener !== "function") {
                return listener;
              }
              return function onRequestFinished(req) {
                const wrappedReq = wrapObject(req, {}, {
                  getContent: {
                    minArgs: 0,
                    maxArgs: 0
                  }
                });
                listener(wrappedReq);
              };
            });
            const onMessageWrappers = new DefaultWeakMap((listener) => {
              if (typeof listener !== "function") {
                return listener;
              }
              return function onMessage(message, sender, sendResponse) {
                let didCallSendResponse = false;
                let wrappedSendResponse;
                let sendResponsePromise = new Promise((resolve) => {
                  wrappedSendResponse = function(response) {
                    didCallSendResponse = true;
                    resolve(response);
                  };
                });
                let result;
                try {
                  result = listener(message, sender, wrappedSendResponse);
                } catch (err) {
                  result = Promise.reject(err);
                }
                const isResultThenable = result !== true && isThenable(result);
                if (result !== true && !isResultThenable && !didCallSendResponse) {
                  return false;
                }
                const sendPromisedResult = (promise) => {
                  promise.then((msg) => {
                    sendResponse(msg);
                  }, (error) => {
                    let message2;
                    if (error && (error instanceof Error || typeof error.message === "string")) {
                      message2 = error.message;
                    } else {
                      message2 = "An unexpected error occurred";
                    }
                    sendResponse({
                      __mozWebExtensionPolyfillReject__: true,
                      message: message2
                    });
                  }).catch((err) => {
                    console.error("Failed to send onMessage rejected reply", err);
                  });
                };
                if (isResultThenable) {
                  sendPromisedResult(result);
                } else {
                  sendPromisedResult(sendResponsePromise);
                }
                return true;
              };
            });
            const wrappedSendMessageCallback = ({
              reject,
              resolve
            }, reply) => {
              if (extensionAPIs.runtime.lastError) {
                if (extensionAPIs.runtime.lastError.message === CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE) {
                  resolve();
                } else {
                  reject(new Error(extensionAPIs.runtime.lastError.message));
                }
              } else if (reply && reply.__mozWebExtensionPolyfillReject__) {
                reject(new Error(reply.message));
              } else {
                resolve(reply);
              }
            };
            const wrappedSendMessage = (name, metadata, apiNamespaceObj, ...args) => {
              if (args.length < metadata.minArgs) {
                throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
              }
              if (args.length > metadata.maxArgs) {
                throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
              }
              return new Promise((resolve, reject) => {
                const wrappedCb = wrappedSendMessageCallback.bind(null, {
                  resolve,
                  reject
                });
                args.push(wrappedCb);
                apiNamespaceObj.sendMessage(...args);
              });
            };
            const staticWrappers = {
              devtools: {
                network: {
                  onRequestFinished: wrapEvent(onRequestFinishedWrappers)
                }
              },
              runtime: {
                onMessage: wrapEvent(onMessageWrappers),
                onMessageExternal: wrapEvent(onMessageWrappers),
                sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
                  minArgs: 1,
                  maxArgs: 3
                })
              },
              tabs: {
                sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
                  minArgs: 2,
                  maxArgs: 3
                })
              }
            };
            const settingMetadata = {
              clear: {
                minArgs: 1,
                maxArgs: 1
              },
              get: {
                minArgs: 1,
                maxArgs: 1
              },
              set: {
                minArgs: 1,
                maxArgs: 1
              }
            };
            apiMetadata.privacy = {
              network: {
                "*": settingMetadata
              },
              services: {
                "*": settingMetadata
              },
              websites: {
                "*": settingMetadata
              }
            };
            return wrapObject(extensionAPIs, staticWrappers, apiMetadata);
          };
          module2.exports = wrapAPIs(chrome);
        } else {
          module2.exports = globalThis.browser;
        }
      });
    }
  });

  // src/browser-polyfill-entry.ts
  var import_webextension_polyfill;
  var init_browser_polyfill_entry = __esm({
    "src/browser-polyfill-entry.ts"() {
      "use strict";
      import_webextension_polyfill = __toESM(require_browser_polyfill(), 1);
    }
  });

  // src/background.ts
  init_browser_polyfill_entry();

  // src/config/state.ts
  init_browser_polyfill_entry();
  var DEFAULT_GLOBAL_STATE = {
    walkerMode: true,
    blockOneTap: false,
    safetyEnter: false
  };
  var DEFAULT_PHANTOM_STATE = {
    master: true,
    xWalker: {
      enabled: true,
      rightColumnDashboard: true,
      // 【追加】違反4解消: デフォルト値のハードコード排除
      skipReposts: true,
      skipAds: true,
      scrollOffset: -150,
      colors: {
        recent: "#00ba7c",
        old: "#ffd400",
        ancient: "#f4212e",
        copied: "rgba(0, 255, 255, 0.2)"
      },
      zenOpacity: 0.5
    }
  };
  var DEFAULT_ALM_CONFIG = {
    enabled: true,
    excludeDomains: [
      "x.com",
      "twitter.com",
      "gemini.google.com",
      "chatgpt.com",
      "claude.ai",
      "chat.deepseek.com",
      "copilot.microsoft.com",
      "perplexity.ai",
      "grok.com",
      "figma.com",
      "canva.com",
      "notion.so",
      "www.youtube.com"
    ]
  };

  // src/background.ts
  function isRestrictedUrl(url) {
    if (!url) return true;
    return url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("devtools://") || url.startsWith("about:") || url.startsWith("edge://") || url.startsWith("moz-extension://") || url.startsWith("firefox://");
  }
  var FORBIDDEN_HOSTS = [
    "addons.mozilla.org",
    "support.mozilla.org",
    "accounts.google.com"
  ];
  function isForbiddenHost(url) {
    if (!url) return false;
    try {
      const hostname = new URL(url).hostname;
      return FORBIDDEN_HOSTS.some((h) => hostname === h || hostname.endsWith("." + h));
    } catch {
      return false;
    }
  }
  function isSkippableTab(url) {
    return isRestrictedUrl(url) || isForbiddenHost(url);
  }
  chrome.runtime.onInstalled.addListener(async () => {
    try {
      const result = await chrome.storage.local.get(null);
      let needsUpdate = false;
      const globalState = result.global || { ...DEFAULT_GLOBAL_STATE };
      const phantomState = result.phantom || { ...DEFAULT_PHANTOM_STATE };
      if ("isWalkerMode" in result) {
        globalState.walkerMode = result.isWalkerMode;
        needsUpdate = true;
      }
      if ("blockGoogleOneTap" in result) {
        globalState.blockOneTap = result.blockGoogleOneTap;
        needsUpdate = true;
      }
      if (result.alm && "safetyEnter" in result.alm) {
        globalState.safetyEnter = result.alm.safetyEnter;
        needsUpdate = true;
      }
      if ("xWalker" in result && !result.phantom) {
        phantomState.xWalker = result.xWalker;
        needsUpdate = true;
      }
      if (needsUpdate || !result.global || !result.phantom) {
        await chrome.storage.local.set({
          global: globalState,
          phantom: phantomState
        });
        await chrome.storage.local.remove(["isWalkerMode", "blockGoogleOneTap"]);
        console.log("[X-Ops Walker] Phantom State Migration Complete.");
      }
    } catch (e) {
      console.error("[X-Ops Walker] Migration error:", e);
    }
    if (!chrome.scripting) return;
    try {
      const tabs = await chrome.tabs.query({});
      const injectTargets = tabs.filter(
        (tab) => tab.id !== void 0 && !isRestrictedUrl(tab.url)
      );
      await Promise.allSettled(
        injectTargets.map(
          (tab) => chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["kernel.js"]
          })
        )
      );
    } catch (e) {
      console.error("[X-Ops Walker] onInstalled injection error:", e);
    }
  });
  async function shiftTab(direction) {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      if (tabs.length <= 1) return void 0;
      tabs.sort((a, b) => a.index - b.index);
      const arrayPos = tabs.findIndex((t) => t.active);
      if (arrayPos === -1) return void 0;
      let nextPos = (arrayPos + direction + tabs.length) % tabs.length;
      for (let attempts = 0; attempts < tabs.length; attempts++) {
        const targetTab = tabs[nextPos];
        if (!isSkippableTab(targetTab.url)) {
          await chrome.tabs.update(targetTab.id, { active: true });
          return targetTab.id;
        }
        nextPos = (nextPos + direction + tabs.length) % tabs.length;
      }
    } catch (e) {
      console.error("[X-Ops Walker] shiftTab error:", e);
    }
    return void 0;
  }
  function sendArrivalBlur(tabId) {
    setTimeout(() => {
      const msg = { command: "FORCE_BLUR_ON_ARRIVAL" };
      chrome.tabs.sendMessage(tabId, msg).catch(() => {
      });
    }, 50);
  }
  chrome.runtime.onMessage.addListener((message, sender) => {
    const tabId = sender.tab?.id;
    (async () => {
      try {
        switch (message.command) {
          case "NEXT_TAB": {
            const nextId = await shiftTab(1);
            if (nextId !== void 0) sendArrivalBlur(nextId);
            break;
          }
          case "PREV_TAB": {
            const prevId = await shiftTab(-1);
            if (prevId !== void 0) sendArrivalBlur(prevId);
            break;
          }
          case "CLOSE_TAB": {
            if (tabId !== void 0) await chrome.tabs.remove(tabId);
            break;
          }
          case "RELOAD_TAB": {
            if (tabId !== void 0) await chrome.tabs.reload(tabId);
            break;
          }
          case "UNDO_CLOSE": {
            const recent = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
            if (recent.length > 0) {
              const sessionId = recent[0].tab?.sessionId ?? recent[0].window?.sessionId;
              if (sessionId) await chrome.sessions.restore(sessionId);
            }
            break;
          }
          case "MUTE_TAB": {
            if (tabId === void 0) break;
            const tab = await chrome.tabs.get(tabId);
            await chrome.tabs.update(tabId, { muted: !tab.mutedInfo?.muted });
            break;
          }
          case "DISCARD_TAB": {
            const tabsToDiscard = await chrome.tabs.query({
              currentWindow: true,
              active: false,
              pinned: false,
              discarded: false
            });
            for (const tab of tabsToDiscard) {
              if (tab.id === void 0) continue;
              const url = tab.url ?? "";
              if (isSkippableTab(url)) continue;
              try {
                chrome.tabs.sendMessage(tab.id, { command: "MARK_SLEEPING" }).catch(() => {
                });
                await new Promise((r) => setTimeout(r, 30));
                await chrome.tabs.discard(tab.id);
              } catch (e) {
                console.warn(`[X-Ops Walker] discard(${tab.id}) skipped:`, e);
              }
            }
            break;
          }
          case "GO_FIRST_TAB": {
            const allTabs = await chrome.tabs.query({ currentWindow: true });
            allTabs.sort((a, b) => a.index - b.index);
            if (allTabs[0]?.id !== void 0) {
              await chrome.tabs.update(allTabs[0].id, { active: true });
              sendArrivalBlur(allTabs[0].id);
            }
            break;
          }
          case "DUPLICATE_TAB": {
            if (tabId !== void 0) await chrome.tabs.duplicate(tabId);
            break;
          }
          case "CLEAN_UP": {
            const tabsToKill = await chrome.tabs.query({
              currentWindow: true,
              active: false,
              pinned: false
            });
            const targetIds = tabsToKill.map((t) => t.id).filter((id) => id !== void 0);
            if (targetIds.length > 0) {
              await chrome.tabs.remove(targetIds);
            }
            break;
          }
          // ── ALM v1.3.0: Kernel からの状態通知 ────────────────────────────────
          case "ALM_VETO": {
            if (tabId === void 0) break;
            const state = almStates.get(tabId);
            if (state) {
              state.veto = true;
            } else {
              almStates.set(tabId, { inactiveAt: null, isExcluded: false, veto: true });
            }
            saveAlmStatesToStorage();
            break;
          }
          case "ALM_VETO_CLEAR": {
            if (tabId === void 0) break;
            const vetoState = almStates.get(tabId);
            if (vetoState) {
              vetoState.veto = false;
              vetoState.inactiveAt = Date.now();
            }
            saveAlmStatesToStorage();
            break;
          }
          default:
            console.warn("[FoxWalker] Unknown command:", message.command);
        }
      } catch (err) {
        console.error(`[FoxWalker] Error [${message.command}]:`, err);
      }
    })();
    return true;
  });
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "walker-keepalive") return;
    port.onDisconnect.addListener(() => {
    });
  });
  var ALM_EXCLUDE_DOMAINS = new Set(DEFAULT_ALM_CONFIG.excludeDomains);
  var currentAlmConfig = {
    enabled: true,
    excludeDomains: Array.from(ALM_EXCLUDE_DOMAINS)
  };
  var isAlmConfigLoaded = false;
  var configLoadPromise = new Promise((resolve) => {
    chrome.storage.local.get("alm", (res) => {
      if (res.alm) {
        const loadedDomains = res.alm.excludeDomains || res.alm.heavyDomains || DEFAULT_ALM_CONFIG.excludeDomains;
        currentAlmConfig = res.alm;
        currentAlmConfig.excludeDomains = loadedDomains;
        ALM_EXCLUDE_DOMAINS = new Set(loadedDomains);
        if (currentAlmConfig.enabled) {
          chrome.alarms.create("alm-master-timer", { periodInMinutes: 1 });
        } else {
          chrome.alarms.clear("alm-master-timer");
        }
      } else {
        chrome.alarms.create("alm-master-timer", { periodInMinutes: 1 });
      }
      isAlmConfigLoaded = true;
      resolve();
    });
  });
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.alm) {
      const newConf = changes.alm.newValue;
      if (!newConf) return;
      const wasEnabled = currentAlmConfig.enabled;
      const newDomains = newConf.excludeDomains || newConf.heavyDomains || [];
      currentAlmConfig = {
        enabled: Boolean(newConf.enabled),
        excludeDomains: newDomains
      };
      ALM_EXCLUDE_DOMAINS = new Set(newDomains);
      if (wasEnabled && !newConf.enabled) {
        console.debug("[ALM] Master Timer Disabled via UI");
        chrome.alarms.clear("alm-master-timer");
      } else if (!wasEnabled && newConf.enabled) {
        console.debug("[ALM] Master Timer Enabled via UI");
        chrome.alarms.create("alm-master-timer", { periodInMinutes: 1 });
      }
    }
  });
  var ALM_GRACE_STANDARD_MS = 8 * 60 * 1e3;
  var ALM_GRACE_STANDARD_OVERLOADED_MS = 5 * 60 * 1e3;
  var ALM_OVERLOAD_THRESHOLD = 30;
  var almStates = /* @__PURE__ */ new Map();
  async function saveAlmStatesToStorage() {
    try {
      const statesObj = Object.fromEntries(almStates);
      await chrome.storage.local.set({ alm_tab_states: statesObj });
    } catch (e) {
      console.warn("[ALM] saveAlmStatesToStorage error:", e);
    }
  }
  async function loadAlmStatesFromStorage() {
    try {
      const res = await chrome.storage.local.get("alm_tab_states");
      if (res.alm_tab_states) {
        for (const [key, value] of Object.entries(res.alm_tab_states)) {
          almStates.set(Number(key), value);
        }
        return true;
      }
    } catch (e) {
      console.warn("[ALM] loadAlmStatesFromStorage error:", e);
    }
    return false;
  }
  async function initializeAlmStates() {
    await loadAlmStatesFromStorage();
    const tabs = await chrome.tabs.query({});
    const now = Date.now();
    for (const tab of tabs) {
      if (tab.id === void 0) continue;
      if (!almStates.has(tab.id) && !tab.active) {
        let isExcluded = false;
        try {
          if (tab.url) isExcluded = ALM_EXCLUDE_DOMAINS.has(new URL(tab.url).hostname);
        } catch {
        }
        almStates.set(tab.id, { inactiveAt: now, isExcluded, veto: false });
      }
    }
    saveAlmStatesToStorage();
  }
  initializeAlmStates();
  chrome.tabs.onRemoved.addListener((tabId) => {
    almStates.delete(tabId);
    saveAlmStatesToStorage();
  });
  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.id === void 0 || tab.active) return;
    let isExcluded = false;
    try {
      if (tab.url) isExcluded = ALM_EXCLUDE_DOMAINS.has(new URL(tab.url).hostname);
    } catch {
    }
    almStates.set(tab.id, { inactiveAt: Date.now(), isExcluded, veto: false });
    saveAlmStatesToStorage();
  });
  async function executeStrategicHibernation(tabId, state) {
    try {
      const liveTab = await chrome.tabs.get(tabId);
      if (liveTab.active) return;
      if (liveTab.discarded) return;
      if (liveTab.pinned) return;
      if (isSkippableTab(liveTab.url)) return;
      chrome.tabs.sendMessage(tabId, { command: "MARK_SLEEPING" }).catch(() => {
      });
      await new Promise((r) => setTimeout(r, 30));
      await chrome.tabs.discard(tabId);
      console.debug(`[ALM] Smart Tab Discard executed: tabId=${tabId} excluded=${state.isExcluded}`);
    } catch (e) {
      console.debug(`[ALM] Hibernation skipped (tab gone): tabId=${tabId}`, e);
    }
  }
  async function scanAndHibernate() {
    if (!isAlmConfigLoaded) await configLoadPromise;
    if (!currentAlmConfig.enabled) return;
    if (almStates.size === 0) {
      await loadAlmStatesFromStorage();
    }
    try {
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      const totalTabCount = allTabs.length;
      const isOverloaded = totalTabCount > ALM_OVERLOAD_THRESHOLD;
      const standardGrace = isOverloaded ? ALM_GRACE_STANDARD_OVERLOADED_MS : ALM_GRACE_STANDARD_MS;
      const now = Date.now();
      for (const [tabId, state] of almStates) {
        if (state.inactiveAt === null) continue;
        if (state.veto || state.isExcluded) continue;
        const elapsed = now - state.inactiveAt;
        if (elapsed >= standardGrace) {
          almStates.delete(tabId);
          saveAlmStatesToStorage();
          executeStrategicHibernation(tabId, state);
        }
      }
    } catch (e) {
      console.warn("[ALM] scanAndHibernate error:", e);
    }
  }
  var windowActiveTabs = /* @__PURE__ */ new Map();
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const prevTabId = windowActiveTabs.get(activeInfo.windowId);
    windowActiveTabs.set(activeInfo.windowId, activeInfo.tabId);
    const newState = almStates.get(activeInfo.tabId) ?? { inactiveAt: null, isExcluded: false, veto: false };
    newState.inactiveAt = null;
    almStates.set(activeInfo.tabId, newState);
    if (prevTabId !== void 0) {
      try {
        const prevTab = await chrome.tabs.get(prevTabId);
        const isExcluded = ALM_EXCLUDE_DOMAINS.has(new URL(prevTab.url ?? "").hostname);
        const prevState = almStates.get(prevTabId) ?? { inactiveAt: Date.now(), isExcluded, veto: false };
        prevState.inactiveAt = Date.now();
        prevState.isExcluded = isExcluded;
        almStates.set(prevTabId, prevState);
      } catch {
      }
    }
    saveAlmStatesToStorage();
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      try {
        const isExcluded = ALM_EXCLUDE_DOMAINS.has(new URL(changeInfo.url).hostname);
        const state = almStates.get(tabId);
        if (state) {
          state.isExcluded = isExcluded;
          saveAlmStatesToStorage();
        }
      } catch {
      }
    }
  });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "alm-master-timer") {
      scanAndHibernate();
    }
  });
})();
