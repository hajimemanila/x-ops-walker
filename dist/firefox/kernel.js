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

  // src/kernel.ts
  init_browser_polyfill_entry();

  // src/router.ts
  init_browser_polyfill_entry();
  var WalkerRouter = class {
    protocols = [];
    baseProtocol;
    constructor(base) {
      this.baseProtocol = base;
    }
    /** ドメイン固有のプロトコルを登録 */
    register(protocol) {
      this.protocols.push(protocol);
    }
    /** Kernel からディスパッチされるエントリーポイント */
    dispatch(event, key, shift, container) {
      const hostname = window.location.hostname;
      for (const protocol of this.protocols) {
        if (protocol.matches(hostname)) {
          if (protocol.handleKey(event, key, shift, container)) {
            return;
          }
        }
      }
      this.baseProtocol.handleKey(event, key, shift, container);
    }
  };

  // src/protocols/base.ts
  init_browser_polyfill_entry();
  var BaseProtocol = class {
    matches(hostname) {
      return true;
    }
    handleKey(event, key, shift, container) {
      if (shift) {
        switch (key) {
          // タブ・ウィンドウ操作（backgroundへ委譲）
          case "x":
            chrome.runtime.sendMessage({ command: "CLOSE_TAB" });
            return true;
          case "z":
            chrome.runtime.sendMessage({ command: "UNDO_CLOSE" });
            return true;
          case "r":
            chrome.runtime.sendMessage({ command: "RELOAD_TAB" });
            return true;
          case "m":
            chrome.runtime.sendMessage({ command: "MUTE_TAB" });
            return true;
          case "g":
            chrome.runtime.sendMessage({ command: "DISCARD_TAB" });
            return true;
          case "t":
            chrome.runtime.sendMessage({ command: "CLEAN_UP" });
            return true;
          case "9":
            chrome.runtime.sendMessage({ command: "GO_FIRST_TAB" });
            return true;
          case "c":
            chrome.runtime.sendMessage({ command: "DUPLICATE_TAB" });
            return true;
          // スクロール操作 (ページ先頭・末尾へ直行)
          case "w":
            container.scrollTo({ top: 0, behavior: "smooth" });
            return true;
          case "s":
            container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
            return true;
          // ナビゲーション (Shift + Space: 前タブ)
          case " ":
            chrome.runtime.sendMessage({ command: "PREV_TAB" });
            return true;
        }
        return false;
      }
      switch (key) {
        // スクロール操作 (画面の80%分)
        case "w":
          container.scrollBy({ top: -window.innerHeight * 0.8, behavior: "smooth" });
          return true;
        case "s":
          container.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
          return true;
        // ナビゲーション (タブ移動)
        case "a":
          chrome.runtime.sendMessage({ command: "PREV_TAB" });
          return true;
        case "d":
          chrome.runtime.sendMessage({ command: "NEXT_TAB" });
          return true;
        case " ":
          chrome.runtime.sendMessage({ command: "NEXT_TAB" });
          return true;
        // 履歴ナビゲーション
        case "q":
          window.history.back();
          return true;
        case "e":
          window.history.forward();
          return true;
        // ピン留め等 (元コードではFはチートシートでしたが、プロトコル分離で参照不可のため代替実装)
        case "f":
          window.dispatchEvent(new CustomEvent("XOpsWalker_ToggleCheatsheet"));
          return true;
        // フォーカス・スクロールのリセット (Z単押し)
        case "z":
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          window.focus();
          container.scrollTo({ top: 0, behavior: "smooth" });
          return true;
      }
      if (event.altKey && key === "z") {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        window.focus();
        container.scrollTo({ top: 0, behavior: "smooth" });
        return true;
      }
      return false;
    }
  };

  // src/protocols/ai-chat.ts
  init_browser_polyfill_entry();
  var AiChatProtocol = class {
    matches(hostname) {
      return hostname.includes("gemini.google.com") || hostname.includes("chatgpt.com") || hostname.includes("claude.ai");
    }
    handleKey(event, key, shift, container) {
      if (key === "z") {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
        return true;
      }
      return false;
    }
  };

  // src/protocols/x-timeline.ts
  init_browser_polyfill_entry();
  var STORAGE_KEY_HIGHLIGHTS = "x_bookmark_highlights";
  function getHighlights() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_HIGHLIGHTS) || "{}");
    } catch (e) {
      return {};
    }
  }
  function saveHighlight(url, active) {
    const data = getHighlights();
    if (active) data[url] = true;
    else delete data[url];
    localStorage.setItem(STORAGE_KEY_HIGHLIGHTS, JSON.stringify(data));
  }
  function cleanUrl(url) {
    if (!url) return "";
    try {
      let cleaned = url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
      return cleaned.toLowerCase().trim();
    } catch {
      return url.toLowerCase().trim();
    }
  }
  var isDashboardEnabled = false;
  var heartbeatId = null;
  var syncFrame = null;
  function initXWalker(config) {
    isDashboardEnabled = config.enabled && config.rightColumnDashboard;
    console.log("[X-Ops Walker] \u{1F43A} X Timeline Walker Protocol Status:", isDashboardEnabled);
    if (isDashboardEnabled) {
      installDashboard();
    } else {
      removeDashboard();
    }
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if ("xWalker" in changes) {
        const newConfig = changes.xWalker.newValue;
        isDashboardEnabled = newConfig.enabled && newConfig.rightColumnDashboard;
        if (isDashboardEnabled) {
          installDashboard();
        } else {
          removeDashboard();
        }
      }
      if ("xOpsBookmarks" in changes && isDashboardEnabled) {
        renderBookmarkList();
      }
    }
  });
  function installDashboard() {
    removeDashboard();
    maintainDOM();
    heartbeatId = setInterval(() => maintainDOM(), 500);
    startSync();
  }
  function removeDashboard() {
    if (heartbeatId) {
      clearInterval(heartbeatId);
      heartbeatId = null;
    }
    if (syncFrame) {
      cancelAnimationFrame(syncFrame);
      syncFrame = null;
    }
    const spacer = document.getElementById("x-ops-dashboard-spacer");
    if (spacer) spacer.remove();
    const box = document.getElementById("x-ops-dashboard-box");
    if (box) box.remove();
  }
  function maintainDOM() {
    if (!isDashboardEnabled) return;
    const path = window.location.pathname;
    const isLoginModal = !!document.querySelector('[data-testid="sheetDialog"]') || !!document.querySelector('[data-testid="login"]');
    const isExcluded = path.startsWith("/settings") || path.includes("/i/flow/login") || path === "/login" || path === "/logout" || path.startsWith("/i/display");
    if (isLoginModal || isExcluded) {
      const box2 = document.getElementById("x-ops-dashboard-box");
      if (box2) box2.style.display = "none";
      return;
    }
    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (!sidebar) return;
    let spacer = document.getElementById("x-ops-dashboard-spacer");
    if (!spacer) {
      spacer = document.createElement("div");
      spacer.id = "x-ops-dashboard-spacer";
      spacer.style.width = "100%";
      spacer.style.height = "150px";
      spacer.style.marginTop = "12px";
      spacer.style.marginBottom = "12px";
      spacer.style.opacity = "0";
      spacer.style.pointerEvents = "none";
    }
    const searchBar = sidebar.querySelector('[role="search"]');
    if (spacer && searchBar) {
      let target = searchBar;
      let depth = 0;
      const sidebarWrapper = sidebar.firstElementChild || sidebar;
      while (target.parentElement && target.parentElement !== sidebarWrapper && depth < 10) {
        const siblings = Array.from(target.parentElement.children).filter((el) => el.id !== "x-ops-dashboard-spacer");
        if (siblings.length > 1) {
          break;
        }
        target = target.parentElement;
        depth++;
      }
      if (target && target.parentElement && target.nextSibling !== spacer) {
        target.after(spacer);
        console.log("[X-Ops Walker] Dashboard spacer secured via Smart Pillar (depth:", depth, ")");
      }
    } else if (spacer && !spacer.isConnected) {
      const wrapper = sidebar.firstElementChild || sidebar;
      if (wrapper.firstChild !== spacer) {
        wrapper.insertBefore(spacer, wrapper.firstChild);
      }
    }
    let box = document.getElementById("x-ops-dashboard-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "x-ops-dashboard-box";
      Object.assign(box.style, {
        position: "fixed",
        zIndex: "9999",
        background: "rgba(10, 10, 22, 0.75)",
        backdropFilter: "blur(16px) saturate(180%)",
        webkitBackdropFilter: "blur(16px) saturate(180%)",
        border: "1px solid rgba(255, 140, 0, 0.2)",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        overflow: "hidden",
        pointerEvents: "auto",
        display: "none",
        // 初期は隠し、sync() で位置確定後に表示する
        opacity: "1"
        // opacity 0 で残らないようにリセット
      });
      const titleText = chrome.i18n.getMessage("x_dashboard_title") || "PHANTOM OPS DASHBOARD";
      const statusText = chrome.i18n.getMessage("x_dashboard_status_ready") || "SYSTEM READY";
      box.innerHTML = `
            <style>
                #x-ops-bookmark-container::-webkit-scrollbar { width: 4px; }
                #x-ops-bookmark-container::-webkit-scrollbar-thumb { background: rgba(255, 140, 0, 0.3); border-radius: 10px; }
                .x-ops-bm-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; cursor: pointer; transition: background-color 0.2s; border-bottom: 1px solid rgba(255, 140, 0, 0.05); position: relative; }
                .x-ops-bm-item:hover { background-color: rgba(255, 255, 255, 0.03); }
                .x-ops-bm-item.target-lock { border-left: 3px solid #00ba7c; background: rgba(0, 186, 124, 0.05); }
                .x-ops-bm-item.active { background: rgba(255, 172, 48, 0.05); }
                .x-ops-bm-link { flex-grow: 1; font-size: 13px; font-weight: 500; color: #eff3f4; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .x-ops-bm-star { font-size: 16px; color: #71767b; padding: 4px; border-radius: 50%; margin-left: 8px; transition: color 0.2s; cursor: pointer; }
                .x-ops-bm-item.active .x-ops-bm-star { color: #ffac30; }
                .x-ops-bm-star:hover { color: #ffac30; background: rgba(255, 172, 48, 0.1); }
                .x-ops-bm-star.popping { animation: starPop 0.3s ease-out; }
                @keyframes starPop { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }
            </style>
            <div style="padding: 10px 14px; background: rgba(255, 140, 0, 0.1); border-bottom: 1px solid rgba(255, 140, 0, 0.2); display: flex; justify-content: space-between; align-items: center;">
                <span style="font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; font-weight: 800; color: #ff8c00; letter-spacing: 0.12em; text-transform: uppercase;">${titleText}</span>
                <button id="x-ops-quick-add" style="background: rgba(255, 140, 0, 0.15); border: 1px solid rgba(255, 140, 0, 0.3); border-radius: 4px; color: #ffac30; font-size: 9px; font-weight: 800; padding: 2px 6px; cursor: pointer; transition: all 0.2s; font-family: 'Segoe UI', sans-serif;">[+] ADD</button>
            </div>
            <div id="x-ops-bookmark-container" style="max-height: 400px; overflow-y: auto; border-bottom: 1px solid rgba(255, 140, 0, 0.1);">
                <!-- Bookmarks injected here -->
            </div>
            <div style="padding: 12px; text-align: center;">
                <div style="font-family: 'Cascadia Code', monospace; font-size: 10px; color: rgba(255, 255, 255, 0.5); letter-spacing: 0.2em;">${statusText}</div>
            </div>
        `;
      document.body.appendChild(box);
      renderBookmarkList();
      const quickAddBtn = box.querySelector("#x-ops-quick-add");
      if (quickAddBtn) {
        quickAddBtn.addEventListener("mouseover", () => {
          quickAddBtn.style.background = "rgba(255, 140, 0, 0.3)";
          quickAddBtn.style.boxShadow = "0 0 8px rgba(255, 140, 0, 0.4)";
        });
        quickAddBtn.addEventListener("mouseout", () => {
          quickAddBtn.style.background = "rgba(255, 140, 0, 0.15)";
          quickAddBtn.style.boxShadow = "none";
        });
        quickAddBtn.addEventListener("click", async () => {
          const url = window.location.href;
          const title = document.title.replace(/\s*\/ X$/i, "").trim();
          const clean = (u) => {
            let c = u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
            return c.toLowerCase().trim();
          };
          const cleanedUrl = clean(url);
          const result = await chrome.storage.local.get(["xOpsBookmarks"]);
          const bookmarks = result.xOpsBookmarks || [];
          if (!bookmarks.some((b) => clean(b.url) === cleanedUrl)) {
            bookmarks.push({ title: title || url, url: cleanedUrl });
            await chrome.storage.local.set({ xOpsBookmarks: bookmarks });
          }
          const originalText = quickAddBtn.innerText;
          quickAddBtn.innerText = "ADDED!";
          quickAddBtn.style.color = "#00ba7c";
          quickAddBtn.style.borderColor = "#00ba7c";
          setTimeout(() => {
            quickAddBtn.innerText = originalText;
            quickAddBtn.style.color = "#ffac30";
            quickAddBtn.style.borderColor = "rgba(255, 140, 0, 0.3)";
          }, 1e3);
        });
      }
    }
    updateTargetHighlight();
  }
  function startSync() {
    function sync() {
      if (!isDashboardEnabled) return;
      const path = window.location.pathname;
      const isLoginModal = !!document.querySelector('[data-testid="sheetDialog"]') || !!document.querySelector('[data-testid="login"]');
      const isExcluded = path.startsWith("/settings") || path.includes("/i/flow/login") || path === "/login" || path === "/logout" || path.startsWith("/i/display");
      const box = document.getElementById("x-ops-dashboard-box");
      if (isLoginModal || isExcluded) {
        if (box && box.style.display !== "none") box.style.display = "none";
        syncFrame = requestAnimationFrame(sync);
        return;
      }
      const spacer = document.getElementById("x-ops-dashboard-spacer");
      const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
      if (spacer && box && sidebar && spacer.isConnected) {
        if (box.style.display !== "block") box.style.display = "block";
        const spacerRect = spacer.getBoundingClientRect();
        const boxHeight = box.offsetHeight;
        const newSpacerHeight = boxHeight + 10 + "px";
        if (spacer.style.height !== newSpacerHeight) spacer.style.height = newSpacerHeight;
        if (spacerRect.width > 0) {
          const newWidth = spacerRect.width + "px";
          if (box.style.width !== newWidth) box.style.width = newWidth;
          const newLeft = spacerRect.left + "px";
          if (box.style.left !== newLeft) box.style.left = newLeft;
        } else if (!box.style.left) {
          const sidebarRect = sidebar.getBoundingClientRect();
          box.style.left = sidebarRect.left + "px";
          box.style.width = sidebarRect.width + "px";
        }
        let newTop = "";
        const searchBar = sidebar.querySelector('[role="search"]');
        if (searchBar) {
          const searchRect = searchBar.getBoundingClientRect();
          newTop = searchRect.bottom + 12 + "px";
        } else {
          newTop = Math.max(spacerRect.top, 53) + "px";
        }
        if (box.style.top !== newTop) box.style.top = newTop;
      } else if (box) {
        if (box.style.display !== "none") box.style.display = "none";
      }
      syncFrame = requestAnimationFrame(sync);
    }
    syncFrame = requestAnimationFrame(sync);
  }
  async function renderBookmarkList() {
    const container = document.getElementById("x-ops-bookmark-container");
    if (!container) return;
    const result = await chrome.storage.local.get(["xOpsBookmarks"]);
    const bookmarks = result.xOpsBookmarks || [];
    container.innerHTML = "";
    const profileUrl = getMyProfileUrl();
    container.appendChild(createBookmarkItem("My Profile (\u81EA\u5206\u306E\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB)", profileUrl));
    bookmarks.forEach((bm) => {
      container.appendChild(createBookmarkItem(bm.title, bm.url));
    });
    updateTargetHighlight();
  }
  function getMyProfileUrl() {
    const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    return profileLink ? profileLink.href : "https://x.com/home";
  }
  function createBookmarkItem(title, url) {
    const item = document.createElement("div");
    item.className = "x-ops-bm-item";
    const star = document.createElement("span");
    star.className = "x-ops-bm-star";
    star.textContent = "\u2606";
    item.onclick = (e) => {
      if (e.target === star) return;
      window.location.href = url.startsWith("x.com") ? "https://" + url : url;
    };
    const link = document.createElement("a");
    link.className = "x-ops-bm-link";
    link.textContent = title;
    link.href = url;
    link.onclick = (e) => e.preventDefault();
    const highlights = getHighlights();
    if (highlights[url]) {
      item.classList.add("active");
    }
    star.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const newState = item.classList.toggle("active");
      saveHighlight(url, newState);
      star.classList.remove("popping");
      void star.offsetWidth;
      star.classList.add("popping");
    };
    item.appendChild(link);
    item.appendChild(star);
    return item;
  }
  function updateTargetHighlight() {
    const container = document.getElementById("x-ops-bookmark-container");
    if (!container) return;
    const currentClean = cleanUrl(window.location.href);
    const items = container.querySelectorAll(".x-ops-bm-item");
    items.forEach((item) => {
      const link = item.querySelector(".x-ops-bm-link");
      if (link && cleanUrl(link.getAttribute("href") || "") === currentClean) {
        item.classList.add("target-lock");
      } else {
        item.classList.remove("target-lock");
      }
    });
  }
  window.addEventListener("x-ops-toggle-star", () => {
    const currentUrl = window.location.href;
    const currentClean = cleanUrl(currentUrl);
    const box = document.getElementById("x-ops-dashboard-box");
    if (!box) return;
    const items = Array.from(box.querySelectorAll(".x-ops-bm-item"));
    const targetItem = items.find((item) => cleanUrl(item.querySelector(".x-ops-bm-link")?.getAttribute("href") || "") === currentClean);
    if (targetItem) {
      const star = targetItem.querySelector(".x-ops-bm-star");
      star?.click();
    }
  });
  window.addEventListener("x-ops-next-star", async () => {
    const result = await chrome.storage.local.get(["xOpsBookmarks"]);
    const bookmarks = result.xOpsBookmarks || [];
    if (bookmarks.length === 0) return;
    const profileUrl = getMyProfileUrl();
    const allUrls = [profileUrl, ...bookmarks.map((b) => b.url)];
    const highlights = getHighlights();
    const currentClean = cleanUrl(window.location.href);
    let currentIdx = allUrls.findIndex((u) => cleanUrl(u) === currentClean);
    let nextUrl = null;
    const starredUrls = allUrls.filter((u) => highlights[u]);
    if (starredUrls.length > 0) {
      const nextStarred = starredUrls.find((u) => allUrls.indexOf(u) > currentIdx) || starredUrls[0];
      nextUrl = nextStarred;
    } else {
      const nextIdx = (currentIdx + 1) % allUrls.length;
      nextUrl = allUrls[nextIdx];
    }
    if (nextUrl && cleanUrl(nextUrl) !== currentClean) {
      window.location.href = nextUrl.startsWith("x.com") ? "https://" + nextUrl : nextUrl;
    }
  });
  window.addEventListener("x-ops-go-profile", () => {
    window.location.href = getMyProfileUrl();
  });

  // src/kernel.ts
  var router = new WalkerRouter(new BaseProtocol());
  router.register(new AiChatProtocol());
  if (window.__XOPS_WALKER_ALIVE__) {
    throw new Error("[X-Ops Walker] Duplicate kernel detected. Old instance exiting silently.");
  }
  window.__XOPS_WALKER_ALIVE__ = true;
  var STORAGE_KEY = "isWalkerMode";
  var BLOCKER_KEY = "blockGoogleOneTap";
  var REGISTERED_ROUTER_KEYS = /* @__PURE__ */ new Set([
    "a",
    "d",
    "s",
    "w",
    "f",
    "x",
    "z",
    "r",
    "m",
    "g",
    "t",
    "9",
    " ",
    "q",
    "e",
    "c"
  ]);
  function getDeepElementFromPoint(x, y) {
    let el = document.elementFromPoint(x, y);
    while (el?.shadowRoot) {
      const inner = el.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === el) break;
      el = inner;
    }
    return el;
  }
  function getScrollParentPiercing(startNode) {
    let el = startNode;
    while (el) {
      const ov = window.getComputedStyle(el).overflowY;
      if ((ov === "auto" || ov === "scroll") && el.scrollHeight > el.clientHeight) {
        return el;
      }
      let parent = el.parentElement;
      if (!parent) {
        const root = el.getRootNode();
        if (root instanceof ShadowRoot) {
          parent = root.host;
        }
      }
      el = parent;
    }
    return document.documentElement;
  }
  function getBestScrollContainer(event) {
    for (const node of event.composedPath()) {
      if (!node || node.nodeType !== 1) continue;
      const el = node;
      const ov = window.getComputedStyle(el).overflowY;
      if ((ov === "auto" || ov === "scroll") && el.scrollHeight > el.clientHeight) {
        return el;
      }
    }
    const activeC = getScrollParentPiercing(document.activeElement);
    if (activeC !== document.documentElement) return activeC;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const centerEl = getDeepElementFromPoint(centerX, centerY);
    return getScrollParentPiercing(centerEl);
  }
  function isOrphan() {
    try {
      chrome.runtime.getManifest();
      return false;
    } catch {
      window.removeEventListener("keydown", keydownHandler, { capture: true });
      window.__XOPS_WALKER_ALIVE__ = false;
      return true;
    }
  }
  function selfDestruct() {
    window.__XOPS_WALKER_ALIVE__ = false;
    window.removeEventListener("keydown", keydownHandler, { capture: true });
    window.removeEventListener("keyup", suppressSiteShortcutsHandler, { capture: true });
    window.removeEventListener("keypress", suppressSiteShortcutsHandler, { capture: true });
    window.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", onWindowFocus);
  }
  var _keepAlivePort = null;
  function connectKeepAlivePort() {
    if (_keepAlivePort) return;
    try {
      _keepAlivePort = chrome.runtime.connect({ name: "walker-keepalive" });
      _keepAlivePort.onDisconnect.addListener(() => {
        _keepAlivePort = null;
      });
    } catch {
    }
  }
  async function safeSendMessage(msg) {
    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 150;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await chrome.runtime.sendMessage(msg);
        return;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("Extension context invalidated") || errMsg.includes("message channel closed")) {
          selfDestruct();
          return;
        }
        if (errMsg.includes("Receiving end does not exist") && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        console.warn("[X-Ops Walker] sendMessage failed (final):", errMsg, msg);
        return;
      }
    }
  }
  function safeStorageGet(keys, cb) {
    try {
      chrome.storage.local.get(keys).then(cb).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Extension context invalidated")) selfDestruct();
      });
    } catch {
      selfDestruct();
    }
  }
  function safeStorageSet(data) {
    try {
      chrome.storage.local.set(data).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Extension context invalidated")) selfDestruct();
      });
    } catch {
      selfDestruct();
    }
  }
  function t(key) {
    const msg = chrome.i18n.getMessage(key);
    return msg || key;
  }
  var oneTapBlockStyle = document.createElement("style");
  oneTapBlockStyle.textContent = [
    'iframe[src*="accounts.google.com/gsi/"]',
    'iframe[src*="smartlock.google.com"]',
    "#credential_picker_container",
    "#google_one_tap_notification",
    "#google-one-tap-popup"
  ].join(",\n") + " { display: none !important; pointer-events: none !important; }";
  function applyOneTapBlocker(enabled) {
    if (enabled && !oneTapBlockStyle.isConnected) {
      document.documentElement.appendChild(oneTapBlockStyle);
    } else if (!enabled && oneTapBlockStyle.isConnected) {
      oneTapBlockStyle.remove();
    }
  }
  var isWalkerMode = false;
  function isEditableElement(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName.toUpperCase();
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return true;
    if (el.getAttribute("contentEditable") === "true") return true;
    const role = el.getAttribute("role") ?? "";
    if (role === "textbox" || role === "searchbox" || role === "combobox" || role === "spinbutton") return true;
    return false;
  }
  function isSensitiveElement(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === "INPUT" && el.type === "password") return true;
    const ac = el.getAttribute("autocomplete") ?? "";
    if (ac.includes("password") || ac.startsWith("cc-")) return true;
    if (el.getAttribute("contentEditable") === "true") return true;
    return false;
  }
  function isInputActive(event) {
    for (const node of event.composedPath()) {
      if (!node || node.nodeType !== 1) continue;
      const el = node;
      if (el === document.body || el === document.documentElement) break;
      if (isSensitiveElement(el)) return true;
      if (isEditableElement(el)) return true;
    }
    return false;
  }
  function shouldPassThrough(event) {
    if (!isWalkerMode && event.key !== "Escape") return true;
    if (event.ctrlKey || event.metaKey || event.altKey) return true;
    if ((window.getSelection()?.toString().trim().length ?? 0) > 0) return true;
    if (event.isComposing || event.key === "Process" || event.keyCode === 229) return true;
    if (isInputActive(event)) return true;
    if (event.repeat) return true;
    if (event.key === "Alt" || event.key === "Control" || event.key === "Meta") return true;
    return false;
  }
  var hud = (() => {
    const host = document.createElement("div");
    host.id = "fox-walker-host";
    Object.assign(host.style, {
      all: "initial",
      position: "fixed",
      zIndex: "2147483647",
      pointerEvents: "none",
      bottom: "24px",
      right: "24px",
      display: "none"
    });
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
    :host { all: initial; }
    #hud {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
      display: flex; align-items: center; gap: 8px;
      padding: 7px 14px 7px 10px; border-radius: 999px;
      background: rgba(18, 18, 28, 0.72);
      backdrop-filter: blur(12px) saturate(160%);
      -webkit-backdrop-filter: blur(12px) saturate(160%);
      border: 1px solid rgba(255, 255, 255, 0.10);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 140, 0, 0.15) inset;
      opacity: 0; transform: translateY(8px) scale(0.96);
      transition: opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none; user-select: none;
    }
    #hud.visible { opacity: 1; transform: translateY(0) scale(1); }
    .icon { width: 16px; height: 16px; object-fit: contain; vertical-align: middle; }
    .label { color: rgba(255, 255, 255, 0.55); text-transform: uppercase; font-size: 10px; letter-spacing: 0.12em; }
    .status { font-size: 12px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; transition: background 0.18s, color 0.18s; }
    .status.on  { background: rgba(255, 140, 0, 0.18); color: #ffac30; box-shadow: 0 0 10px rgba(255, 140, 0, 0.25); }
    .status.off { background: rgba(255, 255, 255, 0.07); color: rgba(255, 255, 255, 0.35); }
    @keyframes pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(255, 140, 0, 0.50); }
      70%  { box-shadow: 0 0 0 8px rgba(255, 140, 0, 0.00); }
      100% { box-shadow: 0 0 0 0 rgba(255, 140, 0, 0.00); }
    }
    #hud.pulse { animation: pulse-ring 0.55s ease-out; }
  `;
    const hudEl = document.createElement("div");
    hudEl.id = "hud";
    const iconImg = document.createElement("img");
    iconImg.src = chrome.runtime.getURL("icons/icon48.png");
    iconImg.className = "icon";
    iconImg.alt = "";
    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = t("hud_label");
    const statusSpan = document.createElement("span");
    statusSpan.className = "status off";
    statusSpan.textContent = t("hud_off");
    hudEl.appendChild(iconImg);
    hudEl.appendChild(labelSpan);
    hudEl.appendChild(statusSpan);
    shadow.appendChild(style);
    shadow.appendChild(hudEl);
    const statusEl = hudEl.querySelector(".status");
    let pulseTimer = null;
    function triggerPulse() {
      hudEl.classList.remove("pulse");
      void hudEl.offsetWidth;
      hudEl.classList.add("pulse");
      if (pulseTimer !== null) clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => hudEl.classList.remove("pulse"), 600);
    }
    let hideTimer = null;
    function setState(active) {
      if (hideTimer !== null) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (active) {
        host.style.display = "block";
        hudEl.classList.add("visible");
        statusEl.className = "status on";
        statusEl.textContent = t("hud_on");
        triggerPulse();
      } else {
        hudEl.classList.remove("visible");
        statusEl.className = "status off";
        statusEl.textContent = t("hud_off");
        hideTimer = setTimeout(() => {
          host.style.display = "none";
        }, 250);
      }
    }
    function mount() {
      if (document.body) {
        document.body.appendChild(host);
      } else {
        document.addEventListener("DOMContentLoaded", () => document.body.appendChild(host), { once: true });
      }
    }
    mount();
    return { setState };
  })();
  var cheatsheet = (() => {
    const host = document.createElement("div");
    host.id = "fox-walker-cheatsheet";
    Object.assign(host.style, {
      all: "initial",
      position: "fixed",
      inset: "0",
      zIndex: "2147483646",
      display: "none",
      alignItems: "center",
      justifyContent: "center"
    });
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
    :host { all: initial; }
    #overlay {
      display: flex; align-items: center; justify-content: center;
      inset: 0; position: fixed;
      pointer-events: none;
    }
    #panel {
      pointer-events: auto;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: rgba(12, 12, 20, 0.82);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 140, 0, 0.10) inset;
      padding: 24px 28px;
      min-width: 380px;
      max-width: 480px;
      opacity: 0;
      transform: scale(0.94) translateY(10px);
      transition: opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1),
                  transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
    }
    #panel.visible { opacity: 1; transform: scale(1) translateY(0); }
    #header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 16px; padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    #header .icon  { width: 20px; height: 20px; object-fit: contain; vertical-align: middle; }
    #header .title { font-size: 13px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: rgba(255, 255, 255, 0.85); }
    #header .badge { margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #ffac30; background: rgba(255, 140, 0, 0.15); border-radius: 999px; padding: 2px 8px; }
    table { width: 100%; border-collapse: collapse; }
    tr + tr td { border-top: 1px solid rgba(255, 255, 255, 0.05); }
    td { padding: 7px 4px; font-size: 12px; color: rgba(255, 255, 255, 0.55); vertical-align: middle; }
    td.key-col { width: 110px; white-space: nowrap; }
    .key {
      display: inline-block; font-size: 11px; font-weight: 700;
      font-family: 'Cascadia Code', 'Consolas', monospace;
      color: #ffac30; background: rgba(255, 140, 0, 0.12);
      border: 1px solid rgba(255, 140, 0, 0.25); border-radius: 5px;
      padding: 1px 7px; margin-right: 2px;
    }
    .desc { color: rgba(255, 255, 255, 0.70); }
    .section-label { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255, 140, 0, 0.55); padding: 10px 4px 4px; }
    #footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.07); font-size: 10px; color: rgba(255, 255, 255, 0.25); text-align: center; letter-spacing: 0.06em; }
  `;
    const overlay = document.createElement("div");
    overlay.id = "overlay";
    const panel = document.createElement("div");
    panel.id = "panel";
    const header = document.createElement("div");
    header.id = "header";
    const hIcon = document.createElement("img");
    hIcon.src = chrome.runtime.getURL("icons/icon48.png");
    hIcon.className = "icon";
    hIcon.alt = "";
    const hTitle = document.createElement("span");
    hTitle.className = "title";
    hTitle.textContent = "X-Ops Walker";
    const hBadge = document.createElement("span");
    hBadge.className = "badge";
    hBadge.textContent = t("cs_badge");
    header.appendChild(hIcon);
    header.appendChild(hTitle);
    header.appendChild(hBadge);
    panel.appendChild(header);
    const table = document.createElement("table");
    function addSection(labelKey) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.className = "section-label";
      td.colSpan = 2;
      td.textContent = t(labelKey);
      tr.appendChild(td);
      table.appendChild(tr);
    }
    function addRow(keys, descKey) {
      const tr = document.createElement("tr");
      const keyTd = document.createElement("td");
      keyTd.className = "key-col";
      for (const k of keys) {
        const span = document.createElement("span");
        span.className = "key";
        span.textContent = k;
        keyTd.appendChild(span);
      }
      const descTd = document.createElement("td");
      descTd.className = "desc";
      descTd.textContent = t(descKey);
      tr.appendChild(keyTd);
      tr.appendChild(descTd);
      table.appendChild(tr);
    }
    addSection("cs_section_nav");
    addRow(["A", "D"], "cs_nav_ad");
    addRow(["Space"], "cs_nav_space");
    addRow(["W", "S"], "cs_nav_ws");
    addRow(["Q", "E"], "cs_nav_qe");
    addSection("cs_section_tab");
    addRow(["Shift", "X"], "cs_tab_xx");
    addRow(["Shift", "Z"], "cs_tab_zz");
    addRow(["Shift", "R"], "cs_tab_rr");
    addRow(["Shift", "M"], "cs_tab_mm");
    addRow(["Shift", "G"], "cs_tab_gg");
    addRow(["Shift", "T"], "cs_tab_tt");
    addRow(["Shift", "W"], "cs_tab_ww");
    addRow(["Shift", "S"], "cs_tab_ss");
    addRow(["Shift", "C"], "cs_tab_cc");
    addSection("cs_section_sys");
    addRow(["Esc"], "cs_sys_esc");
    addRow(["F"], "cs_sys_f");
    addRow(["Z"], "cs_sys_z");
    addRow(["Alt", "Z"], "cs_sys_altz");
    panel.appendChild(table);
    const footer = document.createElement("div");
    footer.id = "footer";
    footer.textContent = t("cs_footer");
    panel.appendChild(footer);
    overlay.appendChild(panel);
    shadow.appendChild(style);
    shadow.appendChild(overlay);
    let visible = false;
    function mount() {
      if (document.body) {
        document.body.appendChild(host);
      } else {
        document.addEventListener("DOMContentLoaded", () => document.body.appendChild(host), { once: true });
      }
    }
    let csHideTimer = null;
    function show() {
      if (csHideTimer !== null) {
        clearTimeout(csHideTimer);
        csHideTimer = null;
      }
      visible = true;
      host.style.display = "flex";
      requestAnimationFrame(() => panel.classList.add("visible"));
    }
    function hide() {
      visible = false;
      panel.classList.remove("visible");
      csHideTimer = setTimeout(() => {
        if (!visible) host.style.display = "none";
      }, 240);
    }
    function toggle() {
      visible ? hide() : show();
    }
    function isVisible() {
      return visible;
    }
    mount();
    return { toggle, hide, isVisible };
  })();
  window.addEventListener("XOpsWalker_ToggleCheatsheet", () => {
    cheatsheet.toggle();
  });
  function deepBlur(root) {
    if (!root) return;
    let el = root;
    while (el?.shadowRoot?.activeElement) {
      el = el.shadowRoot.activeElement;
    }
    if (el instanceof HTMLElement && el !== document.body) {
      el.blur();
    }
  }
  function blurActiveInput() {
    deepBlur(document.activeElement);
    window.focus();
  }
  function normalizeKey(event) {
    const code = event.code;
    if (code.startsWith("Key")) return code.slice(3).toLowerCase();
    if (code.startsWith("Digit")) return code.slice(5);
    if (code === "Space") return " ";
    return event.key.toLowerCase();
  }
  var isSafetyEnterEnabled = false;
  var isSynthesizing = false;
  try {
    chrome.storage.local.get("alm", (res) => {
      if (!chrome.runtime.lastError && res.alm && res.alm.safetyEnter !== void 0) {
        isSafetyEnterEnabled = res.alm.safetyEnter;
      }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && "alm" in changes) {
        const alm = changes["alm"].newValue;
        if (alm && alm.safetyEnter !== void 0) {
          isSafetyEnterEnabled = alm.safetyEnter;
        }
      }
    });
  } catch (e) {
  }
  function showSafetyEnterOSD(target) {
    const existing = document.getElementById("x-ops-safety-osd");
    if (existing) existing.remove();
    const osd = document.createElement("div");
    osd.id = "x-ops-safety-osd";
    osd.style.cssText = `
        position: absolute; background: rgba(43, 45, 49, 0.95); color: #fff;
        font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; font-weight: 600;
        padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,140,0,0.4);
        pointer-events: none; z-index: 2147483647; opacity: 0; transition: opacity 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    osd.textContent = "\u{1F4A1} Ctrl+Enter \u3067\u9001\u4FE1";
    const rect = target.getBoundingClientRect();
    osd.style.top = `${window.scrollY + rect.bottom - 25}px`;
    osd.style.left = `${window.scrollX + rect.right - 120}px`;
    document.body.appendChild(osd);
    requestAnimationFrame(() => {
      osd.style.opacity = "1";
      setTimeout(() => {
        osd.style.opacity = "0";
        setTimeout(() => osd.remove(), 200);
      }, 1500);
    });
  }
  function triggerForcedSend(target) {
    isSynthesizing = true;
    try {
      const keyData = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true };
      target.dispatchEvent(new KeyboardEvent("keydown", keyData));
      target.dispatchEvent(new KeyboardEvent("keypress", keyData));
      target.dispatchEvent(new KeyboardEvent("keyup", keyData));
      setTimeout(() => {
        const sendBtn = target.closest("form")?.querySelector('button[type="submit"]') || document.querySelector('button[data-testid="send-button"]') || document.querySelector('button[aria-label="Send Message"]');
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
        }
      }, 50);
    } finally {
      setTimeout(() => {
        isSynthesizing = false;
      }, 50);
    }
  }
  function handleSafetyEnter(event) {
    if (!isSafetyEnterEnabled || isSynthesizing || event.key !== "Enter") return;
    if (isOrphan()) return;
    if (event.isComposing || event.keyCode === 229) return;
    const target = event.target;
    if (!target) return;
    const isTextarea = target.tagName === "TEXTAREA";
    const isContentEditable = target.isContentEditable || !!target.closest('[contenteditable="true"]');
    if (!isTextarea && !isContentEditable) return;
    if (event.shiftKey) return;
    event.stopPropagation();
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.ctrlKey || event.metaKey) {
      if (event.type === "keydown") triggerForcedSend(target);
      return;
    }
    if (event.type === "keydown") {
      showSafetyEnterOSD(target);
    }
  }
  window.addEventListener("keydown", handleSafetyEnter, true);
  window.addEventListener("keypress", handleSafetyEnter, true);
  window.addEventListener("keyup", handleSafetyEnter, true);
  function keydownHandler(event) {
    if (isOrphan()) return;
    if (isWalkerMode && event.altKey && !event.ctrlKey && !event.metaKey && event.code === "KeyZ") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      deepBlur(document.activeElement);
      document.body.focus();
      window.focus();
      const container = getBestScrollContainer(event);
      router.dispatch(event, "z", event.shiftKey, container);
      return;
    }
    if (shouldPassThrough(event)) return;
    if (document.fullscreenElement !== null && event.key === "Escape") return;
    const key = normalizeKey(event);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (cheatsheet.isVisible()) {
        cheatsheet.hide();
        return;
      }
      isWalkerMode = !isWalkerMode;
      safeStorageSet({ [STORAGE_KEY]: isWalkerMode });
      hud.setState(isWalkerMode);
      if (isWalkerMode) blurActiveInput();
      return;
    }
    if (isWalkerMode && REGISTERED_ROUTER_KEYS.has(key)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const container = getBestScrollContainer(event);
      router.dispatch(event, key, event.shiftKey, container);
      return;
    }
  }
  window.addEventListener("keydown", keydownHandler, { capture: true });
  safeStorageGet([STORAGE_KEY, BLOCKER_KEY], (result) => {
    isWalkerMode = !!result[STORAGE_KEY];
    hud.setState(isWalkerMode);
    applyOneTapBlocker(!!result[BLOCKER_KEY]);
  });
  var currentHost = window.location.hostname;
  if (currentHost === "x.com" || currentHost === "twitter.com") {
    safeStorageGet(["xWalker"], (res) => {
      const xWalker = res.xWalker ?? { enabled: true, rightColumnDashboard: true };
      if (xWalker.enabled) {
        initXWalker(xWalker);
      }
    });
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (STORAGE_KEY in changes) {
      isWalkerMode = !!changes[STORAGE_KEY].newValue;
      hud.setState(isWalkerMode);
      if (isWalkerMode && !document.hidden) blurActiveInput();
    }
    if (BLOCKER_KEY in changes) {
      applyOneTapBlocker(!!changes[BLOCKER_KEY].newValue);
    }
  });
  chrome.runtime.onMessage.addListener((message) => {
    if (message.command === "FORCE_BLUR_ON_ARRIVAL") {
      if (!isWalkerMode) return;
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.focus();
      return;
    }
    if (message.command === "MARK_SLEEPING") {
      if (!document.title.startsWith("\u{1F4A4} ")) {
        document.title = "\u{1F4A4} " + document.title;
      }
    }
    if (message.command === "ALM_REFOCUS") {
      const originalTitle = document.title.replace(/^\[WAKE\]\s*/, "");
      document.title = "[WAKE] " + originalTitle;
      setTimeout(() => {
        if (document.title.startsWith("[WAKE] ")) {
          document.title = originalTitle;
        }
      }, 500);
    }
  });
  var isAhkInfectionEnabled = true;
  function pullStateFromStorage() {
    if (!window.__XOPS_WALKER_ALIVE__) return;
    if (document.title.startsWith("\u{1F4A4} ")) {
      document.title = document.title.slice("\u{1F4A4} ".length);
    }
    safeStorageGet([STORAGE_KEY, BLOCKER_KEY, "alm"], (res) => {
      const result = res;
      isWalkerMode = !!result[STORAGE_KEY];
      hud.setState(isWalkerMode);
      applyOneTapBlocker(!!result[BLOCKER_KEY]);
      if (result.alm && result.alm.ahkInfection !== void 0) {
        isAhkInfectionEnabled = result.alm.ahkInfection;
      }
      if (isWalkerMode) {
        setTimeout(() => {
          if (!isWalkerMode) return;
          if (!window.__XOPS_WALKER_ALIVE__) return;
          blurActiveInput();
        }, 150);
      }
    });
  }
  function onVisibilityChange() {
    if (!document.hidden) pullStateFromStorage();
  }
  function onWindowFocus() {
    pullStateFromStorage();
  }
  window.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", onWindowFocus);
  (function installMediaVeto() {
    let mediaVetoActive = false;
    function onMediaPlay() {
      if (mediaVetoActive) return;
      mediaVetoActive = true;
      safeSendMessage({ command: "ALM_VETO" });
    }
    function onMediaPause() {
      const medias = document.querySelectorAll("audio, video");
      const anyPlaying = Array.from(medias).some((m) => !m.paused);
      if (anyPlaying) return;
      if (!mediaVetoActive) return;
      mediaVetoActive = false;
      safeSendMessage({ command: "ALM_VETO_CLEAR" });
    }
    document.addEventListener("play", onMediaPlay, { capture: true });
    document.addEventListener("pause", onMediaPause, { capture: true });
  })();
  (function installInputVeto() {
    let inputVetoActive = false;
    function onInputFocus(event) {
      for (const node of event.composedPath()) {
        if (!node || node.nodeType !== 1) continue;
        const el = node;
        if (el === document.body || el === document.documentElement) break;
        if (isEditableElement(el)) {
          if (!inputVetoActive) {
            inputVetoActive = true;
            safeSendMessage({ command: "ALM_VETO" });
          }
          return;
        }
      }
    }
    function onInputBlur(event) {
      if (!inputVetoActive) return;
      for (const node of event.composedPath()) {
        if (!node || node.nodeType !== 1) continue;
        const el = node;
        if (el === document.body || el === document.documentElement) break;
        if (isEditableElement(el)) {
          const inputEl = el;
          if ("value" in inputEl && inputEl.value.length > 0) {
            return;
          }
          break;
        }
      }
      inputVetoActive = false;
      safeSendMessage({ command: "ALM_VETO_CLEAR" });
    }
    document.addEventListener("focusin", onInputFocus, { capture: true });
    document.addEventListener("focusout", onInputBlur, { capture: true });
  })();
  window.addEventListener("visibilitychange", () => {
    if (!document.hidden && isAhkInfectionEnabled) {
      const originalTitle = document.title.replace(/^\[WAKE\]\s*/, "");
      document.title = "[WAKE] " + originalTitle;
      setTimeout(() => {
        if (document.title.startsWith("[WAKE] ")) {
          document.title = originalTitle;
        }
      }, 500);
    }
  });
  connectKeepAlivePort();
  function suppressSiteShortcutsHandler(event) {
    if (isOrphan()) return;
    if (shouldPassThrough(event)) return;
    const key = normalizeKey(event);
    if (REGISTERED_ROUTER_KEYS.has(key)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }
  window.addEventListener("keyup", suppressSiteShortcutsHandler, { capture: true });
  window.addEventListener("keypress", suppressSiteShortcutsHandler, { capture: true });
})();
