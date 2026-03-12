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
          case "a":
            chrome.runtime.sendMessage({ command: "GO_FIRST_TAB" });
            return true;
          case "d":
            chrome.runtime.sendMessage({ command: "DUPLICATE_TAB" });
            return true;
          // スクロール操作 (ページ先頭・末尾へ直行)
          case "w":
            window.dispatchEvent(new CustomEvent("x-ops-global-reset"));
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
          window.dispatchEvent(new CustomEvent("x-ops-global-reset"));
          container.scrollTo({ top: 0, behavior: "smooth" });
          return true;
      }
      if (event.altKey && key === "z") {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        window.focus();
        window.dispatchEvent(new CustomEvent("x-ops-global-reset"));
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

  // src/protocols/utils/spatial-navigation.ts
  init_browser_polyfill_entry();
  function getValidTargets(selector) {
    return Array.from(document.querySelectorAll(selector)).filter((el) => {
      if (!el.isConnected) return false;
      const rect = el.getBoundingClientRect();
      return rect.height > 0 && rect.width > 0;
    });
  }
  function getCurrentTarget(selector, focusClass = "x-walker-focused") {
    const targets = getValidTargets(selector);
    if (targets.length === 0) return null;
    if (window.scrollY < 50 && targets.length > 0) {
      return targets[0];
    }
    const currentFocused = document.querySelector(`.${focusClass}`);
    if (currentFocused && targets.includes(currentFocused)) {
      const rect = currentFocused.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        return currentFocused;
      }
    }
    const centerY = window.scrollY + window.innerHeight * 0.3;
    let minDiff = Infinity;
    let closestTarget = null;
    for (const target of targets) {
      const rect = target.getBoundingClientRect();
      const targetCenter = window.scrollY + rect.top + rect.height / 2;
      const diff = Math.abs(centerY - targetCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closestTarget = target;
      }
    }
    return closestTarget;
  }
  function focusNextTarget(selector, direction, offset = 0, focusClass = "x-walker-focused") {
    const targets = getValidTargets(selector);
    if (targets.length === 0) return null;
    const currentTarget = getCurrentTarget(selector, focusClass);
    let currentIndex = currentTarget ? targets.indexOf(currentTarget) : -1;
    if (currentIndex === -1) {
      currentIndex = direction === 1 ? -1 : targets.length;
    }
    const nextIndex = Math.max(0, Math.min(currentIndex + direction, targets.length - 1));
    const nextTarget = targets[nextIndex];
    if (currentTarget && currentTarget !== nextTarget) {
      currentTarget.classList.remove(focusClass);
      currentTarget.style.boxShadow = "";
    }
    nextTarget.classList.add(focusClass);
    const nextRect = nextTarget.getBoundingClientRect();
    window.scrollTo({
      top: window.scrollY + nextRect.top - window.innerHeight * 0.3 - offset,
      behavior: "smooth"
    });
    return nextTarget;
  }

  // src/protocols/x-timeline.ts
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
  var walkerSyncFrame = null;
  var currentUrlPath = window.location.pathname;
  var CONFIG = {
    skipReposts: true,
    skipAds: true,
    scrollOffset: -150,
    colors: { recent: "#00ba7c", old: "#ffd400", ancient: "#f4212e", copied: "rgba(0, 255, 255, 0.2)" },
    zenOpacity: 0.5,
    longPressDelay: 400
  };
  var TARGET_SELECTOR = "article:not([data-x-walker-ignore])";
  var isActive = false;
  var backspaceTimer = null;
  var isBackspaceHeld = false;
  var originalTitle = "";
  var isCheatSheetVisible = false;
  var navLockTimer = null;
  var dashboardHost = null;
  var dashboardShadow = null;
  function injectWalkerCSS() {
    if (document.getElementById("x-walker-style")) return;
    const style = document.createElement("style");
    style.id = "x-walker-style";
    style.textContent = `
        /* \u5909\u66F4: opacity\u306B !important \u3092\u4ED8\u4E0E\u3057\u3001\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF\u30DA\u30FC\u30B8\u3067\u3082\u78BA\u5B9F\u306B\u6697\u8EE2\uFF08Zen\uFF09\u3055\u305B\u308B */
        body.x-walker-active article { opacity: ${CONFIG.zenOpacity} !important; transition: opacity 0.2s ease; }
        body.x-walker-active article:hover { background-color: transparent !important; }
        body.x-walker-active article.x-walker-focused { opacity: 1 !important; background-color: rgba(255, 255, 255, 0.03) !important; }
    `;
    document.documentElement.appendChild(style);
  }
  function initXWalker(config) {
    isDashboardEnabled = config.enabled && config.rightColumnDashboard;
    console.log("[X-Ops Walker] \u{1F43A} X Timeline Walker Protocol Status:", isDashboardEnabled);
    setWalkerState(config.enabled);
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
        setWalkerState(newConfig.enabled);
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
    initDashboardDOM();
    maintainDOM();
    heartbeatId = setInterval(() => maintainDOM(), 500);
  }
  function removeDashboard() {
    if (heartbeatId) {
      clearInterval(heartbeatId);
      heartbeatId = null;
    }
    const oldSpacer = document.getElementById("x-ops-dashboard-spacer");
    if (oldSpacer) oldSpacer.remove();
    if (dashboardHost) {
      dashboardHost.remove();
      dashboardHost = null;
      dashboardShadow = null;
    }
  }
  function maintainDOM() {
    if (!isDashboardEnabled) return;
    if (!dashboardHost) {
      initDashboardDOM();
    } else if (!dashboardHost.isConnected) {
      document.body.appendChild(dashboardHost);
    }
  }
  function initDashboardDOM() {
    if (dashboardHost) return;
    dashboardHost = document.createElement("div");
    dashboardHost.id = "x-ops-dashboard-host";
    Object.assign(dashboardHost.style, {
      position: "fixed",
      zIndex: "9999",
      pointerEvents: "none",
      // 背景のクリックを阻害しない
      display: "none"
    });
    dashboardShadow = dashboardHost.attachShadow({ mode: "closed" });
    const box = document.createElement("div");
    box.id = "box";
    Object.assign(box.style, {
      background: "rgba(10, 10, 22, 0.75)",
      backdropFilter: "blur(16px) saturate(180%)",
      WebkitBackdropFilter: "blur(16px) saturate(180%)",
      border: "1px solid rgba(255, 140, 0, 0.2)",
      borderRadius: "12px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
      overflow: "hidden",
      pointerEvents: "auto",
      // パネル内はクリック可能
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: "#eff3f4",
      transition: "height 0.2s ease",
      width: "100%"
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
            <span style="font-size: 11px; font-weight: 800; color: #ff8c00; letter-spacing: 0.12em; text-transform: uppercase; user-select: none;">${titleText}</span>
            <div style="display: flex; gap: 6px; align-items: center;">
                <button id="x-ops-quick-add" style="background: rgba(255, 140, 0, 0.15); border: 1px solid rgba(255, 140, 0, 0.3); border-radius: 4px; color: #ffac30; font-size: 9px; font-weight: 800; padding: 2px 6px; cursor: pointer; transition: all 0.2s;">[+] ADD</button>
                <button id="x-ops-dashboard-toggle" title="\u6700\u5C0F\u5316" style="background: transparent; border: none; color: rgba(255, 255, 255, 0.6); font-size: 16px; font-weight: bold; cursor: pointer; padding: 0 4px; transition: color 0.2s; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">\u2212</button>
            </div>
        </div>
        <div id="x-ops-dashboard-content">
            <div id="x-ops-bookmark-container" style="max-height: 600px; overflow-y: auto; border-bottom: 1px solid rgba(255, 140, 0, 0.1);"></div>
            <div style="padding: 12px; text-align: center;">
                <div style="font-family: 'Cascadia Code', monospace; font-size: 10px; color: rgba(255, 255, 255, 0.5); letter-spacing: 0.2em;">${statusText}</div>
            </div>
        </div>
    `;
    const toggleBtn = box.querySelector("#x-ops-dashboard-toggle");
    const contentContainer = box.querySelector("#x-ops-dashboard-content");
    if (toggleBtn && contentContainer) {
      toggleBtn.addEventListener("mouseover", () => toggleBtn.style.color = "#fff");
      toggleBtn.addEventListener("mouseout", () => toggleBtn.style.color = "rgba(255, 255, 255, 0.6)");
      toggleBtn.addEventListener("click", () => {
        const isHidden = contentContainer.style.display === "none";
        if (isHidden) {
          contentContainer.style.display = "block";
          toggleBtn.textContent = "\u2212";
          toggleBtn.title = "\u6700\u5C0F\u5316";
        } else {
          contentContainer.style.display = "none";
          toggleBtn.textContent = "\uFF0B";
          toggleBtn.title = "\u5C55\u958B";
        }
      });
    }
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
        const cleanedUrl = cleanUrl(url);
        const result = await chrome.storage.local.get(["xOpsBookmarks"]);
        const bookmarks = result.xOpsBookmarks || [];
        if (!bookmarks.some((b) => cleanUrl(b.url) === cleanedUrl)) {
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
    dashboardShadow.appendChild(box);
    document.body.appendChild(dashboardHost);
    renderBookmarkList();
  }
  function syncDashboardUI() {
    if (!dashboardHost || !dashboardShadow) return;
    const box = dashboardShadow.getElementById("box");
    if (!box) return;
    const path = window.location.pathname;
    const isLoginModal = !!document.querySelector('[data-testid="sheetDialog"]') || !!document.querySelector('[data-testid="login"]');
    const isExcluded = path.startsWith("/settings") || path.includes("/i/flow/login") || path === "/login" || path === "/logout" || path.startsWith("/i/display");
    if (isLoginModal || isExcluded) {
      if (dashboardHost.style.display !== "none") dashboardHost.style.display = "none";
      return;
    }
    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (!sidebar) {
      if (dashboardHost.style.display !== "none") dashboardHost.style.display = "none";
      return;
    }
    if (dashboardHost.style.display !== "block") dashboardHost.style.display = "block";
    const sidebarRect = sidebar.getBoundingClientRect();
    if (dashboardHost.style.width !== sidebarRect.width + "px") dashboardHost.style.width = sidebarRect.width + "px";
    if (dashboardHost.style.left !== sidebarRect.left + "px") dashboardHost.style.left = sidebarRect.left + "px";
    let targetTop = 0;
    let targetMarginDiv = null;
    const searchBar = sidebar.querySelector('[role="search"]');
    if (searchBar) {
      const searchRect = searchBar.getBoundingClientRect();
      targetTop = searchRect.bottom + 12;
      targetMarginDiv = searchBar.parentElement?.nextElementSibling;
    } else {
      targetTop = Math.max(sidebarRect.top, 53);
      targetMarginDiv = sidebar.firstElementChild;
    }
    if (dashboardHost.style.top !== targetTop + "px") dashboardHost.style.top = targetTop + "px";
    if (targetMarginDiv) {
      const currentBoxHeight = box.offsetHeight;
      const targetMargin = currentBoxHeight + 10 + "px";
      if (targetMarginDiv.style.marginTop !== targetMargin) {
        targetMarginDiv.style.marginTop = targetMargin;
        targetMarginDiv.style.transition = "margin-top 0.2s ease";
      }
    }
  }
  function tagIgnoredArticles() {
    document.querySelectorAll("article:not([data-x-walker-inspected])").forEach((article) => {
      article.setAttribute("data-x-walker-inspected", "true");
      const text = article.innerText || "";
      let shouldIgnore = false;
      if (CONFIG.skipAds) {
        const isOwnPromotable = article.querySelector('a[href*="/quick_promote_web/"]');
        const hasAdText = text.includes("\u30D7\u30ED\u30E2\u30FC\u30B7\u30E7\u30F3") || text.includes("Promoted");
        if (hasAdText && !isOwnPromotable) {
          shouldIgnore = true;
        }
      }
      if (!shouldIgnore && CONFIG.skipReposts) {
        if (article.querySelector('[data-testid="socialContext"]')?.textContent?.match(/リポスト|Reposted/)) {
          shouldIgnore = true;
        }
      }
      if (shouldIgnore) {
        article.setAttribute("data-x-walker-ignore", "true");
      }
    });
  }
  function startWalkerLoop() {
    if (walkerSyncFrame !== null) cancelAnimationFrame(walkerSyncFrame);
    function loop() {
      if (!isActive) {
        walkerSyncFrame = null;
        return;
      }
      if (!document.body.classList.contains("x-walker-active")) {
        document.body.classList.add("x-walker-active");
      }
      injectWalkerCSS();
      if (currentUrlPath !== window.location.pathname) {
        currentUrlPath = window.location.pathname;
        triggerAutoTargeting();
      }
      tagIgnoredArticles();
      maintainFocusVisuals();
      if (isDashboardEnabled) syncDashboardUI();
      walkerSyncFrame = requestAnimationFrame(loop);
    }
    walkerSyncFrame = requestAnimationFrame(loop);
  }
  function triggerAutoTargeting() {
    let attempts = 0;
    const initFocusInterval = setInterval(() => {
      const targets = Array.from(document.querySelectorAll(TARGET_SELECTOR));
      if (targets.length > 0) {
        clearInterval(initFocusInterval);
        setTimeout(() => {
          if (!isActive) return;
          const target = getCurrentTarget(TARGET_SELECTOR);
          if (target && window.scrollY < 200) {
            const rect = target.getBoundingClientRect();
            window.scrollTo({
              top: window.scrollY + rect.top - window.innerHeight * 0.3 - CONFIG.scrollOffset,
              behavior: "smooth"
            });
          }
        }, 300);
      } else if (++attempts > 40) {
        clearInterval(initFocusInterval);
      }
    }, 50);
  }
  function getArticleColor(article) {
    const t2 = article.querySelector("time");
    if (!t2) return CONFIG.colors.recent;
    const d = ((/* @__PURE__ */ new Date()).getTime() - new Date(t2.getAttribute("datetime") || "").getTime()) / 864e5;
    return d >= 30 ? CONFIG.colors.ancient : d >= 4 ? CONFIG.colors.old : CONFIG.colors.recent;
  }
  function maintainFocusVisuals() {
    let currentTarget = null;
    if (navLockTimer !== null) {
      currentTarget = document.querySelector(".x-walker-focused");
    } else {
      currentTarget = getCurrentTarget(TARGET_SELECTOR);
    }
    if (!currentTarget) return;
    document.querySelectorAll(".x-walker-focused").forEach((el) => {
      if (el !== currentTarget) {
        el.classList.remove("x-walker-focused");
        el.style.boxShadow = "";
      }
    });
    if (!currentTarget.classList.contains("x-walker-focused")) {
      currentTarget.classList.add("x-walker-focused");
    }
    const color = getArticleColor(currentTarget);
    const expectedShadow = `-4px 0 0 0 ${color}, 0 0 20px ${color}33`;
    if (currentTarget.style.boxShadow !== expectedShadow) {
      currentTarget.style.boxShadow = expectedShadow;
    }
  }
  async function renderBookmarkList() {
    if (!dashboardShadow) return;
    const container = dashboardShadow.getElementById("x-ops-bookmark-container");
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
    const absoluteUrl = url.startsWith("http") ? url : "https://" + url;
    item.onclick = (e) => {
      if (e.target === star) return;
      window.location.href = absoluteUrl;
    };
    const link = document.createElement("a");
    link.className = "x-ops-bm-link";
    link.textContent = title;
    link.href = absoluteUrl;
    link.onclick = (e) => e.preventDefault();
    const highlights = getHighlights();
    const cleanUrlStr = cleanUrl(url);
    const isActiveHighlight = highlights[cleanUrlStr];
    if (isActiveHighlight) {
      item.classList.add("active");
    }
    star.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const myProfileUrl = cleanUrl(getMyProfileUrl());
      if (cleanUrlStr === myProfileUrl) return;
      const newState = item.classList.toggle("active");
      saveHighlight(cleanUrlStr, newState);
      star.classList.remove("popping");
      void star.offsetWidth;
      star.classList.add("popping");
    };
    item.appendChild(link);
    item.appendChild(star);
    return item;
  }
  function updateTargetHighlight() {
    if (!dashboardShadow) return;
    const container = dashboardShadow.getElementById("x-ops-bookmark-container");
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
  function toggleStar() {
    if (!dashboardShadow) return;
    const currentUrl = window.location.href;
    const currentClean = cleanUrl(currentUrl);
    const items = Array.from(dashboardShadow.querySelectorAll(".x-ops-bm-item"));
    const targetItem = items.find((item) => cleanUrl(item.querySelector(".x-ops-bm-link")?.getAttribute("href") || "") === currentClean);
    if (targetItem) {
      const star = targetItem.querySelector(".x-ops-bm-star");
      star?.click();
    }
  }
  function nextStar() {
    if (!dashboardShadow) return;
    const links = Array.from(dashboardShadow.querySelectorAll(".x-ops-bm-link"));
    if (links.length === 0) return;
    const targets = links.map((a) => a.href);
    const highlights = getHighlights();
    const currentPath = cleanUrl(window.location.href);
    const myProfilePath = cleanUrl(getMyProfileUrl());
    let currentIdx = targets.findIndex((url) => cleanUrl(url) === currentPath);
    let nextUrl = null;
    if (currentIdx !== -1 && highlights[cleanUrl(targets[currentIdx])]) {
      let i = 1;
      while (i < targets.length) {
        let candidateIdx = (currentIdx + i) % targets.length;
        let candidateUrl = targets[candidateIdx];
        if (cleanUrl(candidateUrl) !== myProfilePath) {
          nextUrl = candidateUrl;
          break;
        }
        i++;
      }
    } else {
      let starredIdx = targets.findIndex((url) => highlights[cleanUrl(url)]);
      if (starredIdx !== -1) {
        nextUrl = targets[starredIdx];
      } else {
        let i = 1;
        while (i < targets.length) {
          let candidateIdx = (Math.max(0, currentIdx) + i) % targets.length;
          let candidateUrl = targets[candidateIdx];
          if (cleanUrl(candidateUrl) !== myProfilePath) {
            nextUrl = candidateUrl;
            break;
          }
          i++;
        }
      }
    }
    if (nextUrl && cleanUrl(nextUrl) !== currentPath) {
      let modified = false;
      if (currentIdx !== -1) {
        const originUrl = targets[currentIdx];
        if (cleanUrl(originUrl) !== myProfilePath && highlights[cleanUrl(originUrl)]) {
          delete highlights[cleanUrl(originUrl)];
          modified = true;
        }
      }
      if (cleanUrl(nextUrl) !== myProfilePath && !highlights[cleanUrl(nextUrl)]) {
        highlights[cleanUrl(nextUrl)] = true;
        modified = true;
      }
      if (modified) {
        localStorage.setItem(STORAGE_KEY_HIGHLIGHTS, JSON.stringify(highlights));
      }
      window.location.href = nextUrl;
    }
  }
  function goProfile() {
    window.location.href = getMyProfileUrl();
  }
  var XTimelineProtocol = class {
    matches(url) {
      return url.includes("x.com") || url.includes("twitter.com");
    }
    handleKey(event, key, shift, container) {
      if (key === "h") {
        if (!isActive && !isDashboardEnabled) return false;
        toggleCheatSheet();
        return true;
      }
      if (isCheatSheetVisible) return true;
      if (isDashboardEnabled && ["n", "m", "y"].includes(key)) {
        if (key === "n") toggleStar();
        if (key === "m") nextStar();
        if (key === "y") goProfile();
        return true;
      }
      if (!isActive) return false;
      const timelineKeys = ["j", "k", "l", "o", "b", "backspace", "i", "u", ";", "enter", "/", "c", ","];
      if (timelineKeys.includes(key)) {
        if (key === "k" || key === "j") {
          const direction = key === "j" ? 1 : -1;
          focusNextTarget(TARGET_SELECTOR, direction, CONFIG.scrollOffset);
          if (navLockTimer) clearTimeout(navLockTimer);
          navLockTimer = window.setTimeout(() => {
            navLockTimer = null;
          }, 400);
        }
        if (key === "l") executeAction("like");
        if (key === "o") executeAction("repost");
        if (key === "b") executeAction("bookmark");
        if (key === "i") window.location.href = "https://x.com/notifications";
        if (key === "u") window.location.href = "https://x.com/i/bookmarks";
        if (key === ",") window.location.href = "https://x.com/home";
        if (key === "/") {
          const searchInput = document.querySelector('[data-testid="SearchBox_Search_Input"]');
          if (searchInput) searchInput.focus();
        }
        if (key === ";") {
          if (shift) {
            const composeBtn = document.querySelector('a[href="/compose/post"], a[href="/compose/tweet"]') || document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
            if (composeBtn) composeBtn.click();
          } else {
            const target = getCurrentTarget(TARGET_SELECTOR);
            if (target && target.isConnected) {
              const replyBtn = target.querySelector('[data-testid="reply"]');
              if (replyBtn) replyBtn.click();
            }
          }
        }
        if (key === "enter") {
          const target = getCurrentTarget(TARGET_SELECTOR);
          if (target && target.isConnected) {
            const timeEl = target.querySelector("time");
            const link = timeEl ? timeEl.closest("a") : null;
            if (link) link.click();
          }
        }
        if (key === "c") {
          const target = getCurrentTarget(TARGET_SELECTOR);
          if (target && target.isConnected) {
            const textNode = target.querySelector('[data-testid="tweetText"]');
            if (textNode) {
              navigator.clipboard.writeText(textNode.innerText).then(() => {
                flashFeedback(target, "rgba(0, 255, 255, 0.2)");
              }).catch((err) => console.error("[X Walker] Copy failed:", err));
            }
          }
        }
        if (key === "backspace") {
          if (event.repeat) return true;
          startDRSDelete();
        }
        return true;
      }
      return false;
    }
  };
  window.addEventListener("keyup", (e) => {
    if (!isActive) return;
    const activeEl = document.activeElement;
    const isInput = activeEl && (["INPUT", "TEXTAREA"].includes(activeEl.tagName) || activeEl.isContentEditable);
    if (isInput) return;
    if (e.code === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      isBackspaceHeld = false;
      if (backspaceTimer !== null) {
        clearTimeout(backspaceTimer);
        backspaceTimer = null;
      }
      if (document.title === "\u26A0\uFE0F DRS ACTIVE \u26A0\uFE0F") {
        document.title = originalTitle;
      }
    }
  }, true);
  window.addEventListener("x-ops-global-reset", () => {
    if (!isActive) return;
    forceClearFocus();
  });
  function setWalkerState(enabled) {
    if (isActive === enabled) return;
    isActive = enabled;
    if (window.PhantomUI) {
      window.PhantomUI.update(enabled);
    }
    if (isActive) {
      injectWalkerCSS();
      document.body.classList.add("x-walker-active");
      startWalkerLoop();
      triggerAutoTargeting();
    } else {
      document.body.classList.remove("x-walker-active");
      forceClearFocus();
    }
  }
  function forceClearFocus() {
    document.querySelectorAll(".x-walker-focused").forEach((el) => {
      el.classList.remove("x-walker-focused");
      el.style.boxShadow = "";
    });
  }
  function flashFeedback(article, color) {
    if (!article?.isConnected) return;
    const originalBg = article.style.backgroundColor;
    article.style.backgroundColor = color;
    setTimeout(() => {
      if (article.isConnected) article.style.backgroundColor = originalBg;
    }, 200);
  }
  function waitAndClick(selector, callback) {
    let attempts = 0;
    const interval = setInterval(() => {
      const el = typeof selector === "function" ? selector() : document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        el.click();
        callback?.(el);
      } else if (++attempts > 40) clearInterval(interval);
    }, 50);
  }
  function executeAction(actionType) {
    if (!isActive) return;
    const article = getCurrentTarget(TARGET_SELECTOR);
    if (!article?.isConnected) return;
    if (actionType === "like") {
      const btn = article.querySelector('[data-testid="like"], [data-testid="unlike"]');
      if (btn) btn.click();
      else flashFeedback(article, "rgba(249, 24, 128, 0.1)");
    } else if (actionType === "repost") {
      const btn = article.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
      if (btn) {
        btn.click();
        waitAndClick(btn.getAttribute("data-testid") === "retweet" ? '[data-testid="retweetConfirm"]' : '[data-testid="unretweetConfirm"]', () => flashFeedback(article, "rgba(0, 186, 124, 0.1)"));
      }
    } else if (actionType === "bookmark") {
      const btn = article.querySelector('[data-testid="bookmark"], [data-testid="removeBookmark"]');
      if (btn) {
        btn.click();
        flashFeedback(article, "rgba(29, 155, 240, 0.2)");
      }
    }
  }
  function startDRSDelete() {
    isBackspaceHeld = true;
    const article = getCurrentTarget(TARGET_SELECTOR);
    if (!article) return;
    originalTitle = document.title;
    document.title = "\u26A0\uFE0F DRS ACTIVE \u26A0\uFE0F";
    const caret = article.querySelector('[data-testid="caret"]');
    if (caret) caret.click();
    setTimeout(() => {
      const menu = document.querySelector('[role="menu"]');
      if (!menu) return;
      const deleteItems = Array.from(menu.querySelectorAll('[role="menuitem"]'));
      const deleteItem = deleteItems.find((el) => el.textContent?.match(/削除|Delete/));
      if (deleteItem) deleteItem.click();
    }, 100);
    backspaceTimer = window.setTimeout(() => {
      if (isBackspaceHeld) {
        let attempts = 0;
        const interval = setInterval(() => {
          const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirmBtn) {
            clearInterval(interval);
            confirmBtn.click();
            flashFeedback(article, "rgba(244, 33, 46, 0.3)");
            setTimeout(() => {
              focusNextTarget(TARGET_SELECTOR, 1, CONFIG.scrollOffset);
            }, 500);
          } else if (++attempts > 40) {
            clearInterval(interval);
          }
        }, 50);
        if (document.title === "\u26A0\uFE0F DRS ACTIVE \u26A0\uFE0F") document.title = originalTitle;
        isBackspaceHeld = false;
      }
    }, 600);
  }
  function toggleCheatSheet() {
    let sheet = document.getElementById("x-ops-cheat-sheet");
    if (sheet) {
      sheet.remove();
      isCheatSheetVisible = false;
      return;
    }
    isCheatSheetVisible = true;
    sheet = document.createElement("div");
    sheet.id = "x-ops-cheat-sheet";
    Object.assign(sheet.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: "10000",
      background: "rgba(15, 15, 20, 0.85)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
      padding: "24px",
      color: "#e7e9ea",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      minWidth: "360px",
      fontFamily: '"Segoe UI", system-ui, sans-serif'
    });
    const getMsg = (key, fallback) => chrome.i18n.getMessage(key) || fallback;
    const kbdStyle = `background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; color: #ffac30; font-family: monospace; font-weight: bold;`;
    const kbdAlertStyle = `background: rgba(244,33,46,0.2); border: 1px solid rgba(244,33,46,0.4); border-radius: 4px; padding: 2px 6px; color: #f4212e; font-family: monospace; font-weight: bold;`;
    sheet.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 12px; margin-bottom: 16px;">
            <div style="font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                <span style="color: #ff8c00;">\u26A1</span> X-OPS WALKER
            </div>
            <div style="background: rgba(255, 140, 0, 0.15); color: #ffac30; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 12px; border: 1px solid rgba(255, 140, 0, 0.3);">
                ${getMsg("x_cheat_sheet_badge", "CHEAT SHEET")}
            </div>
        </div>

        <div style="font-size: 11px; color: #ff8c00; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em;">${getMsg("x_cheat_sheet_sec_nav", "TACTICAL NAVIGATION")}</div>
        <div style="display: grid; grid-template-columns: 105px 1fr; gap: 10px; font-size: 13px; margin-bottom: 16px;">
            <div style="text-align: right;"><kbd style="${kbdStyle}">J</kbd> / <kbd style="${kbdStyle}">K</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_nav", "Navigate Timeline")}</div>
            
            <div style="text-align: right;"><kbd style="${kbdStyle}">Enter</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_detail", "Open Detail")}</div>
            
            <div style="text-align: right;"><kbd style="${kbdStyle}">/</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_search", "Search")}</div>
            
            <div style="text-align: right;"><kbd style="${kbdStyle}">I</kbd> / <kbd style="${kbdStyle}">U</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_jump", "Notifs / Bookmarks")}</div>

            <div style="text-align: right;"><kbd style="${kbdStyle}">,</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_home", "Go Home")}</div>

            <div style="text-align: right;"><kbd style="${kbdStyle}">N</kbd> / <kbd style="${kbdStyle}">M</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_patrol", "Star Patrol")}</div>
            
            <div style="text-align: right;"><kbd style="${kbdStyle}">Y</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_profile", "Go Profile")}</div>
        </div>

        <div style="font-size: 11px; color: #f4212e; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em;">${getMsg("x_cheat_sheet_sec_action", "COMBAT ACTIONS")}</div>
        <div style="display: grid; grid-template-columns: 105px 1fr; gap: 10px; font-size: 13px;">
            <div style="text-align: right;"><kbd style="${kbdStyle}">L</kbd> / <kbd style="${kbdStyle}">O</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_action", "Like / Repost")}</div>

            <div style="text-align: right;"><kbd style="${kbdStyle}">B</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_bookmark", "Bookmark")}</div>
            <div style="text-align: right;"><kbd style="${kbdStyle}">;</kbd> / <kbd style="${kbdStyle}">\u21E7+;</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_reply", "Reply / Compose")}</div>
            
            <div style="text-align: right;"><kbd style="${kbdStyle}">C</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_copy", "Copy Text")}</div>

            <div style="text-align: right;"><kbd style="${kbdAlertStyle}">BS Hold</kbd></div>
            <div style="display: flex; align-items: center;">${getMsg("x_cheat_sheet_delete", "DRS Delete")}</div>
        </div>

        <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #71767b;">
            ${getMsg("x_cheat_sheet_close", "Press H or click anywhere to close")}
        </div>
    `;
    document.body.appendChild(sheet);
    const closer = () => {
      sheet?.remove();
      isCheatSheetVisible = false;
      document.removeEventListener("click", closer);
    };
    setTimeout(() => document.addEventListener("click", closer), 10);
  }
  function onTabWakeUp() {
    if (document.hidden) return;
    setTimeout(() => {
      const active = document.activeElement;
      if (active && active !== document.body) {
        if (!["INPUT", "TEXTAREA"].includes(active.tagName) && !active.isContentEditable) {
          active.blur();
        }
      }
      document.body.focus();
      if (isDashboardEnabled) {
        maintainDOM();
        syncDashboardUI();
      }
      if (isActive) {
        maintainFocusVisuals();
      }
    }, 200);
  }
  document.addEventListener("visibilitychange", onTabWakeUp);
  window.addEventListener("focus", onTabWakeUp);

  // src/protocols/safety-enter.ts
  init_browser_polyfill_entry();
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
  function interceptSafetyEnter(event) {
    if (!isSafetyEnterEnabled || isSynthesizing || event.key !== "Enter") return false;
    if (event.isComposing || event.keyCode === 229) return false;
    const target = event.target;
    if (!target) return false;
    const isTextarea = target.tagName === "TEXTAREA";
    const isContentEditable = target.isContentEditable || !!target.closest('[contenteditable="true"]');
    if (!isTextarea && !isContentEditable) return false;
    if (event.shiftKey) return false;
    event.stopPropagation();
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.ctrlKey || event.metaKey) {
      if (event.type === "keydown") triggerForcedSend(target);
      return true;
    }
    if (event.type === "keydown") {
      showSafetyEnterOSD(target);
    }
    return true;
  }

  // src/kernel.ts
  var router = new WalkerRouter(new BaseProtocol());
  router.register(new AiChatProtocol());
  router.register(new XTimelineProtocol());
  if (window.__XOPS_WALKER_ALIVE__) {
    throw new Error("[X-Ops Walker] Duplicate kernel detected. Old instance exiting silently.");
  }
  function isPWA() {
    return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: window-controls-overlay)").matches;
  }
  if (isPWA()) {
    console.log("[FoxPhantom] PWA mode detected. Shutting down Kernel.");
  }
  window.__XOPS_WALKER_ALIVE__ = true;
  var STORAGE_KEY = "isWalkerMode";
  var BLOCKER_KEY = "blockGoogleOneTap";
  var REGISTERED_ROUTER_KEYS = /* @__PURE__ */ new Set([
    // Base & Universal Keys
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
    "q",
    "e",
    "c",
    // X Timeline & Domain Specific Keys
    "j",
    "k",
    "l",
    "o",
    "b",
    "i",
    "u",
    "h",
    "n",
    "y",
    ";",
    "/",
    ",",
    "enter",
    "backspace"
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
    const isWalkerToggle = event.code === "KeyP" && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (!isWalkerMode && event.key !== "Escape" && !isWalkerToggle) return true;
    if (event.ctrlKey || event.metaKey || event.altKey) return true;
    if ((window.getSelection()?.toString().trim().length ?? 0) > 0) return true;
    if (event.isComposing || event.key === "Process" || event.keyCode === 229) return true;
    if (isInputActive(event)) return true;
    if (event.repeat) return true;
    if (event.key === "Alt" || event.key === "Control" || event.key === "Meta" || event.key === "Shift") return true;
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
    function isPWA2() {
      return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: window-controls-overlay)").matches || window.matchMedia("(display-mode: minimal-ui)").matches;
    }
    function setState(active) {
      if (isPWA2()) {
        host.style.display = "none";
        return;
      }
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
    #overlay { display: flex; align-items: center; justify-content: center; inset: 0; position: fixed; pointer-events: none; }
    #panel { pointer-events: auto; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: rgba(12, 12, 20, 0.82); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 140, 0, 0.10) inset; padding: 24px 28px; min-width: 380px; max-width: 480px; opacity: 0; transform: scale(0.94) translateY(10px); transition: opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.22s cubic-bezier(0.4, 0, 0.2, 1); user-select: none; }
    #panel.visible { opacity: 1; transform: scale(1) translateY(0); }
    #header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    #header .icon  { width: 20px; height: 20px; object-fit: contain; vertical-align: middle; }
    #header .title { font-size: 13px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: rgba(255, 255, 255, 0.85); }
    #header .badge { margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #ffac30; background: rgba(255, 140, 0, 0.15); border-radius: 999px; padding: 2px 8px; }
    table { width: 100%; border-collapse: collapse; }
    tr + tr td { border-top: 1px solid rgba(255, 255, 255, 0.05); }
    td { padding: 7px 4px; font-size: 12px; color: rgba(255, 255, 255, 0.55); vertical-align: middle; }
    td.key-col { width: 110px; white-space: nowrap; }
    .key { display: inline-block; font-size: 11px; font-weight: 700; font-family: 'Cascadia Code', 'Consolas', monospace; color: #ffac30; background: rgba(255, 140, 0, 0.12); border: 1px solid rgba(255, 140, 0, 0.25); border-radius: 5px; padding: 1px 7px; margin-right: 2px; }
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
    addRow(["Shift", "A"], "cs_tab_aa");
    addRow(["Shift", "D"], "cs_tab_dd");
    addSection("cs_section_sys");
    addRow(["Shift", "P"], "cs_sys_shift_p");
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
  function keydownHandler(event) {
    if (isOrphan()) return;
    if (interceptSafetyEnter(event)) return;
    if (isWalkerMode && event.altKey && !event.ctrlKey && !event.metaKey && event.code === "KeyZ") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      deepBlur(document.activeElement);
      document.body.focus();
      window.focus();
      window.dispatchEvent(new CustomEvent("x-ops-global-reset"));
      const container = getBestScrollContainer(event);
      router.dispatch(event, "z", event.shiftKey, container);
      return;
    }
    if (shouldPassThrough(event)) return;
    if (document.fullscreenElement !== null && event.key === "Escape") return;
    const key = normalizeKey(event);
    if (event.key === "Escape") {
      if (cheatsheet.isVisible()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        cheatsheet.hide();
      }
      return;
    }
    if (event.code === "KeyP" && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (cheatsheet.isVisible()) {
        cheatsheet.hide();
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
  });
  var FocusShield = /* @__PURE__ */ (() => {
    let shieldTimer = null;
    let isActive2 = false;
    function dropShield() {
      if (!isActive2) return;
      isActive2 = false;
      if (shieldTimer) {
        clearTimeout(shieldTimer);
        shieldTimer = null;
      }
      window.removeEventListener("focusin", interceptFocus, true);
      window.removeEventListener("mousedown", dropShield, true);
      window.removeEventListener("keydown", dropShield, true);
    }
    function interceptFocus(e) {
      if (!isWalkerMode) return;
      const target = e.target;
      if (!target) return;
      if (isEditableElement(target) || isSensitiveElement(target)) {
        e.preventDefault();
        target.blur();
        document.body.focus();
      }
    }
    function activate() {
      if (!isWalkerMode) return;
      dropShield();
      blurActiveInput();
      isActive2 = true;
      window.addEventListener("focusin", interceptFocus, true);
      window.addEventListener("mousedown", dropShield, true);
      window.addEventListener("keydown", dropShield, true);
      shieldTimer = setTimeout(dropShield, 1500);
    }
    return { activate, dropShield };
  })();
  function pullStateFromStorage() {
    if (!window.__XOPS_WALKER_ALIVE__) return;
    if (document.title.startsWith("\u{1F4A4} ")) {
      document.title = document.title.slice("\u{1F4A4} ".length);
    }
    safeStorageGet([STORAGE_KEY, BLOCKER_KEY], (res) => {
      isWalkerMode = !!res[STORAGE_KEY];
      hud.setState(isWalkerMode);
      applyOneTapBlocker(!!res[BLOCKER_KEY]);
      if (isWalkerMode) {
        FocusShield.activate();
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
  connectKeepAlivePort();
  function suppressSiteShortcutsHandler(event) {
    if (isOrphan()) return;
    if (interceptSafetyEnter(event)) return;
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
