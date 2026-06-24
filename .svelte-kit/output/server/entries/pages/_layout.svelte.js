import { f as is_array, g as get_prototype_of, o as object_prototype, n as noop, h as current_component, j as getContext$1, s as setContext$1, e as pop, p as push, k as attr, t as to_class, l as stringify, m as spread_attributes, q as ensure_array_like, u as escape_html, v as clsx, w as copy_payload, x as assign_payload, y as spread_props, z as bind_props } from "../../chunks/index.js";
import { p as page } from "../../chunks/index2.js";
import * as PIXI$1 from "pixi.js";
import { Texture as Texture$1, LoaderParserPriority, ExtensionType, extensions, checkExtension, path, TextureSource, copySearchParams, DOMAdapter, Resolver, Geometry, Buffer, BufferUsage, Shader, compileHighShaderGlProgram, colorBitGl, generateTextureBatchBitGl, roundPixelsBitGl, compileHighShaderGpuProgram, colorBit, generateTextureBatchBit, roundPixelsBit, getBatchSamplersUniformGroup, Batcher, Color as Color$1, collectAllRenderables, Point, Ticker, Sprite as Sprite$1, CanvasTextMetrics, TextStyle, FillGradient } from "pixi.js";
import { t as source, u as render_effect, s as set, n as get, v as effect_tracking, w as untrack, x as tick, y as on } from "../../chunks/events.js";
import { i18n } from "@lingui/core";
import _ from "lodash";
import gsap from "gsap";
const empty = [];
function snapshot(value, skip_warning = false) {
  return clone(value, /* @__PURE__ */ new Map(), "", empty);
}
function clone(value, cloned, path2, paths, original = null) {
  if (typeof value === "object" && value !== null) {
    var unwrapped = cloned.get(value);
    if (unwrapped !== void 0) return unwrapped;
    if (value instanceof Map) return (
      /** @type {Snapshot<T>} */
      new Map(value)
    );
    if (value instanceof Set) return (
      /** @type {Snapshot<T>} */
      new Set(value)
    );
    if (is_array(value)) {
      var copy = (
        /** @type {Snapshot<any>} */
        Array(value.length)
      );
      cloned.set(value, copy);
      if (original !== null) {
        cloned.set(original, copy);
      }
      for (var i = 0; i < value.length; i += 1) {
        var element = value[i];
        if (i in value) {
          copy[i] = clone(element, cloned, path2, paths);
        }
      }
      return copy;
    }
    if (get_prototype_of(value) === object_prototype) {
      copy = {};
      cloned.set(value, copy);
      if (original !== null) {
        cloned.set(original, copy);
      }
      for (var key in value) {
        copy[key] = clone(value[key], cloned, path2, paths);
      }
      return copy;
    }
    if (value instanceof Date) {
      return (
        /** @type {Snapshot<T>} */
        structuredClone(value)
      );
    }
    if (typeof /** @type {T & { toJSON?: any } } */
    value.toJSON === "function") {
      return clone(
        /** @type {T & { toJSON(): any } } */
        value.toJSON(),
        cloned,
        path2,
        paths,
        // Associate the instance with the toJSON clone
        value
      );
    }
  }
  if (value instanceof EventTarget) {
    return (
      /** @type {Snapshot<T>} */
      value
    );
  }
  try {
    return (
      /** @type {Snapshot<T>} */
      structuredClone(value)
    );
  } catch (e) {
    return (
      /** @type {Snapshot<T>} */
      value
    );
  }
}
const now = () => Date.now();
const raf = {
  // don't access requestAnimationFrame eagerly outside method
  // this allows basic testing of user code without JSDOM
  // bunder will eval and remove ternary when the user's app is built
  tick: (
    /** @param {any} _ */
    (_2) => noop()
  ),
  now: () => now(),
  tasks: /* @__PURE__ */ new Set()
};
function loop(callback) {
  let task;
  if (raf.tasks.size === 0) ;
  return {
    promise: new Promise((fulfill) => {
      raf.tasks.add(task = { c: callback, f: fulfill });
    }),
    abort() {
      raf.tasks.delete(task);
    }
  };
}
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function onDestroy(fn) {
  var context2 = (
    /** @type {Component} */
    current_component
  );
  (context2.d ??= []).push(fn);
}
const waitForResolve = (callback) => new Promise((resolve) => callback(resolve));
const waitForTimeout = (time) => new Promise((resolve) => {
  const timeout = setTimeout(() => {
    clearTimeout(timeout);
    resolve();
  }, time);
});
function createEventEmitter() {
  const subscriptions = /* @__PURE__ */ new Set();
  const subscribeOnMount = (emitterEventHandlerMap) => {
  };
  const broadcast = (emitterEvent) => {
    subscriptions.forEach((emitterEventHandler) => {
      emitterEventHandler(emitterEvent);
    });
  };
  const broadcastAsync = (emitterEvent) => {
    const getPromises = () => Array.from(subscriptions).map((emitterEventHandler) => emitterEventHandler(emitterEvent));
    return Promise.all(getPromises());
  };
  const eventEmitter2 = {
    subscribeOnMount,
    broadcast,
    broadcastAsync
  };
  return { eventEmitter: eventEmitter2 };
}
const EVENT_EMITTER_NS = "@@eventEmitter";
function setContextEventEmitter(value) {
  setContext$1(EVENT_EMITTER_NS, value);
}
function getContextEventEmitter() {
  return getContext$1(EVENT_EMITTER_NS);
}
const createInterruptible = () => {
  let resolveList = [];
  const add = (targetToWait) => new Promise(async (resolve) => {
    resolveList.push(resolve);
    await targetToWait();
    resolve({ interrupted: false });
  });
  const clear = () => resolveList = [];
  const getLength = () => resolveList.length;
  const interrupt = () => resolveList.forEach((resolve) => resolve({ interrupted: true }));
  return {
    add,
    clear,
    getLength,
    interrupt
  };
};
function OnHotkey($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const context2 = getContextEventEmitter();
  const interruptible = createInterruptible();
  const WAIT_TO_HOLD_TIMEOUT = 400;
  let isHolding = false;
  let isWaitingToHold = false;
  const holdTimeoutStart = async () => {
    isWaitingToHold = true;
    const { interrupted } = await interruptible.add(() => waitForTimeout(WAIT_TO_HOLD_TIMEOUT));
    if (!interrupted) {
      isHolding = true;
      props.onhold?.();
    }
  };
  const holdTimeoutStop = () => {
    isWaitingToHold = false;
    interruptible.interrupt();
    interruptible.clear();
  };
  const keyDown = () => {
    if (!isWaitingToHold) holdTimeoutStart();
    if (!isHolding) props.onpress?.();
  };
  const keyUp = () => {
    if (isWaitingToHold) holdTimeoutStop();
    if (isHolding) {
      props.onholdend?.();
    } else {
      props.onpressend?.();
    }
    isHolding = false;
  };
  context2.eventEmitter.subscribeOnMount({
    hotKey: (emitterEvent) => {
      if (props.disabled) return;
      if (emitterEvent.key !== props.hotkey) return;
      if (emitterEvent.action === "keyUp") return keyUp();
      if (emitterEvent.action === "keyDown") return keyDown();
    }
  });
  onDestroy(() => keyUp());
  pop();
}
function EnableHotkey($$payload, $$props) {
  push();
  const context2 = getContextEventEmitter();
  const PREVENT_DEFAULT_KEYS = ["Space", "ArrowUp", "ArrowDown"];
  const EXCLUDED_TAGS = ["input", "textarea", "select"];
  const getValidElement = (e) => !EXCLUDED_TAGS.includes(e?.target?.tagName?.toLowerCase());
  function handleKeydown(e) {
    if (getValidElement(e)) {
      const isSpace = e.key === " ";
      const key = isSpace ? "Space" : e.key;
      if (PREVENT_DEFAULT_KEYS.includes(key)) e.preventDefault();
      if (key) context2.eventEmitter.broadcast({ type: "hotKey", key, action: "keyDown" });
    }
  }
  function handleKeyup(e) {
    if (getValidElement(e)) {
      const isSpace = e.key === " ";
      const key = isSpace ? "Space" : e.key;
      if (PREVENT_DEFAULT_KEYS.includes(key)) e.preventDefault();
      if (key) context2.eventEmitter.broadcast({ type: "hotKey", key, action: "keyUp" });
    }
  }
  onDestroy(() => {
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("keyup", handleKeyup);
  });
  pop();
}
const getUrlSearchParam = (key) => page.url.searchParams.get(key);
const lang = () => getUrlSearchParam("lang") === "br" ? "pt" : getUrlSearchParam("lang") || "en";
const sessionID = () => getUrlSearchParam("sessionID") || "";
const rgsUrl = () => getUrlSearchParam("rgs_url") || "";
const social = () => getUrlSearchParam("social") === "true";
const replay = () => getUrlSearchParam("replay") === "true";
const amount = () => Number(getUrlSearchParam("amount")) || 0;
const game = () => getUrlSearchParam("game") || "";
const version = () => getUrlSearchParam("version") || "";
const mode$1 = () => getUrlSearchParam("mode") || "";
const event = () => getUrlSearchParam("event") || "";
const stateUrlDerived = {
  // states for play
  lang,
  sessionID,
  rgsUrl,
  social,
  // states for replay
  replay,
  amount,
  game,
  mode: mode$1,
  version,
  event
};
const DEFAULT_BET_MODE_META = {
  BASE: {
    mode: "BASE",
    costMultiplier: 1,
    type: "default",
    parent: "",
    children: "",
    assets: {
      icon: "",
      dialogImage: "",
      dialogVolatility: "",
      volatility: "",
      button: ""
    },
    text: {
      title: "",
      dialog: "",
      button: "",
      betAmountLabel: "",
      tickerIdle: "",
      tickerSpin: "",
      bannerText: ""
    },
    maxWin: 8888
  },
  ANTE: {
    mode: "ANTE",
    costMultiplier: 1.2,
    type: "activate",
    parent: "",
    children: "",
    assets: {
      icon: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/icon_doubleboost.webp",
      dialogImage: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/doubleboost_image.webp",
      dialogVolatility: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/volatility/volatility_01.webp",
      volatility: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/volatility/volatility_white_01.webp",
      button: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/button_activate.webp",
      bannerText: "example banner text"
    },
    text: {
      title: "DOUBLE BOOST",
      dialog: "Double the chance to trigger the FREE SPINS round when activated for 1.2x the player bet amount. DOUBLE BOOST remains active until disabled by the player.",
      description: "Greatly increase your chance of landing a bonus symbol each spin.",
      button: "ACTIVATE",
      betAmountLabel: "DOUBLE BOOST",
      tickerIdle: "DOUBLE BOOST IS ACTIVE",
      tickerSpin: "GOOD LUCK",
      bannerText: "example banner text"
    }
  },
  SUPERANTE: {
    mode: "SUPERANTE",
    costMultiplier: 5,
    type: "activate",
    parent: "",
    children: "",
    assets: {
      icon: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/icon_superboost.webp",
      dialogImage: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/superboost_image.webp",
      dialogVolatility: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/volatility/volatility_02.webp",
      volatility: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/volatility/volatility_white_02.webp",
      button: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/button_activate.webp"
    },
    text: {
      title: "SUPER BOOST",
      dialog: "1 in 20 chance to trigger the FREE SPINS round when activated for 5x the player bet amount. Guarantees 1 or more Scatter symbols every spin. SUPER BOOST remains active until disabled by the player.",
      description: "Guaranteed to land at least 1+ bonus symbol each spin.",
      button: "ACTIVATE",
      betAmountLabel: "SUPER BOOST",
      tickerIdle: "SUPER BOOST IS ACTIVE",
      tickerSpin: "GOOD LUCK",
      bannerText: "example banner text"
    }
  },
  SUPERSPIN: {
    mode: "SUPERSPIN",
    costMultiplier: 25,
    type: "activate",
    parent: "",
    children: "",
    assets: {
      icon: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/icon_superspin.webp",
      dialogImage: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/superspin_image.webp",
      dialogVolatility: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/volatility/volatility_03.webp",
      volatility: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/volatility/volatility_white_03.webp",
      button: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/button_activate.webp"
    },
    text: {
      title: "SAMURAI SPIN",
      dialog: "All game features are boosted when activated for 25x the player bet amount. SAMURAI SPIN remains active until disabled by the player.",
      description: "SAMURAI SPIN is AWESOME! ",
      button: "ACTIVATE",
      betAmountLabel: "SAMURAI SPIN",
      tickerIdle: "SAMURAI SPIN IS ACTIVE",
      tickerSpin: "GOOD LUCK",
      bannerText: "example banner text"
    }
  },
  BONUS: {
    mode: "BONUS",
    costMultiplier: 100,
    type: "buy",
    parent: "",
    children: "",
    assets: {
      icon: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/icon_bonusbuy.webp",
      dialogImage: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/bonus_image.webp",
      dialogVolatility: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/volatility/volatility_04.webp",
      volatility: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/volatility/volatility_white_04.webp",
      button: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_8_97/betModes/button_buy.webp"
    },
    text: {
      title: "BONUS",
      dialog: "Triggers FREE SPINS feature when activated for 100x the player bet amount. The Global Multiplier can reach up to 64x and remains active for the duration of FREE SPINS.",
      description: "Each spin may have a random multiplier applied to winning lines.",
      button: "BUY",
      tickerIdle: "PLACE YOUR BET",
      tickerSpin: "BONUS BUY ACTIVATED",
      bannerText: "example banner text"
    }
  },
  SUPER: {
    mode: "SUPER",
    costMultiplier: 200,
    type: "buy",
    parent: "",
    children: "",
    assets: {
      icon: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/icon_superbonusbuy.webp",
      dialogImage: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/superbonus_image.webp",
      dialogVolatility: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/volatility/volatility_05.webp",
      volatility: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_9_97/betModes/volatility/volatility_white_05.webp",
      button: "https://test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com/1_8_97/betModes/button_buy.webp"
    },
    text: {
      title: "SUPER BONUS",
      dialog: "Triggers FREE SPINS feature when activated for 200x the player bet amount. The Global Multiplier can reach up to 256x and remains active for the duration of FREE SPINS.",
      description: "Enter the mothership! Land values and multiply them with action symbols.",
      button: "BUY",
      tickerIdle: "PLACE YOUR BET",
      tickerSpin: "SUPER BONUS BUY ACTIVATED",
      bannerText: "example banner text"
    }
  }
};
const stateMeta = {
  betModeMeta: DEFAULT_BET_MODE_META
};
const stateMetaDerived = {
  betModeMetaList: () => Object.values(stateMeta.betModeMeta)
};
const stateConfig = {
  betAmountOptions: [
    1,
    5,
    25,
    50,
    75,
    100,
    200,
    500,
    800,
    1e3
  ],
  betMenuOptions: [
    1,
    5,
    25,
    50,
    75,
    100,
    200,
    500,
    800,
    1e3
  ]
};
const stateBet$1 = {
  currency: "USD",
  balanceAmount: 0,
  betAmount: 1,
  wageredBetAmount: 1,
  betToResume: null,
  activeBetModeKey: "BASE",
  winBookEventAmount: 0,
  autoSpinsLoss: 0,
  autoSpinsCounter: 0,
  autoSpinsLossLimitAmount: Infinity,
  autoSpinsSingleWinLimitAmount: Infinity,
  isSpaceHold: false,
  isTurbo: false
};
const correctBetAmount = (value) => {
  if (value <= 0) return 0;
  const costMultiplier = betCostMultiplier();
  if (costMultiplier === 0) return 0;
  const max = stateBet$1.balanceAmount / costMultiplier;
  const options = [...stateConfig.betAmountOptions].sort((a, b) => a - b);
  if (options.length === 0) {
    return value >= max ? max : value;
  }
  const affordable = options.filter((option) => option <= max + 1e-9);
  if (affordable.length === 0) return 0;
  return [...affordable].reverse().find((option) => option <= value + 1e-9) ?? affordable[0];
};
const setBetAmount = (value) => {
  stateBet$1.betAmount = correctBetAmount(value);
};
const updateBetAmount = (update) => {
  stateBet$1.betAmount = correctBetAmount(update(stateBet$1.betAmount));
};
let isTurboLocked = false;
const updateIsTurbo = (value, options) => {
  const { persistent } = options;
  if (!persistent && isTurboLocked) return;
  if (persistent) isTurboLocked = value;
  stateBet$1.isTurbo = value;
};
const activeBetMode = () => stateMeta.betModeMeta?.[stateBet$1.activeBetModeKey.toUpperCase()] ?? stateMeta.betModeMeta?.[stateBet$1.activeBetModeKey.toLowerCase()] ?? null;
const isContinuousBet = () => stateBet$1.autoSpinsCounter > 1 || stateBet$1.isSpaceHold;
const timeScale = () => stateBet$1.isTurbo ? 2 : 1;
const betCostMultiplier = () => {
  const activeMode = stateBetDerived.activeBetMode();
  if (activeMode?.type === "activate" || activeMode?.type === "buy") return activeMode.costMultiplier;
  return 1;
};
const betCost = () => stateBet$1.betAmount * betCostMultiplier();
const isBetCostAvailable = () => betCost() > 0 && betCost() <= stateBet$1.balanceAmount;
const hasAutoBetCounter = () => stateBet$1.autoSpinsCounter !== 0;
const stateBetDerived = {
  setBetAmount,
  updateBetAmount,
  updateIsTurbo,
  activeBetMode,
  isContinuousBet,
  timeScale,
  betCost,
  isBetCostAvailable,
  hasAutoBetCounter
};
const stateModal = { modal: null };
const DEFAULT_VOLUME_VALUE = 75;
const stateSound = {
  volumeValueMusic: DEFAULT_VOLUME_VALUE,
  volumeValueSoundEffect: DEFAULT_VOLUME_VALUE
};
const INFINITY_MARK = "∞";
const AUTO_SPINS_TEXT_OPTIONS = [
  "10",
  "25",
  "50",
  "75",
  "100",
  "250",
  "500",
  "1000",
  INFINITY_MARK
];
const AUTO_SPINS_TEXT_OPTION_MAP = {
  "10": 10,
  "25": 25,
  "50": 50,
  "75": 75,
  "100": 100,
  "250": 250,
  "500": 500,
  "1000": 1e3,
  [INFINITY_MARK]: Infinity
};
const AUTO_SPINS_LOSS_LIMIT_MULTIPLIER_MAP = {
  "5×": 5,
  "10×": 10,
  "25×": 25,
  "50×": 50,
  "100×": 100,
  [INFINITY_MARK]: Infinity
};
const AUTO_SPINS_SINGLE_WIN_LIMIT_MULTIPLIER_MAP = {
  "5×": 5,
  "10×": 10,
  "25×": 25,
  "50×": 50,
  "100×": 100,
  [INFINITY_MARK]: Infinity
};
const stateUi = {
  autoSpinsText: "10",
  autoSpinsLossLimitText: INFINITY_MARK,
  autoSpinsSingleWinLimitText: INFINITY_MARK,
  menuOpen: false
};
const stateI18n = { i18n };
const stateI18nDerived = {
  init: (lang2, messages) => {
    stateI18n.i18n.load(lang2, messages);
    stateI18n.i18n.activate(lang2);
  },
  translate: (value) => stateI18n.i18n._(stateI18n.i18n.t(value))
};
function OnMount($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  pop();
}
const API_AMOUNT_MULTIPLIER = 1e6;
const BOOK_AMOUNT_MULTIPLIER = 100;
const fetcher = (options) => {
  const { method, endpoint, variables } = options;
  return (options.fetch ?? fetch)(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    ...method === "GET" ? {} : { body: JSON.stringify(variables) }
  });
};
const rgsFetcher = {
  post: async function post(options) {
    const response = await fetcher({
      method: "POST",
      variables: options.variables,
      endpoint: `https://${options.rgsUrl}${options.url}`
    });
    if (response.status !== 200) console.error("error", response);
    const data = await response.json();
    return data;
  },
  get: async function get2(options) {
    const response = await fetcher({
      method: "GET",
      endpoint: `https://${options.rgsUrl}${options.url}`
    });
    if (response.status !== 200) console.error("error", response);
    const data = await response.json();
    return data;
  }
};
const requestEndRound = async (options) => {
  const data = await rgsFetcher.post({
    rgsUrl: options.rgsUrl,
    url: "/wallet/end-round",
    variables: {
      sessionID: options.sessionID
    }
  });
  return data;
};
const requestEndEvent = async (options) => {
  const data = await rgsFetcher.post({
    rgsUrl: options.rgsUrl,
    url: "/bet/event",
    variables: {
      sessionID: options.sessionID,
      event: `${options.eventIndex}`
    }
  });
  return data;
};
const requestBet = async (options) => {
  const data = await rgsFetcher.post({
    rgsUrl: options.rgsUrl,
    url: "/wallet/play",
    variables: {
      mode: options.mode,
      currency: options.currency,
      sessionID: options.sessionID,
      amount: options.amount * API_AMOUNT_MULTIPLIER
    }
  });
  return data;
};
function Authenticate($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
const BOARD_CONTEXT_NS = "@@board";
const setContextBoard = (value) => {
  setContext$1(BOARD_CONTEXT_NS, value);
};
const getContextBoard = () => getContext$1(BOARD_CONTEXT_NS);
function BoardContext($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  setContextBoard({ animate: props.animate });
  props.children($$payload);
  $$payload.out += `<!---->`;
  pop();
}
function LoadI18n($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function Popup($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const zIndexInternal = {
    topLayer: 2,
    clickToCloseLayer: 2,
    closeButton: 101
  };
  const closeModal = () => props.persistent ? void 0 : props.onclose();
  let disabled = true;
  $$payload.out += `<div>`;
  props.children($$payload);
  $$payload.out += `<!----></div> `;
  OnHotkey($$payload, { hotkey: "Escape", onpress: closeModal });
  $$payload.out += `<!----> <div${attr("class", to_class("pop-up-wrap", "svelte-zvizg7", { "disabled": disabled }))}${attr("style", `z-index: ${props.zIndex};`)}><div class="blur-layer svelte-zvizg7"></div> <div class="top-layer svelte-zvizg7"${attr("style", `--zIndex: ${stringify(zIndexInternal.topLayer)}`)}><div${attr("tabindex", 0)} class="click-to-close-layer svelte-zvizg7" role="button"${attr("style", `--zIndex: ${stringify(zIndexInternal.clickToCloseLayer)}`)}></div> `;
  if (!props.persistent) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="close-button-wrap svelte-zvizg7"${attr("style", `--zIndex: ${stringify(zIndexInternal.closeButton)}`)}><button class="close-button svelte-zvizg7" data-test="close-button">×</button></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  props.children($$payload);
  $$payload.out += `<!----></div></div>`;
  pop();
}
function Button$1($$payload, $$props) {
  const {
    debug,
    disabled = false,
    onclick,
    children,
    $$slots,
    $$events,
    ...rest
  } = $$props;
  $$payload.out += `<button${spread_attributes({ class: "button", disabled, ...rest }, "svelte-vbgtis", { debug, disabled })}>`;
  children($$payload);
  $$payload.out += `<!----></button>`;
}
function OptionsGrid($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const each_array = ensure_array_like(props.options);
  $$payload.out += `<div class="wrap svelte-15ij6hr"><div class="content-wrap svelte-15ij6hr"><div${attr("class", to_class("grid", "svelte-15ij6hr", { "miniSize": props.miniSize }))}><!--[-->`;
  for (let index = 0, $$length = each_array.length; index < $$length; index++) {
    let option = each_array[index];
    Button$1($$payload, {
      onclick: () => {
        props.onchange(option);
      },
      children: ($$payload2) => {
        props.option($$payload2, { option, index });
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    });
  }
  $$payload.out += `<!--]--></div></div></div>`;
  pop();
}
function OptionsToggle($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const valueIndex = props.options.findIndex((option) => option === props.value);
  const disabledDown = valueIndex === 0;
  const disabledUp = valueIndex === props.options.length - 1;
  const toggleDown = () => props.onchange(props.options[valueIndex - 1]);
  const toggleUp = () => props.onchange(props.options[valueIndex + 1]);
  props.children($$payload, {
    disabledDown,
    disabledUp,
    toggleDown,
    toggleUp
  });
  $$payload.out += `<!---->`;
  pop();
}
function is_date(obj) {
  return Object.prototype.toString.call(obj) === "[object Date]";
}
function linear(t) {
  return t;
}
function backOut(t) {
  const s = 1.70158;
  return --t * t * ((s + 1) * t + s) + 1;
}
function cubicOut(t) {
  const f = t - 1;
  return f * f * f + 1;
}
function get_interpolator(a, b) {
  if (a === b || a !== a) return () => a;
  const type = typeof a;
  if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
    throw new Error("Cannot interpolate values of different type");
  }
  if (Array.isArray(a)) {
    const arr = (
      /** @type {Array<any>} */
      b.map((bi, i) => {
        return get_interpolator(
          /** @type {Array<any>} */
          a[i],
          bi
        );
      })
    );
    return (t) => arr.map((fn) => fn(t));
  }
  if (type === "object") {
    if (!a || !b) {
      throw new Error("Object cannot be null");
    }
    if (is_date(a) && is_date(b)) {
      const an = a.getTime();
      const bn = b.getTime();
      const delta = bn - an;
      return (t) => new Date(an + t * delta);
    }
    const keys = Object.keys(b);
    const interpolators = {};
    keys.forEach((key) => {
      interpolators[key] = get_interpolator(a[key], b[key]);
    });
    return (t) => {
      const result = {};
      keys.forEach((key) => {
        result[key] = interpolators[key](t);
      });
      return result;
    };
  }
  if (type === "number") {
    const delta = (
      /** @type {number} */
      b - /** @type {number} */
      a
    );
    return (t) => a + t * delta;
  }
  return () => b;
}
class Tween {
  #current = source(
    /** @type {T} */
    void 0
  );
  #target = source(
    /** @type {T} */
    void 0
  );
  /** @type {TweenedOptions<T>} */
  #defaults;
  /** @type {import('../internal/client/types').Task | null} */
  #task = null;
  /**
   * @param {T} value
   * @param {TweenedOptions<T>} options
   */
  constructor(value, options = {}) {
    this.#current.v = this.#target.v = value;
    this.#defaults = options;
  }
  /**
   * Create a tween whose value is bound to the return value of `fn`. This must be called
   * inside an effect root (for example, during component initialisation).
   *
   * ```svelte
   * <script>
   * 	import { Tween } from 'svelte/motion';
   *
   * 	let { number } = $props();
   *
   * 	const tween = Tween.of(() => number);
   * <\/script>
   * ```
   * @template U
   * @param {() => U} fn
   * @param {TweenedOptions<U>} [options]
   */
  static of(fn, options) {
    const tween = new Tween(fn(), options);
    render_effect(() => {
      tween.set(fn());
    });
    return tween;
  }
  /**
   * Sets `tween.target` to `value` and returns a `Promise` that resolves if and when `tween.current` catches up to it.
   *
   * If `options` are provided, they will override the tween's defaults.
   * @param {T} value
   * @param {TweenedOptions<T>} [options]
   * @returns
   */
  set(value, options) {
    set(this.#target, value);
    let {
      delay = 0,
      duration = 400,
      easing = linear,
      interpolate = get_interpolator
    } = { ...this.#defaults, ...options };
    if (duration === 0) {
      this.#task?.abort();
      set(this.#current, value);
      return Promise.resolve();
    }
    const start = raf.now() + delay;
    let fn;
    let started = false;
    let previous_task = this.#task;
    this.#task = loop((now2) => {
      if (now2 < start) {
        return true;
      }
      if (!started) {
        started = true;
        const prev = this.#current.v;
        fn = interpolate(prev, value);
        if (typeof duration === "function") {
          duration = duration(prev, value);
        }
        previous_task?.abort();
      }
      const elapsed = now2 - start;
      if (elapsed > /** @type {number} */
      duration) {
        set(this.#current, value);
        return false;
      }
      set(this.#current, fn(easing(elapsed / /** @type {number} */
      duration)));
      return true;
    });
    return this.#task.promise;
  }
  get current() {
    return get(this.#current);
  }
  get target() {
    return get(this.#target);
  }
  set target(v) {
    this.set(v);
  }
}
const SECOND = 1e3;
const zIndex = {
  modal: 50,
  dialog: 100
};
function BaseContent($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  $$payload.out += `<div class="ui-popup-standard-content-wrap svelte-1byxkez"${attr("style", `--maxWidth: ${stringify(props.maxWidth)}; --zIndex: ${stringify(100)}`)}>`;
  props.children($$payload);
  $$payload.out += `<!----></div>`;
  pop();
}
function ModalError($$payload, $$props) {
  push();
  if (stateModal.modal?.name === "error") {
    $$payload.out += "<!--[-->";
    Popup($$payload, {
      zIndex: zIndex.modal,
      persistent: true,
      onclose: () => stateModal.modal = null,
      children: ($$payload2) => {
        BaseContent($$payload2, {
          maxWidth: "100%",
          children: ($$payload3) => {
            const error = stateModal.modal?.error;
            $$payload3.out += `<span>Sorry, something went wrong.</span> <div class="scrollY error-text svelte-fzvoja">`;
            if (error) {
              $$payload3.out += "<!--[-->";
              if (error?.error && error?.message) {
                $$payload3.out += "<!--[-->";
                $$payload3.out += `<span>${escape_html(JSON.stringify(error.error || "unknown"))}</span> <p>${escape_html(JSON.stringify(error.message || "unknown"))}</p>`;
              } else {
                $$payload3.out += "<!--[!-->";
                $$payload3.out += `<p>${escape_html(error)}</p>`;
              }
              $$payload3.out += `<!--]-->`;
            } else {
              $$payload3.out += "<!--[!-->";
              $$payload3.out += `<span>unknown error</span>`;
            }
            $$payload3.out += `<!--]--></div>`;
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function BaseIcon($$payload, $$props) {
  const {
    width,
    height,
    background = "black",
    border = "none"
  } = $$props;
  $$payload.out += `<div class="rectangle svelte-1xcebtp"${attr("style", ` --width-value: ${stringify(width)}; --height-value: ${stringify(height)}; --background-value: ${stringify(background)}; --border-value: ${stringify(border)}; `)}></div>`;
}
function BaseTitle($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  $$payload.out += `<div class="ui-modal-title-wrap svelte-16q8wi8">`;
  props.children($$payload);
  $$payload.out += `<!----></div>`;
  pop();
}
function BaseScrollable($$payload, $$props) {
  push();
  let element = null;
  const { $$slots, $$events, ...props } = $$props;
  $$payload.out += `<div${attr("class", to_class("content " + props.type, "svelte-l3vzfy", {
    "scrollX": !props.noScroll && props.type === "row",
    "scrollY": !props.noScroll && props.type === "column"
  }))}>`;
  props.children($$payload, { element });
  $$payload.out += `<!----></div>`;
  pop();
}
function BaseButtonWrap($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  $$payload.out += `<div class="ui-modal-button-wrap svelte-5vvei4"><div${attr("class", to_class(clsx(props.type), "svelte-5vvei4"))}>`;
  props.children($$payload);
  $$payload.out += `<!----></div></div>`;
  pop();
}
function BaseButtonContent($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  $$payload.out += `<div class="base-button-content svelte-1gyd1e8">`;
  props.children($$payload);
  $$payload.out += `<!----></div>`;
  pop();
}
const NO_LOCALISATION_CURRENCY_MAP = {
  XGC: "GC",
  XSC: "SC"
};
const bookEventAmountToBetAmountMultiplier = (bookEventAmount) => bookEventAmount / BOOK_AMOUNT_MULTIPLIER;
const bookEventAmountToNormalisedAmount = (bookEventAmount) => {
  const betAmountMultiplier = bookEventAmountToBetAmountMultiplier(bookEventAmount);
  return stateBet$1.wageredBetAmount * betAmountMultiplier;
};
const numberToFloat = (value) => Number.parseFloat(`${value}`);
const numberToCurrencyString = (value) => {
  if (stateBet$1.currency in NO_LOCALISATION_CURRENCY_MAP) {
    return `${NO_LOCALISATION_CURRENCY_MAP[stateBet$1.currency]} ${numberToFloat(value).toFixed(2)}`;
  }
  return stateI18n.i18n.number(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: "currency",
    currency: stateBet$1.currency
    // numberingSystem: 'latn',
  });
};
const bookEventAmountToCurrencyString = (bookEventAmount) => {
  const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
  return numberToCurrencyString(normalisedAmount);
};
function BetMenuAmountToggle($$payload, $$props) {
  push();
  const { eventEmitter: eventEmitter2 } = getContextEventEmitter();
  const iconSize = "2.5rem";
  {
    let children = function($$payload2, {
      disabledDown,
      disabledUp,
      toggleDown,
      toggleUp
    }) {
      $$payload2.out += `<div class="toggle-wrap svelte-vim83m">`;
      Button$1($$payload2, {
        "data-test": "down-button",
        disabled: disabledDown,
        onclick: toggleDown,
        children: ($$payload3) => {
          BaseIcon($$payload3, { width: iconSize, height: iconSize });
          $$payload3.out += `<!----> `;
          BaseButtonContent($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<span style="font-size: 2rem;">-</span>`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> <span class="amount">${escape_html(numberToCurrencyString(stateBet$1.betAmount))}</span> `;
      Button$1($$payload2, {
        "data-test": "up-button",
        disabled: disabledUp,
        onclick: toggleUp,
        children: ($$payload3) => {
          BaseIcon($$payload3, { width: iconSize, height: iconSize });
          $$payload3.out += `<!----> `;
          BaseButtonContent($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<span style="font-size: 2rem;">+</span>`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div>`;
    };
    OptionsToggle($$payload, {
      value: stateBet$1.betAmount,
      options: stateConfig.betAmountOptions,
      onchange: (value) => {
        stateBet$1.betAmount = value;
        eventEmitter2.broadcast({ type: "soundPressGeneral" });
      },
      children,
      $$slots: { default: true }
    });
  }
  pop();
}
function increment(source2) {
  set(source2, source2.v + 1);
}
function createSubscriber(start) {
  let subscribers = 0;
  let version2 = source(0);
  let stop;
  return () => {
    if (effect_tracking()) {
      get(version2);
      render_effect(() => {
        if (subscribers === 0) {
          stop = untrack(() => start(() => increment(version2)));
        }
        subscribers += 1;
        return () => {
          tick().then(() => {
            subscribers -= 1;
            if (subscribers === 0) {
              stop?.();
              stop = void 0;
            }
          });
        };
      });
    }
  };
}
class ReactiveValue {
  #fn;
  #subscribe;
  /**
   *
   * @param {() => T} fn
   * @param {(update: () => void) => void} onsubscribe
   */
  constructor(fn, onsubscribe) {
    this.#fn = fn;
    this.#subscribe = createSubscriber(onsubscribe);
  }
  get current() {
    this.#subscribe();
    return this.#fn();
  }
}
const innerWidth = new ReactiveValue(
  () => void 0,
  (update) => on(window, "resize", update)
);
const innerHeight = new ReactiveValue(
  () => void 0,
  (update) => on(window, "resize", update)
);
const CANVAS_RATIO_TYPE_BREAK_POINTS = {
  wideSquare: 1.3,
  // Min ratio of long width canvas, used for position FS UI elements
  narrowSquare: 0.8
  // GALAXY FOLD EXPAND RATIO IS 1.400390625
};
const CANVAS_SIZE_TYPE_BREAK_POINTS = {
  smallMobile: 375,
  // Max size of small mobile layouts e.g. iPhone SE
  mobile: 480,
  // Max size of common mobile layouts e.g. iPhone XR
  tablet: 820,
  // Max size of tablets layouts, e.g. iPad Air
  largeTablet: 1024
  // Max size of large tablets layouts, e.g. iPad Pro
};
const getRatio = (value) => value.width / (value.height || 1);
const STANDARD_MAIN_SIZES_MAP = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 1920, height: 1920 },
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 }
};
const createLayout = (layoutOptions) => {
  const canvasSizes = () => ({
    width: innerWidth.current ?? 1,
    height: innerHeight.current ?? 1
  });
  const canvasRatio = () => getRatio(canvasSizes());
  const canvasRatioType = () => {
    if (canvasRatio() >= CANVAS_RATIO_TYPE_BREAK_POINTS.wideSquare) return "longWidth";
    if (canvasRatio() <= CANVAS_RATIO_TYPE_BREAK_POINTS.narrowSquare) return "longHeight";
    return "almostSquare";
  };
  const canvasSizeType = () => {
    const deviceWidth = Math.min(canvasSizes().width, canvasSizes().height);
    if (deviceWidth <= CANVAS_SIZE_TYPE_BREAK_POINTS.smallMobile) return "smallMobile";
    if (deviceWidth <= CANVAS_SIZE_TYPE_BREAK_POINTS.mobile) return "mobile";
    if (deviceWidth <= CANVAS_SIZE_TYPE_BREAK_POINTS.tablet) return "tablet";
    if (deviceWidth <= CANVAS_SIZE_TYPE_BREAK_POINTS.largeTablet) return "largeTablet";
    return "desktop";
  };
  const layoutType = () => {
    if (canvasRatioType() === "almostSquare") return "tablet";
    if (canvasRatioType() === "longHeight") return "portrait";
    if (canvasSizeType() === "mobile" || canvasSizeType() === "smallMobile") return "landscape";
    return "desktop";
  };
  const isStacked = () => ["portrait", "almostSquare"].includes(layoutType());
  const createMainLayout = (mainSizesMap) => () => {
    const x = canvasSizes().width * 0.5;
    const y = canvasSizes().height * 0.5;
    const mainSizes = mainSizesMap[layoutType()];
    const widthScale = canvasSizes().width / mainSizes.width;
    const heightScale = canvasSizes().height / mainSizes.height;
    const scale = Math.min(widthScale, heightScale);
    return {
      x,
      y,
      scale,
      width: mainSizes.width,
      height: mainSizes.height,
      anchor: 0.5
    };
  };
  const mainLayout = createMainLayout(layoutOptions.mainSizesMap);
  const mainLayoutStandard = createMainLayout(STANDARD_MAIN_SIZES_MAP);
  const createBackgroundLayout = ({ scale, ratio }) => {
    const canvasRatio2 = getRatio(canvasSizes());
    if (canvasRatio2 < ratio) {
      return {
        x: canvasSizes().width / 2,
        y: canvasSizes().height / 2,
        height: canvasSizes().height * scale
      };
    }
    return {
      x: canvasSizes().width / 2,
      y: canvasSizes().height / 2,
      width: canvasSizes().width * scale
    };
  };
  const normalBackgroundLayout = ({ scale }) => createBackgroundLayout({
    scale,
    ratio: layoutOptions.backgroundRatio.normal
  });
  const portraitBackgroundLayout = ({ scale }) => createBackgroundLayout({
    scale,
    ratio: layoutOptions.backgroundRatio.portrait
  });
  const stateLayout2 = { showLoadingScreen: true };
  const stateLayoutDerived2 = {
    canvasSizes,
    canvasRatio,
    canvasRatioType,
    canvasSizeType,
    layoutType,
    isStacked,
    mainLayout,
    mainLayoutStandard,
    normalBackgroundLayout,
    portraitBackgroundLayout
  };
  return { stateLayout: stateLayout2, stateLayoutDerived: stateLayoutDerived2 };
};
const LAYOUT_NS = "@@layout";
function setContextLayout(value) {
  setContext$1(LAYOUT_NS, value);
}
function getContextLayout() {
  return getContext$1(LAYOUT_NS);
}
const i18nDerived$2 = {
  bet: () => stateI18nDerived.translate("BET"),
  max: () => stateI18nDerived.translate("MAX"),
  betMenu: () => stateI18nDerived.translate("BET MENU"),
  selectYourBet: () => stateI18nDerived.translate("SELECT YOUR BET"),
  confirm: () => stateI18nDerived.translate("CONFIRM"),
  masterVolume: () => stateI18nDerived.translate("MASTER VOLUME"),
  musicVolume: () => stateI18nDerived.translate("MUSIC VOLUME"),
  soundEffectVolume: () => stateI18nDerived.translate("SOUND EFFECT VOLUME"),
  autoSpins: () => stateI18nDerived.translate("AUTO SPINS"),
  numberOfRounds: () => stateI18nDerived.translate("NUMBER OF ROUNDS"),
  advanced: () => stateI18nDerived.translate("ADVANCED"),
  singleWinLimit: () => stateI18nDerived.translate("SINGLE WIN LIMIT"),
  lossLimit: () => stateI18nDerived.translate("LOSS LIMIT"),
  startAutoplay: () => stateI18nDerived.translate("START AUTOPLAY"),
  notification: () => stateI18nDerived.translate("NOTIFICATION"),
  autoSpinsStopInfo: () => stateI18nDerived.translate("AUTO PLAY HAS STOPPED DUE TO"),
  insufficientFunds: () => stateI18nDerived.translate("INSUFFICIENT FUNDS TO PLACE THIS BET. PLEASE ADD FUNDS TO YOUR ACCOUNT OR LOWER THE BET LEVEL."),
  lossLimitReached: () => stateI18nDerived.translate("LOSS LIMIT REACHED"),
  singleWinLimitReached: () => stateI18nDerived.translate("SINGLE WIN LIMIT REACHED"),
  settings: () => stateI18nDerived.translate("SETTINGS")
};
function BetMenuAmountGrid($$payload, $$props) {
  push();
  const { stateLayoutDerived: stateLayoutDerived2 } = getContextLayout();
  const count = stateLayoutDerived2.layoutType() === "landscape" ? 15 : 18;
  const options = [
    ...stateConfig.betMenuOptions.slice(0, count - 1),
    ...stateConfig.betMenuOptions.slice(-1)
  ].filter((value, index, array) => array.indexOf(value) === index);
  const isMaxValue = (value) => value === options[options.length - 1];
  const formatValue = (value) => {
    if (Math.abs(value) > 999999) {
      return `${(Math.abs(value) / 1e6).toFixed(2)}M`;
    }
    if (Math.abs(value) > 999) {
      return `${(Math.abs(value) / 1e3).toFixed(2)}K`;
    }
    return Math.abs(value).toFixed(2);
  };
  {
    let option = function($$payload2, { option: option2 }) {
      BaseIcon($$payload2, {
        width: "100%",
        height: "2rem",
        border: option2 === stateBet$1.betAmount ? "2px white solid" : "2px black solid"
      });
      $$payload2.out += `<!----> `;
      BaseButtonContent($$payload2, {
        children: ($$payload3) => {
          $$payload3.out += `<span style="font-size: 1rem;">${escape_html(isMaxValue(option2) ? i18nDerived$2.max() : formatValue(option2))}</span>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    };
    OptionsGrid($$payload, {
      value: stateBet$1.betAmount,
      options,
      onchange: (value) => stateBet$1.betAmount = value,
      option,
      $$slots: { option: true }
    });
  }
  pop();
}
function ModalBetMenu($$payload, $$props) {
  push();
  const confirm = () => {
    stateModal.modal = null;
  };
  if (stateModal.modal?.name === "betAmountMenu") {
    $$payload.out += "<!--[-->";
    Popup($$payload, {
      zIndex: zIndex.modal,
      onclose: () => stateModal.modal = null,
      children: ($$payload2) => {
        BaseContent($$payload2, {
          maxWidth: "100%",
          children: ($$payload3) => {
            BaseTitle($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<!---->${escape_html(i18nDerived$2.betMenu())}`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            BaseScrollable($$payload3, {
              type: "column",
              children: ($$payload4) => {
                $$payload4.out += `<span>${escape_html(i18nDerived$2.selectYourBet())}</span> `;
                BetMenuAmountToggle($$payload4);
                $$payload4.out += `<!----> `;
                BetMenuAmountGrid($$payload4);
                $$payload4.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            BaseButtonWrap($$payload3, {
              type: "full-width",
              children: ($$payload4) => {
                Button$1($$payload4, {
                  "data-test": "confirm-button",
                  onclick: confirm,
                  children: ($$payload5) => {
                    BaseIcon($$payload5, { width: "100%", height: "3rem" });
                    $$payload5.out += `<!----> `;
                    BaseButtonContent($$payload5, {
                      children: ($$payload6) => {
                        $$payload6.out += `<span style="font-size: 1rem;">${escape_html(i18nDerived$2.confirm())}</span>`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload5.out += `<!---->`;
                  },
                  $$slots: { default: true }
                });
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function BonusCard($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  $$payload.out += `<div${attr("class", to_class("bonus-card-wrap", "svelte-z7mxrl", { "active": props.active }))}><div class="info svelte-z7mxrl">`;
  props.title($$payload);
  $$payload.out += `<!----> `;
  props.description($$payload);
  $$payload.out += `<!----> `;
  props.price($$payload);
  $$payload.out += `<!----></div> `;
  props.button($$payload);
  $$payload.out += `<!----></div>`;
  pop();
}
const stateBonus = { selectedBetModeKey: "BASE" };
const stateBonusDerived = {
  selectedBetModeData: () => stateMeta.betModeMeta[stateBonus.selectedBetModeKey]
};
function BonusCards($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const { eventEmitter: eventEmitter2 } = getContextEventEmitter();
  const selectableBetModeKeys = /* @__PURE__ */ new Set(["ANTE", "SUPERSPINS"]);
  const isSelectableMode = (mode2) => selectableBetModeKeys.has(mode2.toUpperCase());
  const clearSelectedMode = () => {
    stateBonus.selectedBetModeKey = "BASE";
    stateBet$1.activeBetModeKey = "BASE";
    stateModal.modal = null;
    eventEmitter2.broadcast({ type: "soundPressGeneral" });
  };
  const selectModeForPlay = (betModeData) => {
    stateBonus.selectedBetModeKey = betModeData.mode;
    stateBet$1.activeBetModeKey = betModeData.mode;
    if (betModeData.type === "activate") {
      stateUi.autoSpinsLossLimitText = INFINITY_MARK;
      stateUi.autoSpinsSingleWinLimitText = INFINITY_MARK;
    }
    stateModal.modal = null;
    eventEmitter2.broadcast({ type: "soundPressGeneral" });
  };
  const openConfirmation = (betModeData) => {
    stateBonus.selectedBetModeKey = betModeData.mode;
    eventEmitter2.broadcast({ type: "buyBonusConfirm" });
    eventEmitter2.broadcast({ type: "soundPressGeneral" });
  };
  const each_array = ensure_array_like(props.list);
  $$payload.out += `<!--[-->`;
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let betModeData = each_array[$$index];
    if (betModeData.type !== "default") {
      $$payload.out += "<!--[-->";
      const selected = stateBet$1.activeBetModeKey.toUpperCase() === betModeData.mode.toUpperCase();
      const selectable = isSelectableMode(betModeData.mode);
      {
        let title = function($$payload2) {
          if (betModeData.assets?.icon) {
            $$payload2.out += "<!--[-->";
            $$payload2.out += `<div class="bonus-icon svelte-1l7iwrp"><img${attr("src", betModeData.assets.icon)}${attr("alt", betModeData.text.title)} class="svelte-1l7iwrp"></div>`;
          } else {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]--> <div class="title svelte-1l7iwrp">${escape_html(betModeData.text.title)}</div>`;
        }, description = function($$payload2) {
          if (betModeData?.text?.description) {
            $$payload2.out += "<!--[-->";
            $$payload2.out += `<div class="description svelte-1l7iwrp">${escape_html(betModeData.text.description)}</div>`;
          } else {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]-->`;
        }, price = function($$payload2) {
          $$payload2.out += `<div class="price svelte-1l7iwrp">${escape_html(`${numberToCurrencyString(stateBet$1.betAmount * betModeData.costMultiplier)}`)}</div>`;
        }, button = function($$payload2) {
          Button$1($$payload2, {
            onclick: () => {
              if (selectable) {
                if (selected) {
                  clearSelectedMode();
                  return;
                }
                selectModeForPlay(betModeData);
                return;
              }
              openConfirmation(betModeData);
            },
            disabled: stateBet$1.betAmount <= 0 || stateBet$1.balanceAmount < stateBet$1.betAmount * betModeData.costMultiplier,
            children: ($$payload3) => {
              if (!betModeData.assets?.icon) {
                $$payload3.out += "<!--[-->";
                BaseIcon($$payload3, {
                  width: "100%",
                  height: "2rem",
                  border: "2px solid white;"
                });
              } else {
                $$payload3.out += "<!--[!-->";
              }
              $$payload3.out += `<!--]--> `;
              BaseButtonContent($$payload3, {
                children: ($$payload4) => {
                  $$payload4.out += `<span style="font-size: 1rem;">${escape_html(selectable && selected ? "SELECTED" : betModeData.text.button)}</span>`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!---->`;
            },
            $$slots: { default: true }
          });
        };
        BonusCard($$payload, {
          active: selectable && selected,
          title,
          description,
          price,
          button,
          $$slots: {
            title: true,
            description: true,
            price: true,
            button: true
          }
        });
      }
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]-->`;
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function BonusContentWrapLarge($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  BaseContent($$payload, {
    maxWidth: "100%",
    children: ($$payload2) => {
      props.betAmount($$payload2);
      $$payload2.out += `<!----> `;
      BaseScrollable($$payload2, {
        type: "column",
        children: ($$payload3) => {
          $$payload3.out += `<div class="bonuses-wrap svelte-8r195e">`;
          props.bonusCardsActivate($$payload3);
          $$payload3.out += `<!----> `;
          props.bonusCardsBuy($$payload3);
          $$payload3.out += `<!----></div>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  pop();
}
var ResizeObserver = {};
var ResizeObservation = {};
var ContentRect = {};
var hasRequiredContentRect;
function requireContentRect() {
  if (hasRequiredContentRect) return ContentRect;
  hasRequiredContentRect = 1;
  Object.defineProperty(ContentRect, "__esModule", { value: true });
  var ContentRect$1 = function(target) {
    if ("getBBox" in target) {
      var box = target.getBBox();
      return Object.freeze({
        height: box.height,
        left: 0,
        top: 0,
        width: box.width
      });
    } else {
      var styles = window.getComputedStyle(target);
      return Object.freeze({
        height: parseFloat(styles.height || "0"),
        left: parseFloat(styles.paddingLeft || "0"),
        top: parseFloat(styles.paddingTop || "0"),
        width: parseFloat(styles.width || "0")
      });
    }
  };
  ContentRect.ContentRect = ContentRect$1;
  return ContentRect;
}
var hasRequiredResizeObservation;
function requireResizeObservation() {
  if (hasRequiredResizeObservation) return ResizeObservation;
  hasRequiredResizeObservation = 1;
  Object.defineProperty(ResizeObservation, "__esModule", { value: true });
  var ContentRect_1 = requireContentRect();
  var ResizeObservation$1 = (
    /** @class */
    function() {
      function ResizeObservation2(target) {
        this.target = target;
        this.$$broadcastWidth = this.$$broadcastHeight = 0;
      }
      Object.defineProperty(ResizeObservation2.prototype, "broadcastWidth", {
        get: function() {
          return this.$$broadcastWidth;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(ResizeObservation2.prototype, "broadcastHeight", {
        get: function() {
          return this.$$broadcastHeight;
        },
        enumerable: true,
        configurable: true
      });
      ResizeObservation2.prototype.isActive = function() {
        var cr = ContentRect_1.ContentRect(this.target);
        return !!cr && (cr.width !== this.broadcastWidth || cr.height !== this.broadcastHeight);
      };
      return ResizeObservation2;
    }()
  );
  ResizeObservation.ResizeObservation = ResizeObservation$1;
  return ResizeObservation;
}
var ResizeObserverEntry = {};
var hasRequiredResizeObserverEntry;
function requireResizeObserverEntry() {
  if (hasRequiredResizeObserverEntry) return ResizeObserverEntry;
  hasRequiredResizeObserverEntry = 1;
  Object.defineProperty(ResizeObserverEntry, "__esModule", { value: true });
  var ContentRect_1 = requireContentRect();
  var ResizeObserverEntry$1 = (
    /** @class */
    /* @__PURE__ */ function() {
      function ResizeObserverEntry2(target) {
        this.target = target;
        this.contentRect = ContentRect_1.ContentRect(target);
      }
      return ResizeObserverEntry2;
    }()
  );
  ResizeObserverEntry.ResizeObserverEntry = ResizeObserverEntry$1;
  return ResizeObserverEntry;
}
var hasRequiredResizeObserver;
function requireResizeObserver() {
  if (hasRequiredResizeObserver) return ResizeObserver;
  hasRequiredResizeObserver = 1;
  Object.defineProperty(ResizeObserver, "__esModule", { value: true });
  var ResizeObservation_1 = requireResizeObservation();
  var ResizeObserverEntry_1 = requireResizeObserverEntry();
  var resizeObservers = [];
  var ResizeObserver$1 = (
    /** @class */
    function() {
      function ResizeObserver2(callback) {
        this.$$observationTargets = [];
        this.$$activeTargets = [];
        this.$$skippedTargets = [];
        var message = callbackGuard(callback);
        if (message) {
          throw TypeError(message);
        }
        this.$$callback = callback;
      }
      ResizeObserver2.prototype.observe = function(target) {
        var message = targetGuard("observe", target);
        if (message) {
          throw TypeError(message);
        }
        var index = findTargetIndex(this.$$observationTargets, target);
        if (index >= 0) {
          return;
        }
        this.$$observationTargets.push(new ResizeObservation_1.ResizeObservation(target));
        registerResizeObserver(this);
      };
      ResizeObserver2.prototype.unobserve = function(target) {
        var message = targetGuard("unobserve", target);
        if (message) {
          throw TypeError(message);
        }
        var index = findTargetIndex(this.$$observationTargets, target);
        if (index < 0) {
          return;
        }
        this.$$observationTargets.splice(index, 1);
        if (this.$$observationTargets.length === 0) {
          deregisterResizeObserver(this);
        }
      };
      ResizeObserver2.prototype.disconnect = function() {
        this.$$observationTargets = [];
        this.$$activeTargets = [];
        deregisterResizeObserver(this);
      };
      return ResizeObserver2;
    }()
  );
  ResizeObserver.ResizeObserver = ResizeObserver$1;
  function registerResizeObserver(resizeObserver) {
    var index = resizeObservers.indexOf(resizeObserver);
    if (index < 0) {
      resizeObservers.push(resizeObserver);
      startLoop();
    }
  }
  function deregisterResizeObserver(resizeObserver) {
    var index = resizeObservers.indexOf(resizeObserver);
    if (index >= 0) {
      resizeObservers.splice(index, 1);
      checkStopLoop();
    }
  }
  function callbackGuard(callback) {
    if (typeof callback === "undefined") {
      return "Failed to construct 'ResizeObserver': 1 argument required, but only 0 present.";
    }
    if (typeof callback !== "function") {
      return "Failed to construct 'ResizeObserver': The callback provided as parameter 1 is not a function.";
    }
  }
  function targetGuard(functionName, target) {
    if (typeof target === "undefined") {
      return "Failed to execute '" + functionName + "' on 'ResizeObserver': 1 argument required, but only 0 present.";
    }
    if (!(target && target.nodeType === window.Node.ELEMENT_NODE)) {
      return "Failed to execute '" + functionName + "' on 'ResizeObserver': parameter 1 is not of type 'Element'.";
    }
  }
  function findTargetIndex(collection, target) {
    for (var index = 0; index < collection.length; index += 1) {
      if (collection[index].target === target) {
        return index;
      }
    }
    return -1;
  }
  var gatherActiveObservationsAtDepth = function(depth) {
    resizeObservers.forEach(function(ro) {
      ro.$$activeTargets = [];
      ro.$$skippedTargets = [];
      ro.$$observationTargets.forEach(function(ot) {
        if (ot.isActive()) {
          var targetDepth = calculateDepthForNode(ot.target);
          if (targetDepth > depth) {
            ro.$$activeTargets.push(ot);
          } else {
            ro.$$skippedTargets.push(ot);
          }
        }
      });
    });
  };
  var hasActiveObservations = function() {
    return resizeObservers.some(function(ro) {
      return !!ro.$$activeTargets.length;
    });
  };
  var hasSkippedObservations = function() {
    return resizeObservers.some(function(ro) {
      return !!ro.$$skippedTargets.length;
    });
  };
  var broadcastActiveObservations = function() {
    var shallowestTargetDepth = Infinity;
    resizeObservers.forEach(function(ro) {
      if (!ro.$$activeTargets.length) {
        return;
      }
      var entries = [];
      ro.$$activeTargets.forEach(function(obs) {
        var entry = new ResizeObserverEntry_1.ResizeObserverEntry(obs.target);
        entries.push(entry);
        obs.$$broadcastWidth = entry.contentRect.width;
        obs.$$broadcastHeight = entry.contentRect.height;
        var targetDepth = calculateDepthForNode(obs.target);
        if (targetDepth < shallowestTargetDepth) {
          shallowestTargetDepth = targetDepth;
        }
      });
      ro.$$callback(entries, ro);
      ro.$$activeTargets = [];
    });
    return shallowestTargetDepth;
  };
  var deliverResizeLoopErrorNotification = function() {
    var errorEvent = new window.ErrorEvent("ResizeLoopError", {
      message: "ResizeObserver loop completed with undelivered notifications."
    });
    window.dispatchEvent(errorEvent);
  };
  var calculateDepthForNode = function(target) {
    var depth = 0;
    while (target.parentNode) {
      target = target.parentNode;
      depth += 1;
    }
    return depth;
  };
  var notificationIteration = function() {
    var depth = 0;
    gatherActiveObservationsAtDepth(depth);
    while (hasActiveObservations()) {
      depth = broadcastActiveObservations();
      gatherActiveObservationsAtDepth(depth);
    }
    if (hasSkippedObservations()) {
      deliverResizeLoopErrorNotification();
    }
  };
  var animationFrameCancelToken;
  var startLoop = function() {
    if (animationFrameCancelToken)
      return;
    runLoop();
  };
  var runLoop = function() {
    animationFrameCancelToken = window.requestAnimationFrame(function() {
      notificationIteration();
      runLoop();
    });
  };
  var checkStopLoop = function() {
    if (animationFrameCancelToken && !resizeObservers.some(function(ro) {
      return !!ro.$$observationTargets.length;
    })) {
      window.cancelAnimationFrame(animationFrameCancelToken);
      animationFrameCancelToken = void 0;
    }
  };
  var install = function() {
    return window.ResizeObserver = ResizeObserver$1;
  };
  ResizeObserver.install = install;
  return ResizeObserver;
}
requireResizeObserver();
function BonusContentWrapPortrait($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const { stateLayoutDerived: stateLayoutDerived2 } = getContextLayout();
  const horizontalScale = stateLayoutDerived2.canvasSizes().width / (240 * (props.maxListLength || 1));
  const verticalScale = (stateLayoutDerived2.canvasSizes().height - 250) / 0;
  const scale = Math.min(verticalScale, horizontalScale);
  const scaled = scale < 1;
  BaseContent($$payload, {
    maxWidth: "100%",
    children: ($$payload2) => {
      $$payload2.out += `<div${attr("class", to_class("wrap", "svelte-rmrbdn", { "scaled": scaled }))}><div class="bonuses svelte-rmrbdn"${attr("style", `transform: scale(${stringify(Math.min(scale, 1))});`)}>`;
      BaseScrollable($$payload2, {
        type: "row",
        noScroll: true,
        children: ($$payload3) => {
          props.bonusCardsActivate($$payload3);
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      BaseScrollable($$payload2, {
        type: "row",
        noScroll: true,
        children: ($$payload3) => {
          props.bonusCardsBuy($$payload3);
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div> `;
      if (!scaled) {
        $$payload2.out += "<!--[-->";
        $$payload2.out += `<div>`;
        props.betAmount($$payload2);
        $$payload2.out += `<!----></div>`;
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--></div> `;
      if (scaled) {
        $$payload2.out += "<!--[-->";
        $$payload2.out += `<div class="badge-amount-wrap-scaled svelte-rmrbdn">`;
        props.betAmount($$payload2);
        $$payload2.out += `<!----></div>`;
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]-->`;
    },
    $$slots: { default: true }
  });
  pop();
}
function BonusContentWrapLandscape($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const { stateLayoutDerived: stateLayoutDerived2 } = getContextLayout();
  const verticalScale = stateLayoutDerived2.canvasSizes().height / (270 * 2);
  const horizontalScale = (stateLayoutDerived2.canvasSizes().width - 250) / 0;
  const scale = Math.min(verticalScale, horizontalScale);
  BaseContent($$payload, {
    maxWidth: "100%",
    children: ($$payload2) => {
      $$payload2.out += `<div class="bonuses-wrap svelte-8l82fa"><div class="bonuses svelte-8l82fa"${attr("style", `transform: scale(${stringify(Math.min(scale, 1))});`)}>`;
      BaseScrollable($$payload2, {
        type: "row",
        noScroll: true,
        children: ($$payload3) => {
          props.bonusCardsActivate($$payload3);
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      BaseScrollable($$payload2, {
        type: "row",
        noScroll: true,
        children: ($$payload3) => {
          props.bonusCardsBuy($$payload3);
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div></div> <div class="badge-amount-wrap svelte-8l82fa">`;
      props.betAmount($$payload2);
      $$payload2.out += `<!----></div>`;
    },
    $$slots: { default: true }
  });
  pop();
}
function ModalBuyBonus($$payload, $$props) {
  push();
  const { stateLayoutDerived: stateLayoutDerived2 } = getContextLayout();
  const activateList = stateMetaDerived.betModeMetaList().filter((item) => item.type === "activate");
  const buyList = stateMetaDerived.betModeMetaList().filter((item) => item.type === "buy");
  const COMPONENT_MAP = {
    desktop: BonusContentWrapLarge,
    tablet: BonusContentWrapLarge,
    portrait: BonusContentWrapPortrait,
    landscape: BonusContentWrapLandscape
  };
  const BonusContentWrap = COMPONENT_MAP[stateLayoutDerived2.layoutType()];
  if (stateModal.modal?.name === "buyBonus") {
    $$payload.out += "<!--[-->";
    Popup($$payload, {
      zIndex: zIndex.modal,
      onclose: () => stateModal.modal = null,
      children: ($$payload2) => {
        $$payload2.out += `<!---->`;
        {
          let betAmount = function($$payload3) {
            BetMenuAmountToggle($$payload3);
          }, bonusCardsActivate = function($$payload3) {
            BonusCards($$payload3, { list: activateList });
          }, bonusCardsBuy = function($$payload3) {
            BonusCards($$payload3, { list: buyList });
          };
          BonusContentWrap($$payload2, {
            maxListLength: Math.max(activateList.length, buyList.length),
            betAmount,
            bonusCardsActivate,
            bonusCardsBuy,
            $$slots: {
              betAmount: true,
              bonusCardsActivate: true,
              bonusCardsBuy: true
            }
          });
        }
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function ModalBuyBonusConfirm($$payload, $$props) {
  push();
  const { eventEmitter: eventEmitter2 } = getContextEventEmitter();
  const confirm = () => {
    stateBet$1.activeBetModeKey = stateBonus.selectedBetModeKey;
    if (stateBonusDerived.selectedBetModeData().type === "buy") {
      eventEmitter2.broadcast({ type: "bet" });
    }
    if (stateBonusDerived.selectedBetModeData().type === "activate") {
      stateUi.autoSpinsLossLimitText = INFINITY_MARK;
      stateUi.autoSpinsSingleWinLimitText = INFINITY_MARK;
    }
  };
  if (stateModal.modal?.name === "buyBonusConfirm") {
    $$payload.out += "<!--[-->";
    Popup($$payload, {
      zIndex: zIndex.dialog,
      onclose: () => stateModal.modal = { name: "buyBonus" },
      children: ($$payload2) => {
        BaseContent($$payload2, {
          maxWidth: "500px",
          children: ($$payload3) => {
            BaseTitle($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<!---->${escape_html(stateBonusDerived.selectedBetModeData().text.title)}`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            BaseScrollable($$payload3, {
              type: "column",
              children: ($$payload4) => {
                $$payload4.out += `<!---->${escape_html(stateBonusDerived.selectedBetModeData().text.dialog)}`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            BaseButtonWrap($$payload3, {
              type: "max-width",
              children: ($$payload4) => {
                Button$1($$payload4, {
                  "data-test": "confirm-button",
                  onclick: () => {
                    confirm();
                    eventEmitter2.broadcast({ type: "soundPressGeneral" });
                    stateModal.modal = null;
                  },
                  children: ($$payload5) => {
                    BaseIcon($$payload5, { width: "100%", height: "3rem" });
                    $$payload5.out += `<!----> `;
                    BaseButtonContent($$payload5, {
                      children: ($$payload6) => {
                        $$payload6.out += `<span style="font-size: 1rem;">${escape_html(i18nDerived$2.confirm())}</span>`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload5.out += `<!---->`;
                  },
                  $$slots: { default: true }
                });
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function AutoSpinsOptions($$payload, $$props) {
  push();
  const { stateLayoutDerived: stateLayoutDerived2 } = getContextLayout();
  const AUTO_SPINS_TEXT_OPTIONS_PORTRAIT = AUTO_SPINS_TEXT_OPTIONS.filter((value) => value !== "1000");
  const options = stateLayoutDerived2.layoutType() === "landscape" ? AUTO_SPINS_TEXT_OPTIONS_PORTRAIT : AUTO_SPINS_TEXT_OPTIONS;
  {
    let option = function($$payload2, { option: option2 }) {
      BaseIcon($$payload2, {
        width: "100%",
        height: "2rem",
        border: option2 === stateUi.autoSpinsText ? "2px white solid" : "2px black solid"
      });
      $$payload2.out += `<!----> `;
      BaseButtonContent($$payload2, {
        children: ($$payload3) => {
          $$payload3.out += `<span style="font-size: 1rem;" data-test="round-options"${attr("class", to_class("", "svelte-eq8ntj", { "infinity": option2 === "∞" }))}>${escape_html(option2)}</span>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    };
    OptionsGrid($$payload, {
      value: stateUi.autoSpinsText,
      options,
      onchange: (value) => stateUi.autoSpinsText = value,
      option,
      $$slots: { option: true }
    });
  }
  pop();
}
function AutoSpinsStartButton($$payload, $$props) {
  push();
  const { eventEmitter: eventEmitter2 } = getContextEventEmitter();
  const startAutoBet = () => {
    stateBet$1.autoSpinsCounter = AUTO_SPINS_TEXT_OPTION_MAP[stateUi.autoSpinsText];
    stateBet$1.autoSpinsLossLimitAmount = stateBet$1.betAmount * AUTO_SPINS_LOSS_LIMIT_MULTIPLIER_MAP[stateUi.autoSpinsLossLimitText];
    stateBet$1.autoSpinsSingleWinLimitAmount = stateBet$1.betAmount * AUTO_SPINS_SINGLE_WIN_LIMIT_MULTIPLIER_MAP[stateUi.autoSpinsSingleWinLimitText];
    if (stateBetDerived.activeBetMode().type === "buy") stateBet$1.activeBetModeKey = "BASE";
    eventEmitter2.broadcast({ type: "soundPressGeneral" });
    eventEmitter2.broadcast({ type: "autoBet" });
    stateModal.modal = null;
  };
  Button$1($$payload, {
    disabled: !stateBetDerived.isBetCostAvailable(),
    onclick: startAutoBet,
    children: ($$payload2) => {
      BaseIcon($$payload2, { width: "100%", height: "3rem" });
      $$payload2.out += `<!----> `;
      BaseButtonContent($$payload2, {
        children: ($$payload3) => {
          $$payload3.out += `<span style="font-size: 1rem;">${escape_html(i18nDerived$2.startAutoplay())}</span>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  pop();
}
function ModalAutoSpin($$payload, $$props) {
  push();
  if (stateModal.modal?.name === "autoSpin") {
    $$payload.out += "<!--[-->";
    Popup($$payload, {
      zIndex: zIndex.modal,
      onclose: () => stateModal.modal = null,
      children: ($$payload2) => {
        BaseContent($$payload2, {
          maxWidth: "100%",
          children: ($$payload3) => {
            BaseTitle($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<!---->${escape_html(i18nDerived$2.autoSpins())}`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            {
              let children = function($$payload4) {
                $$payload4.out += `<div class="subtitle" data-test="number-of-rounds">${escape_html(i18nDerived$2.numberOfRounds())}</div> `;
                AutoSpinsOptions($$payload4);
                $$payload4.out += `<!---->`;
              };
              BaseScrollable($$payload3, {
                type: "column",
                children,
                $$slots: { default: true }
              });
            }
            $$payload3.out += `<!----> `;
            BaseButtonWrap($$payload3, {
              type: "full-width",
              children: ($$payload4) => {
                AutoSpinsStartButton($$payload4);
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function ModalAutoSpinMessage($$payload, $$props) {
  push();
  const messageMap = {
    lossLimitReached: i18nDerived$2.lossLimitReached(),
    singleWinLimitReached: i18nDerived$2.singleWinLimitReached(),
    insufficientFunds: i18nDerived$2.insufficientFunds()
  };
  if (stateModal.modal?.name === "autoSpinMessage") {
    $$payload.out += "<!--[-->";
    Popup($$payload, {
      zIndex: zIndex.modal,
      onclose: () => stateModal.modal = null,
      children: ($$payload2) => {
        BaseContent($$payload2, {
          maxWidth: "100%",
          children: ($$payload3) => {
            BaseTitle($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<!---->${escape_html(i18nDerived$2.notification())}`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            BaseScrollable($$payload3, {
              type: "column",
              children: ($$payload4) => {
                $$payload4.out += `<span class="text svelte-1kl734d" data-test="auto-spin-stop-info">${escape_html(i18nDerived$2.autoSpinsStopInfo())}</span> <div class="scrollY info-text svelte-1kl734d" data-test="auto-spin-stop-content">${escape_html(messageMap[stateModal.modal.message])}</div>`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function ModalPayTable($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  if (stateModal.modal?.name === "payTable") {
    $$payload.out += "<!--[-->";
    Popup($$payload, {
      zIndex: zIndex.modal,
      onclose: () => stateModal.modal = null,
      children: ($$payload2) => {
        BaseContent($$payload2, {
          maxWidth: "100%",
          children: ($$payload3) => {
            BaseScrollable($$payload3, {
              type: "column",
              children: ($$payload4) => {
                $$payload4.out += `<span>ADD YOUR PAY TABLE</span> `;
                props.children($$payload4);
                $$payload4.out += `<!---->`;
              },
              $$slots: { default: true }
            });
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function ModalGameRules($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  if (stateModal.modal?.name === "gameRules") {
    $$payload.out += "<!--[-->";
    Popup($$payload, {
      zIndex: zIndex.modal,
      onclose: () => stateModal.modal = null,
      children: ($$payload2) => {
        BaseContent($$payload2, {
          maxWidth: "100%",
          children: ($$payload3) => {
            BaseScrollable($$payload3, {
              type: "column",
              children: ($$payload4) => {
                props.children($$payload4);
                $$payload4.out += `<!---->`;
              },
              $$slots: { default: true }
            });
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function ModalSettings($$payload, $$props) {
  push();
  let $$settled = true;
  let $$inner_payload;
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
function Modals($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  ModalError($$payload);
  $$payload.out += `<!----> `;
  ModalBetMenu($$payload);
  $$payload.out += `<!----> `;
  if (props.buyBonus) {
    $$payload.out += "<!--[-->";
    props.buyBonus($$payload);
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    ModalBuyBonus($$payload);
  }
  $$payload.out += `<!--]--> `;
  ModalBuyBonusConfirm($$payload);
  $$payload.out += `<!----> `;
  ModalAutoSpin($$payload);
  $$payload.out += `<!----> `;
  ModalAutoSpinMessage($$payload);
  $$payload.out += `<!----> `;
  ModalPayTable($$payload, {
    children: ($$payload2) => {
      props.version($$payload2);
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----> `;
  ModalGameRules($$payload, {
    children: ($$payload2) => {
      if (props.gameRules) {
        $$payload2.out += "<!--[-->";
        props.gameRules($$payload2);
        $$payload2.out += `<!---->`;
      } else {
        $$payload2.out += "<!--[!-->";
        props.version($$payload2);
        $$payload2.out += `<!---->`;
      }
      $$payload2.out += `<!--]-->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----> `;
  ModalSettings($$payload);
  $$payload.out += `<!---->`;
  pop();
}
let PUBLIC_SITE_MODE = void 0;
function GameVersion($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  $$payload.out += `<!---->${escape_html(PUBLIC_SITE_MODE)}
${escape_html(props.version)}`;
  pop();
}
function GlobalStyle($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  props.children($$payload);
  $$payload.out += `<!---->`;
  pop();
}
const en$2 = {
  "MASTER VOLUME": "MASTER VOLUME"
};
const zh$2 = {
  "MASTER VOLUME": "主音量"
};
const messagesMap$2 = {
  en: en$2,
  zh: zh$2
};
if (typeof window !== "undefined" && window.PIXI) {
  const prevRequire = window.require;
  window.require = (x) => {
    if (prevRequire)
      return prevRequire(x);
    else if (x.startsWith("@pixi/") || x.startsWith("pixi.js"))
      return window.PIXI;
  };
}
class StringSet {
  entries = {};
  size = 0;
  add(value) {
    let contains = this.entries[value];
    this.entries[value] = true;
    if (!contains) {
      this.size++;
      return true;
    }
    return false;
  }
  addAll(values) {
    let oldSize = this.size;
    for (var i = 0, n = values.length; i < n; i++)
      this.add(values[i]);
    return oldSize != this.size;
  }
  contains(value) {
    return this.entries[value];
  }
  clear() {
    this.entries = {};
    this.size = 0;
  }
}
class Color {
  r;
  g;
  b;
  a;
  static WHITE = new Color(1, 1, 1, 1);
  static RED = new Color(1, 0, 0, 1);
  static GREEN = new Color(0, 1, 0, 1);
  static BLUE = new Color(0, 0, 1, 1);
  static MAGENTA = new Color(1, 0, 1, 1);
  constructor(r = 0, g = 0, b = 0, a = 0) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
  set(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
    return this.clamp();
  }
  setFromColor(c) {
    this.r = c.r;
    this.g = c.g;
    this.b = c.b;
    this.a = c.a;
    return this;
  }
  setFromString(hex) {
    hex = hex.charAt(0) == "#" ? hex.substr(1) : hex;
    this.r = parseInt(hex.substr(0, 2), 16) / 255;
    this.g = parseInt(hex.substr(2, 2), 16) / 255;
    this.b = parseInt(hex.substr(4, 2), 16) / 255;
    this.a = hex.length != 8 ? 1 : parseInt(hex.substr(6, 2), 16) / 255;
    return this;
  }
  add(r, g, b, a) {
    this.r += r;
    this.g += g;
    this.b += b;
    this.a += a;
    return this.clamp();
  }
  clamp() {
    if (this.r < 0)
      this.r = 0;
    else if (this.r > 1)
      this.r = 1;
    if (this.g < 0)
      this.g = 0;
    else if (this.g > 1)
      this.g = 1;
    if (this.b < 0)
      this.b = 0;
    else if (this.b > 1)
      this.b = 1;
    if (this.a < 0)
      this.a = 0;
    else if (this.a > 1)
      this.a = 1;
    return this;
  }
  static rgba8888ToColor(color, value) {
    color.r = ((value & 4278190080) >>> 24) / 255;
    color.g = ((value & 16711680) >>> 16) / 255;
    color.b = ((value & 65280) >>> 8) / 255;
    color.a = (value & 255) / 255;
  }
  static rgb888ToColor(color, value) {
    color.r = ((value & 16711680) >>> 16) / 255;
    color.g = ((value & 65280) >>> 8) / 255;
    color.b = (value & 255) / 255;
  }
  toRgb888() {
    const hex = (x) => ("0" + (x * 255).toString(16)).slice(-2);
    return Number("0x" + hex(this.r) + hex(this.g) + hex(this.b));
  }
  static fromString(hex) {
    return new Color().setFromString(hex);
  }
}
class MathUtils {
  static PI = 3.1415927;
  static PI2 = MathUtils.PI * 2;
  static invPI2 = 1 / MathUtils.PI2;
  static radiansToDegrees = 180 / MathUtils.PI;
  static radDeg = MathUtils.radiansToDegrees;
  static degreesToRadians = MathUtils.PI / 180;
  static degRad = MathUtils.degreesToRadians;
  static clamp(value, min, max) {
    if (value < min)
      return min;
    if (value > max)
      return max;
    return value;
  }
  static cosDeg(degrees) {
    return Math.cos(degrees * MathUtils.degRad);
  }
  static sinDeg(degrees) {
    return Math.sin(degrees * MathUtils.degRad);
  }
  static atan2Deg(y, x) {
    return Math.atan2(y, x) * MathUtils.degRad;
  }
  static signum(value) {
    return value > 0 ? 1 : value < 0 ? -1 : 0;
  }
  static toInt(x) {
    return x > 0 ? Math.floor(x) : Math.ceil(x);
  }
  static cbrt(x) {
    let y = Math.pow(Math.abs(x), 1 / 3);
    return x < 0 ? -y : y;
  }
  static randomTriangular(min, max) {
    return MathUtils.randomTriangularWith(min, max, (min + max) * 0.5);
  }
  static randomTriangularWith(min, max, mode2) {
    let u = Math.random();
    let d = max - min;
    if (u <= (mode2 - min) / d)
      return min + Math.sqrt(u * d * (mode2 - min));
    return max - Math.sqrt((1 - u) * d * (max - mode2));
  }
  static isPowerOfTwo(value) {
    return value && (value & value - 1) === 0;
  }
}
class Utils {
  static SUPPORTS_TYPED_ARRAYS = typeof Float32Array !== "undefined";
  static arrayCopy(source2, sourceStart, dest, destStart, numElements) {
    for (let i = sourceStart, j = destStart; i < sourceStart + numElements; i++, j++) {
      dest[j] = source2[i];
    }
  }
  static arrayFill(array, fromIndex, toIndex, value) {
    for (let i = fromIndex; i < toIndex; i++)
      array[i] = value;
  }
  static setArraySize(array, size, value = 0) {
    let oldSize = array.length;
    if (oldSize == size)
      return array;
    array.length = size;
    if (oldSize < size) {
      for (let i = oldSize; i < size; i++)
        array[i] = value;
    }
    return array;
  }
  static ensureArrayCapacity(array, size, value = 0) {
    if (array.length >= size)
      return array;
    return Utils.setArraySize(array, size, value);
  }
  static newArray(size, defaultValue) {
    let array = new Array(size);
    for (let i = 0; i < size; i++)
      array[i] = defaultValue;
    return array;
  }
  static newFloatArray(size) {
    if (Utils.SUPPORTS_TYPED_ARRAYS)
      return new Float32Array(size);
    else {
      let array = new Array(size);
      for (let i = 0; i < array.length; i++)
        array[i] = 0;
      return array;
    }
  }
  static newShortArray(size) {
    if (Utils.SUPPORTS_TYPED_ARRAYS)
      return new Int16Array(size);
    else {
      let array = new Array(size);
      for (let i = 0; i < array.length; i++)
        array[i] = 0;
      return array;
    }
  }
  static toFloatArray(array) {
    return Utils.SUPPORTS_TYPED_ARRAYS ? new Float32Array(array) : array;
  }
  static toSinglePrecision(value) {
    return Utils.SUPPORTS_TYPED_ARRAYS ? Math.fround(value) : value;
  }
  // This function is used to fix WebKit 602 specific issue described at http://esotericsoftware.com/forum/iOS-10-disappearing-graphics-10109
  static webkit602BugfixHelper(alpha, blend) {
  }
  static contains(array, element, identity = true) {
    for (var i = 0; i < array.length; i++)
      if (array[i] == element)
        return true;
    return false;
  }
  static enumValue(type, name) {
    return type[name[0].toUpperCase() + name.slice(1)];
  }
}
class Pool {
  items = new Array();
  instantiator;
  constructor(instantiator) {
    this.instantiator = instantiator;
  }
  obtain() {
    return this.items.length > 0 ? this.items.pop() : this.instantiator();
  }
  free(item) {
    if (item.reset)
      item.reset();
    this.items.push(item);
  }
  freeAll(items) {
    for (let i = 0; i < items.length; i++)
      this.free(items[i]);
  }
  clear() {
    this.items.length = 0;
  }
}
class Attachment {
  name;
  constructor(name) {
    if (!name)
      throw new Error("name cannot be null.");
    this.name = name;
  }
}
class VertexAttachment extends Attachment {
  static nextID = 0;
  /** The unique ID for this attachment. */
  id = VertexAttachment.nextID++;
  /** The bones which affect the {@link #getVertices()}. The array entries are, for each vertex, the number of bones affecting
   * the vertex followed by that many bone indices, which is the index of the bone in {@link Skeleton#bones}. Will be null
   * if this attachment has no weights. */
  bones = null;
  /** The vertex positions in the bone's coordinate system. For a non-weighted attachment, the values are `x,y`
   * entries for each vertex. For a weighted attachment, the values are `x,y,weight` entries for each bone affecting
   * each vertex. */
  vertices = [];
  /** The maximum number of world vertex values that can be output by
   * {@link #computeWorldVertices()} using the `count` parameter. */
  worldVerticesLength = 0;
  /** Timelines for the timeline attachment are also applied to this attachment.
   * May be null if no attachment-specific timelines should be applied. */
  timelineAttachment = this;
  constructor(name) {
    super(name);
  }
  /** Transforms the attachment's local {@link #vertices} to world coordinates. If the slot's {@link Slot#deform} is
   * not empty, it is used to deform the vertices.
   *
   * See [World transforms](http://esotericsoftware.com/spine-runtime-skeletons#World-transforms) in the Spine
   * Runtimes Guide.
   * @param start The index of the first {@link #vertices} value to transform. Each vertex has 2 values, x and y.
   * @param count The number of world vertex values to output. Must be <= {@link #worldVerticesLength} - `start`.
   * @param worldVertices The output world vertices. Must have a length >= `offset` + `count` *
   *           `stride` / 2.
   * @param offset The `worldVertices` index to begin writing values.
   * @param stride The number of `worldVertices` entries between the value pairs written. */
  computeWorldVertices(slot, start, count, worldVertices, offset, stride) {
    count = offset + (count >> 1) * stride;
    let skeleton = slot.bone.skeleton;
    let deformArray = slot.deform;
    let vertices = this.vertices;
    let bones = this.bones;
    if (!bones) {
      if (deformArray.length > 0)
        vertices = deformArray;
      let bone = slot.bone;
      let x = bone.worldX;
      let y = bone.worldY;
      let a = bone.a, b = bone.b, c = bone.c, d = bone.d;
      for (let v2 = start, w = offset; w < count; v2 += 2, w += stride) {
        let vx = vertices[v2], vy = vertices[v2 + 1];
        worldVertices[w] = vx * a + vy * b + x;
        worldVertices[w + 1] = vx * c + vy * d + y;
      }
      return;
    }
    let v = 0, skip = 0;
    for (let i = 0; i < start; i += 2) {
      let n = bones[v];
      v += n + 1;
      skip += n;
    }
    let skeletonBones = skeleton.bones;
    if (deformArray.length == 0) {
      for (let w = offset, b = skip * 3; w < count; w += stride) {
        let wx = 0, wy = 0;
        let n = bones[v++];
        n += v;
        for (; v < n; v++, b += 3) {
          let bone = skeletonBones[bones[v]];
          let vx = vertices[b], vy = vertices[b + 1], weight = vertices[b + 2];
          wx += (vx * bone.a + vy * bone.b + bone.worldX) * weight;
          wy += (vx * bone.c + vy * bone.d + bone.worldY) * weight;
        }
        worldVertices[w] = wx;
        worldVertices[w + 1] = wy;
      }
    } else {
      let deform = deformArray;
      for (let w = offset, b = skip * 3, f = skip << 1; w < count; w += stride) {
        let wx = 0, wy = 0;
        let n = bones[v++];
        n += v;
        for (; v < n; v++, b += 3, f += 2) {
          let bone = skeletonBones[bones[v]];
          let vx = vertices[b] + deform[f], vy = vertices[b + 1] + deform[f + 1], weight = vertices[b + 2];
          wx += (vx * bone.a + vy * bone.b + bone.worldX) * weight;
          wy += (vx * bone.c + vy * bone.d + bone.worldY) * weight;
        }
        worldVertices[w] = wx;
        worldVertices[w + 1] = wy;
      }
    }
  }
  /** Does not copy id (generated) or name (set on construction). **/
  copyTo(attachment) {
    if (this.bones) {
      attachment.bones = new Array(this.bones.length);
      Utils.arrayCopy(this.bones, 0, attachment.bones, 0, this.bones.length);
    } else
      attachment.bones = null;
    if (this.vertices) {
      attachment.vertices = Utils.newFloatArray(this.vertices.length);
      Utils.arrayCopy(this.vertices, 0, attachment.vertices, 0, this.vertices.length);
    }
    attachment.worldVerticesLength = this.worldVerticesLength;
    attachment.timelineAttachment = this.timelineAttachment;
  }
}
var SequenceMode;
(function(SequenceMode2) {
  SequenceMode2[SequenceMode2["hold"] = 0] = "hold";
  SequenceMode2[SequenceMode2["once"] = 1] = "once";
  SequenceMode2[SequenceMode2["loop"] = 2] = "loop";
  SequenceMode2[SequenceMode2["pingpong"] = 3] = "pingpong";
  SequenceMode2[SequenceMode2["onceReverse"] = 4] = "onceReverse";
  SequenceMode2[SequenceMode2["loopReverse"] = 5] = "loopReverse";
  SequenceMode2[SequenceMode2["pingpongReverse"] = 6] = "pingpongReverse";
})(SequenceMode || (SequenceMode = {}));
[
  SequenceMode.hold,
  SequenceMode.once,
  SequenceMode.loop,
  SequenceMode.pingpong,
  SequenceMode.onceReverse,
  SequenceMode.loopReverse,
  SequenceMode.pingpongReverse
];
class Animation {
  /** The animation's name, which is unique across all animations in the skeleton. */
  name;
  timelines = [];
  timelineIds = new StringSet();
  /** The duration of the animation in seconds, which is the highest time of all keys in the timeline. */
  duration;
  constructor(name, timelines, duration) {
    if (!name)
      throw new Error("name cannot be null.");
    this.name = name;
    this.setTimelines(timelines);
    this.duration = duration;
  }
  setTimelines(timelines) {
    if (!timelines)
      throw new Error("timelines cannot be null.");
    this.timelines = timelines;
    this.timelineIds.clear();
    for (var i = 0; i < timelines.length; i++)
      this.timelineIds.addAll(timelines[i].getPropertyIds());
  }
  hasTimeline(ids) {
    for (let i = 0; i < ids.length; i++)
      if (this.timelineIds.contains(ids[i]))
        return true;
    return false;
  }
  /** Applies all the animation's timelines to the specified skeleton.
   *
   * See Timeline {@link Timeline#apply(Skeleton, float, float, Array, float, MixBlend, MixDirection)}.
   * @param loop If true, the animation repeats after {@link #getDuration()}.
   * @param events May be null to ignore fired events. */
  apply(skeleton, lastTime, time, loop2, events, alpha, blend, direction) {
    if (!skeleton)
      throw new Error("skeleton cannot be null.");
    if (loop2 && this.duration != 0) {
      time %= this.duration;
      if (lastTime > 0)
        lastTime %= this.duration;
    }
    let timelines = this.timelines;
    for (let i = 0, n = timelines.length; i < n; i++)
      timelines[i].apply(skeleton, lastTime, time, events, alpha, blend, direction);
  }
}
var MixBlend;
(function(MixBlend2) {
  MixBlend2[MixBlend2["setup"] = 0] = "setup";
  MixBlend2[MixBlend2["first"] = 1] = "first";
  MixBlend2[MixBlend2["replace"] = 2] = "replace";
  MixBlend2[MixBlend2["add"] = 3] = "add";
})(MixBlend || (MixBlend = {}));
var MixDirection;
(function(MixDirection2) {
  MixDirection2[MixDirection2["mixIn"] = 0] = "mixIn";
  MixDirection2[MixDirection2["mixOut"] = 1] = "mixOut";
})(MixDirection || (MixDirection = {}));
const Property = {
  rotate: 0,
  attachment: 11,
  event: 13,
  drawOrder: 14
};
class Timeline {
  propertyIds;
  frames;
  constructor(frameCount, propertyIds) {
    this.propertyIds = propertyIds;
    this.frames = Utils.newFloatArray(frameCount * this.getFrameEntries());
  }
  getPropertyIds() {
    return this.propertyIds;
  }
  getFrameEntries() {
    return 1;
  }
  getFrameCount() {
    return this.frames.length / this.getFrameEntries();
  }
  getDuration() {
    return this.frames[this.frames.length - this.getFrameEntries()];
  }
  static search1(frames, time) {
    let n = frames.length;
    for (let i = 1; i < n; i++)
      if (frames[i] > time)
        return i - 1;
    return n - 1;
  }
  static search(frames, time, step) {
    let n = frames.length;
    for (let i = step; i < n; i += step)
      if (frames[i] > time)
        return i - step;
    return n - step;
  }
}
class CurveTimeline extends Timeline {
  curves;
  // type, x, y, ...
  constructor(frameCount, bezierCount, propertyIds) {
    super(frameCount, propertyIds);
    this.curves = Utils.newFloatArray(
      frameCount + bezierCount * 18
      /*BEZIER_SIZE*/
    );
    this.curves[frameCount - 1] = 1;
  }
  /** Sets the specified key frame to linear interpolation. */
  setLinear(frame) {
    this.curves[frame] = 0;
  }
  /** Sets the specified key frame to stepped interpolation. */
  setStepped(frame) {
    this.curves[frame] = 1;
  }
  /** Shrinks the storage for Bezier curves, for use when <code>bezierCount</code> (specified in the constructor) was larger
   * than the actual number of Bezier curves. */
  shrink(bezierCount) {
    let size = this.getFrameCount() + bezierCount * 18;
    if (this.curves.length > size) {
      let newCurves = Utils.newFloatArray(size);
      Utils.arrayCopy(this.curves, 0, newCurves, 0, size);
      this.curves = newCurves;
    }
  }
  /** Stores the segments for the specified Bezier curve. For timelines that modify multiple values, there may be more than
   * one curve per frame.
   * @param bezier The ordinal of this Bezier curve for this timeline, between 0 and <code>bezierCount - 1</code> (specified
   *           in the constructor), inclusive.
   * @param frame Between 0 and <code>frameCount - 1</code>, inclusive.
   * @param value The index of the value for this frame that this curve is used for.
   * @param time1 The time for the first key.
   * @param value1 The value for the first key.
   * @param cx1 The time for the first Bezier handle.
   * @param cy1 The value for the first Bezier handle.
   * @param cx2 The time of the second Bezier handle.
   * @param cy2 The value for the second Bezier handle.
   * @param time2 The time for the second key.
   * @param value2 The value for the second key. */
  setBezier(bezier, frame, value, time1, value1, cx1, cy1, cx2, cy2, time2, value2) {
    let curves = this.curves;
    let i = this.getFrameCount() + bezier * 18;
    if (value == 0)
      curves[frame] = 2 + i;
    let tmpx = (time1 - cx1 * 2 + cx2) * 0.03, tmpy = (value1 - cy1 * 2 + cy2) * 0.03;
    let dddx = ((cx1 - cx2) * 3 - time1 + time2) * 6e-3, dddy = ((cy1 - cy2) * 3 - value1 + value2) * 6e-3;
    let ddx = tmpx * 2 + dddx, ddy = tmpy * 2 + dddy;
    let dx = (cx1 - time1) * 0.3 + tmpx + dddx * 0.16666667, dy = (cy1 - value1) * 0.3 + tmpy + dddy * 0.16666667;
    let x = time1 + dx, y = value1 + dy;
    for (let n = i + 18; i < n; i += 2) {
      curves[i] = x;
      curves[i + 1] = y;
      dx += ddx;
      dy += ddy;
      ddx += dddx;
      ddy += dddy;
      x += dx;
      y += dy;
    }
  }
  /** Returns the Bezier interpolated value for the specified time.
   * @param frameIndex The index into {@link #getFrames()} for the values of the frame before <code>time</code>.
   * @param valueOffset The offset from <code>frameIndex</code> to the value this curve is used for.
   * @param i The index of the Bezier segments. See {@link #getCurveType(int)}. */
  getBezierValue(time, frameIndex, valueOffset, i) {
    let curves = this.curves;
    if (curves[i] > time) {
      let x2 = this.frames[frameIndex], y2 = this.frames[frameIndex + valueOffset];
      return y2 + (time - x2) / (curves[i] - x2) * (curves[i + 1] - y2);
    }
    let n = i + 18;
    for (i += 2; i < n; i += 2) {
      if (curves[i] >= time) {
        let x2 = curves[i - 2], y2 = curves[i - 1];
        return y2 + (time - x2) / (curves[i] - x2) * (curves[i + 1] - y2);
      }
    }
    frameIndex += this.getFrameEntries();
    let x = curves[n - 2], y = curves[n - 1];
    return y + (time - x) / (this.frames[frameIndex] - x) * (this.frames[frameIndex + valueOffset] - y);
  }
}
class CurveTimeline1 extends CurveTimeline {
  constructor(frameCount, bezierCount, propertyId) {
    super(frameCount, bezierCount, [propertyId]);
  }
  getFrameEntries() {
    return 2;
  }
  /** Sets the time and value for the specified frame.
   * @param frame Between 0 and <code>frameCount</code>, inclusive.
   * @param time The frame time in seconds. */
  setFrame(frame, time, value) {
    frame <<= 1;
    this.frames[frame] = time;
    this.frames[
      frame + 1
      /*VALUE*/
    ] = value;
  }
  /** Returns the interpolated value for the specified time. */
  getCurveValue(time) {
    let frames = this.frames;
    let i = frames.length - 2;
    for (let ii = 2; ii <= i; ii += 2) {
      if (frames[ii] > time) {
        i = ii - 2;
        break;
      }
    }
    let curveType = this.curves[i >> 1];
    switch (curveType) {
      case 0:
        let before = frames[i], value = frames[
          i + 1
          /*VALUE*/
        ];
        return value + (time - before) / (frames[
          i + 2
          /*ENTRIES*/
        ] - before) * (frames[
          i + 2 + 1
          /*VALUE*/
        ] - value);
      case 1:
        return frames[
          i + 1
          /*VALUE*/
        ];
    }
    return this.getBezierValue(
      time,
      i,
      1,
      curveType - 2
      /*BEZIER*/
    );
  }
  getRelativeValue(time, alpha, blend, current, setup2) {
    if (time < this.frames[0]) {
      switch (blend) {
        case MixBlend.setup:
          return setup2;
        case MixBlend.first:
          return current + (setup2 - current) * alpha;
      }
      return current;
    }
    let value = this.getCurveValue(time);
    switch (blend) {
      case MixBlend.setup:
        return setup2 + value * alpha;
      case MixBlend.first:
      case MixBlend.replace:
        value += setup2 - current;
    }
    return current + value * alpha;
  }
  getAbsoluteValue(time, alpha, blend, current, setup2) {
    if (time < this.frames[0]) {
      switch (blend) {
        case MixBlend.setup:
          return setup2;
        case MixBlend.first:
          return current + (setup2 - current) * alpha;
      }
      return current;
    }
    let value = this.getCurveValue(time);
    if (blend == MixBlend.setup)
      return setup2 + (value - setup2) * alpha;
    return current + (value - current) * alpha;
  }
  getAbsoluteValue2(time, alpha, blend, current, setup2, value) {
    if (time < this.frames[0]) {
      switch (blend) {
        case MixBlend.setup:
          return setup2;
        case MixBlend.first:
          return current + (setup2 - current) * alpha;
      }
      return current;
    }
    if (blend == MixBlend.setup)
      return setup2 + (value - setup2) * alpha;
    return current + (value - current) * alpha;
  }
  getScaleValue(time, alpha, blend, direction, current, setup2) {
    const frames = this.frames;
    if (time < frames[0]) {
      switch (blend) {
        case MixBlend.setup:
          return setup2;
        case MixBlend.first:
          return current + (setup2 - current) * alpha;
      }
      return current;
    }
    let value = this.getCurveValue(time) * setup2;
    if (alpha == 1) {
      if (blend == MixBlend.add)
        return current + value - setup2;
      return value;
    }
    if (direction == MixDirection.mixOut) {
      switch (blend) {
        case MixBlend.setup:
          return setup2 + (Math.abs(value) * MathUtils.signum(setup2) - setup2) * alpha;
        case MixBlend.first:
        case MixBlend.replace:
          return current + (Math.abs(value) * MathUtils.signum(current) - current) * alpha;
      }
    } else {
      let s = 0;
      switch (blend) {
        case MixBlend.setup:
          s = Math.abs(setup2) * MathUtils.signum(value);
          return s + (value - s) * alpha;
        case MixBlend.first:
        case MixBlend.replace:
          s = Math.abs(current) * MathUtils.signum(value);
          return s + (value - s) * alpha;
      }
    }
    return current + (value - setup2) * alpha;
  }
}
class RotateTimeline extends CurveTimeline1 {
  boneIndex = 0;
  constructor(frameCount, bezierCount, boneIndex) {
    super(frameCount, bezierCount, Property.rotate + "|" + boneIndex);
    this.boneIndex = boneIndex;
  }
  apply(skeleton, lastTime, time, events, alpha, blend, direction) {
    let bone = skeleton.bones[this.boneIndex];
    if (bone.active)
      bone.rotation = this.getRelativeValue(time, alpha, blend, bone.rotation, bone.data.rotation);
  }
}
class AttachmentTimeline extends Timeline {
  slotIndex = 0;
  /** The attachment name for each key frame. May contain null values to clear the attachment. */
  attachmentNames;
  constructor(frameCount, slotIndex) {
    super(frameCount, [
      Property.attachment + "|" + slotIndex
    ]);
    this.slotIndex = slotIndex;
    this.attachmentNames = new Array(frameCount);
  }
  getFrameCount() {
    return this.frames.length;
  }
  /** Sets the time in seconds and the attachment name for the specified key frame. */
  setFrame(frame, time, attachmentName) {
    this.frames[frame] = time;
    this.attachmentNames[frame] = attachmentName;
  }
  apply(skeleton, lastTime, time, events, alpha, blend, direction) {
    let slot = skeleton.slots[this.slotIndex];
    if (!slot.bone.active)
      return;
    if (direction == MixDirection.mixOut) {
      if (blend == MixBlend.setup)
        this.setAttachment(skeleton, slot, slot.data.attachmentName);
      return;
    }
    if (time < this.frames[0]) {
      if (blend == MixBlend.setup || blend == MixBlend.first)
        this.setAttachment(skeleton, slot, slot.data.attachmentName);
      return;
    }
    this.setAttachment(skeleton, slot, this.attachmentNames[Timeline.search1(this.frames, time)]);
  }
  setAttachment(skeleton, slot, attachmentName) {
    slot.setAttachment(!attachmentName ? null : skeleton.getAttachment(this.slotIndex, attachmentName));
  }
}
class EventTimeline extends Timeline {
  static propertyIds = ["" + Property.event];
  /** The event for each key frame. */
  events;
  constructor(frameCount) {
    super(frameCount, EventTimeline.propertyIds);
    this.events = new Array(frameCount);
  }
  getFrameCount() {
    return this.frames.length;
  }
  /** Sets the time in seconds and the event for the specified key frame. */
  setFrame(frame, event2) {
    this.frames[frame] = event2.time;
    this.events[frame] = event2;
  }
  /** Fires events for frames > `lastTime` and <= `time`. */
  apply(skeleton, lastTime, time, firedEvents, alpha, blend, direction) {
    if (!firedEvents)
      return;
    let frames = this.frames;
    let frameCount = this.frames.length;
    if (lastTime > time) {
      this.apply(skeleton, lastTime, Number.MAX_VALUE, firedEvents, alpha, blend, direction);
      lastTime = -1;
    } else if (lastTime >= frames[frameCount - 1])
      return;
    if (time < frames[0])
      return;
    let i = 0;
    if (lastTime < frames[0])
      i = 0;
    else {
      i = Timeline.search1(frames, lastTime) + 1;
      let frameTime = frames[i];
      while (i > 0) {
        if (frames[i - 1] != frameTime)
          break;
        i--;
      }
    }
    for (; i < frameCount && time >= frames[i]; i++)
      firedEvents.push(this.events[i]);
  }
}
class DrawOrderTimeline extends Timeline {
  static propertyIds = ["" + Property.drawOrder];
  /** The draw order for each key frame. See {@link #setFrame(int, float, int[])}. */
  drawOrders;
  constructor(frameCount) {
    super(frameCount, DrawOrderTimeline.propertyIds);
    this.drawOrders = new Array(frameCount);
  }
  getFrameCount() {
    return this.frames.length;
  }
  /** Sets the time in seconds and the draw order for the specified key frame.
   * @param drawOrder For each slot in {@link Skeleton#slots}, the index of the new draw order. May be null to use setup pose
   *           draw order. */
  setFrame(frame, time, drawOrder) {
    this.frames[frame] = time;
    this.drawOrders[frame] = drawOrder;
  }
  apply(skeleton, lastTime, time, firedEvents, alpha, blend, direction) {
    if (direction == MixDirection.mixOut) {
      if (blend == MixBlend.setup)
        Utils.arrayCopy(skeleton.slots, 0, skeleton.drawOrder, 0, skeleton.slots.length);
      return;
    }
    if (time < this.frames[0]) {
      if (blend == MixBlend.setup || blend == MixBlend.first)
        Utils.arrayCopy(skeleton.slots, 0, skeleton.drawOrder, 0, skeleton.slots.length);
      return;
    }
    let idx = Timeline.search1(this.frames, time);
    let drawOrderToSetupIndex = this.drawOrders[idx];
    if (!drawOrderToSetupIndex)
      Utils.arrayCopy(skeleton.slots, 0, skeleton.drawOrder, 0, skeleton.slots.length);
    else {
      let drawOrder = skeleton.drawOrder;
      let slots = skeleton.slots;
      for (let i = 0, n = drawOrderToSetupIndex.length; i < n; i++)
        drawOrder[i] = slots[drawOrderToSetupIndex[i]];
    }
  }
}
class AnimationState {
  static _emptyAnimation = new Animation("<empty>", [], 0);
  static emptyAnimation() {
    return AnimationState._emptyAnimation;
  }
  /** The AnimationStateData to look up mix durations. */
  data;
  /** The list of tracks that currently have animations, which may contain null entries. */
  tracks = new Array();
  /** Multiplier for the delta time when the animation state is updated, causing time for all animations and mixes to play slower
   * or faster. Defaults to 1.
   *
   * See TrackEntry {@link TrackEntry#timeScale} for affecting a single animation. */
  timeScale = 1;
  unkeyedState = 0;
  events = new Array();
  listeners = new Array();
  queue = new EventQueue(this);
  propertyIDs = new StringSet();
  animationsChanged = false;
  trackEntryPool = new Pool(() => new TrackEntry());
  constructor(data) {
    this.data = data;
  }
  /** Increments each track entry {@link TrackEntry#trackTime()}, setting queued animations as current if needed. */
  update(delta) {
    delta *= this.timeScale;
    let tracks = this.tracks;
    for (let i = 0, n = tracks.length; i < n; i++) {
      let current = tracks[i];
      if (!current)
        continue;
      current.animationLast = current.nextAnimationLast;
      current.trackLast = current.nextTrackLast;
      let currentDelta = delta * current.timeScale;
      if (current.delay > 0) {
        current.delay -= currentDelta;
        if (current.delay > 0)
          continue;
        currentDelta = -current.delay;
        current.delay = 0;
      }
      let next = current.next;
      if (next) {
        let nextTime = current.trackLast - next.delay;
        if (nextTime >= 0) {
          next.delay = 0;
          next.trackTime += current.timeScale == 0 ? 0 : (nextTime / current.timeScale + delta) * next.timeScale;
          current.trackTime += currentDelta;
          this.setCurrent(i, next, true);
          while (next.mixingFrom) {
            next.mixTime += delta;
            next = next.mixingFrom;
          }
          continue;
        }
      } else if (current.trackLast >= current.trackEnd && !current.mixingFrom) {
        tracks[i] = null;
        this.queue.end(current);
        this.clearNext(current);
        continue;
      }
      if (current.mixingFrom && this.updateMixingFrom(current, delta)) {
        let from = current.mixingFrom;
        current.mixingFrom = null;
        if (from)
          from.mixingTo = null;
        while (from) {
          this.queue.end(from);
          from = from.mixingFrom;
        }
      }
      current.trackTime += currentDelta;
    }
    this.queue.drain();
  }
  /** Returns true when all mixing from entries are complete. */
  updateMixingFrom(to, delta) {
    let from = to.mixingFrom;
    if (!from)
      return true;
    let finished = this.updateMixingFrom(from, delta);
    from.animationLast = from.nextAnimationLast;
    from.trackLast = from.nextTrackLast;
    if (to.nextTrackLast != -1) {
      const discard = to.mixTime == 0 && from.mixTime == 0;
      if (to.mixTime >= to.mixDuration || discard) {
        if (from.totalAlpha == 0 || to.mixDuration == 0 || discard) {
          to.mixingFrom = from.mixingFrom;
          if (from.mixingFrom != null)
            from.mixingFrom.mixingTo = to;
          to.interruptAlpha = from.interruptAlpha;
          this.queue.end(from);
        }
        return finished;
      }
    }
    from.trackTime += delta * from.timeScale;
    to.mixTime += delta;
    return false;
  }
  /** Poses the skeleton using the track entry animations. There are no side effects other than invoking listeners, so the
   * animation state can be applied to multiple skeletons to pose them identically.
   * @returns True if any animations were applied. */
  apply(skeleton) {
    if (!skeleton)
      throw new Error("skeleton cannot be null.");
    if (this.animationsChanged)
      this._animationsChanged();
    let events = this.events;
    let tracks = this.tracks;
    let applied = false;
    for (let i2 = 0, n2 = tracks.length; i2 < n2; i2++) {
      let current = tracks[i2];
      if (!current || current.delay > 0)
        continue;
      applied = true;
      let blend = i2 == 0 ? MixBlend.first : current.mixBlend;
      let alpha = current.alpha;
      if (current.mixingFrom)
        alpha *= this.applyMixingFrom(current, skeleton, blend);
      else if (current.trackTime >= current.trackEnd && !current.next)
        alpha = 0;
      let attachments = alpha >= current.alphaAttachmentThreshold;
      let animationLast = current.animationLast, animationTime = current.getAnimationTime(), applyTime = animationTime;
      let applyEvents = events;
      if (current.reverse) {
        applyTime = current.animation.duration - applyTime;
        applyEvents = null;
      }
      let timelines = current.animation.timelines;
      let timelineCount = timelines.length;
      if (i2 == 0 && alpha == 1 || blend == MixBlend.add) {
        if (i2 == 0)
          attachments = true;
        for (let ii = 0; ii < timelineCount; ii++) {
          var timeline = timelines[ii];
          if (timeline instanceof AttachmentTimeline)
            this.applyAttachmentTimeline(timeline, skeleton, applyTime, blend, attachments);
          else
            timeline.apply(skeleton, animationLast, applyTime, applyEvents, alpha, blend, MixDirection.mixIn);
        }
      } else {
        let timelineMode = current.timelineMode;
        let shortestRotation = current.shortestRotation;
        let firstFrame = !shortestRotation && current.timelinesRotation.length != timelineCount << 1;
        if (firstFrame)
          current.timelinesRotation.length = timelineCount << 1;
        for (let ii = 0; ii < timelineCount; ii++) {
          let timeline2 = timelines[ii];
          let timelineBlend = timelineMode[ii] == SUBSEQUENT ? blend : MixBlend.setup;
          if (!shortestRotation && timeline2 instanceof RotateTimeline) {
            this.applyRotateTimeline(timeline2, skeleton, applyTime, alpha, timelineBlend, current.timelinesRotation, ii << 1, firstFrame);
          } else if (timeline2 instanceof AttachmentTimeline) {
            this.applyAttachmentTimeline(timeline2, skeleton, applyTime, blend, attachments);
          } else {
            timeline2.apply(skeleton, animationLast, applyTime, applyEvents, alpha, timelineBlend, MixDirection.mixIn);
          }
        }
      }
      this.queueEvents(current, animationTime);
      events.length = 0;
      current.nextAnimationLast = animationTime;
      current.nextTrackLast = current.trackTime;
    }
    var setupState = this.unkeyedState + SETUP;
    var slots = skeleton.slots;
    for (var i = 0, n = skeleton.slots.length; i < n; i++) {
      var slot = slots[i];
      if (slot.attachmentState == setupState) {
        var attachmentName = slot.data.attachmentName;
        slot.setAttachment(!attachmentName ? null : skeleton.getAttachment(slot.data.index, attachmentName));
      }
    }
    this.unkeyedState += 2;
    this.queue.drain();
    return applied;
  }
  applyMixingFrom(to, skeleton, blend) {
    let from = to.mixingFrom;
    if (from.mixingFrom)
      this.applyMixingFrom(from, skeleton, blend);
    let mix = 0;
    if (to.mixDuration == 0) {
      mix = 1;
      if (blend == MixBlend.first)
        blend = MixBlend.setup;
    } else {
      mix = to.mixTime / to.mixDuration;
      if (mix > 1)
        mix = 1;
      if (blend != MixBlend.first)
        blend = from.mixBlend;
    }
    let attachments = mix < from.mixAttachmentThreshold, drawOrder = mix < from.mixDrawOrderThreshold;
    let timelines = from.animation.timelines;
    let timelineCount = timelines.length;
    let alphaHold = from.alpha * to.interruptAlpha, alphaMix = alphaHold * (1 - mix);
    let animationLast = from.animationLast, animationTime = from.getAnimationTime(), applyTime = animationTime;
    let events = null;
    if (from.reverse)
      applyTime = from.animation.duration - applyTime;
    else if (mix < from.eventThreshold)
      events = this.events;
    if (blend == MixBlend.add) {
      for (let i = 0; i < timelineCount; i++)
        timelines[i].apply(skeleton, animationLast, applyTime, events, alphaMix, blend, MixDirection.mixOut);
    } else {
      let timelineMode = from.timelineMode;
      let timelineHoldMix = from.timelineHoldMix;
      let shortestRotation = from.shortestRotation;
      let firstFrame = !shortestRotation && from.timelinesRotation.length != timelineCount << 1;
      if (firstFrame)
        from.timelinesRotation.length = timelineCount << 1;
      from.totalAlpha = 0;
      for (let i = 0; i < timelineCount; i++) {
        let timeline = timelines[i];
        let direction = MixDirection.mixOut;
        let timelineBlend;
        let alpha = 0;
        switch (timelineMode[i]) {
          case SUBSEQUENT:
            if (!drawOrder && timeline instanceof DrawOrderTimeline)
              continue;
            timelineBlend = blend;
            alpha = alphaMix;
            break;
          case FIRST:
            timelineBlend = MixBlend.setup;
            alpha = alphaMix;
            break;
          case HOLD_SUBSEQUENT:
            timelineBlend = blend;
            alpha = alphaHold;
            break;
          case HOLD_FIRST:
            timelineBlend = MixBlend.setup;
            alpha = alphaHold;
            break;
          default:
            timelineBlend = MixBlend.setup;
            let holdMix = timelineHoldMix[i];
            alpha = alphaHold * Math.max(0, 1 - holdMix.mixTime / holdMix.mixDuration);
            break;
        }
        from.totalAlpha += alpha;
        if (!shortestRotation && timeline instanceof RotateTimeline)
          this.applyRotateTimeline(timeline, skeleton, applyTime, alpha, timelineBlend, from.timelinesRotation, i << 1, firstFrame);
        else if (timeline instanceof AttachmentTimeline)
          this.applyAttachmentTimeline(timeline, skeleton, applyTime, timelineBlend, attachments && alpha >= from.alphaAttachmentThreshold);
        else {
          if (drawOrder && timeline instanceof DrawOrderTimeline && timelineBlend == MixBlend.setup)
            direction = MixDirection.mixIn;
          timeline.apply(skeleton, animationLast, applyTime, events, alpha, timelineBlend, direction);
        }
      }
    }
    if (to.mixDuration > 0)
      this.queueEvents(from, animationTime);
    this.events.length = 0;
    from.nextAnimationLast = animationTime;
    from.nextTrackLast = from.trackTime;
    return mix;
  }
  applyAttachmentTimeline(timeline, skeleton, time, blend, attachments) {
    var slot = skeleton.slots[timeline.slotIndex];
    if (!slot.bone.active)
      return;
    if (time < timeline.frames[0]) {
      if (blend == MixBlend.setup || blend == MixBlend.first)
        this.setAttachment(skeleton, slot, slot.data.attachmentName, attachments);
    } else
      this.setAttachment(skeleton, slot, timeline.attachmentNames[Timeline.search1(timeline.frames, time)], attachments);
    if (slot.attachmentState <= this.unkeyedState)
      slot.attachmentState = this.unkeyedState + SETUP;
  }
  setAttachment(skeleton, slot, attachmentName, attachments) {
    slot.setAttachment(!attachmentName ? null : skeleton.getAttachment(slot.data.index, attachmentName));
    if (attachments)
      slot.attachmentState = this.unkeyedState + CURRENT;
  }
  applyRotateTimeline(timeline, skeleton, time, alpha, blend, timelinesRotation, i, firstFrame) {
    if (firstFrame)
      timelinesRotation[i] = 0;
    if (alpha == 1) {
      timeline.apply(skeleton, 0, time, null, 1, blend, MixDirection.mixIn);
      return;
    }
    let bone = skeleton.bones[timeline.boneIndex];
    if (!bone.active)
      return;
    let frames = timeline.frames;
    let r1 = 0, r2 = 0;
    if (time < frames[0]) {
      switch (blend) {
        case MixBlend.setup:
          bone.rotation = bone.data.rotation;
        default:
          return;
        case MixBlend.first:
          r1 = bone.rotation;
          r2 = bone.data.rotation;
      }
    } else {
      r1 = blend == MixBlend.setup ? bone.data.rotation : bone.rotation;
      r2 = bone.data.rotation + timeline.getCurveValue(time);
    }
    let total = 0, diff = r2 - r1;
    diff -= Math.ceil(diff / 360 - 0.5) * 360;
    if (diff == 0) {
      total = timelinesRotation[i];
    } else {
      let lastTotal = 0, lastDiff = 0;
      if (firstFrame) {
        lastTotal = 0;
        lastDiff = diff;
      } else {
        lastTotal = timelinesRotation[i];
        lastDiff = timelinesRotation[i + 1];
      }
      let loops = lastTotal - lastTotal % 360;
      total = diff + loops;
      let current = diff >= 0, dir = lastTotal >= 0;
      if (Math.abs(lastDiff) <= 90 && MathUtils.signum(lastDiff) != MathUtils.signum(diff)) {
        if (Math.abs(lastTotal - loops) > 180) {
          total += 360 * MathUtils.signum(lastTotal);
          dir = current;
        } else if (loops != 0)
          total -= 360 * MathUtils.signum(lastTotal);
        else
          dir = current;
      }
      if (dir != current)
        total += 360 * MathUtils.signum(lastTotal);
      timelinesRotation[i] = total;
    }
    timelinesRotation[i + 1] = diff;
    bone.rotation = r1 + total * alpha;
  }
  queueEvents(entry, animationTime) {
    let animationStart = entry.animationStart, animationEnd = entry.animationEnd;
    let duration = animationEnd - animationStart;
    let trackLastWrapped = entry.trackLast % duration;
    let events = this.events;
    let i = 0, n = events.length;
    for (; i < n; i++) {
      let event2 = events[i];
      if (event2.time < trackLastWrapped)
        break;
      if (event2.time > animationEnd)
        continue;
      this.queue.event(entry, event2);
    }
    let complete = false;
    if (entry.loop) {
      if (duration == 0)
        complete = true;
      else {
        const cycles = Math.floor(entry.trackTime / duration);
        complete = cycles > 0 && cycles > Math.floor(entry.trackLast / duration);
      }
    } else
      complete = animationTime >= animationEnd && entry.animationLast < animationEnd;
    if (complete)
      this.queue.complete(entry);
    for (; i < n; i++) {
      let event2 = events[i];
      if (event2.time < animationStart)
        continue;
      this.queue.event(entry, event2);
    }
  }
  /** Removes all animations from all tracks, leaving skeletons in their current pose.
   *
   * It may be desired to use {@link AnimationState#setEmptyAnimation()} to mix the skeletons back to the setup pose,
   * rather than leaving them in their current pose. */
  clearTracks() {
    let oldDrainDisabled = this.queue.drainDisabled;
    this.queue.drainDisabled = true;
    for (let i = 0, n = this.tracks.length; i < n; i++)
      this.clearTrack(i);
    this.tracks.length = 0;
    this.queue.drainDisabled = oldDrainDisabled;
    this.queue.drain();
  }
  /** Removes all animations from the track, leaving skeletons in their current pose.
   *
   * It may be desired to use {@link AnimationState#setEmptyAnimation()} to mix the skeletons back to the setup pose,
   * rather than leaving them in their current pose. */
  clearTrack(trackIndex) {
    if (trackIndex >= this.tracks.length)
      return;
    let current = this.tracks[trackIndex];
    if (!current)
      return;
    this.queue.end(current);
    this.clearNext(current);
    let entry = current;
    while (true) {
      let from = entry.mixingFrom;
      if (!from)
        break;
      this.queue.end(from);
      entry.mixingFrom = null;
      entry.mixingTo = null;
      entry = from;
    }
    this.tracks[current.trackIndex] = null;
    this.queue.drain();
  }
  setCurrent(index, current, interrupt) {
    let from = this.expandToIndex(index);
    this.tracks[index] = current;
    current.previous = null;
    if (from) {
      if (interrupt)
        this.queue.interrupt(from);
      current.mixingFrom = from;
      from.mixingTo = current;
      current.mixTime = 0;
      if (from.mixingFrom && from.mixDuration > 0)
        current.interruptAlpha *= Math.min(1, from.mixTime / from.mixDuration);
      from.timelinesRotation.length = 0;
    }
    this.queue.start(current);
  }
  /** Sets an animation by name.
    *
    * See {@link #setAnimationWith()}. */
  setAnimation(trackIndex, animationName, loop2 = false) {
    let animation = this.data.skeletonData.findAnimation(animationName);
    if (!animation)
      throw new Error("Animation not found: " + animationName);
    return this.setAnimationWith(trackIndex, animation, loop2);
  }
  /** Sets the current animation for a track, discarding any queued animations. If the formerly current track entry was never
   * applied to a skeleton, it is replaced (not mixed from).
   * @param loop If true, the animation will repeat. If false it will not, instead its last frame is applied if played beyond its
   *           duration. In either case {@link TrackEntry#trackEnd} determines when the track is cleared.
   * @returns A track entry to allow further customization of animation playback. References to the track entry must not be kept
   *         after the {@link AnimationStateListener#dispose()} event occurs. */
  setAnimationWith(trackIndex, animation, loop2 = false) {
    if (!animation)
      throw new Error("animation cannot be null.");
    let interrupt = true;
    let current = this.expandToIndex(trackIndex);
    if (current) {
      if (current.nextTrackLast == -1) {
        this.tracks[trackIndex] = current.mixingFrom;
        this.queue.interrupt(current);
        this.queue.end(current);
        this.clearNext(current);
        current = current.mixingFrom;
        interrupt = false;
      } else
        this.clearNext(current);
    }
    let entry = this.trackEntry(trackIndex, animation, loop2, current);
    this.setCurrent(trackIndex, entry, interrupt);
    this.queue.drain();
    return entry;
  }
  /** Queues an animation by name.
   *
   * See {@link #addAnimationWith()}. */
  addAnimation(trackIndex, animationName, loop2 = false, delay = 0) {
    let animation = this.data.skeletonData.findAnimation(animationName);
    if (!animation)
      throw new Error("Animation not found: " + animationName);
    return this.addAnimationWith(trackIndex, animation, loop2, delay);
  }
  /** Adds an animation to be played after the current or last queued animation for a track. If the track is empty, it is
   * equivalent to calling {@link #setAnimationWith()}.
   * @param delay If > 0, sets {@link TrackEntry#delay}. If <= 0, the delay set is the duration of the previous track entry
   *           minus any mix duration (from the {@link AnimationStateData}) plus the specified `delay` (ie the mix
   *           ends at (`delay` = 0) or before (`delay` < 0) the previous track entry duration). If the
   *           previous entry is looping, its next loop completion is used instead of its duration.
   * @returns A track entry to allow further customization of animation playback. References to the track entry must not be kept
   *         after the {@link AnimationStateListener#dispose()} event occurs. */
  addAnimationWith(trackIndex, animation, loop2 = false, delay = 0) {
    if (!animation)
      throw new Error("animation cannot be null.");
    let last = this.expandToIndex(trackIndex);
    if (last) {
      while (last.next)
        last = last.next;
    }
    let entry = this.trackEntry(trackIndex, animation, loop2, last);
    if (!last) {
      this.setCurrent(trackIndex, entry, true);
      this.queue.drain();
    } else {
      last.next = entry;
      entry.previous = last;
      if (delay <= 0)
        delay += last.getTrackComplete() - entry.mixDuration;
    }
    entry.delay = delay;
    return entry;
  }
  /** Sets an empty animation for a track, discarding any queued animations, and sets the track entry's
   * {@link TrackEntry#mixduration}. An empty animation has no timelines and serves as a placeholder for mixing in or out.
   *
   * Mixing out is done by setting an empty animation with a mix duration using either {@link #setEmptyAnimation()},
   * {@link #setEmptyAnimations()}, or {@link #addEmptyAnimation()}. Mixing to an empty animation causes
   * the previous animation to be applied less and less over the mix duration. Properties keyed in the previous animation
   * transition to the value from lower tracks or to the setup pose value if no lower tracks key the property. A mix duration of
   * 0 still mixes out over one frame.
   *
   * Mixing in is done by first setting an empty animation, then adding an animation using
   * {@link #addAnimation()} and on the returned track entry, set the
   * {@link TrackEntry#setMixDuration()}. Mixing from an empty animation causes the new animation to be applied more and
   * more over the mix duration. Properties keyed in the new animation transition from the value from lower tracks or from the
   * setup pose value if no lower tracks key the property to the value keyed in the new animation. */
  setEmptyAnimation(trackIndex, mixDuration = 0) {
    let entry = this.setAnimationWith(trackIndex, AnimationState.emptyAnimation(), false);
    entry.mixDuration = mixDuration;
    entry.trackEnd = mixDuration;
    return entry;
  }
  /** Adds an empty animation to be played after the current or last queued animation for a track, and sets the track entry's
   * {@link TrackEntry#mixDuration}. If the track is empty, it is equivalent to calling
   * {@link #setEmptyAnimation()}.
   *
   * See {@link #setEmptyAnimation()}.
   * @param delay If > 0, sets {@link TrackEntry#delay}. If <= 0, the delay set is the duration of the previous track entry
   *           minus any mix duration plus the specified `delay` (ie the mix ends at (`delay` = 0) or
   *           before (`delay` < 0) the previous track entry duration). If the previous entry is looping, its next
   *           loop completion is used instead of its duration.
   * @return A track entry to allow further customization of animation playback. References to the track entry must not be kept
   *         after the {@link AnimationStateListener#dispose()} event occurs. */
  addEmptyAnimation(trackIndex, mixDuration = 0, delay = 0) {
    let entry = this.addAnimationWith(trackIndex, AnimationState.emptyAnimation(), false, delay);
    if (delay <= 0)
      entry.delay += entry.mixDuration - mixDuration;
    entry.mixDuration = mixDuration;
    entry.trackEnd = mixDuration;
    return entry;
  }
  /** Sets an empty animation for every track, discarding any queued animations, and mixes to it over the specified mix
    * duration. */
  setEmptyAnimations(mixDuration = 0) {
    let oldDrainDisabled = this.queue.drainDisabled;
    this.queue.drainDisabled = true;
    for (let i = 0, n = this.tracks.length; i < n; i++) {
      let current = this.tracks[i];
      if (current)
        this.setEmptyAnimation(current.trackIndex, mixDuration);
    }
    this.queue.drainDisabled = oldDrainDisabled;
    this.queue.drain();
  }
  expandToIndex(index) {
    if (index < this.tracks.length)
      return this.tracks[index];
    Utils.ensureArrayCapacity(this.tracks, index + 1, null);
    this.tracks.length = index + 1;
    return null;
  }
  /** @param last May be null. */
  trackEntry(trackIndex, animation, loop2, last) {
    let entry = this.trackEntryPool.obtain();
    entry.reset();
    entry.trackIndex = trackIndex;
    entry.animation = animation;
    entry.loop = loop2;
    entry.holdPrevious = false;
    entry.reverse = false;
    entry.shortestRotation = false;
    entry.eventThreshold = 0;
    entry.alphaAttachmentThreshold = 0;
    entry.mixAttachmentThreshold = 0;
    entry.mixDrawOrderThreshold = 0;
    entry.animationStart = 0;
    entry.animationEnd = animation.duration;
    entry.animationLast = -1;
    entry.nextAnimationLast = -1;
    entry.delay = 0;
    entry.trackTime = 0;
    entry.trackLast = -1;
    entry.nextTrackLast = -1;
    entry.trackEnd = Number.MAX_VALUE;
    entry.timeScale = 1;
    entry.alpha = 1;
    entry.mixTime = 0;
    entry.mixDuration = !last ? 0 : this.data.getMix(last.animation, animation);
    entry.interruptAlpha = 1;
    entry.totalAlpha = 0;
    entry.mixBlend = MixBlend.replace;
    return entry;
  }
  /** Removes the {@link TrackEntry#getNext() next entry} and all entries after it for the specified entry. */
  clearNext(entry) {
    let next = entry.next;
    while (next) {
      this.queue.dispose(next);
      next = next.next;
    }
    entry.next = null;
  }
  _animationsChanged() {
    this.animationsChanged = false;
    this.propertyIDs.clear();
    let tracks = this.tracks;
    for (let i = 0, n = tracks.length; i < n; i++) {
      let entry = tracks[i];
      if (!entry)
        continue;
      while (entry.mixingFrom)
        entry = entry.mixingFrom;
      do {
        if (!entry.mixingTo || entry.mixBlend != MixBlend.add)
          this.computeHold(entry);
        entry = entry.mixingTo;
      } while (entry);
    }
  }
  computeHold(entry) {
    let to = entry.mixingTo;
    let timelines = entry.animation.timelines;
    let timelinesCount = entry.animation.timelines.length;
    let timelineMode = entry.timelineMode;
    timelineMode.length = timelinesCount;
    let timelineHoldMix = entry.timelineHoldMix;
    timelineHoldMix.length = 0;
    let propertyIDs = this.propertyIDs;
    if (to && to.holdPrevious) {
      for (let i = 0; i < timelinesCount; i++)
        timelineMode[i] = propertyIDs.addAll(timelines[i].getPropertyIds()) ? HOLD_FIRST : HOLD_SUBSEQUENT;
      return;
    }
    outer: for (let i = 0; i < timelinesCount; i++) {
      let timeline = timelines[i];
      let ids = timeline.getPropertyIds();
      if (!propertyIDs.addAll(ids))
        timelineMode[i] = SUBSEQUENT;
      else if (!to || timeline instanceof AttachmentTimeline || timeline instanceof DrawOrderTimeline || timeline instanceof EventTimeline || !to.animation.hasTimeline(ids)) {
        timelineMode[i] = FIRST;
      } else {
        for (let next = to.mixingTo; next; next = next.mixingTo) {
          if (next.animation.hasTimeline(ids))
            continue;
          if (entry.mixDuration > 0) {
            timelineMode[i] = HOLD_MIX;
            timelineHoldMix[i] = next;
            continue outer;
          }
          break;
        }
        timelineMode[i] = HOLD_FIRST;
      }
    }
  }
  /** Returns the track entry for the animation currently playing on the track, or null if no animation is currently playing. */
  getCurrent(trackIndex) {
    if (trackIndex >= this.tracks.length)
      return null;
    return this.tracks[trackIndex];
  }
  /** Adds a listener to receive events for all track entries. */
  addListener(listener) {
    if (!listener)
      throw new Error("listener cannot be null.");
    this.listeners.push(listener);
  }
  /** Removes the listener added with {@link #addListener()}. */
  removeListener(listener) {
    let index = this.listeners.indexOf(listener);
    if (index >= 0)
      this.listeners.splice(index, 1);
  }
  /** Removes all listeners added with {@link #addListener()}. */
  clearListeners() {
    this.listeners.length = 0;
  }
  /** Discards all listener notifications that have not yet been delivered. This can be useful to call from an
   * {@link AnimationStateListener} when it is known that further notifications that may have been already queued for delivery
   * are not wanted because new animations are being set. */
  clearListenerNotifications() {
    this.queue.clear();
  }
}
class TrackEntry {
  /** The animation to apply for this track entry. */
  animation = null;
  previous = null;
  /** The animation queued to start after this animation, or null. `next` makes up a linked list. */
  next = null;
  /** The track entry for the previous animation when mixing from the previous animation to this animation, or null if no
   * mixing is currently occuring. When mixing from multiple animations, `mixingFrom` makes up a linked list. */
  mixingFrom = null;
  /** The track entry for the next animation when mixing from this animation to the next animation, or null if no mixing is
   * currently occuring. When mixing to multiple animations, `mixingTo` makes up a linked list. */
  mixingTo = null;
  /** The listener for events generated by this track entry, or null.
   *
   * A track entry returned from {@link AnimationState#setAnimation()} is already the current animation
   * for the track, so the track entry listener {@link AnimationStateListener#start()} will not be called. */
  listener = null;
  /** The index of the track where this track entry is either current or queued.
   *
   * See {@link AnimationState#getCurrent()}. */
  trackIndex = 0;
  /** If true, the animation will repeat. If false it will not, instead its last frame is applied if played beyond its
   * duration. */
  loop = false;
  /** If true, when mixing from the previous animation to this animation, the previous animation is applied as normal instead
   * of being mixed out.
   *
   * When mixing between animations that key the same property, if a lower track also keys that property then the value will
   * briefly dip toward the lower track value during the mix. This happens because the first animation mixes from 100% to 0%
   * while the second animation mixes from 0% to 100%. Setting `holdPrevious` to true applies the first animation
   * at 100% during the mix so the lower track value is overwritten. Such dipping does not occur on the lowest track which
   * keys the property, only when a higher track also keys the property.
   *
   * Snapping will occur if `holdPrevious` is true and this animation does not key all the same properties as the
   * previous animation. */
  holdPrevious = false;
  reverse = false;
  shortestRotation = false;
  /** When the mix percentage ({@link #mixTime} / {@link #mixDuration}) is less than the
   * `eventThreshold`, event timelines are applied while this animation is being mixed out. Defaults to 0, so event
   * timelines are not applied while this animation is being mixed out. */
  eventThreshold = 0;
  /** When the mix percentage ({@link #mixtime} / {@link #mixDuration}) is less than the
   * `attachmentThreshold`, attachment timelines are applied while this animation is being mixed out. Defaults to
   * 0, so attachment timelines are not applied while this animation is being mixed out. */
  mixAttachmentThreshold = 0;
  /** When {@link #getAlpha()} is greater than <code>alphaAttachmentThreshold</code>, attachment timelines are applied.
   * Defaults to 0, so attachment timelines are always applied. */
  alphaAttachmentThreshold = 0;
  /** When the mix percentage ({@link #getMixTime()} / {@link #getMixDuration()}) is less than the
   * <code>mixDrawOrderThreshold</code>, draw order timelines are applied while this animation is being mixed out. Defaults to
   * 0, so draw order timelines are not applied while this animation is being mixed out. */
  mixDrawOrderThreshold = 0;
  /** Seconds when this animation starts, both initially and after looping. Defaults to 0.
   *
   * When changing the `animationStart` time, it often makes sense to set {@link #animationLast} to the same
   * value to prevent timeline keys before the start time from triggering. */
  animationStart = 0;
  /** Seconds for the last frame of this animation. Non-looping animations won't play past this time. Looping animations will
   * loop back to {@link #animationStart} at this time. Defaults to the animation {@link Animation#duration}. */
  animationEnd = 0;
  /** The time in seconds this animation was last applied. Some timelines use this for one-time triggers. Eg, when this
   * animation is applied, event timelines will fire all events between the `animationLast` time (exclusive) and
   * `animationTime` (inclusive). Defaults to -1 to ensure triggers on frame 0 happen the first time this animation
   * is applied. */
  animationLast = 0;
  nextAnimationLast = 0;
  /** Seconds to postpone playing the animation. When this track entry is the current track entry, `delay`
   * postpones incrementing the {@link #trackTime}. When this track entry is queued, `delay` is the time from
   * the start of the previous animation to when this track entry will become the current track entry (ie when the previous
   * track entry {@link TrackEntry#trackTime} >= this track entry's `delay`).
   *
   * {@link #timeScale} affects the delay. */
  delay = 0;
  /** Current time in seconds this track entry has been the current track entry. The track time determines
   * {@link #animationTime}. The track time can be set to start the animation at a time other than 0, without affecting
   * looping. */
  trackTime = 0;
  trackLast = 0;
  nextTrackLast = 0;
  /** The track time in seconds when this animation will be removed from the track. Defaults to the highest possible float
   * value, meaning the animation will be applied until a new animation is set or the track is cleared. If the track end time
   * is reached, no other animations are queued for playback, and mixing from any previous animations is complete, then the
   * properties keyed by the animation are set to the setup pose and the track is cleared.
   *
   * It may be desired to use {@link AnimationState#addEmptyAnimation()} rather than have the animation
   * abruptly cease being applied. */
  trackEnd = 0;
  /** Multiplier for the delta time when this track entry is updated, causing time for this animation to pass slower or
   * faster. Defaults to 1.
   *
   * {@link #mixTime} is not affected by track entry time scale, so {@link #mixDuration} may need to be adjusted to
   * match the animation speed.
   *
   * When using {@link AnimationState#addAnimation()} with a `delay` <= 0, note the
   * {@link #delay} is set using the mix duration from the {@link AnimationStateData}, assuming time scale to be 1. If
   * the time scale is not 1, the delay may need to be adjusted.
   *
   * See AnimationState {@link AnimationState#timeScale} for affecting all animations. */
  timeScale = 0;
  /** Values < 1 mix this animation with the skeleton's current pose (usually the pose resulting from lower tracks). Defaults
   * to 1, which overwrites the skeleton's current pose with this animation.
   *
   * Typically track 0 is used to completely pose the skeleton, then alpha is used on higher tracks. It doesn't make sense to
   * use alpha on track 0 if the skeleton pose is from the last frame render. */
  alpha = 0;
  /** Seconds from 0 to the {@link #getMixDuration()} when mixing from the previous animation to this animation. May be
   * slightly more than `mixDuration` when the mix is complete. */
  mixTime = 0;
  /** Seconds for mixing from the previous animation to this animation. Defaults to the value provided by AnimationStateData
   * {@link AnimationStateData#getMix()} based on the animation before this animation (if any).
   *
   * A mix duration of 0 still mixes out over one frame to provide the track entry being mixed out a chance to revert the
   * properties it was animating.
   *
   * The `mixDuration` can be set manually rather than use the value from
   * {@link AnimationStateData#getMix()}. In that case, the `mixDuration` can be set for a new
   * track entry only before {@link AnimationState#update(float)} is first called.
   *
   * When using {@link AnimationState#addAnimation()} with a `delay` <= 0, note the
   * {@link #delay} is set using the mix duration from the {@link AnimationStateData}, not a mix duration set
   * afterward. */
  _mixDuration = 0;
  interruptAlpha = 0;
  totalAlpha = 0;
  get mixDuration() {
    return this._mixDuration;
  }
  set mixDuration(mixDuration) {
    this._mixDuration = mixDuration;
  }
  setMixDurationWithDelay(mixDuration, delay) {
    this._mixDuration = mixDuration;
    if (this.previous != null && delay <= 0)
      delay += this.previous.getTrackComplete() - mixDuration;
    this.delay = delay;
  }
  /** Controls how properties keyed in the animation are mixed with lower tracks. Defaults to {@link MixBlend#replace}, which
   * replaces the values from the lower tracks with the animation values. {@link MixBlend#add} adds the animation values to
   * the values from the lower tracks.
   *
   * The `mixBlend` can be set for a new track entry only before {@link AnimationState#apply()} is first
   * called. */
  mixBlend = MixBlend.replace;
  timelineMode = new Array();
  timelineHoldMix = new Array();
  timelinesRotation = new Array();
  reset() {
    this.next = null;
    this.previous = null;
    this.mixingFrom = null;
    this.mixingTo = null;
    this.animation = null;
    this.listener = null;
    this.timelineMode.length = 0;
    this.timelineHoldMix.length = 0;
    this.timelinesRotation.length = 0;
  }
  /** Uses {@link #trackTime} to compute the `animationTime`, which is between {@link #animationStart}
   * and {@link #animationEnd}. When the `trackTime` is 0, the `animationTime` is equal to the
   * `animationStart` time. */
  getAnimationTime() {
    if (this.loop) {
      let duration = this.animationEnd - this.animationStart;
      if (duration == 0)
        return this.animationStart;
      return this.trackTime % duration + this.animationStart;
    }
    return Math.min(this.trackTime + this.animationStart, this.animationEnd);
  }
  setAnimationLast(animationLast) {
    this.animationLast = animationLast;
    this.nextAnimationLast = animationLast;
  }
  /** Returns true if at least one loop has been completed.
   *
   * See {@link AnimationStateListener#complete()}. */
  isComplete() {
    return this.trackTime >= this.animationEnd - this.animationStart;
  }
  /** Resets the rotation directions for mixing this entry's rotate timelines. This can be useful to avoid bones rotating the
   * long way around when using {@link #alpha} and starting animations on other tracks.
   *
   * Mixing with {@link MixBlend#replace} involves finding a rotation between two others, which has two possible solutions:
   * the short way or the long way around. The two rotations likely change over time, so which direction is the short or long
   * way also changes. If the short way was always chosen, bones would flip to the other side when that direction became the
   * long way. TrackEntry chooses the short way the first time it is applied and remembers that direction. */
  resetRotationDirections() {
    this.timelinesRotation.length = 0;
  }
  getTrackComplete() {
    let duration = this.animationEnd - this.animationStart;
    if (duration != 0) {
      if (this.loop)
        return duration * (1 + (this.trackTime / duration | 0));
      if (this.trackTime < duration)
        return duration;
    }
    return this.trackTime;
  }
  /** Returns true if this track entry has been applied at least once.
   * <p>
   * See {@link AnimationState#apply(Skeleton)}. */
  wasApplied() {
    return this.nextTrackLast != -1;
  }
  /** Returns true if there is a {@link #getNext()} track entry and it will become the current track entry during the next
   * {@link AnimationState#update(float)}. */
  isNextReady() {
    return this.next != null && this.nextTrackLast - this.next.delay >= 0;
  }
}
class EventQueue {
  objects = [];
  drainDisabled = false;
  animState;
  constructor(animState) {
    this.animState = animState;
  }
  start(entry) {
    this.objects.push(EventType.start);
    this.objects.push(entry);
    this.animState.animationsChanged = true;
  }
  interrupt(entry) {
    this.objects.push(EventType.interrupt);
    this.objects.push(entry);
  }
  end(entry) {
    this.objects.push(EventType.end);
    this.objects.push(entry);
    this.animState.animationsChanged = true;
  }
  dispose(entry) {
    this.objects.push(EventType.dispose);
    this.objects.push(entry);
  }
  complete(entry) {
    this.objects.push(EventType.complete);
    this.objects.push(entry);
  }
  event(entry, event2) {
    this.objects.push(EventType.event);
    this.objects.push(entry);
    this.objects.push(event2);
  }
  drain() {
    if (this.drainDisabled)
      return;
    this.drainDisabled = true;
    let objects = this.objects;
    let listeners = this.animState.listeners;
    for (let i = 0; i < objects.length; i += 2) {
      let type = objects[i];
      let entry = objects[i + 1];
      switch (type) {
        case EventType.start:
          if (entry.listener && entry.listener.start)
            entry.listener.start(entry);
          for (let ii = 0; ii < listeners.length; ii++) {
            let listener = listeners[ii];
            if (listener.start)
              listener.start(entry);
          }
          break;
        case EventType.interrupt:
          if (entry.listener && entry.listener.interrupt)
            entry.listener.interrupt(entry);
          for (let ii = 0; ii < listeners.length; ii++) {
            let listener = listeners[ii];
            if (listener.interrupt)
              listener.interrupt(entry);
          }
          break;
        case EventType.end:
          if (entry.listener && entry.listener.end)
            entry.listener.end(entry);
          for (let ii = 0; ii < listeners.length; ii++) {
            let listener = listeners[ii];
            if (listener.end)
              listener.end(entry);
          }
        // Fall through.
        case EventType.dispose:
          if (entry.listener && entry.listener.dispose)
            entry.listener.dispose(entry);
          for (let ii = 0; ii < listeners.length; ii++) {
            let listener = listeners[ii];
            if (listener.dispose)
              listener.dispose(entry);
          }
          this.animState.trackEntryPool.free(entry);
          break;
        case EventType.complete:
          if (entry.listener && entry.listener.complete)
            entry.listener.complete(entry);
          for (let ii = 0; ii < listeners.length; ii++) {
            let listener = listeners[ii];
            if (listener.complete)
              listener.complete(entry);
          }
          break;
        case EventType.event:
          let event2 = objects[i++ + 2];
          if (entry.listener && entry.listener.event)
            entry.listener.event(entry, event2);
          for (let ii = 0; ii < listeners.length; ii++) {
            let listener = listeners[ii];
            if (listener.event)
              listener.event(entry, event2);
          }
          break;
      }
    }
    this.clear();
    this.drainDisabled = false;
  }
  clear() {
    this.objects.length = 0;
  }
}
var EventType;
(function(EventType2) {
  EventType2[EventType2["start"] = 0] = "start";
  EventType2[EventType2["interrupt"] = 1] = "interrupt";
  EventType2[EventType2["end"] = 2] = "end";
  EventType2[EventType2["dispose"] = 3] = "dispose";
  EventType2[EventType2["complete"] = 4] = "complete";
  EventType2[EventType2["event"] = 5] = "event";
})(EventType || (EventType = {}));
const SUBSEQUENT = 0;
const FIRST = 1;
const HOLD_SUBSEQUENT = 2;
const HOLD_FIRST = 3;
const HOLD_MIX = 4;
const SETUP = 1;
const CURRENT = 2;
class Texture {
  _image;
  constructor(image) {
    this._image = image;
  }
  getImage() {
    return this._image;
  }
}
var TextureFilter;
(function(TextureFilter2) {
  TextureFilter2[TextureFilter2["Nearest"] = 9728] = "Nearest";
  TextureFilter2[TextureFilter2["Linear"] = 9729] = "Linear";
  TextureFilter2[TextureFilter2["MipMap"] = 9987] = "MipMap";
  TextureFilter2[TextureFilter2["MipMapNearestNearest"] = 9984] = "MipMapNearestNearest";
  TextureFilter2[TextureFilter2["MipMapLinearNearest"] = 9985] = "MipMapLinearNearest";
  TextureFilter2[TextureFilter2["MipMapNearestLinear"] = 9986] = "MipMapNearestLinear";
  TextureFilter2[TextureFilter2["MipMapLinearLinear"] = 9987] = "MipMapLinearLinear";
})(TextureFilter || (TextureFilter = {}));
var TextureWrap;
(function(TextureWrap2) {
  TextureWrap2[TextureWrap2["MirroredRepeat"] = 33648] = "MirroredRepeat";
  TextureWrap2[TextureWrap2["ClampToEdge"] = 33071] = "ClampToEdge";
  TextureWrap2[TextureWrap2["Repeat"] = 10497] = "Repeat";
})(TextureWrap || (TextureWrap = {}));
class TextureRegion {
  texture;
  u = 0;
  v = 0;
  u2 = 0;
  v2 = 0;
  width = 0;
  height = 0;
  degrees = 0;
  offsetX = 0;
  offsetY = 0;
  originalWidth = 0;
  originalHeight = 0;
}
class TextureAtlas {
  pages = new Array();
  regions = new Array();
  constructor(atlasText) {
    let reader = new TextureAtlasReader(atlasText);
    let entry = new Array(4);
    let pageFields = {};
    pageFields["size"] = (page3) => {
      page3.width = parseInt(entry[1]);
      page3.height = parseInt(entry[2]);
    };
    pageFields["format"] = () => {
    };
    pageFields["filter"] = (page3) => {
      page3.minFilter = Utils.enumValue(TextureFilter, entry[1]);
      page3.magFilter = Utils.enumValue(TextureFilter, entry[2]);
    };
    pageFields["repeat"] = (page3) => {
      if (entry[1].indexOf("x") != -1)
        page3.uWrap = TextureWrap.Repeat;
      if (entry[1].indexOf("y") != -1)
        page3.vWrap = TextureWrap.Repeat;
    };
    pageFields["pma"] = (page3) => {
      page3.pma = entry[1] == "true";
    };
    var regionFields = {};
    regionFields["xy"] = (region) => {
      region.x = parseInt(entry[1]);
      region.y = parseInt(entry[2]);
    };
    regionFields["size"] = (region) => {
      region.width = parseInt(entry[1]);
      region.height = parseInt(entry[2]);
    };
    regionFields["bounds"] = (region) => {
      region.x = parseInt(entry[1]);
      region.y = parseInt(entry[2]);
      region.width = parseInt(entry[3]);
      region.height = parseInt(entry[4]);
    };
    regionFields["offset"] = (region) => {
      region.offsetX = parseInt(entry[1]);
      region.offsetY = parseInt(entry[2]);
    };
    regionFields["orig"] = (region) => {
      region.originalWidth = parseInt(entry[1]);
      region.originalHeight = parseInt(entry[2]);
    };
    regionFields["offsets"] = (region) => {
      region.offsetX = parseInt(entry[1]);
      region.offsetY = parseInt(entry[2]);
      region.originalWidth = parseInt(entry[3]);
      region.originalHeight = parseInt(entry[4]);
    };
    regionFields["rotate"] = (region) => {
      let value = entry[1];
      if (value == "true")
        region.degrees = 90;
      else if (value != "false")
        region.degrees = parseInt(value);
    };
    regionFields["index"] = (region) => {
      region.index = parseInt(entry[1]);
    };
    let line = reader.readLine();
    while (line && line.trim().length == 0)
      line = reader.readLine();
    while (true) {
      if (!line || line.trim().length == 0)
        break;
      if (reader.readEntry(entry, line) == 0)
        break;
      line = reader.readLine();
    }
    let page2 = null;
    let names = null;
    let values = null;
    while (true) {
      if (line === null)
        break;
      if (line.trim().length == 0) {
        page2 = null;
        line = reader.readLine();
      } else if (!page2) {
        page2 = new TextureAtlasPage(line.trim());
        while (true) {
          if (reader.readEntry(entry, line = reader.readLine()) == 0)
            break;
          let field = pageFields[entry[0]];
          if (field)
            field(page2);
        }
        this.pages.push(page2);
      } else {
        let region = new TextureAtlasRegion(page2, line);
        while (true) {
          let count = reader.readEntry(entry, line = reader.readLine());
          if (count == 0)
            break;
          let field = regionFields[entry[0]];
          if (field)
            field(region);
          else {
            if (!names)
              names = [];
            if (!values)
              values = [];
            names.push(entry[0]);
            let entryValues = [];
            for (let i = 0; i < count; i++)
              entryValues.push(parseInt(entry[i + 1]));
            values.push(entryValues);
          }
        }
        if (region.originalWidth == 0 && region.originalHeight == 0) {
          region.originalWidth = region.width;
          region.originalHeight = region.height;
        }
        if (names && names.length > 0 && values && values.length > 0) {
          region.names = names;
          region.values = values;
          names = null;
          values = null;
        }
        region.u = region.x / page2.width;
        region.v = region.y / page2.height;
        if (region.degrees == 90) {
          region.u2 = (region.x + region.height) / page2.width;
          region.v2 = (region.y + region.width) / page2.height;
        } else {
          region.u2 = (region.x + region.width) / page2.width;
          region.v2 = (region.y + region.height) / page2.height;
        }
        this.regions.push(region);
      }
    }
  }
  findRegion(name) {
    for (let i = 0; i < this.regions.length; i++) {
      if (this.regions[i].name == name) {
        return this.regions[i];
      }
    }
    return null;
  }
  setTextures(assetManager, pathPrefix = "") {
    for (let page2 of this.pages)
      page2.setTexture(assetManager.get(pathPrefix + page2.name));
  }
  dispose() {
    for (let i = 0; i < this.pages.length; i++) {
      this.pages[i].texture?.dispose();
    }
  }
}
class TextureAtlasReader {
  lines;
  index = 0;
  constructor(text) {
    this.lines = text.split(/\r\n|\r|\n/);
  }
  readLine() {
    if (this.index >= this.lines.length)
      return null;
    return this.lines[this.index++];
  }
  readEntry(entry, line) {
    if (!line)
      return 0;
    line = line.trim();
    if (line.length == 0)
      return 0;
    let colon = line.indexOf(":");
    if (colon == -1)
      return 0;
    entry[0] = line.substr(0, colon).trim();
    for (let i = 1, lastMatch = colon + 1; ; i++) {
      let comma = line.indexOf(",", lastMatch);
      if (comma == -1) {
        entry[i] = line.substr(lastMatch).trim();
        return i;
      }
      entry[i] = line.substr(lastMatch, comma - lastMatch).trim();
      lastMatch = comma + 1;
      if (i == 4)
        return 4;
    }
  }
}
class TextureAtlasPage {
  name;
  minFilter = TextureFilter.Nearest;
  magFilter = TextureFilter.Nearest;
  uWrap = TextureWrap.ClampToEdge;
  vWrap = TextureWrap.ClampToEdge;
  texture = null;
  width = 0;
  height = 0;
  pma = false;
  regions = new Array();
  constructor(name) {
    this.name = name;
  }
  setTexture(texture) {
    this.texture = texture;
    texture.setFilters(this.minFilter, this.magFilter);
    texture.setWraps(this.uWrap, this.vWrap);
    for (let region of this.regions)
      region.texture = texture;
  }
}
class TextureAtlasRegion extends TextureRegion {
  page;
  name;
  x = 0;
  y = 0;
  offsetX = 0;
  offsetY = 0;
  originalWidth = 0;
  originalHeight = 0;
  index = 0;
  degrees = 0;
  names = null;
  values = null;
  constructor(page2, name) {
    super();
    this.page = page2;
    this.name = name;
    page2.regions.push(this);
  }
}
class MeshAttachment extends VertexAttachment {
  region = null;
  /** The name of the texture region for this attachment. */
  path;
  /** The UV pair for each vertex, normalized within the texture region. */
  regionUVs = [];
  /** The UV pair for each vertex, normalized within the entire texture.
   *
   * See {@link #updateUVs}. */
  uvs = [];
  /** Triplets of vertex indices which describe the mesh's triangulation. */
  triangles = [];
  /** The color to tint the mesh. */
  color = new Color(1, 1, 1, 1);
  /** The width of the mesh's image. Available only when nonessential data was exported. */
  width = 0;
  /** The height of the mesh's image. Available only when nonessential data was exported. */
  height = 0;
  /** The number of entries at the beginning of {@link #vertices} that make up the mesh hull. */
  hullLength = 0;
  /** Vertex index pairs describing edges for controling triangulation. Mesh triangles will never cross edges. Only available if
   * nonessential data was exported. Triangulation is not performed at runtime. */
  edges = [];
  parentMesh = null;
  sequence = null;
  tempColor = new Color(0, 0, 0, 0);
  constructor(name, path2) {
    super(name);
    this.path = path2;
  }
  /** Calculates {@link #uvs} using the {@link #regionUVs} and region. Must be called if the region, the region's properties, or
   * the {@link #regionUVs} are changed. */
  updateRegion() {
    if (!this.region)
      throw new Error("Region not set.");
    let regionUVs = this.regionUVs;
    if (!this.uvs || this.uvs.length != regionUVs.length)
      this.uvs = Utils.newFloatArray(regionUVs.length);
    let uvs = this.uvs;
    let n = this.uvs.length;
    let u = this.region.u, v = this.region.v, width = 0, height = 0;
    if (this.region instanceof TextureAtlasRegion) {
      let region = this.region, page2 = region.page;
      let textureWidth = page2.width, textureHeight = page2.height;
      switch (region.degrees) {
        case 90:
          u -= (region.originalHeight - region.offsetY - region.height) / textureWidth;
          v -= (region.originalWidth - region.offsetX - region.width) / textureHeight;
          width = region.originalHeight / textureWidth;
          height = region.originalWidth / textureHeight;
          for (let i = 0; i < n; i += 2) {
            uvs[i] = u + regionUVs[i + 1] * width;
            uvs[i + 1] = v + (1 - regionUVs[i]) * height;
          }
          return;
        case 180:
          u -= (region.originalWidth - region.offsetX - region.width) / textureWidth;
          v -= region.offsetY / textureHeight;
          width = region.originalWidth / textureWidth;
          height = region.originalHeight / textureHeight;
          for (let i = 0; i < n; i += 2) {
            uvs[i] = u + (1 - regionUVs[i]) * width;
            uvs[i + 1] = v + (1 - regionUVs[i + 1]) * height;
          }
          return;
        case 270:
          u -= region.offsetY / textureWidth;
          v -= region.offsetX / textureHeight;
          width = region.originalHeight / textureWidth;
          height = region.originalWidth / textureHeight;
          for (let i = 0; i < n; i += 2) {
            uvs[i] = u + (1 - regionUVs[i + 1]) * width;
            uvs[i + 1] = v + regionUVs[i] * height;
          }
          return;
      }
      u -= region.offsetX / textureWidth;
      v -= (region.originalHeight - region.offsetY - region.height) / textureHeight;
      width = region.originalWidth / textureWidth;
      height = region.originalHeight / textureHeight;
    } else if (!this.region) {
      u = v = 0;
      width = height = 1;
    } else {
      width = this.region.u2 - u;
      height = this.region.v2 - v;
    }
    for (let i = 0; i < n; i += 2) {
      uvs[i] = u + regionUVs[i] * width;
      uvs[i + 1] = v + regionUVs[i + 1] * height;
    }
  }
  /** The parent mesh if this is a linked mesh, else null. A linked mesh shares the {@link #bones}, {@link #vertices},
   * {@link #regionUVs}, {@link #triangles}, {@link #hullLength}, {@link #edges}, {@link #width}, and {@link #height} with the
   * parent mesh, but may have a different {@link #name} or {@link #path} (and therefore a different texture). */
  getParentMesh() {
    return this.parentMesh;
  }
  /** @param parentMesh May be null. */
  setParentMesh(parentMesh) {
    this.parentMesh = parentMesh;
    if (parentMesh) {
      this.bones = parentMesh.bones;
      this.vertices = parentMesh.vertices;
      this.worldVerticesLength = parentMesh.worldVerticesLength;
      this.regionUVs = parentMesh.regionUVs;
      this.triangles = parentMesh.triangles;
      this.hullLength = parentMesh.hullLength;
      this.worldVerticesLength = parentMesh.worldVerticesLength;
    }
  }
  copy() {
    if (this.parentMesh)
      return this.newLinkedMesh();
    let copy = new MeshAttachment(this.name, this.path);
    copy.region = this.region;
    copy.color.setFromColor(this.color);
    this.copyTo(copy);
    copy.regionUVs = new Array(this.regionUVs.length);
    Utils.arrayCopy(this.regionUVs, 0, copy.regionUVs, 0, this.regionUVs.length);
    copy.uvs = new Array(this.uvs.length);
    Utils.arrayCopy(this.uvs, 0, copy.uvs, 0, this.uvs.length);
    copy.triangles = new Array(this.triangles.length);
    Utils.arrayCopy(this.triangles, 0, copy.triangles, 0, this.triangles.length);
    copy.hullLength = this.hullLength;
    copy.sequence = this.sequence != null ? this.sequence.copy() : null;
    if (this.edges) {
      copy.edges = new Array(this.edges.length);
      Utils.arrayCopy(this.edges, 0, copy.edges, 0, this.edges.length);
    }
    copy.width = this.width;
    copy.height = this.height;
    return copy;
  }
  computeWorldVertices(slot, start, count, worldVertices, offset, stride) {
    if (this.sequence != null)
      this.sequence.apply(slot, this);
    super.computeWorldVertices(slot, start, count, worldVertices, offset, stride);
  }
  /** Returns a new mesh with the {@link #parentMesh} set to this mesh's parent mesh, if any, else to this mesh. **/
  newLinkedMesh() {
    let copy = new MeshAttachment(this.name, this.path);
    copy.region = this.region;
    copy.color.setFromColor(this.color);
    copy.timelineAttachment = this.timelineAttachment;
    copy.setParentMesh(this.parentMesh ? this.parentMesh : this);
    if (copy.region != null)
      copy.updateRegion();
    return copy;
  }
}
class RegionAttachment extends Attachment {
  /** The local x translation. */
  x = 0;
  /** The local y translation. */
  y = 0;
  /** The local scaleX. */
  scaleX = 1;
  /** The local scaleY. */
  scaleY = 1;
  /** The local rotation. */
  rotation = 0;
  /** The width of the region attachment in Spine. */
  width = 0;
  /** The height of the region attachment in Spine. */
  height = 0;
  /** The color to tint the region attachment. */
  color = new Color(1, 1, 1, 1);
  /** The name of the texture region for this attachment. */
  path;
  region = null;
  sequence = null;
  /** For each of the 4 vertices, a pair of <code>x,y</code> values that is the local position of the vertex.
   *
   * See {@link #updateOffset()}. */
  offset = Utils.newFloatArray(8);
  uvs = Utils.newFloatArray(8);
  tempColor = new Color(1, 1, 1, 1);
  constructor(name, path2) {
    super(name);
    this.path = path2;
  }
  /** Calculates the {@link #offset} using the region settings. Must be called after changing region settings. */
  updateRegion() {
    if (!this.region)
      throw new Error("Region not set.");
    let region = this.region;
    let uvs = this.uvs;
    if (region == null) {
      uvs[0] = 0;
      uvs[1] = 0;
      uvs[2] = 0;
      uvs[3] = 1;
      uvs[4] = 1;
      uvs[5] = 1;
      uvs[6] = 1;
      uvs[7] = 0;
      return;
    }
    let regionScaleX = this.width / this.region.originalWidth * this.scaleX;
    let regionScaleY = this.height / this.region.originalHeight * this.scaleY;
    let localX = -this.width / 2 * this.scaleX + this.region.offsetX * regionScaleX;
    let localY = -this.height / 2 * this.scaleY + this.region.offsetY * regionScaleY;
    let localX2 = localX + this.region.width * regionScaleX;
    let localY2 = localY + this.region.height * regionScaleY;
    let radians = this.rotation * MathUtils.degRad;
    let cos = Math.cos(radians);
    let sin = Math.sin(radians);
    let x = this.x, y = this.y;
    let localXCos = localX * cos + x;
    let localXSin = localX * sin;
    let localYCos = localY * cos + y;
    let localYSin = localY * sin;
    let localX2Cos = localX2 * cos + x;
    let localX2Sin = localX2 * sin;
    let localY2Cos = localY2 * cos + y;
    let localY2Sin = localY2 * sin;
    let offset = this.offset;
    offset[0] = localXCos - localYSin;
    offset[1] = localYCos + localXSin;
    offset[2] = localXCos - localY2Sin;
    offset[3] = localY2Cos + localXSin;
    offset[4] = localX2Cos - localY2Sin;
    offset[5] = localY2Cos + localX2Sin;
    offset[6] = localX2Cos - localYSin;
    offset[7] = localYCos + localX2Sin;
    if (region.degrees == 90) {
      uvs[0] = region.u2;
      uvs[1] = region.v2;
      uvs[2] = region.u;
      uvs[3] = region.v2;
      uvs[4] = region.u;
      uvs[5] = region.v;
      uvs[6] = region.u2;
      uvs[7] = region.v;
    } else {
      uvs[0] = region.u;
      uvs[1] = region.v2;
      uvs[2] = region.u;
      uvs[3] = region.v;
      uvs[4] = region.u2;
      uvs[5] = region.v;
      uvs[6] = region.u2;
      uvs[7] = region.v2;
    }
  }
  /** Transforms the attachment's four vertices to world coordinates. If the attachment has a {@link #sequence}, the region may
   * be changed.
   * <p>
   * See <a href="http://esotericsoftware.com/spine-runtime-skeletons#World-transforms">World transforms</a> in the Spine
   * Runtimes Guide.
   * @param worldVertices The output world vertices. Must have a length >= <code>offset</code> + 8.
   * @param offset The <code>worldVertices</code> index to begin writing values.
   * @param stride The number of <code>worldVertices</code> entries between the value pairs written. */
  computeWorldVertices(slot, worldVertices, offset, stride) {
    if (this.sequence != null)
      this.sequence.apply(slot, this);
    let bone = slot.bone;
    let vertexOffset = this.offset;
    let x = bone.worldX, y = bone.worldY;
    let a = bone.a, b = bone.b, c = bone.c, d = bone.d;
    let offsetX = 0, offsetY = 0;
    offsetX = vertexOffset[0];
    offsetY = vertexOffset[1];
    worldVertices[offset] = offsetX * a + offsetY * b + x;
    worldVertices[offset + 1] = offsetX * c + offsetY * d + y;
    offset += stride;
    offsetX = vertexOffset[2];
    offsetY = vertexOffset[3];
    worldVertices[offset] = offsetX * a + offsetY * b + x;
    worldVertices[offset + 1] = offsetX * c + offsetY * d + y;
    offset += stride;
    offsetX = vertexOffset[4];
    offsetY = vertexOffset[5];
    worldVertices[offset] = offsetX * a + offsetY * b + x;
    worldVertices[offset + 1] = offsetX * c + offsetY * d + y;
    offset += stride;
    offsetX = vertexOffset[6];
    offsetY = vertexOffset[7];
    worldVertices[offset] = offsetX * a + offsetY * b + x;
    worldVertices[offset + 1] = offsetX * c + offsetY * d + y;
  }
  copy() {
    let copy = new RegionAttachment(this.name, this.path);
    copy.region = this.region;
    copy.x = this.x;
    copy.y = this.y;
    copy.scaleX = this.scaleX;
    copy.scaleY = this.scaleY;
    copy.rotation = this.rotation;
    copy.width = this.width;
    copy.height = this.height;
    Utils.arrayCopy(this.uvs, 0, copy.uvs, 0, 8);
    Utils.arrayCopy(this.offset, 0, copy.offset, 0, 8);
    copy.color.setFromColor(this.color);
    copy.sequence = this.sequence != null ? this.sequence.copy() : null;
    return copy;
  }
  static X1 = 0;
  static Y1 = 1;
  static C1R = 2;
  static C1G = 3;
  static C1B = 4;
  static C1A = 5;
  static U1 = 6;
  static V1 = 7;
  static X2 = 8;
  static Y2 = 9;
  static C2R = 10;
  static C2G = 11;
  static C2B = 12;
  static C2A = 13;
  static U2 = 14;
  static V2 = 15;
  static X3 = 16;
  static Y3 = 17;
  static C3R = 18;
  static C3G = 19;
  static C3B = 20;
  static C3A = 21;
  static U3 = 22;
  static V3 = 23;
  static X4 = 24;
  static Y4 = 25;
  static C4R = 26;
  static C4G = 27;
  static C4B = 28;
  static C4A = 29;
  static U4 = 30;
  static V4 = 31;
}
var Inherit;
(function(Inherit2) {
  Inherit2[Inherit2["Normal"] = 0] = "Normal";
  Inherit2[Inherit2["OnlyTranslation"] = 1] = "OnlyTranslation";
  Inherit2[Inherit2["NoRotationOrReflection"] = 2] = "NoRotationOrReflection";
  Inherit2[Inherit2["NoScale"] = 3] = "NoScale";
  Inherit2[Inherit2["NoScaleOrReflection"] = 4] = "NoScaleOrReflection";
})(Inherit || (Inherit = {}));
var PositionMode;
(function(PositionMode2) {
  PositionMode2[PositionMode2["Fixed"] = 0] = "Fixed";
  PositionMode2[PositionMode2["Percent"] = 1] = "Percent";
})(PositionMode || (PositionMode = {}));
var SpacingMode;
(function(SpacingMode2) {
  SpacingMode2[SpacingMode2["Length"] = 0] = "Length";
  SpacingMode2[SpacingMode2["Fixed"] = 1] = "Fixed";
  SpacingMode2[SpacingMode2["Percent"] = 2] = "Percent";
  SpacingMode2[SpacingMode2["Proportional"] = 3] = "Proportional";
})(SpacingMode || (SpacingMode = {}));
var RotateMode;
(function(RotateMode2) {
  RotateMode2[RotateMode2["Tangent"] = 0] = "Tangent";
  RotateMode2[RotateMode2["Chain"] = 1] = "Chain";
  RotateMode2[RotateMode2["ChainScale"] = 2] = "ChainScale";
})(RotateMode || (RotateMode = {}));
var Physics;
(function(Physics2) {
  Physics2[Physics2["none"] = 0] = "none";
  Physics2[Physics2["reset"] = 1] = "reset";
  Physics2[Physics2["update"] = 2] = "update";
  Physics2[Physics2["pose"] = 3] = "pose";
})(Physics || (Physics = {}));
var BlendMode;
(function(BlendMode2) {
  BlendMode2[BlendMode2["Normal"] = 0] = "Normal";
  BlendMode2[BlendMode2["Additive"] = 1] = "Additive";
  BlendMode2[BlendMode2["Multiply"] = 2] = "Multiply";
  BlendMode2[BlendMode2["Screen"] = 3] = "Screen";
})(BlendMode || (BlendMode = {}));
var AttachmentType;
(function(AttachmentType2) {
  AttachmentType2[AttachmentType2["Region"] = 0] = "Region";
  AttachmentType2[AttachmentType2["BoundingBox"] = 1] = "BoundingBox";
  AttachmentType2[AttachmentType2["Mesh"] = 2] = "Mesh";
  AttachmentType2[AttachmentType2["LinkedMesh"] = 3] = "LinkedMesh";
  AttachmentType2[AttachmentType2["Path"] = 4] = "Path";
  AttachmentType2[AttachmentType2["Point"] = 5] = "Point";
  AttachmentType2[AttachmentType2["Clipping"] = 6] = "Clipping";
})(AttachmentType || (AttachmentType = {}));
(() => {
  if (typeof Math.fround === "undefined") {
    Math.fround = /* @__PURE__ */ function(array) {
      return function(x) {
        return array[0] = x, array[0];
      };
    }(new Float32Array(1));
  }
})();
class SpineTexture extends Texture {
  static textureMap = /* @__PURE__ */ new Map();
  static from(texture) {
    if (SpineTexture.textureMap.has(texture)) {
      return SpineTexture.textureMap.get(texture);
    }
    return new SpineTexture(texture);
  }
  texture;
  constructor(image) {
    super(image.resource);
    this.texture = Texture$1.from(image);
  }
  setFilters(minFilter, magFilter) {
    const style = this.texture.source.style;
    style.minFilter = SpineTexture.toPixiTextureFilter(minFilter);
    style.magFilter = SpineTexture.toPixiTextureFilter(magFilter);
    this.texture.source.autoGenerateMipmaps = SpineTexture.toPixiMipMap(minFilter);
    this.texture.source.updateMipmaps();
  }
  setWraps(uWrap, vWrap) {
    const style = this.texture.source.style;
    style.addressModeU = SpineTexture.toPixiTextureWrap(uWrap);
    style.addressModeV = SpineTexture.toPixiTextureWrap(vWrap);
  }
  dispose() {
    this.texture.destroy();
  }
  static toPixiMipMap(filter) {
    switch (filter) {
      case TextureFilter.Nearest:
      case TextureFilter.Linear:
        return false;
      case TextureFilter.MipMapNearestLinear:
      case TextureFilter.MipMapNearestNearest:
      case TextureFilter.MipMapLinearLinear:
      // TextureFilter.MipMapLinearLinear == TextureFilter.MipMap
      case TextureFilter.MipMapLinearNearest:
        return true;
      default:
        throw new Error(`Unknown texture filter: ${String(filter)}`);
    }
  }
  static toPixiTextureFilter(filter) {
    switch (filter) {
      case TextureFilter.Nearest:
      case TextureFilter.MipMapNearestLinear:
      case TextureFilter.MipMapNearestNearest:
        return "nearest";
      case TextureFilter.Linear:
      case TextureFilter.MipMapLinearLinear:
      // TextureFilter.MipMapLinearLinear == TextureFilter.MipMap
      case TextureFilter.MipMapLinearNearest:
        return "linear";
      default:
        throw new Error(`Unknown texture filter: ${String(filter)}`);
    }
  }
  static toPixiTextureWrap(wrap) {
    switch (wrap) {
      case TextureWrap.ClampToEdge:
        return "clamp-to-edge";
      case TextureWrap.MirroredRepeat:
        return "mirror-repeat";
      case TextureWrap.Repeat:
        return "repeat";
      default:
        throw new Error(`Unknown texture wrap: ${String(wrap)}`);
    }
  }
  static toPixiBlending(blend) {
    switch (blend) {
      case BlendMode.Normal:
        return "normal";
      case BlendMode.Additive:
        return "add";
      case BlendMode.Multiply:
        return "multiply";
      case BlendMode.Screen:
        return "screen";
      default:
        throw new Error(`Unknown blendMode: ${String(blend)}`);
    }
  }
}
const spineTextureAtlasLoader = {
  extension: ExtensionType.Asset,
  resolver: {
    test: (value) => checkExtension(value, ".atlas"),
    parse: (value) => {
      const split = value.split(".");
      return {
        resolution: parseFloat(Resolver.RETINA_PREFIX?.exec(value)?.[1] ?? "1"),
        format: split[split.length - 2],
        src: value
      };
    }
  },
  loader: {
    extension: {
      type: ExtensionType.LoadParser,
      priority: LoaderParserPriority.Normal,
      name: "spineTextureAtlasLoader"
    },
    test(url) {
      return checkExtension(url, ".atlas");
    },
    async load(url) {
      const response = await DOMAdapter.get().fetch(url);
      const txt = await response.text();
      return txt;
    },
    testParse(asset, options) {
      const isExtensionRight = checkExtension(options.src, ".atlas");
      const isString = typeof asset === "string";
      return Promise.resolve(isExtensionRight && isString);
    },
    unload(atlas) {
      atlas.dispose();
    },
    async parse(asset, options, loader) {
      const metadata = options.data || {};
      let basePath = path.dirname(options.src);
      if (basePath && basePath.lastIndexOf("/") !== basePath.length - 1) {
        basePath += "/";
      }
      const retval = new TextureAtlas(asset);
      if (metadata.images instanceof TextureSource || typeof metadata.images === "string") {
        const pixiTexture = metadata.images;
        metadata.images = {};
        metadata.images[retval.pages[0].name] = pixiTexture;
      }
      const textureLoadingPromises = [];
      for (const page2 of retval.pages) {
        const pageName = page2.name;
        const providedPage = metadata?.images ? metadata.images[pageName] : void 0;
        if (providedPage instanceof TextureSource) {
          page2.setTexture(SpineTexture.from(providedPage));
        } else {
          const url = providedPage ?? path.normalize([...basePath.split(path.sep), pageName].join(path.sep));
          const assetsToLoadIn = {
            src: copySearchParams(url, options.src),
            data: {
              ...metadata.imageMetadata,
              alphaMode: page2.pma ? "premultiplied-alpha" : "premultiply-alpha-on-upload"
            }
          };
          const pixiPromise = loader.load(assetsToLoadIn).then((texture) => {
            page2.setTexture(SpineTexture.from(texture.source));
          });
          textureLoadingPromises.push(pixiPromise);
        }
      }
      await Promise.all(textureLoadingPromises);
      return retval;
    }
  }
};
extensions.add(spineTextureAtlasLoader);
function isJson(resource) {
  return Object.prototype.hasOwnProperty.call(resource, "bones");
}
function isBuffer(resource) {
  return resource instanceof Uint8Array;
}
const spineLoaderExtension = {
  extension: ExtensionType.Asset,
  loader: {
    extension: {
      type: ExtensionType.LoadParser,
      priority: LoaderParserPriority.Normal,
      name: "spineSkeletonLoader"
    },
    test(url) {
      return checkExtension(url, ".skel");
    },
    async load(url) {
      const response = await DOMAdapter.get().fetch(url);
      const buffer = new Uint8Array(await response.arrayBuffer());
      return buffer;
    },
    testParse(asset, options) {
      const isJsonSpineModel = checkExtension(options.src, ".json") && isJson(asset);
      const isBinarySpineModel = checkExtension(options.src, ".skel") && isBuffer(asset);
      return Promise.resolve(isJsonSpineModel || isBinarySpineModel);
    }
  }
};
extensions.add(spineLoaderExtension);
const placeHolderBufferData = new Float32Array(1);
const placeHolderIndexData = new Uint32Array(1);
class DarkTintBatchGeometry extends Geometry {
  constructor() {
    const vertexSize = 7;
    const attributeBuffer = new Buffer({
      data: placeHolderBufferData,
      label: "attribute-batch-buffer",
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
      shrinkToFit: false
    });
    const indexBuffer = new Buffer({
      data: placeHolderIndexData,
      label: "index-batch-buffer",
      usage: BufferUsage.INDEX | BufferUsage.COPY_DST,
      // | BufferUsage.STATIC,
      shrinkToFit: false
    });
    const stride = vertexSize * 4;
    super({
      attributes: {
        aPosition: {
          buffer: attributeBuffer,
          format: "float32x2",
          stride,
          offset: 0
        },
        aUV: {
          buffer: attributeBuffer,
          format: "float32x2",
          stride,
          offset: 2 * 4
        },
        aColor: {
          buffer: attributeBuffer,
          format: "unorm8x4",
          stride,
          offset: 4 * 4
        },
        aDarkColor: {
          buffer: attributeBuffer,
          format: "unorm8x4",
          stride,
          offset: 5 * 4
        },
        aTextureIdAndRound: {
          buffer: attributeBuffer,
          format: "uint16x2",
          stride,
          offset: 6 * 4
        }
      },
      indexBuffer
    });
  }
}
const darkTintBit = {
  name: "color-bit",
  vertex: {
    header: (
      /* wgsl */
      `
            @in aDarkColor: vec4<f32>;
            @out vDarkColor: vec4<f32>;
        `
    ),
    main: (
      /* wgsl */
      `
        vDarkColor = aDarkColor;
        `
    )
  },
  fragment: {
    header: (
      /* wgsl */
      `
            @in vDarkColor: vec4<f32>;
        `
    ),
    end: (
      /* wgsl */
      `

        let alpha = outColor.a * vColor.a;
        let rgb = ((outColor.a - 1.0) * vDarkColor.a + 1.0 - outColor.rgb) * vDarkColor.rgb + outColor.rgb * vColor.rgb;

        finalColor = vec4<f32>(rgb, alpha);

        `
    )
  }
};
const darkTintBitGl = {
  name: "color-bit",
  vertex: {
    header: (
      /* glsl */
      `
            in vec4 aDarkColor;
            out vec4 vDarkColor;
        `
    ),
    main: (
      /* glsl */
      `
            vDarkColor = aDarkColor;
        `
    )
  },
  fragment: {
    header: (
      /* glsl */
      `
            in vec4 vDarkColor;
        `
    ),
    end: (
      /* glsl */
      `

        finalColor.a = outColor.a * vColor.a;
        finalColor.rgb = ((outColor.a - 1.0) * vDarkColor.a + 1.0 - outColor.rgb) * vDarkColor.rgb + outColor.rgb * vColor.rgb;
        `
    )
  }
};
class DarkTintShader extends Shader {
  constructor(maxTextures) {
    const glProgram = compileHighShaderGlProgram({
      name: "dark-tint-batch",
      bits: [
        colorBitGl,
        darkTintBitGl,
        generateTextureBatchBitGl(maxTextures),
        roundPixelsBitGl
      ]
    });
    const gpuProgram = compileHighShaderGpuProgram({
      name: "dark-tint-batch",
      bits: [
        colorBit,
        darkTintBit,
        generateTextureBatchBit(maxTextures),
        roundPixelsBit
      ]
    });
    super({
      glProgram,
      gpuProgram,
      resources: {
        batchSamplers: getBatchSamplersUniformGroup(maxTextures)
      }
    });
  }
}
let defaultShader = null;
class DarkTintBatcher extends Batcher {
  /** @ignore */
  static extension = {
    type: [
      ExtensionType.Batcher
    ],
    name: "darkTint"
  };
  geometry = new DarkTintBatchGeometry();
  shader = defaultShader || (defaultShader = new DarkTintShader(this.maxTextures));
  name = DarkTintBatcher.extension.name;
  /** The size of one attribute. 1 = 32 bit. x, y, u, v, color, darkColor, textureIdAndRound -> total = 7 */
  vertexSize = 7;
  packAttributes(element, float32View, uint32View, index, textureId) {
    const textureIdAndRound = textureId << 16 | element.roundPixels & 65535;
    const wt = element.transform;
    const a = wt.a;
    const b = wt.b;
    const c = wt.c;
    const d = wt.d;
    const tx = wt.tx;
    const ty = wt.ty;
    const { positions, uvs } = element;
    const argb = element.color;
    const worldAlpha = (argb >> 24 & 255) / 255;
    const darkColor = Color$1.shared.setValue(element.darkColor).premultiply(worldAlpha, true).toPremultiplied(1, false);
    const offset = element.attributeOffset;
    const end = offset + element.attributeSize;
    for (let i = offset; i < end; i++) {
      const i2 = i * 2;
      const x = positions[i2];
      const y = positions[i2 + 1];
      float32View[index++] = a * x + c * y + tx;
      float32View[index++] = d * y + b * x + ty;
      float32View[index++] = uvs[i2];
      float32View[index++] = uvs[i2 + 1];
      uint32View[index++] = argb;
      uint32View[index++] = darkColor;
      uint32View[index++] = textureIdAndRound;
    }
  }
  packQuadAttributes(element, float32View, uint32View, index, textureId) {
    const texture = element.texture;
    const wt = element.transform;
    const a = wt.a;
    const b = wt.b;
    const c = wt.c;
    const d = wt.d;
    const tx = wt.tx;
    const ty = wt.ty;
    const bounds = element.bounds;
    const w0 = bounds.maxX;
    const w1 = bounds.minX;
    const h0 = bounds.maxY;
    const h1 = bounds.minY;
    const uvs = texture.uvs;
    const argb = element.color;
    const darkColor = element.darkColor;
    const textureIdAndRound = textureId << 16 | element.roundPixels & 65535;
    float32View[index + 0] = a * w1 + c * h1 + tx;
    float32View[index + 1] = d * h1 + b * w1 + ty;
    float32View[index + 2] = uvs.x0;
    float32View[index + 3] = uvs.y0;
    uint32View[index + 4] = argb;
    uint32View[index + 5] = darkColor;
    uint32View[index + 6] = textureIdAndRound;
    float32View[index + 7] = a * w0 + c * h1 + tx;
    float32View[index + 8] = d * h1 + b * w0 + ty;
    float32View[index + 9] = uvs.x1;
    float32View[index + 10] = uvs.y1;
    uint32View[index + 11] = argb;
    uint32View[index + 12] = darkColor;
    uint32View[index + 13] = textureIdAndRound;
    float32View[index + 14] = a * w0 + c * h0 + tx;
    float32View[index + 15] = d * h0 + b * w0 + ty;
    float32View[index + 16] = uvs.x2;
    float32View[index + 17] = uvs.y2;
    uint32View[index + 18] = argb;
    uint32View[index + 19] = darkColor;
    uint32View[index + 20] = textureIdAndRound;
    float32View[index + 21] = a * w1 + c * h0 + tx;
    float32View[index + 22] = d * h0 + b * w1 + ty;
    float32View[index + 23] = uvs.x3;
    float32View[index + 24] = uvs.y3;
    uint32View[index + 25] = argb;
    uint32View[index + 26] = darkColor;
    uint32View[index + 27] = textureIdAndRound;
  }
}
extensions.add(DarkTintBatcher);
class BatchableSpineSlot {
  indexOffset = 0;
  attributeOffset = 0;
  indexSize;
  attributeSize;
  batcherName = "darkTint";
  topology = "triangle-list";
  packAsQuad = false;
  renderable;
  positions;
  indices;
  uvs;
  roundPixels;
  data;
  blendMode;
  darkTint;
  texture;
  transform;
  // used internally by batcher specific. Stored for efficient updating.
  _textureId;
  _attributeStart;
  _indexStart;
  _batcher;
  _batch;
  get color() {
    const slotColor = this.data.color;
    const parentColor = this.renderable.groupColor;
    const parentAlpha = this.renderable.groupAlpha;
    let abgr;
    const mixedA = slotColor.a * parentAlpha * 255;
    if (parentColor !== 16777215) {
      const parentB = parentColor >> 16 & 255;
      const parentG = parentColor >> 8 & 255;
      const parentR = parentColor & 255;
      const mixedR = slotColor.r * parentR;
      const mixedG = slotColor.g * parentG;
      const mixedB = slotColor.b * parentB;
      abgr = mixedA << 24 | mixedB << 16 | mixedG << 8 | mixedR;
    } else {
      abgr = mixedA << 24 | slotColor.b * 255 << 16 | slotColor.g * 255 << 8 | slotColor.r * 255;
    }
    return abgr;
  }
  get darkColor() {
    const darkColor = this.data.darkColor;
    return darkColor.b * 255 << 16 | darkColor.g * 255 << 8 | darkColor.r * 255;
  }
  get groupTransform() {
    return this.renderable.groupTransform;
  }
  setData(renderable, data, blendMode, roundPixels) {
    this.renderable = renderable;
    this.transform = renderable.groupTransform;
    this.data = data;
    if (data.clipped) {
      const clippedData = data.clippedData;
      this.indexSize = clippedData.indicesCount;
      this.attributeSize = clippedData.vertexCount;
      this.positions = clippedData.vertices;
      this.indices = clippedData.indices;
      this.uvs = clippedData.uvs;
    } else {
      this.indexSize = data.indices.length;
      this.attributeSize = data.vertices.length / 2;
      this.positions = data.vertices;
      this.indices = data.indices;
      this.uvs = data.uvs;
    }
    this.texture = data.texture;
    this.roundPixels = roundPixels;
    this.blendMode = blendMode;
    this.batcherName = data.darkTint ? "darkTint" : "default";
  }
}
const spineBlendModeMap = {
  0: "normal",
  1: "add",
  2: "multiply",
  3: "screen"
};
class SpinePipe {
  /** @ignore */
  static extension = {
    type: [
      ExtensionType.WebGLPipes,
      ExtensionType.WebGPUPipes,
      ExtensionType.CanvasPipes
    ],
    name: "spine"
  };
  renderer;
  gpuSpineData = {};
  _destroyRenderableBound = this.destroyRenderable.bind(this);
  constructor(renderer) {
    this.renderer = renderer;
  }
  validateRenderable(spine) {
    spine._validateAndTransformAttachments();
    if (spine.spineAttachmentsDirty) {
      return true;
    } else if (spine.spineTexturesDirty) {
      const drawOrder = spine.skeleton.drawOrder;
      const gpuSpine = this.gpuSpineData[spine.uid];
      for (let i = 0, n = drawOrder.length; i < n; i++) {
        const slot = drawOrder[i];
        const attachment = slot.getAttachment();
        if (attachment instanceof RegionAttachment || attachment instanceof MeshAttachment) {
          const cacheData = spine._getCachedData(slot, attachment);
          const batchableSpineSlot = gpuSpine.slotBatches[cacheData.id];
          const texture = cacheData.texture;
          if (texture !== batchableSpineSlot.texture) {
            if (!batchableSpineSlot._batcher.checkAndUpdateTexture(batchableSpineSlot, texture)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
  addRenderable(spine, instructionSet) {
    const gpuSpine = this._getSpineData(spine);
    const batcher = this.renderer.renderPipes.batch;
    const drawOrder = spine.skeleton.drawOrder;
    const roundPixels = this.renderer._roundPixels | spine._roundPixels;
    spine._validateAndTransformAttachments();
    spine.spineAttachmentsDirty = false;
    spine.spineTexturesDirty = false;
    for (let i = 0, n = drawOrder.length; i < n; i++) {
      const slot = drawOrder[i];
      const attachment = slot.getAttachment();
      const blendMode = spineBlendModeMap[slot.data.blendMode];
      if (attachment instanceof RegionAttachment || attachment instanceof MeshAttachment) {
        const cacheData = spine._getCachedData(slot, attachment);
        const batchableSpineSlot = gpuSpine.slotBatches[cacheData.id] ||= new BatchableSpineSlot();
        batchableSpineSlot.setData(spine, cacheData, blendMode, roundPixels);
        if (!cacheData.skipRender) {
          batcher.addToBatch(batchableSpineSlot, instructionSet);
        }
      }
      const containerAttachment = spine._slotsObject[slot.data.name];
      if (containerAttachment) {
        const container = containerAttachment.container;
        container.includeInBuild = true;
        collectAllRenderables(container, instructionSet, this.renderer);
        container.includeInBuild = false;
      }
    }
  }
  updateRenderable(spine) {
    const gpuSpine = this.gpuSpineData[spine.uid];
    spine._validateAndTransformAttachments();
    spine.spineAttachmentsDirty = false;
    spine.spineTexturesDirty = false;
    const drawOrder = spine.skeleton.drawOrder;
    for (let i = 0, n = drawOrder.length; i < n; i++) {
      const slot = drawOrder[i];
      const attachment = slot.getAttachment();
      if (attachment instanceof RegionAttachment || attachment instanceof MeshAttachment) {
        const cacheData = spine._getCachedData(slot, attachment);
        if (!cacheData.skipRender) {
          const batchableSpineSlot = gpuSpine.slotBatches[spine._getCachedData(slot, attachment).id];
          batchableSpineSlot._batcher?.updateElement(batchableSpineSlot);
        }
      }
    }
  }
  destroyRenderable(spine) {
    this.gpuSpineData[spine.uid] = null;
    spine.off("destroyed", this._destroyRenderableBound);
  }
  destroy() {
    this.gpuSpineData = null;
    this.renderer = null;
  }
  _getSpineData(spine) {
    return this.gpuSpineData[spine.uid] || this._initMeshData(spine);
  }
  _initMeshData(spine) {
    this.gpuSpineData[spine.uid] = { slotBatches: {} };
    spine.on("destroyed", this._destroyRenderableBound);
    return this.gpuSpineData[spine.uid];
  }
}
extensions.add(SpinePipe);
const APP_NS = "@@pixi_svelte";
function setContextApp(value) {
  setContext$1(APP_NS, value);
}
function getContextApp() {
  return getContext$1(APP_NS);
}
const PARENT_NS = "@@pixi_parent";
function createContextParent(value) {
  const addToParent = (node) => {
  };
  const context2 = { parent: value, addToParent };
  setContext$1(PARENT_NS, context2);
  return context2;
}
function getContextParent() {
  return getContext$1(PARENT_NS);
}
var webfontloader = { exports: {} };
var hasRequiredWebfontloader;
function requireWebfontloader() {
  if (hasRequiredWebfontloader) return webfontloader.exports;
  hasRequiredWebfontloader = 1;
  (function(module) {
    (function() {
      function aa(a, b, c) {
        return a.call.apply(a.bind, arguments);
      }
      function ba(a, b, c) {
        if (!a) throw Error();
        if (2 < arguments.length) {
          var d = Array.prototype.slice.call(arguments, 2);
          return function() {
            var c2 = Array.prototype.slice.call(arguments);
            Array.prototype.unshift.apply(c2, d);
            return a.apply(b, c2);
          };
        }
        return function() {
          return a.apply(b, arguments);
        };
      }
      function p(a, b, c) {
        p = Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf("native code") ? aa : ba;
        return p.apply(null, arguments);
      }
      var q = Date.now || function() {
        return +/* @__PURE__ */ new Date();
      };
      function ca(a, b) {
        this.a = a;
        this.o = b || a;
        this.c = this.o.document;
      }
      var da = !!window.FontFace;
      function t(a, b, c, d) {
        b = a.c.createElement(b);
        if (c) for (var e in c) c.hasOwnProperty(e) && ("style" == e ? b.style.cssText = c[e] : b.setAttribute(e, c[e]));
        d && b.appendChild(a.c.createTextNode(d));
        return b;
      }
      function u(a, b, c) {
        a = a.c.getElementsByTagName(b)[0];
        a || (a = document.documentElement);
        a.insertBefore(c, a.lastChild);
      }
      function v(a) {
        a.parentNode && a.parentNode.removeChild(a);
      }
      function w(a, b, c) {
        b = b || [];
        c = c || [];
        for (var d = a.className.split(/\s+/), e = 0; e < b.length; e += 1) {
          for (var f = false, g = 0; g < d.length; g += 1) if (b[e] === d[g]) {
            f = true;
            break;
          }
          f || d.push(b[e]);
        }
        b = [];
        for (e = 0; e < d.length; e += 1) {
          f = false;
          for (g = 0; g < c.length; g += 1) if (d[e] === c[g]) {
            f = true;
            break;
          }
          f || b.push(d[e]);
        }
        a.className = b.join(" ").replace(/\s+/g, " ").replace(/^\s+|\s+$/, "");
      }
      function y(a, b) {
        for (var c = a.className.split(/\s+/), d = 0, e = c.length; d < e; d++) if (c[d] == b) return true;
        return false;
      }
      function ea(a) {
        return a.o.location.hostname || a.a.location.hostname;
      }
      function z(a, b, c) {
        function d() {
          m && e && f && (m(g), m = null);
        }
        b = t(a, "link", { rel: "stylesheet", href: b, media: "all" });
        var e = false, f = true, g = null, m = c || null;
        da ? (b.onload = function() {
          e = true;
          d();
        }, b.onerror = function() {
          e = true;
          g = Error("Stylesheet failed to load");
          d();
        }) : setTimeout(function() {
          e = true;
          d();
        }, 0);
        u(a, "head", b);
      }
      function A(a, b, c, d) {
        var e = a.c.getElementsByTagName("head")[0];
        if (e) {
          var f = t(a, "script", { src: b }), g = false;
          f.onload = f.onreadystatechange = function() {
            g || this.readyState && "loaded" != this.readyState && "complete" != this.readyState || (g = true, c && c(null), f.onload = f.onreadystatechange = null, "HEAD" == f.parentNode.tagName && e.removeChild(f));
          };
          e.appendChild(f);
          setTimeout(function() {
            g || (g = true, c && c(Error("Script load timeout")));
          }, d || 5e3);
          return f;
        }
        return null;
      }
      function B() {
        this.a = 0;
        this.c = null;
      }
      function C2(a) {
        a.a++;
        return function() {
          a.a--;
          D(a);
        };
      }
      function E(a, b) {
        a.c = b;
        D(a);
      }
      function D(a) {
        0 == a.a && a.c && (a.c(), a.c = null);
      }
      function F(a) {
        this.a = a || "-";
      }
      F.prototype.c = function(a) {
        for (var b = [], c = 0; c < arguments.length; c++) b.push(arguments[c].replace(/[\W_]+/g, "").toLowerCase());
        return b.join(this.a);
      };
      function G(a, b) {
        this.c = a;
        this.f = 4;
        this.a = "n";
        var c = (b || "n4").match(/^([nio])([1-9])$/i);
        c && (this.a = c[1], this.f = parseInt(c[2], 10));
      }
      function fa(a) {
        return H(a) + " " + (a.f + "00") + " 300px " + I(a.c);
      }
      function I(a) {
        var b = [];
        a = a.split(/,\s*/);
        for (var c = 0; c < a.length; c++) {
          var d = a[c].replace(/['"]/g, "");
          -1 != d.indexOf(" ") || /^\d/.test(d) ? b.push("'" + d + "'") : b.push(d);
        }
        return b.join(",");
      }
      function J(a) {
        return a.a + a.f;
      }
      function H(a) {
        var b = "normal";
        "o" === a.a ? b = "oblique" : "i" === a.a && (b = "italic");
        return b;
      }
      function ga(a) {
        var b = 4, c = "n", d = null;
        a && ((d = a.match(/(normal|oblique|italic)/i)) && d[1] && (c = d[1].substr(0, 1).toLowerCase()), (d = a.match(/([1-9]00|normal|bold)/i)) && d[1] && (/bold/i.test(d[1]) ? b = 7 : /[1-9]00/.test(d[1]) && (b = parseInt(d[1].substr(0, 1), 10))));
        return c + b;
      }
      function ha(a, b) {
        this.c = a;
        this.f = a.o.document.documentElement;
        this.h = b;
        this.a = new F("-");
        this.j = false !== b.events;
        this.g = false !== b.classes;
      }
      function ia(a) {
        a.g && w(a.f, [a.a.c("wf", "loading")]);
        K(a, "loading");
      }
      function L(a) {
        if (a.g) {
          var b = y(a.f, a.a.c("wf", "active")), c = [], d = [a.a.c("wf", "loading")];
          b || c.push(a.a.c("wf", "inactive"));
          w(a.f, c, d);
        }
        K(a, "inactive");
      }
      function K(a, b, c) {
        if (a.j && a.h[b]) if (c) a.h[b](c.c, J(c));
        else a.h[b]();
      }
      function ja() {
        this.c = {};
      }
      function ka(a, b, c) {
        var d = [], e;
        for (e in b) if (b.hasOwnProperty(e)) {
          var f = a.c[e];
          f && d.push(f(b[e], c));
        }
        return d;
      }
      function M(a, b) {
        this.c = a;
        this.f = b;
        this.a = t(this.c, "span", { "aria-hidden": "true" }, this.f);
      }
      function N(a) {
        u(a.c, "body", a.a);
      }
      function O(a) {
        return "display:block;position:absolute;top:-9999px;left:-9999px;font-size:300px;width:auto;height:auto;line-height:normal;margin:0;padding:0;font-variant:normal;white-space:nowrap;font-family:" + I(a.c) + ";" + ("font-style:" + H(a) + ";font-weight:" + (a.f + "00") + ";");
      }
      function P(a, b, c, d, e, f) {
        this.g = a;
        this.j = b;
        this.a = d;
        this.c = c;
        this.f = e || 3e3;
        this.h = f || void 0;
      }
      P.prototype.start = function() {
        var a = this.c.o.document, b = this, c = q(), d = new Promise(function(d2, e2) {
          function f2() {
            q() - c >= b.f ? e2() : a.fonts.load(fa(b.a), b.h).then(function(a2) {
              1 <= a2.length ? d2() : setTimeout(f2, 25);
            }, function() {
              e2();
            });
          }
          f2();
        }), e = null, f = new Promise(function(a2, d2) {
          e = setTimeout(d2, b.f);
        });
        Promise.race([f, d]).then(function() {
          e && (clearTimeout(e), e = null);
          b.g(b.a);
        }, function() {
          b.j(b.a);
        });
      };
      function Q(a, b, c, d, e, f, g) {
        this.v = a;
        this.B = b;
        this.c = c;
        this.a = d;
        this.s = g || "BESbswy";
        this.f = {};
        this.w = e || 3e3;
        this.u = f || null;
        this.m = this.j = this.h = this.g = null;
        this.g = new M(this.c, this.s);
        this.h = new M(this.c, this.s);
        this.j = new M(this.c, this.s);
        this.m = new M(this.c, this.s);
        a = new G(this.a.c + ",serif", J(this.a));
        a = O(a);
        this.g.a.style.cssText = a;
        a = new G(this.a.c + ",sans-serif", J(this.a));
        a = O(a);
        this.h.a.style.cssText = a;
        a = new G("serif", J(this.a));
        a = O(a);
        this.j.a.style.cssText = a;
        a = new G("sans-serif", J(this.a));
        a = O(a);
        this.m.a.style.cssText = a;
        N(this.g);
        N(this.h);
        N(this.j);
        N(this.m);
      }
      var R = { D: "serif", C: "sans-serif" }, S = null;
      function T() {
        if (null === S) {
          var a = /AppleWebKit\/([0-9]+)(?:\.([0-9]+))/.exec(window.navigator.userAgent);
          S = !!a && (536 > parseInt(a[1], 10) || 536 === parseInt(a[1], 10) && 11 >= parseInt(a[2], 10));
        }
        return S;
      }
      Q.prototype.start = function() {
        this.f.serif = this.j.a.offsetWidth;
        this.f["sans-serif"] = this.m.a.offsetWidth;
        this.A = q();
        U(this);
      };
      function la(a, b, c) {
        for (var d in R) if (R.hasOwnProperty(d) && b === a.f[R[d]] && c === a.f[R[d]]) return true;
        return false;
      }
      function U(a) {
        var b = a.g.a.offsetWidth, c = a.h.a.offsetWidth, d;
        (d = b === a.f.serif && c === a.f["sans-serif"]) || (d = T() && la(a, b, c));
        d ? q() - a.A >= a.w ? T() && la(a, b, c) && (null === a.u || a.u.hasOwnProperty(a.a.c)) ? V(a, a.v) : V(a, a.B) : ma(a) : V(a, a.v);
      }
      function ma(a) {
        setTimeout(p(function() {
          U(this);
        }, a), 50);
      }
      function V(a, b) {
        setTimeout(p(function() {
          v(this.g.a);
          v(this.h.a);
          v(this.j.a);
          v(this.m.a);
          b(this.a);
        }, a), 0);
      }
      function W(a, b, c) {
        this.c = a;
        this.a = b;
        this.f = 0;
        this.m = this.j = false;
        this.s = c;
      }
      var X = null;
      W.prototype.g = function(a) {
        var b = this.a;
        b.g && w(b.f, [b.a.c("wf", a.c, J(a).toString(), "active")], [b.a.c("wf", a.c, J(a).toString(), "loading"), b.a.c("wf", a.c, J(a).toString(), "inactive")]);
        K(b, "fontactive", a);
        this.m = true;
        na(this);
      };
      W.prototype.h = function(a) {
        var b = this.a;
        if (b.g) {
          var c = y(b.f, b.a.c("wf", a.c, J(a).toString(), "active")), d = [], e = [b.a.c("wf", a.c, J(a).toString(), "loading")];
          c || d.push(b.a.c("wf", a.c, J(a).toString(), "inactive"));
          w(b.f, d, e);
        }
        K(b, "fontinactive", a);
        na(this);
      };
      function na(a) {
        0 == --a.f && a.j && (a.m ? (a = a.a, a.g && w(a.f, [a.a.c("wf", "active")], [a.a.c("wf", "loading"), a.a.c("wf", "inactive")]), K(a, "active")) : L(a.a));
      }
      function oa(a) {
        this.j = a;
        this.a = new ja();
        this.h = 0;
        this.f = this.g = true;
      }
      oa.prototype.load = function(a) {
        this.c = new ca(this.j, a.context || this.j);
        this.g = false !== a.events;
        this.f = false !== a.classes;
        pa(this, new ha(this.c, a), a);
      };
      function qa(a, b, c, d, e) {
        var f = 0 == --a.h;
        (a.f || a.g) && setTimeout(function() {
          var a2 = e || null, m = d || null || {};
          if (0 === c.length && f) L(b.a);
          else {
            b.f += c.length;
            f && (b.j = f);
            var h, l = [];
            for (h = 0; h < c.length; h++) {
              var k = c[h], n = m[k.c], r = b.a, x = k;
              r.g && w(r.f, [r.a.c("wf", x.c, J(x).toString(), "loading")]);
              K(r, "fontloading", x);
              r = null;
              if (null === X) if (window.FontFace) {
                var x = /Gecko.*Firefox\/(\d+)/.exec(window.navigator.userAgent), xa = /OS X.*Version\/10\..*Safari/.exec(window.navigator.userAgent) && /Apple/.exec(window.navigator.vendor);
                X = x ? 42 < parseInt(x[1], 10) : xa ? false : true;
              } else X = false;
              X ? r = new P(p(b.g, b), p(b.h, b), b.c, k, b.s, n) : r = new Q(p(b.g, b), p(b.h, b), b.c, k, b.s, a2, n);
              l.push(r);
            }
            for (h = 0; h < l.length; h++) l[h].start();
          }
        }, 0);
      }
      function pa(a, b, c) {
        var d = [], e = c.timeout;
        ia(b);
        var d = ka(a.a, c, a.c), f = new W(a.c, b, e);
        a.h = d.length;
        b = 0;
        for (c = d.length; b < c; b++) d[b].load(function(b2, d2, c2) {
          qa(a, f, b2, d2, c2);
        });
      }
      function ra(a, b) {
        this.c = a;
        this.a = b;
      }
      ra.prototype.load = function(a) {
        function b() {
          if (f["__mti_fntLst" + d]) {
            var c2 = f["__mti_fntLst" + d](), e2 = [], h;
            if (c2) for (var l = 0; l < c2.length; l++) {
              var k = c2[l].fontfamily;
              void 0 != c2[l].fontStyle && void 0 != c2[l].fontWeight ? (h = c2[l].fontStyle + c2[l].fontWeight, e2.push(new G(k, h))) : e2.push(new G(k));
            }
            a(e2);
          } else setTimeout(function() {
            b();
          }, 50);
        }
        var c = this, d = c.a.projectId, e = c.a.version;
        if (d) {
          var f = c.c.o;
          A(this.c, (c.a.api || "https://fast.fonts.net/jsapi") + "/" + d + ".js" + (e ? "?v=" + e : ""), function(e2) {
            e2 ? a([]) : (f["__MonotypeConfiguration__" + d] = function() {
              return c.a;
            }, b());
          }).id = "__MonotypeAPIScript__" + d;
        } else a([]);
      };
      function sa(a, b) {
        this.c = a;
        this.a = b;
      }
      sa.prototype.load = function(a) {
        var b, c, d = this.a.urls || [], e = this.a.families || [], f = this.a.testStrings || {}, g = new B();
        b = 0;
        for (c = d.length; b < c; b++) z(this.c, d[b], C2(g));
        var m = [];
        b = 0;
        for (c = e.length; b < c; b++) if (d = e[b].split(":"), d[1]) for (var h = d[1].split(","), l = 0; l < h.length; l += 1) m.push(new G(d[0], h[l]));
        else m.push(new G(d[0]));
        E(g, function() {
          a(m, f);
        });
      };
      function ta(a, b) {
        a ? this.c = a : this.c = ua;
        this.a = [];
        this.f = [];
        this.g = b || "";
      }
      var ua = "https://fonts.googleapis.com/css";
      function va(a, b) {
        for (var c = b.length, d = 0; d < c; d++) {
          var e = b[d].split(":");
          3 == e.length && a.f.push(e.pop());
          var f = "";
          2 == e.length && "" != e[1] && (f = ":");
          a.a.push(e.join(f));
        }
      }
      function wa(a) {
        if (0 == a.a.length) throw Error("No fonts to load!");
        if (-1 != a.c.indexOf("kit=")) return a.c;
        for (var b = a.a.length, c = [], d = 0; d < b; d++) c.push(a.a[d].replace(/ /g, "+"));
        b = a.c + "?family=" + c.join("%7C");
        0 < a.f.length && (b += "&subset=" + a.f.join(","));
        0 < a.g.length && (b += "&text=" + encodeURIComponent(a.g));
        return b;
      }
      function ya(a) {
        this.f = a;
        this.a = [];
        this.c = {};
      }
      var za = { latin: "BESbswy", "latin-ext": "çöüğş", cyrillic: "йяЖ", greek: "αβΣ", khmer: "កខគ", Hanuman: "កខគ" }, Aa = { thin: "1", extralight: "2", "extra-light": "2", ultralight: "2", "ultra-light": "2", light: "3", regular: "4", book: "4", medium: "5", "semi-bold": "6", semibold: "6", "demi-bold": "6", demibold: "6", bold: "7", "extra-bold": "8", extrabold: "8", "ultra-bold": "8", ultrabold: "8", black: "9", heavy: "9", l: "3", r: "4", b: "7" }, Ba = { i: "i", italic: "i", n: "n", normal: "n" }, Ca = /^(thin|(?:(?:extra|ultra)-?)?light|regular|book|medium|(?:(?:semi|demi|extra|ultra)-?)?bold|black|heavy|l|r|b|[1-9]00)?(n|i|normal|italic)?$/;
      function Da(a) {
        for (var b = a.f.length, c = 0; c < b; c++) {
          var d = a.f[c].split(":"), e = d[0].replace(/\+/g, " "), f = ["n4"];
          if (2 <= d.length) {
            var g;
            var m = d[1];
            g = [];
            if (m) for (var m = m.split(","), h = m.length, l = 0; l < h; l++) {
              var k;
              k = m[l];
              if (k.match(/^[\w-]+$/)) {
                var n = Ca.exec(k.toLowerCase());
                if (null == n) k = "";
                else {
                  k = n[2];
                  k = null == k || "" == k ? "n" : Ba[k];
                  n = n[1];
                  if (null == n || "" == n) n = "4";
                  else var r = Aa[n], n = r ? r : isNaN(n) ? "4" : n.substr(0, 1);
                  k = [k, n].join("");
                }
              } else k = "";
              k && g.push(k);
            }
            0 < g.length && (f = g);
            3 == d.length && (d = d[2], g = [], d = d ? d.split(",") : g, 0 < d.length && (d = za[d[0]]) && (a.c[e] = d));
          }
          a.c[e] || (d = za[e]) && (a.c[e] = d);
          for (d = 0; d < f.length; d += 1) a.a.push(new G(e, f[d]));
        }
      }
      function Ea(a, b) {
        this.c = a;
        this.a = b;
      }
      var Fa = { Arimo: true, Cousine: true, Tinos: true };
      Ea.prototype.load = function(a) {
        var b = new B(), c = this.c, d = new ta(this.a.api, this.a.text), e = this.a.families;
        va(d, e);
        var f = new ya(e);
        Da(f);
        z(c, wa(d), C2(b));
        E(b, function() {
          a(f.a, f.c, Fa);
        });
      };
      function Ga(a, b) {
        this.c = a;
        this.a = b;
      }
      Ga.prototype.load = function(a) {
        var b = this.a.id, c = this.c.o;
        b ? A(this.c, (this.a.api || "https://use.typekit.net") + "/" + b + ".js", function(b2) {
          if (b2) a([]);
          else if (c.Typekit && c.Typekit.config && c.Typekit.config.fn) {
            b2 = c.Typekit.config.fn;
            for (var e = [], f = 0; f < b2.length; f += 2) for (var g = b2[f], m = b2[f + 1], h = 0; h < m.length; h++) e.push(new G(g, m[h]));
            try {
              c.Typekit.load({ events: false, classes: false, async: true });
            } catch (l) {
            }
            a(e);
          }
        }, 2e3) : a([]);
      };
      function Ha(a, b) {
        this.c = a;
        this.f = b;
        this.a = [];
      }
      Ha.prototype.load = function(a) {
        var b = this.f.id, c = this.c.o, d = this;
        b ? (c.__webfontfontdeckmodule__ || (c.__webfontfontdeckmodule__ = {}), c.__webfontfontdeckmodule__[b] = function(b2, c2) {
          for (var g = 0, m = c2.fonts.length; g < m; ++g) {
            var h = c2.fonts[g];
            d.a.push(new G(h.name, ga("font-weight:" + h.weight + ";font-style:" + h.style)));
          }
          a(d.a);
        }, A(this.c, (this.f.api || "https://f.fontdeck.com/s/css/js/") + ea(this.c) + "/" + b + ".js", function(b2) {
          b2 && a([]);
        })) : a([]);
      };
      var Y = new oa(window);
      Y.a.c.custom = function(a, b) {
        return new sa(b, a);
      };
      Y.a.c.fontdeck = function(a, b) {
        return new Ha(b, a);
      };
      Y.a.c.monotype = function(a, b) {
        return new ra(b, a);
      };
      Y.a.c.typekit = function(a, b) {
        return new Ga(b, a);
      };
      Y.a.c.google = function(a, b) {
        return new Ea(b, a);
      };
      var Z = { load: p(Y.load, Y) };
      module.exports ? module.exports = Z : (window.WebFont = Z, window.WebFontConfig && Y.load(window.WebFontConfig));
    })();
  })(webfontloader);
  return webfontloader.exports;
}
requireWebfontloader();
const getPointValues = ({ point, defaultValue }) => {
  const finalDefaultValue = defaultValue;
  if (typeof point === "number") return [point, point];
  return [
    (point === null || point === void 0 ? void 0 : point.x) || finalDefaultValue,
    (point === null || point === void 0 ? void 0 : point.y) || finalDefaultValue
  ];
};
const anchorToPivot = ({ anchor, sizes }) => {
  const { width, height } = sizes;
  const [anchorX, anchorY] = getPointValues({ point: anchor, defaultValue: 0 });
  return { x: width * anchorX, y: height * anchorY };
};
function InitialiseApplication($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const context2 = getContextApp();
  onDestroy(() => {
    if (context2.stateApp.pixiApplication) {
      context2.stateApp.pixiApplication.destroy();
    }
  });
  $$payload.out += `<div>`;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div>`;
  pop();
}
function InitialiseParent($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const context2 = getContextApp();
  let parentContext = createContextParent(context2.stateApp.pixiApplication?.stage ?? new PIXI.Container());
  if (parentContext.parent) {
    $$payload.out += "<!--[-->";
    props.children($$payload);
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function AssetsLoader($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const context2 = getContextApp();
  context2.stateApp.assets ? Object.keys(context2.stateApp.assets).filter((key) => Boolean(context2.stateApp.assets?.[key].preload) === false) : [];
  context2.stateApp.assets ? Object.keys(context2.stateApp.assets).filter((key) => context2.stateApp.assets?.[key].preload === true) : [];
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function App($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const context2 = getContextApp();
  onDestroy(() => context2.stateApp.reset());
  InitialiseApplication($$payload, {
    children: ($$payload2) => {
      InitialiseParent($$payload2, {
        children: ($$payload3) => {
          AssetsLoader($$payload3, {
            children: ($$payload4) => {
              props.children($$payload4);
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
        },
        $$slots: { default: true }
      });
    },
    $$slots: { default: true }
  });
  pop();
}
function Text($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const parentContext = getContextParent();
  const text = new PIXI$1.Text({ text: props.text, style: props.style });
  parentContext.addToParent(text);
  pop();
}
function Container($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const parentContext = getContextParent();
  const container = new PIXI$1.Container();
  parentContext.addToParent(container);
  createContextParent(container);
  props.children($$payload);
  $$payload.out += `<!---->`;
  pop();
}
function Graphics($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const parentContext = getContextParent();
  const graphics = new PIXI$1.Graphics();
  parentContext.addToParent(graphics);
  pop();
}
function Rectangle$1($$payload, $$props) {
  push();
  const {
    anchor,
    width,
    height,
    borderRadius,
    backgroundColor,
    backgroundAlpha,
    borderColor,
    borderWidth,
    borderAlpha,
    $$slots,
    $$events,
    ...graphicsProps
  } = $$props;
  Graphics($$payload, spread_props([
    graphicsProps,
    {
      pivot: anchorToPivot({ anchor, sizes: { width, height } }),
      draw: (graphics) => {
        graphics.roundRect(0, 0, width, height, borderRadius ?? 0);
        graphics.fill({
          color: backgroundColor ?? 0,
          alpha: backgroundAlpha ?? 1
        });
        graphics.stroke({
          color: borderColor ?? 0,
          width: borderWidth ?? 0,
          alpha: borderAlpha ?? 1
        });
      }
    }
  ]));
  pop();
}
function BaseSprite($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const parentContext = getContextParent();
  const sprite = new PIXI$1.Sprite(props.texture);
  parentContext.addToParent(sprite);
  pop();
}
function Sprite($$payload, $$props) {
  push();
  const {
    debug,
    key,
    $$slots,
    $$events,
    ...baseSpriteProps
  } = $$props;
  const context2 = getContextApp();
  const texture = context2.stateApp.loadedAssets?.[key] || PIXI$1.Texture.EMPTY;
  if (texture === PIXI$1.Texture.EMPTY || debug) {
    $$payload.out += "<!--[-->";
    $$payload.out += `${escape_html(console.error(`Sprite: key "${key}" is not found in the loadedAssets`))}
	${escape_html(console.log("loadedAssets", snapshot(context2.stateApp).loadedAssets))}`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  BaseSprite($$payload, spread_props([baseSpriteProps, { texture }]));
  $$payload.out += `<!---->`;
  pop();
}
/*!
 * @barvynkoa/particle-emitter - v6.0.0
 * Compiled Mon, 27 May 2024 12:15:21 UTC
 *
 * @barvynkoa/particle-emitter is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license
 */
class PolygonalChain {
  /**
   * @param data Point data for polygon chains. Either a list of points for a single chain, or a list of chains.
   */
  constructor(data) {
    this.segments = [];
    this.countingLengths = [];
    this.totalLength = 0;
    this.init(data);
  }
  /**
   * @param data Point data for polygon chains. Either a list of points for a single chain, or a list of chains.
   */
  init(data) {
    if (!data || !data.length) {
      this.segments.push({ p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 }, l: 0 });
    } else if (Array.isArray(data[0])) {
      for (let i = 0; i < data.length; ++i) {
        const chain = data[i];
        let prevPoint = chain[0];
        for (let j = 1; j < chain.length; ++j) {
          const second = chain[j];
          this.segments.push({ p1: prevPoint, p2: second, l: 0 });
          prevPoint = second;
        }
      }
    } else {
      let prevPoint = data[0];
      for (let i = 1; i < data.length; ++i) {
        const second = data[i];
        this.segments.push({ p1: prevPoint, p2: second, l: 0 });
        prevPoint = second;
      }
    }
    for (let i = 0; i < this.segments.length; ++i) {
      const { p1, p2 } = this.segments[i];
      const segLength = Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
      this.segments[i].l = segLength;
      this.totalLength += segLength;
      this.countingLengths.push(this.totalLength);
    }
  }
  /**
   * Gets a random point in the chain.
   * @param out - Particle ?, because was point data
   */
  getRandPos(out) {
    const rand = Math.random() * this.totalLength;
    let chosenSeg;
    let lerp;
    if (this.segments.length === 1) {
      chosenSeg = this.segments[0];
      lerp = rand;
    } else {
      for (let i = 0; i < this.countingLengths.length; ++i) {
        if (rand < this.countingLengths[i]) {
          chosenSeg = this.segments[i];
          lerp = i === 0 ? rand : rand - this.countingLengths[i - 1];
          break;
        }
      }
    }
    lerp /= chosenSeg.l || 1;
    const { p1, p2 } = chosenSeg;
    out.x = p1.x + lerp * (p2.x - p1.x);
    out.y = p1.y + lerp * (p2.y - p1.y);
  }
}
PolygonalChain.type = "polygonalChain";
PolygonalChain.editorConfig = null;
class Rectangle {
  constructor(config2) {
    this.x = config2.x;
    this.y = config2.y;
    this.w = config2.w;
    this.h = config2.h;
  }
  getRandPos(particle) {
    particle.x = Math.random() * this.w + this.x;
    particle.y = Math.random() * this.h + this.y;
  }
}
Rectangle.type = "rect";
Rectangle.editorConfig = null;
class PropertyNode {
  /**
   * @param value The value for this node
   * @param time The time for this node, between 0-1
   * @param [ease] Custom ease for this list. Only relevant for the first node.
   */
  constructor(value, time, ease) {
    this.value = value;
    this.time = time;
    this.next = null;
    this.isStepped = false;
    if (ease) {
      this.ease = typeof ease === "function" ? ease : generateEase(ease);
    } else {
      this.ease = null;
    }
  }
  /**
   * Creates a list of property values from a data object {list, isStepped} with a list of objects in
   * the form {value, time}. Alternatively, the data object can be in the deprecated form of
   * {start, end}.
   * @param data The data for the list.
   * @param data.list The array of value and time objects.
   * @param data.isStepped If the list is stepped rather than interpolated.
   * @param data.ease Custom ease for this list.
   * @return The first node in the list
   */
  // eslint-disable-next-line max-len
  static createList(data) {
    if ("list" in data) {
      const array = data.list;
      let node;
      const { value, time } = array[0];
      const first = node = new PropertyNode(typeof value === "string" ? hexToRGB(value) : value, time, data.ease);
      if (array.length > 2 || array.length === 2 && array[1].value !== value) {
        for (let i = 1; i < array.length; ++i) {
          const { value: value2, time: time2 } = array[i];
          node.next = new PropertyNode(typeof value2 === "string" ? hexToRGB(value2) : value2, time2);
          node = node.next;
        }
      }
      first.isStepped = !!data.isStepped;
      return first;
    }
    const start = new PropertyNode(typeof data.start === "string" ? hexToRGB(data.start) : data.start, 0);
    if (data.end !== data.start) {
      start.next = new PropertyNode(typeof data.end === "string" ? hexToRGB(data.end) : data.end, 1);
    }
    return start;
  }
}
let GetTextureFromString = Texture$1.from;
const DEG_TO_RADS = Math.PI / 180;
function rotatePoint(angle, p) {
  if (!angle)
    return;
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const xnew = p.x * c - p.y * s;
  const ynew = p.x * s + p.y * c;
  p.x = xnew;
  p.y = ynew;
}
function combineRGBComponents(r, g, b) {
  return (
    /* a << 24 |*/
    r << 16 | g << 8 | b
  );
}
function length(point) {
  return Math.sqrt(point.x * point.x + point.y * point.y);
}
function normalize(point) {
  const oneOverLen = 1 / length(point);
  point.x *= oneOverLen;
  point.y *= oneOverLen;
}
function scaleBy(point, value) {
  point.x *= value;
  point.y *= value;
}
function hexToRGB(color, output) {
  if (!output) {
    output = {};
  }
  if (color.charAt(0) === "#") {
    color = color.substr(1);
  } else if (color.indexOf("0x") === 0) {
    color = color.substr(2);
  }
  let alpha;
  if (color.length === 8) {
    alpha = color.substr(0, 2);
    color = color.substr(2);
  }
  output.r = parseInt(color.substr(0, 2), 16);
  output.g = parseInt(color.substr(2, 2), 16);
  output.b = parseInt(color.substr(4, 2), 16);
  if (alpha) {
    output.a = parseInt(alpha, 16);
  }
  return output;
}
function generateEase(segments) {
  const qty = segments.length;
  const oneOverQty = 1 / qty;
  return function(time) {
    const i = qty * time | 0;
    const t = (time - i * oneOverQty) * qty;
    const s = segments[i] || segments[qty - 1];
    return s.s + t * (2 * (1 - t) * (s.cp - s.s) + t * (s.e - s.s));
  };
}
function getBlendMode(name) {
  return name || "normal";
}
class Torus {
  constructor(config2) {
    this.x = config2.x || 0;
    this.y = config2.y || 0;
    this.radius = config2.radius;
    this.innerRadius = config2.innerRadius || 0;
    this.rotation = !!config2.affectRotation;
  }
  getRandPos(particle) {
    if (this.innerRadius !== this.radius) {
      particle.x = Math.random() * (this.radius - this.innerRadius) + this.innerRadius;
    } else {
      particle.x = this.radius;
    }
    particle.y = 0;
    const angle = Math.random() * Math.PI * 2;
    if (this.rotation) {
      particle.rotation += angle;
    }
    rotatePoint(angle, particle.position);
    particle.position.x += this.x;
    particle.position.y += this.y;
  }
}
Torus.type = "torus";
Torus.editorConfig = null;
var BehaviorOrder;
(function(BehaviorOrder2) {
  BehaviorOrder2[BehaviorOrder2["Spawn"] = 0] = "Spawn";
  BehaviorOrder2[BehaviorOrder2["Normal"] = 2] = "Normal";
  BehaviorOrder2[BehaviorOrder2["Late"] = 5] = "Late";
})(BehaviorOrder || (BehaviorOrder = {}));
class AccelerationBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Late;
    this.minStart = config2.minStart;
    this.maxStart = config2.maxStart;
    this.accel = config2.accel;
    this.rotate = !!config2.rotate;
    this.maxSpeed = config2.maxSpeed ?? 0;
  }
  initParticles(first) {
    let next = first;
    while (next) {
      const speed = Math.random() * (this.maxStart - this.minStart) + this.minStart;
      if (!next.config.velocity) {
        next.config.velocity = new Point(speed, 0);
      } else {
        next.config.velocity.set(speed, 0);
      }
      rotatePoint(next.rotation, next.config.velocity);
      next = next.next;
    }
  }
  updateParticle(particle, deltaSec) {
    const vel = particle.config.velocity;
    const oldVX = vel.x;
    const oldVY = vel.y;
    vel.x += this.accel.x * deltaSec;
    vel.y += this.accel.y * deltaSec;
    if (this.maxSpeed) {
      const currentSpeed = length(vel);
      if (currentSpeed > this.maxSpeed) {
        scaleBy(vel, this.maxSpeed / currentSpeed);
      }
    }
    particle.x += (oldVX + vel.x) / 2 * deltaSec;
    particle.y += (oldVY + vel.y) / 2 * deltaSec;
    if (this.rotate) {
      particle.rotation = Math.atan2(vel.y, vel.x);
    }
  }
}
AccelerationBehavior.type = "moveAcceleration";
AccelerationBehavior.editorConfig = null;
function intValueSimple(lerp) {
  if (this.ease)
    lerp = this.ease(lerp);
  return (this.first.next.value - this.first.value) * lerp + this.first.value;
}
function intColorSimple(lerp) {
  if (this.ease)
    lerp = this.ease(lerp);
  const curVal = this.first.value;
  const nextVal = this.first.next.value;
  const r = (nextVal.r - curVal.r) * lerp + curVal.r;
  const g = (nextVal.g - curVal.g) * lerp + curVal.g;
  const b = (nextVal.b - curVal.b) * lerp + curVal.b;
  return combineRGBComponents(r, g, b);
}
function intValueComplex(lerp) {
  if (this.ease)
    lerp = this.ease(lerp);
  let current = this.first;
  let next = current.next;
  while (lerp > next.time) {
    current = next;
    next = next.next;
  }
  lerp = (lerp - current.time) / (next.time - current.time);
  return (next.value - current.value) * lerp + current.value;
}
function intColorComplex(lerp) {
  if (this.ease)
    lerp = this.ease(lerp);
  let current = this.first;
  let next = current.next;
  while (lerp > next.time) {
    current = next;
    next = next.next;
  }
  lerp = (lerp - current.time) / (next.time - current.time);
  const curVal = current.value;
  const nextVal = next.value;
  const r = (nextVal.r - curVal.r) * lerp + curVal.r;
  const g = (nextVal.g - curVal.g) * lerp + curVal.g;
  const b = (nextVal.b - curVal.b) * lerp + curVal.b;
  return combineRGBComponents(r, g, b);
}
function intValueStepped(lerp) {
  if (this.ease)
    lerp = this.ease(lerp);
  let current = this.first;
  while (current.next && lerp > current.next.time) {
    current = current.next;
  }
  return current.value;
}
function intColorStepped(lerp) {
  if (this.ease)
    lerp = this.ease(lerp);
  let current = this.first;
  while (current.next && lerp > current.next.time) {
    current = current.next;
  }
  const curVal = current.value;
  return combineRGBComponents(curVal.r, curVal.g, curVal.b);
}
class PropertyList {
  /**
   * @param isColor If this list handles color values
   */
  constructor(isColor = false) {
    this.first = null;
    this.isColor = !!isColor;
    this.interpolate = null;
    this.ease = null;
  }
  /**
   * Resets the list for use.
   * @param first The first node in the list.
   * @param first.isStepped If the values should be stepped instead of interpolated linearly.
   */
  reset(first) {
    this.first = first;
    const isSimple = first.next && first.next.time >= 1;
    if (isSimple) {
      this.interpolate = this.isColor ? intColorSimple : intValueSimple;
    } else if (first.isStepped) {
      this.interpolate = this.isColor ? intColorStepped : intValueStepped;
    } else {
      this.interpolate = this.isColor ? intColorComplex : intValueComplex;
    }
    this.ease = this.first.ease;
  }
}
class AlphaBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    this.list = new PropertyList(false);
    this.list.reset(PropertyNode.createList(config2.alpha));
  }
  initParticles(first) {
    let next = first;
    while (next) {
      next.alpha = this.list.first.value;
      next = next.next;
    }
  }
  updateParticle(particle) {
    particle.alpha = this.list.interpolate(particle.agePercent);
  }
}
AlphaBehavior.type = "alpha";
AlphaBehavior.editorConfig = null;
class StaticAlphaBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    this.value = config2.alpha;
  }
  initParticles(first) {
    let next = first;
    while (next) {
      next.alpha = this.value;
      next = next.next;
    }
  }
}
StaticAlphaBehavior.type = "alphaStatic";
StaticAlphaBehavior.editorConfig = null;
function getTextures(textures) {
  const outTextures = [];
  for (let j = 0; j < textures.length; ++j) {
    let tex = textures[j];
    if (typeof tex === "string") {
      outTextures.push(GetTextureFromString(tex));
    } else if (tex instanceof Texture$1) {
      outTextures.push(tex);
    } else {
      let dupe = tex.count || 1;
      if (typeof tex.texture === "string") {
        tex = GetTextureFromString(tex.texture);
      } else {
        tex = tex.texture;
      }
      for (; dupe > 0; --dupe) {
        outTextures.push(tex);
      }
    }
  }
  return outTextures;
}
class RandomAnimatedTextureBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    this.anims = [];
    for (let i = 0; i < config2.anims.length; ++i) {
      const anim = config2.anims[i];
      const textures = getTextures(anim.textures);
      const framerate = anim.framerate < 0 ? -1 : anim.framerate > 0 ? anim.framerate : 60;
      const parsedAnim = {
        textures,
        duration: framerate > 0 ? textures.length / framerate : 0,
        framerate,
        loop: framerate > 0 ? !!anim.loop : false
      };
      this.anims.push(parsedAnim);
    }
  }
  initParticles(first) {
    let next = first;
    while (next) {
      const index = Math.floor(Math.random() * this.anims.length);
      const anim = next.config.anim = this.anims[index];
      next.texture = anim.textures[0];
      next.config.animElapsed = 0;
      if (anim.framerate === -1) {
        next.config.animDuration = next.maxLife;
        next.config.animFramerate = anim.textures.length / next.maxLife;
      } else {
        next.config.animDuration = anim.duration;
        next.config.animFramerate = anim.framerate;
      }
      next = next.next;
    }
  }
  updateParticle(particle, deltaSec) {
    const config2 = particle.config;
    const anim = config2.anim;
    config2.animElapsed += deltaSec;
    if (config2.animElapsed >= config2.animDuration) {
      if (config2.anim.loop) {
        config2.animElapsed = config2.animElapsed % config2.animDuration;
      } else {
        config2.animElapsed = config2.animDuration - 1e-6;
      }
    }
    const frame = config2.animElapsed * config2.animFramerate + 1e-7 | 0;
    particle.texture = anim.textures[frame] || anim.textures[anim.textures.length - 1] || Texture$1.EMPTY;
  }
}
RandomAnimatedTextureBehavior.type = "animatedRandom";
RandomAnimatedTextureBehavior.editorConfig = null;
class SingleAnimatedTextureBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    const anim = config2.anim;
    const textures = getTextures(anim.textures);
    const framerate = anim.framerate < 0 ? -1 : anim.framerate > 0 ? anim.framerate : 60;
    this.anim = {
      textures,
      duration: framerate > 0 ? textures.length / framerate : 0,
      framerate,
      loop: framerate > 0 ? !!anim.loop : false
    };
  }
  initParticles(first) {
    let next = first;
    const anim = this.anim;
    while (next) {
      next.texture = anim.textures[0];
      next.config.animElapsed = 0;
      if (anim.framerate === -1) {
        next.config.animDuration = next.maxLife;
        next.config.animFramerate = anim.textures.length / next.maxLife;
      } else {
        next.config.animDuration = anim.duration;
        next.config.animFramerate = anim.framerate;
      }
      next = next.next;
    }
  }
  updateParticle(particle, deltaSec) {
    const anim = this.anim;
    const config2 = particle.config;
    config2.animElapsed += deltaSec;
    if (config2.animElapsed >= config2.animDuration) {
      if (anim.loop) {
        config2.animElapsed = config2.animElapsed % config2.animDuration;
      } else {
        config2.animElapsed = config2.animDuration - 1e-6;
      }
    }
    const frame = config2.animElapsed * config2.animFramerate + 1e-7 | 0;
    particle.texture = anim.textures[frame] || anim.textures[anim.textures.length - 1] || Texture$1.EMPTY;
  }
}
SingleAnimatedTextureBehavior.type = "animatedSingle";
SingleAnimatedTextureBehavior.editorConfig = null;
class BlendModeBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    this.value = config2.blendMode;
  }
  initParticles(first) {
    let next = first;
    while (next) {
      next.blendMode = getBlendMode(this.value);
      next = next.next;
    }
  }
}
BlendModeBehavior.type = "blendMode";
BlendModeBehavior.editorConfig = null;
class BurstSpawnBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Spawn;
    this.spacing = config2.spacing * DEG_TO_RADS;
    this.start = config2.start * DEG_TO_RADS;
    this.distance = config2.distance;
  }
  initParticles(first) {
    let count = 0;
    let next = first;
    while (next) {
      let angle;
      if (this.spacing) {
        angle = this.start + this.spacing * count;
      } else {
        angle = Math.random() * Math.PI * 2;
      }
      next.rotation = angle;
      if (this.distance) {
        next.position.x = this.distance;
        rotatePoint(angle, next.position);
      }
      next = next.next;
      ++count;
    }
  }
}
BurstSpawnBehavior.type = "spawnBurst";
BurstSpawnBehavior.editorConfig = null;
class ColorBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    this.list = new PropertyList(true);
    this.list.reset(PropertyNode.createList(config2.color));
  }
  initParticles(first) {
    let next = first;
    const color = this.list.first.value;
    const tint = combineRGBComponents(color.r, color.g, color.b);
    while (next) {
      next.tint = tint;
      next = next.next;
    }
  }
  updateParticle(particle) {
    particle.tint = this.list.interpolate(particle.agePercent);
  }
}
ColorBehavior.type = "color";
ColorBehavior.editorConfig = null;
class StaticColorBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    let color = config2.color;
    if (color.charAt(0) === "#") {
      color = color.substr(1);
    } else if (color.indexOf("0x") === 0) {
      color = color.substr(2);
    }
    this.value = parseInt(color, 16);
  }
  initParticles(first) {
    let next = first;
    while (next) {
      next.tint = this.value;
      next = next.next;
    }
  }
}
StaticColorBehavior.type = "colorStatic";
StaticColorBehavior.editorConfig = null;
class OrderedTextureBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    this.index = 0;
    this.textures = config2.textures.map((tex) => typeof tex === "string" ? GetTextureFromString(tex) : tex);
  }
  initParticles(first) {
    let next = first;
    while (next) {
      next.texture = this.textures[this.index];
      if (++this.index >= this.textures.length) {
        this.index = 0;
      }
      next = next.next;
    }
  }
}
OrderedTextureBehavior.type = "textureOrdered";
OrderedTextureBehavior.editorConfig = null;
const helperPoint = new Point();
const MATH_FUNCS = [
  "E",
  "LN2",
  "LN10",
  "LOG2E",
  "LOG10E",
  "PI",
  "SQRT1_2",
  "SQRT2",
  "abs",
  "acos",
  "acosh",
  "asin",
  "asinh",
  "atan",
  "atanh",
  "atan2",
  "cbrt",
  "ceil",
  "cos",
  "cosh",
  "exp",
  "expm1",
  "floor",
  "fround",
  "hypot",
  "log",
  "log1p",
  "log10",
  "log2",
  "max",
  "min",
  "pow",
  "random",
  "round",
  "sign",
  "sin",
  "sinh",
  "sqrt",
  "tan",
  "tanh"
];
const WHITELISTER = new RegExp([
  // Allow the 4 basic operations, parentheses and all numbers/decimals, as well
  // as 'x', for the variable usage.
  "[01234567890\\.\\*\\-\\+\\/\\(\\)x ,]"
].concat(MATH_FUNCS).join("|"), "g");
function parsePath(pathString) {
  const matches2 = pathString.match(WHITELISTER);
  for (let i = matches2.length - 1; i >= 0; --i) {
    if (MATH_FUNCS.indexOf(matches2[i]) >= 0) {
      matches2[i] = `Math.${matches2[i]}`;
    }
  }
  pathString = matches2.join("");
  return new Function("x", `return ${pathString};`);
}
class PathBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Late;
    if (config2.path) {
      if (typeof config2.path === "function") {
        this.path = config2.path;
      } else {
        try {
          this.path = parsePath(config2.path);
        } catch (e) {
          this.path = null;
        }
      }
    } else {
      this.path = (x) => x;
    }
    this.list = new PropertyList(false);
    this.list.reset(PropertyNode.createList(config2.speed));
    this.minMult = config2.minMult ?? 1;
  }
  initParticles(first) {
    let next = first;
    while (next) {
      next.config.initRotation = next.rotation;
      if (!next.config.initPosition) {
        next.config.initPosition = new Point(next.x, next.y);
      } else {
        next.config.initPosition.copyFrom(next.position);
      }
      next.config.movement = 0;
      const mult = Math.random() * (1 - this.minMult) + this.minMult;
      next.config.speedMult = mult;
      next = next.next;
    }
  }
  updateParticle(particle, deltaSec) {
    const speed = this.list.interpolate(particle.agePercent) * particle.config.speedMult;
    particle.config.movement += speed * deltaSec;
    helperPoint.x = particle.config.movement;
    helperPoint.y = this.path(helperPoint.x);
    rotatePoint(particle.config.initRotation, helperPoint);
    particle.position.x = particle.config.initPosition.x + helperPoint.x;
    particle.position.y = particle.config.initPosition.y + helperPoint.y;
  }
}
PathBehavior.type = "movePath";
PathBehavior.editorConfig = null;
class PointSpawnBehavior {
  constructor() {
    this.order = BehaviorOrder.Spawn;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initParticles(_first) {
  }
}
PointSpawnBehavior.type = "spawnPoint";
PointSpawnBehavior.editorConfig = null;
class RandomTextureBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    this.textures = config2.textures.map((tex) => typeof tex === "string" ? GetTextureFromString(tex) : tex);
  }
  initParticles(first) {
    let next = first;
    while (next) {
      const index = Math.floor(Math.random() * this.textures.length);
      next.texture = this.textures[index];
      next = next.next;
    }
  }
}
RandomTextureBehavior.type = "textureRandom";
RandomTextureBehavior.editorConfig = null;
class RotationBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    this.minStart = config2.minStart * DEG_TO_RADS;
    this.maxStart = config2.maxStart * DEG_TO_RADS;
    this.minSpeed = config2.minSpeed * DEG_TO_RADS;
    this.maxSpeed = config2.maxSpeed * DEG_TO_RADS;
    this.accel = config2.accel * DEG_TO_RADS;
  }
  initParticles(first) {
    let next = first;
    while (next) {
      if (this.minStart === this.maxStart) {
        next.rotation += this.maxStart;
      } else {
        next.rotation += Math.random() * (this.maxStart - this.minStart) + this.minStart;
      }
      next.config.rotSpeed = Math.random() * (this.maxSpeed - this.minSpeed) + this.minSpeed;
      next = next.next;
    }
  }
  updateParticle(particle, deltaSec) {
    if (this.accel) {
      const oldSpeed = particle.config.rotSpeed;
      particle.config.rotSpeed += this.accel * deltaSec;
      particle.rotation += (particle.config.rotSpeed + oldSpeed) / 2 * deltaSec;
    } else {
      particle.rotation += particle.config.rotSpeed * deltaSec;
    }
  }
}
RotationBehavior.type = "rotation";
RotationBehavior.editorConfig = null;
class StaticRotationBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    this.min = config2.min * DEG_TO_RADS;
    this.max = config2.max * DEG_TO_RADS;
  }
  initParticles(first) {
    let next = first;
    while (next) {
      if (this.min === this.max) {
        next.rotation += this.max;
      } else {
        next.rotation += Math.random() * (this.max - this.min) + this.min;
      }
      next = next.next;
    }
  }
}
StaticRotationBehavior.type = "rotationStatic";
StaticRotationBehavior.editorConfig = null;
class NoRotationBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Late + 1;
    this.rotation = (config2.rotation || 0) * DEG_TO_RADS;
  }
  initParticles(first) {
    let next = first;
    while (next) {
      next.rotation = this.rotation;
      next = next.next;
    }
  }
}
NoRotationBehavior.type = "noRotation";
NoRotationBehavior.editorConfig = null;
class ScaleBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    this.list = new PropertyList(false);
    this.list.reset(PropertyNode.createList(config2.scale));
    this.minMult = config2.minMult ?? 1;
  }
  initParticles(first) {
    let next = first;
    while (next) {
      const mult = Math.random() * (1 - this.minMult) + this.minMult;
      next.config.scaleMult = mult;
      next.scale.x = next.scale.y = this.list.first.value * mult;
      next = next.next;
    }
  }
  updateParticle(particle) {
    particle.scale.x = particle.scale.y = this.list.interpolate(particle.agePercent) * particle.config.scaleMult;
  }
}
ScaleBehavior.type = "scale";
ScaleBehavior.editorConfig = null;
class StaticScaleBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    this.min = config2.min;
    this.max = config2.max;
  }
  initParticles(first) {
    let next = first;
    while (next) {
      const scale = Math.random() * (this.max - this.min) + this.min;
      next.scale.x = next.scale.y = scale;
      next = next.next;
    }
  }
}
StaticScaleBehavior.type = "scaleStatic";
StaticScaleBehavior.editorConfig = null;
class ShapeSpawnBehavior {
  /**
   * Registers a shape to be used by the ShapeSpawn behavior.
   * @param constructor The shape class constructor to use, with a static `type` property to reference it by.
   * @param typeOverride An optional type override, primarily for registering a shape under multiple names.
   */
  static registerShape(constructor, typeOverride) {
    ShapeSpawnBehavior.shapes[typeOverride || constructor.type] = constructor;
  }
  constructor(config2) {
    this.order = BehaviorOrder.Spawn;
    const ShapeClass = ShapeSpawnBehavior.shapes[config2.type];
    if (!ShapeClass) {
      throw new Error(`No shape found with type '${config2.type}'`);
    }
    this.shape = new ShapeClass(config2.data);
  }
  initParticles(first) {
    let next = first;
    while (next) {
      this.shape.getRandPos(next);
      next = next.next;
    }
  }
}
ShapeSpawnBehavior.type = "spawnShape";
ShapeSpawnBehavior.editorConfig = null;
ShapeSpawnBehavior.shapes = {};
ShapeSpawnBehavior.registerShape(PolygonalChain);
ShapeSpawnBehavior.registerShape(Rectangle);
ShapeSpawnBehavior.registerShape(Torus);
ShapeSpawnBehavior.registerShape(Torus, "circle");
class SingleTextureBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Normal;
    this.texture = typeof config2.texture === "string" ? GetTextureFromString(config2.texture) : config2.texture;
  }
  initParticles(first) {
    let next = first;
    while (next) {
      next.texture = this.texture;
      next = next.next;
    }
  }
}
SingleTextureBehavior.type = "textureSingle";
SingleTextureBehavior.editorConfig = null;
class SpeedBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Late;
    this.list = new PropertyList(false);
    this.list.reset(PropertyNode.createList(config2.speed));
    this.minMult = config2.minMult ?? 1;
  }
  initParticles(first) {
    let next = first;
    while (next) {
      const mult = Math.random() * (1 - this.minMult) + this.minMult;
      next.config.speedMult = mult;
      if (!next.config.velocity) {
        next.config.velocity = new Point(this.list.first.value * mult, 0);
      } else {
        next.config.velocity.set(this.list.first.value * mult, 0);
      }
      rotatePoint(next.rotation, next.config.velocity);
      next = next.next;
    }
  }
  updateParticle(particle, deltaSec) {
    const speed = this.list.interpolate(particle.agePercent) * particle.config.speedMult;
    const vel = particle.config.velocity;
    normalize(vel);
    scaleBy(vel, speed);
    particle.x += vel.x * deltaSec;
    particle.y += vel.y * deltaSec;
  }
}
SpeedBehavior.type = "moveSpeed";
SpeedBehavior.editorConfig = null;
class StaticSpeedBehavior {
  constructor(config2) {
    this.order = BehaviorOrder.Late;
    this.min = config2.min;
    this.max = config2.max;
  }
  initParticles(first) {
    let next = first;
    while (next) {
      const speed = Math.random() * (this.max - this.min) + this.min;
      if (!next.config.velocity) {
        next.config.velocity = new Point(speed, 0);
      } else {
        next.config.velocity.set(speed, 0);
      }
      rotatePoint(next.rotation, next.config.velocity);
      next = next.next;
    }
  }
  updateParticle(particle, deltaSec) {
    const velocity = particle.config.velocity;
    particle.x += velocity.x * deltaSec;
    particle.y += velocity.y * deltaSec;
  }
}
StaticSpeedBehavior.type = "moveSpeedStatic";
StaticSpeedBehavior.editorConfig = null;
class Particle extends Sprite$1 {
  /**
   * @param emitter The emitter that controls this particle.
   */
  constructor(emitter) {
    super();
    this.prevChild = this.nextChild = null;
    this.emitter = emitter;
    this.config = {};
    this.anchor.x = this.anchor.y = 0.5;
    this.maxLife = 0;
    this.age = 0;
    this.agePercent = 0;
    this.oneOverLife = 0;
    this.next = null;
    this.prev = null;
    this.init = this.init;
    this.kill = this.kill;
  }
  /**
   * Initializes the particle for use, based on the properties that have to
   * have been set already on the particle.
   */
  init(maxLife) {
    this.maxLife = maxLife;
    this.age = this.agePercent = 0;
    this.rotation = 0;
    this.position.x = this.position.y = 0;
    this.scale.x = this.scale.y = 1;
    this.tint = 16777215;
    this.alpha = 1;
    this.oneOverLife = 1 / this.maxLife;
    this.visible = true;
  }
  /**
   * Kills the particle, removing it from the display list
   * and telling the emitter to recycle it.
   */
  kill() {
    this.emitter.recycle(this);
  }
  /**
   * Destroys the particle, removing references and preventing future use.
   */
  destroy() {
    if (this.parent) {
      this.parent.removeChild(this);
    }
    this.emitter = this.next = this.prev = null;
    super.destroy();
  }
}
const ticker = Ticker.shared;
const PositionParticle = Symbol("Position particle per emitter position");
class Emitter {
  /**
   * Registers a new behavior, so that it will be recognized when initializing emitters.
   * Behaviors registered later with duplicate types will override older ones, although there is no limit on
   * the allowed types.
   * @param constructor The behavior class to register.
   */
  static registerBehavior(constructor) {
    Emitter.knownBehaviors[constructor.type] = constructor;
  }
  /**
   * @param particleParent The container to add the particles to.
   * @param particleImages A texture or array of textures to use
   *                       for the particles. Strings will be turned
   *                       into textures via Texture.from().
   * @param config A configuration object containing settings for the emitter.
   * @param config.emit If config.emit is explicitly passed as false, the
   *                    Emitter will start disabled.
   * @param config.autoUpdate If config.autoUpdate is explicitly passed as
   *                          true, the Emitter will automatically call
   *                          update via the PIXI shared ticker.
   */
  constructor(particleParent, config2) {
    this.initBehaviors = [];
    this.updateBehaviors = [];
    this.recycleBehaviors = [];
    this.minLifetime = 0;
    this.maxLifetime = 0;
    this.customEase = null;
    this._frequency = 1;
    this.spawnChance = 1;
    this.maxParticles = 1e3;
    this.emitterLifetime = -1;
    this.spawnPos = new Point();
    this.particlesPerWave = 1;
    this.rotation = 0;
    this.ownerPos = new Point();
    this._prevEmitterPos = new Point();
    this._prevPosIsValid = false;
    this._posChanged = false;
    this._parent = null;
    this.addAtBack = false;
    this.particleCount = 0;
    this._emit = false;
    this._spawnTimer = 0;
    this._emitterLife = -1;
    this._activeParticlesFirst = null;
    this._activeParticlesLast = null;
    this._poolFirst = null;
    this._origConfig = null;
    this._autoUpdate = false;
    this._destroyWhenComplete = false;
    this._completeCallback = null;
    this.parent = particleParent;
    if (config2) {
      this.init(config2);
    }
    this.recycle = this.recycle;
    this.update = this.update;
    this.rotate = this.rotate;
    this.updateSpawnPos = this.updateSpawnPos;
    this.updateOwnerPos = this.updateOwnerPos;
  }
  /**
   * Time between particle spawns in seconds. If this value is not a number greater than 0,
   * it will be set to 1 (particle per second) to prevent infinite loops.
   */
  get frequency() {
    return this._frequency;
  }
  set frequency(value) {
    if (typeof value === "number" && value > 0) {
      this._frequency = value;
    } else {
      this._frequency = 1;
    }
  }
  /**
  * The container to add particles to. Settings this will dump any active particles.
  */
  get parent() {
    return this._parent;
  }
  set parent(value) {
    this.cleanup();
    this._parent = value;
  }
  /**
   * Sets up the emitter based on the config settings.
   * @param config A configuration object containing settings for the emitter.
   */
  init(config2) {
    if (!config2) {
      return;
    }
    this.cleanup();
    this._origConfig = config2;
    this.minLifetime = config2.lifetime.min;
    this.maxLifetime = config2.lifetime.max;
    if (config2.ease) {
      this.customEase = typeof config2.ease === "function" ? config2.ease : generateEase(config2.ease);
    } else {
      this.customEase = null;
    }
    this.particlesPerWave = 1;
    if (config2.particlesPerWave && config2.particlesPerWave > 1) {
      this.particlesPerWave = config2.particlesPerWave;
    }
    this.frequency = config2.frequency;
    this.spawnChance = typeof config2.spawnChance === "number" && config2.spawnChance > 0 ? config2.spawnChance : 1;
    this.emitterLifetime = config2.emitterLifetime || -1;
    this.maxParticles = config2.maxParticles > 0 ? config2.maxParticles : 1e3;
    this.addAtBack = !!config2.addAtBack;
    this.rotation = 0;
    this.ownerPos.set(0);
    if (config2.pos) {
      this.spawnPos.copyFrom(config2.pos);
    } else {
      this.spawnPos.set(0);
    }
    this._prevEmitterPos.copyFrom(this.spawnPos);
    this._prevPosIsValid = false;
    this._spawnTimer = 0;
    this.emit = config2.emit === void 0 ? true : !!config2.emit;
    this.autoUpdate = !!config2.autoUpdate;
    const behaviors = config2.behaviors.map((data) => {
      const constructor = Emitter.knownBehaviors[data.type];
      if (!constructor) {
        console.error(`Unknown behavior: ${data.type}`);
        return null;
      }
      return new constructor(data.config);
    }).filter((b) => !!b);
    behaviors.push(PositionParticle);
    behaviors.sort((a, b) => {
      if (a === PositionParticle) {
        return b.order === BehaviorOrder.Spawn ? 1 : -1;
      } else if (b === PositionParticle) {
        return a.order === BehaviorOrder.Spawn ? -1 : 1;
      }
      return a.order - b.order;
    });
    this.initBehaviors = behaviors.slice();
    this.updateBehaviors = behaviors.filter((b) => b !== PositionParticle && b.updateParticle);
    this.recycleBehaviors = behaviors.filter((b) => b !== PositionParticle && b.recycleParticle);
  }
  /**
   * Gets the instantiated behavior of the specified type, if it is present on this emitter.
   * @param type The behavior type to find.
   */
  getBehavior(type) {
    if (!Emitter.knownBehaviors[type])
      return null;
    return this.initBehaviors.find((b) => b instanceof Emitter.knownBehaviors[type]) || null;
  }
  /**
   * Fills the pool with the specified number of particles, so that they don't have to be instantiated later.
   * @param count The number of particles to create.
   */
  fillPool(count) {
    for (; count > 0; --count) {
      const p = new Particle(this);
      p.next = this._poolFirst;
      this._poolFirst = p;
    }
  }
  /**
   * Recycles an individual particle. For internal use only.
   * @param particle The particle to recycle.
   * @param fromCleanup If this is being called to manually clean up all particles.
   * @internal
   */
  recycle(particle, fromCleanup = false) {
    for (let i = 0; i < this.recycleBehaviors.length; ++i) {
      this.recycleBehaviors[i].recycleParticle(particle, !fromCleanup);
    }
    if (particle.next) {
      particle.next.prev = particle.prev;
    }
    if (particle.prev) {
      particle.prev.next = particle.next;
    }
    if (particle === this._activeParticlesLast) {
      this._activeParticlesLast = particle.prev;
    }
    if (particle === this._activeParticlesFirst) {
      this._activeParticlesFirst = particle.next;
    }
    particle.prev = null;
    particle.next = this._poolFirst;
    this._poolFirst = particle;
    if (particle.parent) {
      particle.parent.removeChild(particle);
    }
    --this.particleCount;
  }
  /**
   * Sets the rotation of the emitter to a new value. This rotates the spawn position in addition
   * to particle direction.
   * @param newRot The new rotation, in degrees.
   */
  rotate(newRot) {
    if (this.rotation === newRot)
      return;
    const diff = newRot - this.rotation;
    this.rotation = newRot;
    rotatePoint(diff, this.spawnPos);
    this._posChanged = true;
  }
  /**
   * Changes the spawn position of the emitter.
   * @param x The new x value of the spawn position for the emitter.
   * @param y The new y value of the spawn position for the emitter.
   */
  updateSpawnPos(x, y) {
    this._posChanged = true;
    this.spawnPos.x = x;
    this.spawnPos.y = y;
  }
  /**
   * Changes the position of the emitter's owner. You should call this if you are adding
   * particles to the world container that your emitter's owner is moving around in.
   * @param x The new x value of the emitter's owner.
   * @param y The new y value of the emitter's owner.
   */
  updateOwnerPos(x, y) {
    this._posChanged = true;
    this.ownerPos.x = x;
    this.ownerPos.y = y;
  }
  /**
   * Prevents emitter position interpolation in the next update.
   * This should be used if you made a major position change of your emitter's owner
   * that was not normal movement.
   */
  resetPositionTracking() {
    this._prevPosIsValid = false;
  }
  /**
   * If particles should be emitted during update() calls. Setting this to false
   * stops new particles from being created, but allows existing ones to die out.
   */
  get emit() {
    return this._emit;
  }
  set emit(value) {
    this._emit = !!value;
    this._emitterLife = this.emitterLifetime;
  }
  /**
   * If the update function is called automatically from the shared ticker.
   * Setting this to false requires calling the update function manually.
   */
  get autoUpdate() {
    return this._autoUpdate;
  }
  set autoUpdate(value) {
    if (this._autoUpdate && !value) {
      ticker.remove(this.update, this);
    } else if (!this._autoUpdate && value) {
      ticker.add(this.update, this);
    }
    this._autoUpdate = !!value;
  }
  /**
   * Starts emitting particles, sets autoUpdate to true, and sets up the Emitter to destroy itself
   * when particle emission is complete.
   * @param callback Callback for when emission is complete (all particles have died off)
   */
  playOnceAndDestroy(callback) {
    this.autoUpdate = true;
    this.emit = true;
    this._destroyWhenComplete = true;
    this._completeCallback = callback;
  }
  /**
   * Starts emitting particles and optionally calls a callback when particle emission is complete.
   * @param callback Callback for when emission is complete (all particles have died off)
   */
  playOnce(callback) {
    this.emit = true;
    this._completeCallback = callback;
  }
  /**
   * Updates all particles spawned by this emitter and emits new ones.
   * @param delta Time elapsed since the previous frame, in __seconds__. Or Ticker instance for pixi.js v8.0.0
   */
  update(delta) {
    if (typeof delta !== "number") {
      delta = delta.deltaTime;
    }
    if (this._autoUpdate) {
      delta = ticker.elapsedMS * 1e-3;
    }
    if (!this._parent)
      return;
    for (let particle = this._activeParticlesFirst, next; particle; particle = next) {
      next = particle.next;
      particle.age += delta;
      if (particle.age > particle.maxLife || particle.age < 0) {
        this.recycle(particle);
      } else {
        let lerp = particle.age * particle.oneOverLife;
        if (this.customEase) {
          if (this.customEase.length === 4) {
            lerp = this.customEase(lerp, 0, 1, 1);
          } else {
            lerp = this.customEase(lerp);
          }
        }
        particle.agePercent = lerp;
        for (let i = 0; i < this.updateBehaviors.length; ++i) {
          if (this.updateBehaviors[i].updateParticle(particle, delta)) {
            this.recycle(particle);
            break;
          }
        }
      }
    }
    let prevX;
    let prevY;
    if (this._prevPosIsValid) {
      prevX = this._prevEmitterPos.x;
      prevY = this._prevEmitterPos.y;
    }
    const curX = this.ownerPos.x + this.spawnPos.x;
    const curY = this.ownerPos.y + this.spawnPos.y;
    if (this._emit) {
      this._spawnTimer -= delta < 0 ? 0 : delta;
      while (this._spawnTimer <= 0) {
        if (this._emitterLife >= 0) {
          this._emitterLife -= this._frequency;
          if (this._emitterLife <= 0) {
            this._spawnTimer = 0;
            this._emitterLife = 0;
            this.emit = false;
            break;
          }
        }
        if (this.particleCount >= this.maxParticles) {
          this._spawnTimer += this._frequency;
          continue;
        }
        let emitPosX;
        let emitPosY;
        if (this._prevPosIsValid && this._posChanged) {
          const lerp = 1 + this._spawnTimer / delta;
          emitPosX = (curX - prevX) * lerp + prevX;
          emitPosY = (curY - prevY) * lerp + prevY;
        } else {
          emitPosX = curX;
          emitPosY = curY;
        }
        let waveFirst = null;
        let waveLast = null;
        for (let len = Math.min(this.particlesPerWave, this.maxParticles - this.particleCount), i = 0; i < len; ++i) {
          if (this.spawnChance < 1 && Math.random() >= this.spawnChance) {
            continue;
          }
          let lifetime;
          if (this.minLifetime === this.maxLifetime) {
            lifetime = this.minLifetime;
          } else {
            lifetime = Math.random() * (this.maxLifetime - this.minLifetime) + this.minLifetime;
          }
          if (-this._spawnTimer >= lifetime) {
            continue;
          }
          let p;
          if (this._poolFirst) {
            p = this._poolFirst;
            this._poolFirst = this._poolFirst.next;
            p.next = null;
          } else {
            p = new Particle(this);
          }
          p.init(lifetime);
          if (this.addAtBack) {
            this._parent.addChildAt(p, 0);
          } else {
            this._parent.addChild(p);
          }
          if (waveFirst) {
            waveLast.next = p;
            p.prev = waveLast;
            waveLast = p;
          } else {
            waveLast = waveFirst = p;
          }
          ++this.particleCount;
        }
        if (waveFirst) {
          if (this._activeParticlesLast) {
            this._activeParticlesLast.next = waveFirst;
            waveFirst.prev = this._activeParticlesLast;
            this._activeParticlesLast = waveLast;
          } else {
            this._activeParticlesFirst = waveFirst;
            this._activeParticlesLast = waveLast;
          }
          for (let i = 0; i < this.initBehaviors.length; ++i) {
            const behavior = this.initBehaviors[i];
            if (behavior === PositionParticle) {
              for (let particle = waveFirst, next; particle; particle = next) {
                next = particle.next;
                if (this.rotation !== 0) {
                  rotatePoint(this.rotation, particle.position);
                  particle.rotation += this.rotation;
                }
                particle.position.x += emitPosX;
                particle.position.y += emitPosY;
                particle.age += -this._spawnTimer;
                let lerp = particle.age * particle.oneOverLife;
                if (this.customEase) {
                  if (this.customEase.length === 4) {
                    lerp = this.customEase(lerp, 0, 1, 1);
                  } else {
                    lerp = this.customEase(lerp);
                  }
                }
                particle.agePercent = lerp;
              }
            } else {
              behavior.initParticles(waveFirst);
            }
          }
          for (let particle = waveFirst, next; particle; particle = next) {
            next = particle.next;
            for (let i = 0; i < this.updateBehaviors.length; ++i) {
              if (this.updateBehaviors[i].updateParticle(particle, -this._spawnTimer)) {
                this.recycle(particle);
                break;
              }
            }
          }
        }
        this._spawnTimer += this._frequency;
      }
    }
    if (this._posChanged) {
      this._prevEmitterPos.x = curX;
      this._prevEmitterPos.y = curY;
      this._prevPosIsValid = true;
      this._posChanged = false;
    }
    if (!this._emit && !this._activeParticlesFirst) {
      if (this._completeCallback) {
        const cb = this._completeCallback;
        this._completeCallback = null;
        cb();
      }
      if (this._destroyWhenComplete) {
        this.destroy();
      }
    }
  }
  /**
   * Emits a single wave of particles, using standard spawnChance & particlesPerWave settings. Does not affect
   * regular spawning through the frequency, and ignores the emit property. The max particle count is respected, however,
   * so if there are already too many particles then nothing will happen.
   */
  emitNow() {
    const emitPosX = this.ownerPos.x + this.spawnPos.x;
    const emitPosY = this.ownerPos.y + this.spawnPos.y;
    let waveFirst = null;
    let waveLast = null;
    for (let len = Math.min(this.particlesPerWave, this.maxParticles - this.particleCount), i = 0; i < len; ++i) {
      if (this.spawnChance < 1 && Math.random() >= this.spawnChance) {
        continue;
      }
      let p;
      if (this._poolFirst) {
        p = this._poolFirst;
        this._poolFirst = this._poolFirst.next;
        p.next = null;
      } else {
        p = new Particle(this);
      }
      let lifetime;
      if (this.minLifetime === this.maxLifetime) {
        lifetime = this.minLifetime;
      } else {
        lifetime = Math.random() * (this.maxLifetime - this.minLifetime) + this.minLifetime;
      }
      p.init(lifetime);
      if (this.addAtBack) {
        this._parent.addChildAt(p, 0);
      } else {
        this._parent.addChild(p);
      }
      if (waveFirst) {
        waveLast.next = p;
        p.prev = waveLast;
        waveLast = p;
      } else {
        waveLast = waveFirst = p;
      }
      ++this.particleCount;
    }
    if (waveFirst) {
      if (this._activeParticlesLast) {
        this._activeParticlesLast.next = waveFirst;
        waveFirst.prev = this._activeParticlesLast;
        this._activeParticlesLast = waveLast;
      } else {
        this._activeParticlesFirst = waveFirst;
        this._activeParticlesLast = waveLast;
      }
      for (let i = 0; i < this.initBehaviors.length; ++i) {
        const behavior = this.initBehaviors[i];
        if (behavior === PositionParticle) {
          for (let particle = waveFirst, next; particle; particle = next) {
            next = particle.next;
            if (this.rotation !== 0) {
              rotatePoint(this.rotation, particle.position);
              particle.rotation += this.rotation;
            }
            particle.position.x += emitPosX;
            particle.position.y += emitPosY;
          }
        } else {
          behavior.initParticles(waveFirst);
        }
      }
    }
  }
  /**
   * Kills all active particles immediately.
   */
  cleanup() {
    let particle;
    let next;
    for (particle = this._activeParticlesFirst; particle; particle = next) {
      next = particle.next;
      this.recycle(particle, true);
    }
    this._activeParticlesFirst = this._activeParticlesLast = null;
    this.particleCount = 0;
  }
  /**
   * If this emitter has been destroyed. Note that a destroyed emitter can still be reused, after
   * having a new parent set and being reinitialized.
   */
  get destroyed() {
    return !(this._parent && this.initBehaviors.length);
  }
  /**
   * Destroys the emitter and all of its particles.
   */
  destroy() {
    this.autoUpdate = false;
    this.cleanup();
    let next;
    for (let particle = this._poolFirst; particle; particle = next) {
      next = particle.next;
      particle.destroy();
    }
    this._poolFirst = this._parent = this.spawnPos = this.ownerPos = this.customEase = this._completeCallback = null;
    this.initBehaviors.length = this.updateBehaviors.length = this.recycleBehaviors.length = 0;
  }
}
Emitter.knownBehaviors = {};
Emitter.registerBehavior(AccelerationBehavior);
Emitter.registerBehavior(AlphaBehavior);
Emitter.registerBehavior(StaticAlphaBehavior);
Emitter.registerBehavior(RandomAnimatedTextureBehavior);
Emitter.registerBehavior(SingleAnimatedTextureBehavior);
Emitter.registerBehavior(BlendModeBehavior);
Emitter.registerBehavior(BurstSpawnBehavior);
Emitter.registerBehavior(ColorBehavior);
Emitter.registerBehavior(StaticColorBehavior);
Emitter.registerBehavior(OrderedTextureBehavior);
Emitter.registerBehavior(PathBehavior);
Emitter.registerBehavior(PointSpawnBehavior);
Emitter.registerBehavior(RandomTextureBehavior);
Emitter.registerBehavior(RotationBehavior);
Emitter.registerBehavior(StaticRotationBehavior);
Emitter.registerBehavior(NoRotationBehavior);
Emitter.registerBehavior(ScaleBehavior);
Emitter.registerBehavior(StaticScaleBehavior);
Emitter.registerBehavior(ShapeSpawnBehavior);
Emitter.registerBehavior(SingleTextureBehavior);
Emitter.registerBehavior(SpeedBehavior);
Emitter.registerBehavior(StaticSpeedBehavior);
function createApp({ assets: assets2 }) {
  const reset = () => {
    stateApp2.loaded = false;
    stateApp2.loadingProgress = 0;
    stateApp2.loadedAssets = {};
    stateApp2.pixiApplication = void 0;
  };
  const stateApp2 = {
    reset,
    assets: assets2,
    loaded: false,
    loadingProgress: 0,
    loadedAssets: {},
    pixiApplication: void 0
  };
  return { stateApp: stateApp2 };
}
function EnablePixiExtension($$payload, $$props) {
  push();
  const context2 = getContextApp();
  globalThis.__PIXI_APP__ = context2.stateApp.pixiApplication;
  pop();
}
function FadeContainer($$payload, $$props) {
  push();
  const {
    show,
    persistent,
    duration,
    oncomplete,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const alpha = new Tween(show ? 1 : 0, { duration });
  if (alpha.current > 0 || persistent) {
    $$payload.out += "<!--[-->";
    Container($$payload, spread_props([
      restProps,
      {
        alpha: alpha.current,
        children: ($$payload2) => {
          children($$payload2);
          $$payload2.out += `<!---->`;
        },
        $$slots: { default: true }
      }
    ]));
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function ResponsiveText($$payload, $$props) {
  const { maxWidth, $$slots, $$events, ...textProps } = $$props;
  let baseSizes = { width: 0 };
  const responsiveScale = maxWidth / (baseSizes.width || 1);
  Container($$payload, {
    visible: false,
    children: ($$payload2) => {
      Text($$payload2, spread_props([
        textProps,
        { onresize: (sizes) => baseSizes = sizes }
      ]));
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----> `;
  Container($$payload, {
    children: ($$payload2) => {
      Text($$payload2, spread_props([
        textProps,
        { scale: Math.min(responsiveScale, 1) }
      ]));
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!---->`;
}
function Button($$payload, $$props) {
  push();
  const {
    children,
    sizes,
    anchor,
    disabled,
    onpress,
    debug,
    $$slots,
    $$events,
    ...containerProps
  } = $$props;
  const center = { x: sizes.width * 0.5, y: sizes.height * 0.5 };
  let hovered = false;
  let pressed = false;
  Container($$payload, spread_props([
    containerProps,
    {
      eventMode: "static",
      cursor: disabled ? "not-allowed" : "pointer",
      pivot: anchorToPivot({ sizes, anchor }),
      onpointerover: () => {
        if (disabled) return;
        hovered = true;
      },
      onpointerout: () => {
        if (disabled) return;
        hovered = false;
      },
      onpointerdown: () => {
        if (disabled) return;
        pressed = true;
      },
      onpointerup: () => {
        if (disabled) return;
        pressed = false;
        onpress();
      },
      children: ($$payload2) => {
        if (debug) {
          $$payload2.out += "<!--[-->";
          Rectangle$1($$payload2, {
            width: sizes.width,
            height: sizes.height,
            alpha: 0.5,
            borderWidth: 2,
            borderColor: 16777215
          });
        } else {
          $$payload2.out += "<!--[!-->";
        }
        $$payload2.out += `<!--]--> `;
        children($$payload2, { center, hovered, pressed });
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    }
  ]));
  pop();
}
function MainContainer($$payload, $$props) {
  push();
  const {
    debug,
    alignVertical,
    alignHorizontal,
    children,
    standard,
    $$slots,
    $$events,
    ...containerProps
  } = $$props;
  const context2 = getContextLayout();
  const mainLayout = (standard ? context2.stateLayoutDerived.mainLayoutStandard : context2.stateLayoutDerived.mainLayout)();
  const canvasSizes = context2.stateLayoutDerived.canvasSizes();
  const getY = () => {
    const bottomY = canvasSizes.height * 0.5 - mainLayout.height * mainLayout.scale * 0.5;
    return alignVertical === "bottom" ? bottomY : 0;
  };
  const getX = () => {
    if (alignHorizontal === "left") return -canvasSizes.width * 0.5 + mainLayout.width * mainLayout.scale * 0.5;
    if (alignHorizontal === "right") return canvasSizes.width * 0.5 - mainLayout.width * mainLayout.scale * 0.5;
    return 0;
  };
  const y = getY();
  const x = getX();
  Container($$payload, {
    x,
    y,
    children: ($$payload2) => {
      Container($$payload2, spread_props([
        containerProps,
        {
          x: mainLayout.x,
          y: mainLayout.y,
          scale: mainLayout.scale,
          pivot: anchorToPivot({
            anchor: mainLayout.anchor,
            sizes: {
              width: mainLayout.width,
              height: mainLayout.height
            }
          }),
          children: ($$payload3) => {
            if (debug) {
              $$payload3.out += "<!--[-->";
              Rectangle$1($$payload3, {
                width: mainLayout.width,
                height: mainLayout.height,
                alpha: 0.5,
                borderWidth: 2,
                borderColor: 16777215
              });
            } else {
              $$payload3.out += "<!--[!-->";
            }
            $$payload3.out += `<!--]--> `;
            children($$payload3);
            $$payload3.out += `<!----> `;
            if (debug) {
              $$payload3.out += "<!--[-->";
              Text($$payload3, {
                text: `
layoutType: ${context2.stateLayoutDerived.layoutType()}

type: ${standard ? "standard" : "game"}

scale: ${mainLayout.scale}

mainSizes: {
		width: ${mainLayout.width},
		height: ${mainLayout.height}
}

canvasSizes: {
		width: ${context2.stateLayoutDerived.canvasSizes().width},
		height: ${context2.stateLayoutDerived.canvasSizes().height}
}`,
                style: { fill: 16777215 }
              });
            } else {
              $$payload3.out += "<!--[!-->";
            }
            $$payload3.out += `<!--]-->`;
          },
          $$slots: { default: true }
        }
      ]));
    },
    $$slots: { default: true }
  });
  pop();
}
function CanvasSizeRectangle($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const context2 = getContextLayout();
  Rectangle$1($$payload, spread_props([
    props,
    {
      width: context2.stateLayoutDerived.canvasSizes().width,
      height: context2.stateLayoutDerived.canvasSizes().height
    }
  ]));
  pop();
}
function OnPressFullScreen($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  CanvasSizeRectangle($$payload, {
    onpointerup: props.onpress,
    cursor: "pointer",
    eventMode: "static",
    backgroundColor: 16777215,
    backgroundAlpha: 1e-3
  });
  pop();
}
function getGlobal() {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
}
function getDevTools() {
  const w = getGlobal();
  if (w.__xstate__) {
    return w.__xstate__;
  }
  return void 0;
}
const devToolsAdapter = (service) => {
  if (typeof window === "undefined") {
    return;
  }
  const devTools = getDevTools();
  if (devTools) {
    devTools.register(service);
  }
};
class Mailbox {
  constructor(_process) {
    this._process = _process;
    this._active = false;
    this._current = null;
    this._last = null;
  }
  start() {
    this._active = true;
    this.flush();
  }
  clear() {
    if (this._current) {
      this._current.next = null;
      this._last = this._current;
    }
  }
  enqueue(event2) {
    const enqueued = {
      value: event2,
      next: null
    };
    if (this._current) {
      this._last.next = enqueued;
      this._last = enqueued;
      return;
    }
    this._current = enqueued;
    this._last = enqueued;
    if (this._active) {
      this.flush();
    }
  }
  flush() {
    while (this._current) {
      const consumed = this._current;
      this._process(consumed.value);
      this._current = consumed.next;
    }
    this._last = null;
  }
}
const STATE_DELIMITER = ".";
const TARGETLESS_KEY = "";
const NULL_EVENT = "";
const STATE_IDENTIFIER$1 = "#";
const WILDCARD = "*";
const XSTATE_INIT = "xstate.init";
const XSTATE_STOP = "xstate.stop";
function createAfterEvent(delayRef, id) {
  return {
    type: `xstate.after.${delayRef}.${id}`
  };
}
function createDoneStateEvent(id, output) {
  return {
    type: `xstate.done.state.${id}`,
    output
  };
}
function createDoneActorEvent(invokeId, output) {
  return {
    type: `xstate.done.actor.${invokeId}`,
    output,
    actorId: invokeId
  };
}
function createErrorActorEvent(id, error) {
  return {
    type: `xstate.error.actor.${id}`,
    error,
    actorId: id
  };
}
function createInitEvent(input) {
  return {
    type: XSTATE_INIT,
    input
  };
}
function reportUnhandledError(err) {
  setTimeout(() => {
    throw err;
  });
}
const symbolObservable = (() => typeof Symbol === "function" && Symbol.observable || "@@observable")();
function matchesState(parentStateId, childStateId) {
  const parentStateValue = toStateValue(parentStateId);
  const childStateValue = toStateValue(childStateId);
  if (typeof childStateValue === "string") {
    if (typeof parentStateValue === "string") {
      return childStateValue === parentStateValue;
    }
    return false;
  }
  if (typeof parentStateValue === "string") {
    return parentStateValue in childStateValue;
  }
  return Object.keys(parentStateValue).every((key) => {
    if (!(key in childStateValue)) {
      return false;
    }
    return matchesState(parentStateValue[key], childStateValue[key]);
  });
}
function toStatePath(stateId) {
  if (isArray(stateId)) {
    return stateId;
  }
  const result = [];
  let segment = "";
  for (let i = 0; i < stateId.length; i++) {
    const char = stateId.charCodeAt(i);
    switch (char) {
      // \
      case 92:
        segment += stateId[i + 1];
        i++;
        continue;
      // .
      case 46:
        result.push(segment);
        segment = "";
        continue;
    }
    segment += stateId[i];
  }
  result.push(segment);
  return result;
}
function toStateValue(stateValue) {
  if (isMachineSnapshot(stateValue)) {
    return stateValue.value;
  }
  if (typeof stateValue !== "string") {
    return stateValue;
  }
  const statePath = toStatePath(stateValue);
  return pathToStateValue(statePath);
}
function pathToStateValue(statePath) {
  if (statePath.length === 1) {
    return statePath[0];
  }
  const value = {};
  let marker = value;
  for (let i = 0; i < statePath.length - 1; i++) {
    if (i === statePath.length - 2) {
      marker[statePath[i]] = statePath[i + 1];
    } else {
      const previous = marker;
      marker = {};
      previous[statePath[i]] = marker;
    }
  }
  return value;
}
function mapValues(collection, iteratee) {
  const result = {};
  const collectionKeys = Object.keys(collection);
  for (let i = 0; i < collectionKeys.length; i++) {
    const key = collectionKeys[i];
    result[key] = iteratee(collection[key], key, collection, i);
  }
  return result;
}
function toArrayStrict(value) {
  if (isArray(value)) {
    return value;
  }
  return [value];
}
function toArray(value) {
  if (value === void 0) {
    return [];
  }
  return toArrayStrict(value);
}
function resolveOutput(mapper, context2, event2, self2) {
  if (typeof mapper === "function") {
    return mapper({
      context: context2,
      event: event2,
      self: self2
    });
  }
  return mapper;
}
function isArray(value) {
  return Array.isArray(value);
}
function isErrorActorEvent(event2) {
  return event2.type.startsWith("xstate.error.actor");
}
function toTransitionConfigArray(configLike) {
  return toArrayStrict(configLike).map((transitionLike) => {
    if (typeof transitionLike === "undefined" || typeof transitionLike === "string") {
      return {
        target: transitionLike
      };
    }
    return transitionLike;
  });
}
function normalizeTarget(target) {
  if (target === void 0 || target === TARGETLESS_KEY) {
    return void 0;
  }
  return toArray(target);
}
function toObserver(nextHandler, errorHandler, completionHandler) {
  const isObserver = typeof nextHandler === "object";
  const self2 = isObserver ? nextHandler : void 0;
  return {
    next: (isObserver ? nextHandler.next : nextHandler)?.bind(self2),
    error: (isObserver ? nextHandler.error : errorHandler)?.bind(self2),
    complete: (isObserver ? nextHandler.complete : completionHandler)?.bind(self2)
  };
}
function createInvokeId(stateNodeId, index) {
  return `${index}.${stateNodeId}`;
}
function resolveReferencedActor(machine, src) {
  const match = src.match(/^xstate\.invoke\.(\d+)\.(.*)/);
  if (!match) {
    return machine.implementations.actors[src];
  }
  const [, indexStr, nodeId] = match;
  const node = machine.getStateNodeById(nodeId);
  const invokeConfig = node.config.invoke;
  return (Array.isArray(invokeConfig) ? invokeConfig[indexStr] : invokeConfig).src;
}
function createScheduledEventId(actorRef, id) {
  return `${actorRef.sessionId}.${id}`;
}
let idCounter = 0;
function createSystem(rootActor, options) {
  const children = /* @__PURE__ */ new Map();
  const keyedActors = /* @__PURE__ */ new Map();
  const reverseKeyedActors = /* @__PURE__ */ new WeakMap();
  const inspectionObservers = /* @__PURE__ */ new Set();
  const timerMap = {};
  const {
    clock,
    logger
  } = options;
  const scheduler = {
    schedule: (source2, target, event2, delay, id = Math.random().toString(36).slice(2)) => {
      const scheduledEvent = {
        source: source2,
        target,
        event: event2,
        delay,
        id,
        startedAt: Date.now()
      };
      const scheduledEventId = createScheduledEventId(source2, id);
      system._snapshot._scheduledEvents[scheduledEventId] = scheduledEvent;
      const timeout = clock.setTimeout(() => {
        delete timerMap[scheduledEventId];
        delete system._snapshot._scheduledEvents[scheduledEventId];
        system._relay(source2, target, event2);
      }, delay);
      timerMap[scheduledEventId] = timeout;
    },
    cancel: (source2, id) => {
      const scheduledEventId = createScheduledEventId(source2, id);
      const timeout = timerMap[scheduledEventId];
      delete timerMap[scheduledEventId];
      delete system._snapshot._scheduledEvents[scheduledEventId];
      if (timeout !== void 0) {
        clock.clearTimeout(timeout);
      }
    },
    cancelAll: (actorRef) => {
      for (const scheduledEventId in system._snapshot._scheduledEvents) {
        const scheduledEvent = system._snapshot._scheduledEvents[scheduledEventId];
        if (scheduledEvent.source === actorRef) {
          scheduler.cancel(actorRef, scheduledEvent.id);
        }
      }
    }
  };
  const sendInspectionEvent = (event2) => {
    if (!inspectionObservers.size) {
      return;
    }
    const resolvedInspectionEvent = {
      ...event2,
      rootId: rootActor.sessionId
    };
    inspectionObservers.forEach((observer) => observer.next?.(resolvedInspectionEvent));
  };
  const system = {
    _snapshot: {
      _scheduledEvents: (options?.snapshot && options.snapshot.scheduler) ?? {}
    },
    _bookId: () => `x:${idCounter++}`,
    _register: (sessionId, actorRef) => {
      children.set(sessionId, actorRef);
      return sessionId;
    },
    _unregister: (actorRef) => {
      children.delete(actorRef.sessionId);
      const systemId = reverseKeyedActors.get(actorRef);
      if (systemId !== void 0) {
        keyedActors.delete(systemId);
        reverseKeyedActors.delete(actorRef);
      }
    },
    get: (systemId) => {
      return keyedActors.get(systemId);
    },
    _set: (systemId, actorRef) => {
      const existing = keyedActors.get(systemId);
      if (existing && existing !== actorRef) {
        throw new Error(`Actor with system ID '${systemId}' already exists.`);
      }
      keyedActors.set(systemId, actorRef);
      reverseKeyedActors.set(actorRef, systemId);
    },
    inspect: (observerOrFn) => {
      const observer = toObserver(observerOrFn);
      inspectionObservers.add(observer);
      return {
        unsubscribe() {
          inspectionObservers.delete(observer);
        }
      };
    },
    _sendInspectionEvent: sendInspectionEvent,
    _relay: (source2, target, event2) => {
      system._sendInspectionEvent({
        type: "@xstate.event",
        sourceRef: source2,
        actorRef: target,
        event: event2
      });
      target._send(event2);
    },
    scheduler,
    getSnapshot: () => {
      return {
        _scheduledEvents: {
          ...system._snapshot._scheduledEvents
        }
      };
    },
    start: () => {
      const scheduledEvents = system._snapshot._scheduledEvents;
      system._snapshot._scheduledEvents = {};
      for (const scheduledId in scheduledEvents) {
        const {
          source: source2,
          target,
          event: event2,
          delay,
          id
        } = scheduledEvents[scheduledId];
        scheduler.schedule(source2, target, event2, delay, id);
      }
    },
    _clock: clock,
    _logger: logger
  };
  return system;
}
let executingCustomAction = false;
const $$ACTOR_TYPE = 1;
let ProcessingStatus = /* @__PURE__ */ function(ProcessingStatus2) {
  ProcessingStatus2[ProcessingStatus2["NotStarted"] = 0] = "NotStarted";
  ProcessingStatus2[ProcessingStatus2["Running"] = 1] = "Running";
  ProcessingStatus2[ProcessingStatus2["Stopped"] = 2] = "Stopped";
  return ProcessingStatus2;
}({});
const defaultOptions = {
  clock: {
    setTimeout: (fn, ms) => {
      return setTimeout(fn, ms);
    },
    clearTimeout: (id) => {
      return clearTimeout(id);
    }
  },
  logger: console.log.bind(console),
  devTools: false
};
class Actor {
  /**
   * Creates a new actor instance for the given logic with the provided options,
   * if any.
   *
   * @param logic The logic to create an actor from
   * @param options Actor options
   */
  constructor(logic, options) {
    this.logic = logic;
    this._snapshot = void 0;
    this.clock = void 0;
    this.options = void 0;
    this.id = void 0;
    this.mailbox = new Mailbox(this._process.bind(this));
    this.observers = /* @__PURE__ */ new Set();
    this.eventListeners = /* @__PURE__ */ new Map();
    this.logger = void 0;
    this._processingStatus = ProcessingStatus.NotStarted;
    this._parent = void 0;
    this._syncSnapshot = void 0;
    this.ref = void 0;
    this._actorScope = void 0;
    this._systemId = void 0;
    this.sessionId = void 0;
    this.system = void 0;
    this._doneEvent = void 0;
    this.src = void 0;
    this._deferred = [];
    const resolvedOptions = {
      ...defaultOptions,
      ...options
    };
    const {
      clock,
      logger,
      parent,
      syncSnapshot,
      id,
      systemId,
      inspect
    } = resolvedOptions;
    this.system = parent ? parent.system : createSystem(this, {
      clock,
      logger
    });
    if (inspect && !parent) {
      this.system.inspect(toObserver(inspect));
    }
    this.sessionId = this.system._bookId();
    this.id = id ?? this.sessionId;
    this.logger = options?.logger ?? this.system._logger;
    this.clock = options?.clock ?? this.system._clock;
    this._parent = parent;
    this._syncSnapshot = syncSnapshot;
    this.options = resolvedOptions;
    this.src = resolvedOptions.src ?? logic;
    this.ref = this;
    this._actorScope = {
      self: this,
      id: this.id,
      sessionId: this.sessionId,
      logger: this.logger,
      defer: (fn) => {
        this._deferred.push(fn);
      },
      system: this.system,
      stopChild: (child) => {
        if (child._parent !== this) {
          throw new Error(`Cannot stop child actor ${child.id} of ${this.id} because it is not a child`);
        }
        child._stop();
      },
      emit: (emittedEvent) => {
        const listeners = this.eventListeners.get(emittedEvent.type);
        const wildcardListener = this.eventListeners.get("*");
        if (!listeners && !wildcardListener) {
          return;
        }
        const allListeners = [...listeners ? listeners.values() : [], ...wildcardListener ? wildcardListener.values() : []];
        for (const handler of allListeners) {
          handler(emittedEvent);
        }
      },
      actionExecutor: (action) => {
        const exec = () => {
          this._actorScope.system._sendInspectionEvent({
            type: "@xstate.action",
            actorRef: this,
            action: {
              type: action.type,
              params: action.params
            }
          });
          if (!action.exec) {
            return;
          }
          const saveExecutingCustomAction = executingCustomAction;
          try {
            executingCustomAction = true;
            action.exec(action.info, action.params);
          } finally {
            executingCustomAction = saveExecutingCustomAction;
          }
        };
        if (this._processingStatus === ProcessingStatus.Running) {
          exec();
        } else {
          this._deferred.push(exec);
        }
      }
    };
    this.send = this.send.bind(this);
    this.system._sendInspectionEvent({
      type: "@xstate.actor",
      actorRef: this
    });
    if (systemId) {
      this._systemId = systemId;
      this.system._set(systemId, this);
    }
    this._initState(options?.snapshot ?? options?.state);
    if (systemId && this._snapshot.status !== "active") {
      this.system._unregister(this);
    }
  }
  _initState(persistedState) {
    try {
      this._snapshot = persistedState ? this.logic.restoreSnapshot ? this.logic.restoreSnapshot(persistedState, this._actorScope) : persistedState : this.logic.getInitialSnapshot(this._actorScope, this.options?.input);
    } catch (err) {
      this._snapshot = {
        status: "error",
        output: void 0,
        error: err
      };
    }
  }
  update(snapshot2, event2) {
    this._snapshot = snapshot2;
    let deferredFn;
    while (deferredFn = this._deferred.shift()) {
      try {
        deferredFn();
      } catch (err) {
        this._deferred.length = 0;
        this._snapshot = {
          ...snapshot2,
          status: "error",
          error: err
        };
      }
    }
    switch (this._snapshot.status) {
      case "active":
        for (const observer of this.observers) {
          try {
            observer.next?.(snapshot2);
          } catch (err) {
            reportUnhandledError(err);
          }
        }
        break;
      case "done":
        for (const observer of this.observers) {
          try {
            observer.next?.(snapshot2);
          } catch (err) {
            reportUnhandledError(err);
          }
        }
        this._stopProcedure();
        this._complete();
        this._doneEvent = createDoneActorEvent(this.id, this._snapshot.output);
        if (this._parent) {
          this.system._relay(this, this._parent, this._doneEvent);
        }
        break;
      case "error":
        this._error(this._snapshot.error);
        break;
    }
    this.system._sendInspectionEvent({
      type: "@xstate.snapshot",
      actorRef: this,
      event: event2,
      snapshot: snapshot2
    });
  }
  /**
   * Subscribe an observer to an actor’s snapshot values.
   *
   * @remarks
   * The observer will receive the actor’s snapshot value when it is emitted.
   * The observer can be:
   *
   * - A plain function that receives the latest snapshot, or
   * - An observer object whose `.next(snapshot)` method receives the latest
   *   snapshot
   *
   * @example
   *
   * ```ts
   * // Observer as a plain function
   * const subscription = actor.subscribe((snapshot) => {
   *   console.log(snapshot);
   * });
   * ```
   *
   * @example
   *
   * ```ts
   * // Observer as an object
   * const subscription = actor.subscribe({
   *   next(snapshot) {
   *     console.log(snapshot);
   *   },
   *   error(err) {
   *     // ...
   *   },
   *   complete() {
   *     // ...
   *   }
   * });
   * ```
   *
   * The return value of `actor.subscribe(observer)` is a subscription object
   * that has an `.unsubscribe()` method. You can call
   * `subscription.unsubscribe()` to unsubscribe the observer:
   *
   * @example
   *
   * ```ts
   * const subscription = actor.subscribe((snapshot) => {
   *   // ...
   * });
   *
   * // Unsubscribe the observer
   * subscription.unsubscribe();
   * ```
   *
   * When the actor is stopped, all of its observers will automatically be
   * unsubscribed.
   *
   * @param observer - Either a plain function that receives the latest
   *   snapshot, or an observer object whose `.next(snapshot)` method receives
   *   the latest snapshot
   */
  subscribe(nextListenerOrObserver, errorListener, completeListener) {
    const observer = toObserver(nextListenerOrObserver, errorListener, completeListener);
    if (this._processingStatus !== ProcessingStatus.Stopped) {
      this.observers.add(observer);
    } else {
      switch (this._snapshot.status) {
        case "done":
          try {
            observer.complete?.();
          } catch (err) {
            reportUnhandledError(err);
          }
          break;
        case "error": {
          const err = this._snapshot.error;
          if (!observer.error) {
            reportUnhandledError(err);
          } else {
            try {
              observer.error(err);
            } catch (err2) {
              reportUnhandledError(err2);
            }
          }
          break;
        }
      }
    }
    return {
      unsubscribe: () => {
        this.observers.delete(observer);
      }
    };
  }
  on(type, handler) {
    let listeners = this.eventListeners.get(type);
    if (!listeners) {
      listeners = /* @__PURE__ */ new Set();
      this.eventListeners.set(type, listeners);
    }
    const wrappedHandler = handler.bind(void 0);
    listeners.add(wrappedHandler);
    return {
      unsubscribe: () => {
        listeners.delete(wrappedHandler);
      }
    };
  }
  /** Starts the Actor from the initial state */
  start() {
    if (this._processingStatus === ProcessingStatus.Running) {
      return this;
    }
    if (this._syncSnapshot) {
      this.subscribe({
        next: (snapshot2) => {
          if (snapshot2.status === "active") {
            this.system._relay(this, this._parent, {
              type: `xstate.snapshot.${this.id}`,
              snapshot: snapshot2
            });
          }
        },
        error: () => {
        }
      });
    }
    this.system._register(this.sessionId, this);
    if (this._systemId) {
      this.system._set(this._systemId, this);
    }
    this._processingStatus = ProcessingStatus.Running;
    const initEvent = createInitEvent(this.options.input);
    this.system._sendInspectionEvent({
      type: "@xstate.event",
      sourceRef: this._parent,
      actorRef: this,
      event: initEvent
    });
    const status = this._snapshot.status;
    switch (status) {
      case "done":
        this.update(this._snapshot, initEvent);
        return this;
      case "error":
        this._error(this._snapshot.error);
        return this;
    }
    if (!this._parent) {
      this.system.start();
    }
    if (this.logic.start) {
      try {
        this.logic.start(this._snapshot, this._actorScope);
      } catch (err) {
        this._snapshot = {
          ...this._snapshot,
          status: "error",
          error: err
        };
        this._error(err);
        return this;
      }
    }
    this.update(this._snapshot, initEvent);
    if (this.options.devTools) {
      this.attachDevTools();
    }
    this.mailbox.start();
    return this;
  }
  _process(event2) {
    let nextState;
    let caughtError;
    try {
      nextState = this.logic.transition(this._snapshot, event2, this._actorScope);
    } catch (err) {
      caughtError = {
        err
      };
    }
    if (caughtError) {
      const {
        err
      } = caughtError;
      this._snapshot = {
        ...this._snapshot,
        status: "error",
        error: err
      };
      this._error(err);
      return;
    }
    this.update(nextState, event2);
    if (event2.type === XSTATE_STOP) {
      this._stopProcedure();
      this._complete();
    }
  }
  _stop() {
    if (this._processingStatus === ProcessingStatus.Stopped) {
      return this;
    }
    this.mailbox.clear();
    if (this._processingStatus === ProcessingStatus.NotStarted) {
      this._processingStatus = ProcessingStatus.Stopped;
      return this;
    }
    this.mailbox.enqueue({
      type: XSTATE_STOP
    });
    return this;
  }
  /** Stops the Actor and unsubscribe all listeners. */
  stop() {
    if (this._parent) {
      throw new Error("A non-root actor cannot be stopped directly.");
    }
    return this._stop();
  }
  _complete() {
    for (const observer of this.observers) {
      try {
        observer.complete?.();
      } catch (err) {
        reportUnhandledError(err);
      }
    }
    this.observers.clear();
  }
  _reportError(err) {
    if (!this.observers.size) {
      if (!this._parent) {
        reportUnhandledError(err);
      }
      return;
    }
    let reportError = false;
    for (const observer of this.observers) {
      const errorListener = observer.error;
      reportError ||= !errorListener;
      try {
        errorListener?.(err);
      } catch (err2) {
        reportUnhandledError(err2);
      }
    }
    this.observers.clear();
    if (reportError) {
      reportUnhandledError(err);
    }
  }
  _error(err) {
    this._stopProcedure();
    this._reportError(err);
    if (this._parent) {
      this.system._relay(this, this._parent, createErrorActorEvent(this.id, err));
    }
  }
  // TODO: atm children don't belong entirely to the actor so
  // in a way - it's not even super aware of them
  // so we can't stop them from here but we really should!
  // right now, they are being stopped within the machine's transition
  // but that could throw and leave us with "orphaned" active actors
  _stopProcedure() {
    if (this._processingStatus !== ProcessingStatus.Running) {
      return this;
    }
    this.system.scheduler.cancelAll(this);
    this.mailbox.clear();
    this.mailbox = new Mailbox(this._process.bind(this));
    this._processingStatus = ProcessingStatus.Stopped;
    this.system._unregister(this);
    return this;
  }
  /** @internal */
  _send(event2) {
    if (this._processingStatus === ProcessingStatus.Stopped) {
      return;
    }
    this.mailbox.enqueue(event2);
  }
  /**
   * Sends an event to the running Actor to trigger a transition.
   *
   * @param event The event to send
   */
  send(event2) {
    this.system._relay(void 0, this, event2);
  }
  attachDevTools() {
    const {
      devTools
    } = this.options;
    if (devTools) {
      const resolvedDevToolsAdapter = typeof devTools === "function" ? devTools : devToolsAdapter;
      resolvedDevToolsAdapter(this);
    }
  }
  toJSON() {
    return {
      xstate$$type: $$ACTOR_TYPE,
      id: this.id
    };
  }
  /**
   * Obtain the internal state of the actor, which can be persisted.
   *
   * @remarks
   * The internal state can be persisted from any actor, not only machines.
   *
   * Note that the persisted state is not the same as the snapshot from
   * {@link Actor.getSnapshot}. Persisted state represents the internal state of
   * the actor, while snapshots represent the actor's last emitted value.
   *
   * Can be restored with {@link ActorOptions.state}
   * @see https://stately.ai/docs/persistence
   */
  getPersistedSnapshot(options) {
    return this.logic.getPersistedSnapshot(this._snapshot, options);
  }
  [symbolObservable]() {
    return this;
  }
  /**
   * Read an actor’s snapshot synchronously.
   *
   * @remarks
   * The snapshot represent an actor's last emitted value.
   *
   * When an actor receives an event, its internal state may change. An actor
   * may emit a snapshot when a state transition occurs.
   *
   * Note that some actors, such as callback actors generated with
   * `fromCallback`, will not emit snapshots.
   * @see {@link Actor.subscribe} to subscribe to an actor’s snapshot values.
   * @see {@link Actor.getPersistedSnapshot} to persist the internal state of an actor (which is more than just a snapshot).
   */
  getSnapshot() {
    return this._snapshot;
  }
}
function createActor(logic, ...[options]) {
  return new Actor(logic, options);
}
function resolveCancel(_2, snapshot2, actionArgs, actionParams, {
  sendId
}) {
  const resolvedSendId = typeof sendId === "function" ? sendId(actionArgs, actionParams) : sendId;
  return [snapshot2, {
    sendId: resolvedSendId
  }, void 0];
}
function executeCancel(actorScope, params) {
  actorScope.defer(() => {
    actorScope.system.scheduler.cancel(actorScope.self, params.sendId);
  });
}
function cancel(sendId) {
  function cancel2(_args, _params) {
  }
  cancel2.type = "xstate.cancel";
  cancel2.sendId = sendId;
  cancel2.resolve = resolveCancel;
  cancel2.execute = executeCancel;
  return cancel2;
}
function resolveSpawn(actorScope, snapshot2, actionArgs, _actionParams, {
  id,
  systemId,
  src,
  input,
  syncSnapshot
}) {
  const logic = typeof src === "string" ? resolveReferencedActor(snapshot2.machine, src) : src;
  const resolvedId = typeof id === "function" ? id(actionArgs) : id;
  let actorRef;
  let resolvedInput = void 0;
  if (logic) {
    resolvedInput = typeof input === "function" ? input({
      context: snapshot2.context,
      event: actionArgs.event,
      self: actorScope.self
    }) : input;
    actorRef = createActor(logic, {
      id: resolvedId,
      src,
      parent: actorScope.self,
      syncSnapshot,
      systemId,
      input: resolvedInput
    });
  }
  return [cloneMachineSnapshot(snapshot2, {
    children: {
      ...snapshot2.children,
      [resolvedId]: actorRef
    }
  }), {
    id,
    systemId,
    actorRef,
    src,
    input: resolvedInput
  }, void 0];
}
function executeSpawn(actorScope, {
  actorRef
}) {
  if (!actorRef) {
    return;
  }
  actorScope.defer(() => {
    if (actorRef._processingStatus === ProcessingStatus.Stopped) {
      return;
    }
    actorRef.start();
  });
}
function spawnChild(...[src, {
  id,
  systemId,
  input,
  syncSnapshot = false
} = {}]) {
  function spawnChild2(_args, _params) {
  }
  spawnChild2.type = "xstate.spawnChild";
  spawnChild2.id = id;
  spawnChild2.systemId = systemId;
  spawnChild2.src = src;
  spawnChild2.input = input;
  spawnChild2.syncSnapshot = syncSnapshot;
  spawnChild2.resolve = resolveSpawn;
  spawnChild2.execute = executeSpawn;
  return spawnChild2;
}
function resolveStop(_2, snapshot2, args, actionParams, {
  actorRef
}) {
  const actorRefOrString = typeof actorRef === "function" ? actorRef(args, actionParams) : actorRef;
  const resolvedActorRef = typeof actorRefOrString === "string" ? snapshot2.children[actorRefOrString] : actorRefOrString;
  let children = snapshot2.children;
  if (resolvedActorRef) {
    children = {
      ...children
    };
    delete children[resolvedActorRef.id];
  }
  return [cloneMachineSnapshot(snapshot2, {
    children
  }), resolvedActorRef, void 0];
}
function executeStop(actorScope, actorRef) {
  if (!actorRef) {
    return;
  }
  actorScope.system._unregister(actorRef);
  if (actorRef._processingStatus !== ProcessingStatus.Running) {
    actorScope.stopChild(actorRef);
    return;
  }
  actorScope.defer(() => {
    actorScope.stopChild(actorRef);
  });
}
function stopChild(actorRef) {
  function stop(_args, _params) {
  }
  stop.type = "xstate.stopChild";
  stop.actorRef = actorRef;
  stop.resolve = resolveStop;
  stop.execute = executeStop;
  return stop;
}
function evaluateGuard(guard, context2, event2, snapshot2) {
  const {
    machine
  } = snapshot2;
  const isInline = typeof guard === "function";
  const resolved = isInline ? guard : machine.implementations.guards[typeof guard === "string" ? guard : guard.type];
  if (!isInline && !resolved) {
    throw new Error(`Guard '${typeof guard === "string" ? guard : guard.type}' is not implemented.'.`);
  }
  if (typeof resolved !== "function") {
    return evaluateGuard(resolved, context2, event2, snapshot2);
  }
  const guardArgs = {
    context: context2,
    event: event2
  };
  const guardParams = isInline || typeof guard === "string" ? void 0 : "params" in guard ? typeof guard.params === "function" ? guard.params({
    context: context2,
    event: event2
  }) : guard.params : void 0;
  if (!("check" in resolved)) {
    return resolved(guardArgs, guardParams);
  }
  const builtinGuard = resolved;
  return builtinGuard.check(
    snapshot2,
    guardArgs,
    resolved
    // this holds all params
  );
}
const isAtomicStateNode = (stateNode) => stateNode.type === "atomic" || stateNode.type === "final";
function getChildren(stateNode) {
  return Object.values(stateNode.states).filter((sn) => sn.type !== "history");
}
function getProperAncestors(stateNode, toStateNode) {
  const ancestors = [];
  if (toStateNode === stateNode) {
    return ancestors;
  }
  let m = stateNode.parent;
  while (m && m !== toStateNode) {
    ancestors.push(m);
    m = m.parent;
  }
  return ancestors;
}
function getAllStateNodes(stateNodes) {
  const nodeSet = new Set(stateNodes);
  const adjList = getAdjList(nodeSet);
  for (const s of nodeSet) {
    if (s.type === "compound" && (!adjList.get(s) || !adjList.get(s).length)) {
      getInitialStateNodesWithTheirAncestors(s).forEach((sn) => nodeSet.add(sn));
    } else {
      if (s.type === "parallel") {
        for (const child of getChildren(s)) {
          if (child.type === "history") {
            continue;
          }
          if (!nodeSet.has(child)) {
            const initialStates = getInitialStateNodesWithTheirAncestors(child);
            for (const initialStateNode of initialStates) {
              nodeSet.add(initialStateNode);
            }
          }
        }
      }
    }
  }
  for (const s of nodeSet) {
    let m = s.parent;
    while (m) {
      nodeSet.add(m);
      m = m.parent;
    }
  }
  return nodeSet;
}
function getValueFromAdj(baseNode, adjList) {
  const childStateNodes = adjList.get(baseNode);
  if (!childStateNodes) {
    return {};
  }
  if (baseNode.type === "compound") {
    const childStateNode = childStateNodes[0];
    if (childStateNode) {
      if (isAtomicStateNode(childStateNode)) {
        return childStateNode.key;
      }
    } else {
      return {};
    }
  }
  const stateValue = {};
  for (const childStateNode of childStateNodes) {
    stateValue[childStateNode.key] = getValueFromAdj(childStateNode, adjList);
  }
  return stateValue;
}
function getAdjList(stateNodes) {
  const adjList = /* @__PURE__ */ new Map();
  for (const s of stateNodes) {
    if (!adjList.has(s)) {
      adjList.set(s, []);
    }
    if (s.parent) {
      if (!adjList.has(s.parent)) {
        adjList.set(s.parent, []);
      }
      adjList.get(s.parent).push(s);
    }
  }
  return adjList;
}
function getStateValue(rootNode, stateNodes) {
  const config2 = getAllStateNodes(stateNodes);
  return getValueFromAdj(rootNode, getAdjList(config2));
}
function isInFinalState(stateNodeSet, stateNode) {
  if (stateNode.type === "compound") {
    return getChildren(stateNode).some((s) => s.type === "final" && stateNodeSet.has(s));
  }
  if (stateNode.type === "parallel") {
    return getChildren(stateNode).every((sn) => isInFinalState(stateNodeSet, sn));
  }
  return stateNode.type === "final";
}
const isStateId = (str) => str[0] === STATE_IDENTIFIER$1;
function getCandidates(stateNode, receivedEventType) {
  const candidates = stateNode.transitions.get(receivedEventType) || [...stateNode.transitions.keys()].filter((eventDescriptor) => {
    if (eventDescriptor === WILDCARD) {
      return true;
    }
    if (!eventDescriptor.endsWith(".*")) {
      return false;
    }
    const partialEventTokens = eventDescriptor.split(".");
    const eventTokens = receivedEventType.split(".");
    for (let tokenIndex = 0; tokenIndex < partialEventTokens.length; tokenIndex++) {
      const partialEventToken = partialEventTokens[tokenIndex];
      const eventToken = eventTokens[tokenIndex];
      if (partialEventToken === "*") {
        const isLastToken = tokenIndex === partialEventTokens.length - 1;
        return isLastToken;
      }
      if (partialEventToken !== eventToken) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => b.length - a.length).flatMap((key) => stateNode.transitions.get(key));
  return candidates;
}
function getDelayedTransitions(stateNode) {
  const afterConfig = stateNode.config.after;
  if (!afterConfig) {
    return [];
  }
  const mutateEntryExit = (delay) => {
    const afterEvent = createAfterEvent(delay, stateNode.id);
    const eventType = afterEvent.type;
    stateNode.entry.push(raise(afterEvent, {
      id: eventType,
      delay
    }));
    stateNode.exit.push(cancel(eventType));
    return eventType;
  };
  const delayedTransitions = Object.keys(afterConfig).flatMap((delay) => {
    const configTransition = afterConfig[delay];
    const resolvedTransition = typeof configTransition === "string" ? {
      target: configTransition
    } : configTransition;
    const resolvedDelay = Number.isNaN(+delay) ? delay : +delay;
    const eventType = mutateEntryExit(resolvedDelay);
    return toArray(resolvedTransition).map((transition) => ({
      ...transition,
      event: eventType,
      delay: resolvedDelay
    }));
  });
  return delayedTransitions.map((delayedTransition) => {
    const {
      delay
    } = delayedTransition;
    return {
      ...formatTransition(stateNode, delayedTransition.event, delayedTransition),
      delay
    };
  });
}
function formatTransition(stateNode, descriptor, transitionConfig) {
  const normalizedTarget = normalizeTarget(transitionConfig.target);
  const reenter = transitionConfig.reenter ?? false;
  const target = resolveTarget(stateNode, normalizedTarget);
  const transition = {
    ...transitionConfig,
    actions: toArray(transitionConfig.actions),
    guard: transitionConfig.guard,
    target,
    source: stateNode,
    reenter,
    eventType: descriptor,
    toJSON: () => ({
      ...transition,
      source: `#${stateNode.id}`,
      target: target ? target.map((t) => `#${t.id}`) : void 0
    })
  };
  return transition;
}
function formatTransitions(stateNode) {
  const transitions = /* @__PURE__ */ new Map();
  if (stateNode.config.on) {
    for (const descriptor of Object.keys(stateNode.config.on)) {
      if (descriptor === NULL_EVENT) {
        throw new Error('Null events ("") cannot be specified as a transition key. Use `always: { ... }` instead.');
      }
      const transitionsConfig = stateNode.config.on[descriptor];
      transitions.set(descriptor, toTransitionConfigArray(transitionsConfig).map((t) => formatTransition(stateNode, descriptor, t)));
    }
  }
  if (stateNode.config.onDone) {
    const descriptor = `xstate.done.state.${stateNode.id}`;
    transitions.set(descriptor, toTransitionConfigArray(stateNode.config.onDone).map((t) => formatTransition(stateNode, descriptor, t)));
  }
  for (const invokeDef of stateNode.invoke) {
    if (invokeDef.onDone) {
      const descriptor = `xstate.done.actor.${invokeDef.id}`;
      transitions.set(descriptor, toTransitionConfigArray(invokeDef.onDone).map((t) => formatTransition(stateNode, descriptor, t)));
    }
    if (invokeDef.onError) {
      const descriptor = `xstate.error.actor.${invokeDef.id}`;
      transitions.set(descriptor, toTransitionConfigArray(invokeDef.onError).map((t) => formatTransition(stateNode, descriptor, t)));
    }
    if (invokeDef.onSnapshot) {
      const descriptor = `xstate.snapshot.${invokeDef.id}`;
      transitions.set(descriptor, toTransitionConfigArray(invokeDef.onSnapshot).map((t) => formatTransition(stateNode, descriptor, t)));
    }
  }
  for (const delayedTransition of stateNode.after) {
    let existing = transitions.get(delayedTransition.eventType);
    if (!existing) {
      existing = [];
      transitions.set(delayedTransition.eventType, existing);
    }
    existing.push(delayedTransition);
  }
  return transitions;
}
function formatInitialTransition(stateNode, _target) {
  const resolvedTarget = typeof _target === "string" ? stateNode.states[_target] : _target ? stateNode.states[_target.target] : void 0;
  if (!resolvedTarget && _target) {
    throw new Error(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string
      `Initial state node "${_target}" not found on parent state node #${stateNode.id}`
    );
  }
  const transition = {
    source: stateNode,
    actions: !_target || typeof _target === "string" ? [] : toArray(_target.actions),
    eventType: null,
    reenter: false,
    target: resolvedTarget ? [resolvedTarget] : [],
    toJSON: () => ({
      ...transition,
      source: `#${stateNode.id}`,
      target: resolvedTarget ? [`#${resolvedTarget.id}`] : []
    })
  };
  return transition;
}
function resolveTarget(stateNode, targets) {
  if (targets === void 0) {
    return void 0;
  }
  return targets.map((target) => {
    if (typeof target !== "string") {
      return target;
    }
    if (isStateId(target)) {
      return stateNode.machine.getStateNodeById(target);
    }
    const isInternalTarget = target[0] === STATE_DELIMITER;
    if (isInternalTarget && !stateNode.parent) {
      return getStateNodeByPath(stateNode, target.slice(1));
    }
    const resolvedTarget = isInternalTarget ? stateNode.key + target : target;
    if (stateNode.parent) {
      try {
        const targetStateNode = getStateNodeByPath(stateNode.parent, resolvedTarget);
        return targetStateNode;
      } catch (err) {
        throw new Error(`Invalid transition definition for state node '${stateNode.id}':
${err.message}`);
      }
    } else {
      throw new Error(`Invalid target: "${target}" is not a valid target from the root node. Did you mean ".${target}"?`);
    }
  });
}
function resolveHistoryDefaultTransition(stateNode) {
  const normalizedTarget = normalizeTarget(stateNode.config.target);
  if (!normalizedTarget) {
    return stateNode.parent.initial;
  }
  return {
    target: normalizedTarget.map((t) => typeof t === "string" ? getStateNodeByPath(stateNode.parent, t) : t)
  };
}
function isHistoryNode(stateNode) {
  return stateNode.type === "history";
}
function getInitialStateNodesWithTheirAncestors(stateNode) {
  const states = getInitialStateNodes(stateNode);
  for (const initialState of states) {
    for (const ancestor of getProperAncestors(initialState, stateNode)) {
      states.add(ancestor);
    }
  }
  return states;
}
function getInitialStateNodes(stateNode) {
  const set2 = /* @__PURE__ */ new Set();
  function iter(descStateNode) {
    if (set2.has(descStateNode)) {
      return;
    }
    set2.add(descStateNode);
    if (descStateNode.type === "compound") {
      iter(descStateNode.initial.target[0]);
    } else if (descStateNode.type === "parallel") {
      for (const child of getChildren(descStateNode)) {
        iter(child);
      }
    }
  }
  iter(stateNode);
  return set2;
}
function getStateNode(stateNode, stateKey) {
  if (isStateId(stateKey)) {
    return stateNode.machine.getStateNodeById(stateKey);
  }
  if (!stateNode.states) {
    throw new Error(`Unable to retrieve child state '${stateKey}' from '${stateNode.id}'; no child states exist.`);
  }
  const result = stateNode.states[stateKey];
  if (!result) {
    throw new Error(`Child state '${stateKey}' does not exist on '${stateNode.id}'`);
  }
  return result;
}
function getStateNodeByPath(stateNode, statePath) {
  if (typeof statePath === "string" && isStateId(statePath)) {
    try {
      return stateNode.machine.getStateNodeById(statePath);
    } catch {
    }
  }
  const arrayStatePath = toStatePath(statePath).slice();
  let currentStateNode = stateNode;
  while (arrayStatePath.length) {
    const key = arrayStatePath.shift();
    if (!key.length) {
      break;
    }
    currentStateNode = getStateNode(currentStateNode, key);
  }
  return currentStateNode;
}
function getStateNodes(stateNode, stateValue) {
  if (typeof stateValue === "string") {
    const childStateNode = stateNode.states[stateValue];
    if (!childStateNode) {
      throw new Error(`State '${stateValue}' does not exist on '${stateNode.id}'`);
    }
    return [stateNode, childStateNode];
  }
  const childStateKeys = Object.keys(stateValue);
  const childStateNodes = childStateKeys.map((subStateKey) => getStateNode(stateNode, subStateKey)).filter(Boolean);
  return [stateNode.machine.root, stateNode].concat(childStateNodes, childStateKeys.reduce((allSubStateNodes, subStateKey) => {
    const subStateNode = getStateNode(stateNode, subStateKey);
    if (!subStateNode) {
      return allSubStateNodes;
    }
    const subStateNodes = getStateNodes(subStateNode, stateValue[subStateKey]);
    return allSubStateNodes.concat(subStateNodes);
  }, []));
}
function transitionAtomicNode(stateNode, stateValue, snapshot2, event2) {
  const childStateNode = getStateNode(stateNode, stateValue);
  const next = childStateNode.next(snapshot2, event2);
  if (!next || !next.length) {
    return stateNode.next(snapshot2, event2);
  }
  return next;
}
function transitionCompoundNode(stateNode, stateValue, snapshot2, event2) {
  const subStateKeys = Object.keys(stateValue);
  const childStateNode = getStateNode(stateNode, subStateKeys[0]);
  const next = transitionNode(childStateNode, stateValue[subStateKeys[0]], snapshot2, event2);
  if (!next || !next.length) {
    return stateNode.next(snapshot2, event2);
  }
  return next;
}
function transitionParallelNode(stateNode, stateValue, snapshot2, event2) {
  const allInnerTransitions = [];
  for (const subStateKey of Object.keys(stateValue)) {
    const subStateValue = stateValue[subStateKey];
    if (!subStateValue) {
      continue;
    }
    const subStateNode = getStateNode(stateNode, subStateKey);
    const innerTransitions = transitionNode(subStateNode, subStateValue, snapshot2, event2);
    if (innerTransitions) {
      allInnerTransitions.push(...innerTransitions);
    }
  }
  if (!allInnerTransitions.length) {
    return stateNode.next(snapshot2, event2);
  }
  return allInnerTransitions;
}
function transitionNode(stateNode, stateValue, snapshot2, event2) {
  if (typeof stateValue === "string") {
    return transitionAtomicNode(stateNode, stateValue, snapshot2, event2);
  }
  if (Object.keys(stateValue).length === 1) {
    return transitionCompoundNode(stateNode, stateValue, snapshot2, event2);
  }
  return transitionParallelNode(stateNode, stateValue, snapshot2, event2);
}
function getHistoryNodes(stateNode) {
  return Object.keys(stateNode.states).map((key) => stateNode.states[key]).filter((sn) => sn.type === "history");
}
function isDescendant(childStateNode, parentStateNode) {
  let marker = childStateNode;
  while (marker.parent && marker.parent !== parentStateNode) {
    marker = marker.parent;
  }
  return marker.parent === parentStateNode;
}
function hasIntersection(s1, s2) {
  const set1 = new Set(s1);
  const set2 = new Set(s2);
  for (const item of set1) {
    if (set2.has(item)) {
      return true;
    }
  }
  for (const item of set2) {
    if (set1.has(item)) {
      return true;
    }
  }
  return false;
}
function removeConflictingTransitions(enabledTransitions, stateNodeSet, historyValue) {
  const filteredTransitions = /* @__PURE__ */ new Set();
  for (const t1 of enabledTransitions) {
    let t1Preempted = false;
    const transitionsToRemove = /* @__PURE__ */ new Set();
    for (const t2 of filteredTransitions) {
      if (hasIntersection(computeExitSet([t1], stateNodeSet, historyValue), computeExitSet([t2], stateNodeSet, historyValue))) {
        if (isDescendant(t1.source, t2.source)) {
          transitionsToRemove.add(t2);
        } else {
          t1Preempted = true;
          break;
        }
      }
    }
    if (!t1Preempted) {
      for (const t3 of transitionsToRemove) {
        filteredTransitions.delete(t3);
      }
      filteredTransitions.add(t1);
    }
  }
  return Array.from(filteredTransitions);
}
function findLeastCommonAncestor(stateNodes) {
  const [head, ...tail] = stateNodes;
  for (const ancestor of getProperAncestors(head, void 0)) {
    if (tail.every((sn) => isDescendant(sn, ancestor))) {
      return ancestor;
    }
  }
}
function getEffectiveTargetStates(transition, historyValue) {
  if (!transition.target) {
    return [];
  }
  const targets = /* @__PURE__ */ new Set();
  for (const targetNode of transition.target) {
    if (isHistoryNode(targetNode)) {
      if (historyValue[targetNode.id]) {
        for (const node of historyValue[targetNode.id]) {
          targets.add(node);
        }
      } else {
        for (const node of getEffectiveTargetStates(resolveHistoryDefaultTransition(targetNode), historyValue)) {
          targets.add(node);
        }
      }
    } else {
      targets.add(targetNode);
    }
  }
  return [...targets];
}
function getTransitionDomain(transition, historyValue) {
  const targetStates = getEffectiveTargetStates(transition, historyValue);
  if (!targetStates) {
    return;
  }
  if (!transition.reenter && targetStates.every((target) => target === transition.source || isDescendant(target, transition.source))) {
    return transition.source;
  }
  const lca = findLeastCommonAncestor(targetStates.concat(transition.source));
  if (lca) {
    return lca;
  }
  if (transition.reenter) {
    return;
  }
  return transition.source.machine.root;
}
function computeExitSet(transitions, stateNodeSet, historyValue) {
  const statesToExit = /* @__PURE__ */ new Set();
  for (const t of transitions) {
    if (t.target?.length) {
      const domain = getTransitionDomain(t, historyValue);
      if (t.reenter && t.source === domain) {
        statesToExit.add(domain);
      }
      for (const stateNode of stateNodeSet) {
        if (isDescendant(stateNode, domain)) {
          statesToExit.add(stateNode);
        }
      }
    }
  }
  return [...statesToExit];
}
function areStateNodeCollectionsEqual(prevStateNodes, nextStateNodeSet) {
  if (prevStateNodes.length !== nextStateNodeSet.size) {
    return false;
  }
  for (const node of prevStateNodes) {
    if (!nextStateNodeSet.has(node)) {
      return false;
    }
  }
  return true;
}
function microstep(transitions, currentSnapshot, actorScope, event2, isInitial, internalQueue) {
  if (!transitions.length) {
    return currentSnapshot;
  }
  const mutStateNodeSet = new Set(currentSnapshot._nodes);
  let historyValue = currentSnapshot.historyValue;
  const filteredTransitions = removeConflictingTransitions(transitions, mutStateNodeSet, historyValue);
  let nextState = currentSnapshot;
  if (!isInitial) {
    [nextState, historyValue] = exitStates(nextState, event2, actorScope, filteredTransitions, mutStateNodeSet, historyValue, internalQueue, actorScope.actionExecutor);
  }
  nextState = resolveActionsAndContext(nextState, event2, actorScope, filteredTransitions.flatMap((t) => t.actions), internalQueue, void 0);
  nextState = enterStates(nextState, event2, actorScope, filteredTransitions, mutStateNodeSet, internalQueue, historyValue, isInitial);
  const nextStateNodes = [...mutStateNodeSet];
  if (nextState.status === "done") {
    nextState = resolveActionsAndContext(nextState, event2, actorScope, nextStateNodes.sort((a, b) => b.order - a.order).flatMap((state) => state.exit), internalQueue, void 0);
  }
  try {
    if (historyValue === currentSnapshot.historyValue && areStateNodeCollectionsEqual(currentSnapshot._nodes, mutStateNodeSet)) {
      return nextState;
    }
    return cloneMachineSnapshot(nextState, {
      _nodes: nextStateNodes,
      historyValue
    });
  } catch (e) {
    throw e;
  }
}
function getMachineOutput(snapshot2, event2, actorScope, rootNode, rootCompletionNode) {
  if (rootNode.output === void 0) {
    return;
  }
  const doneStateEvent = createDoneStateEvent(rootCompletionNode.id, rootCompletionNode.output !== void 0 && rootCompletionNode.parent ? resolveOutput(rootCompletionNode.output, snapshot2.context, event2, actorScope.self) : void 0);
  return resolveOutput(rootNode.output, snapshot2.context, doneStateEvent, actorScope.self);
}
function enterStates(currentSnapshot, event2, actorScope, filteredTransitions, mutStateNodeSet, internalQueue, historyValue, isInitial) {
  let nextSnapshot = currentSnapshot;
  const statesToEnter = /* @__PURE__ */ new Set();
  const statesForDefaultEntry = /* @__PURE__ */ new Set();
  computeEntrySet(filteredTransitions, historyValue, statesForDefaultEntry, statesToEnter);
  if (isInitial) {
    statesForDefaultEntry.add(currentSnapshot.machine.root);
  }
  const completedNodes = /* @__PURE__ */ new Set();
  for (const stateNodeToEnter of [...statesToEnter].sort((a, b) => a.order - b.order)) {
    mutStateNodeSet.add(stateNodeToEnter);
    const actions = [];
    actions.push(...stateNodeToEnter.entry);
    for (const invokeDef of stateNodeToEnter.invoke) {
      actions.push(spawnChild(invokeDef.src, {
        ...invokeDef,
        syncSnapshot: !!invokeDef.onSnapshot
      }));
    }
    if (statesForDefaultEntry.has(stateNodeToEnter)) {
      const initialActions = stateNodeToEnter.initial.actions;
      actions.push(...initialActions);
    }
    nextSnapshot = resolveActionsAndContext(nextSnapshot, event2, actorScope, actions, internalQueue, stateNodeToEnter.invoke.map((invokeDef) => invokeDef.id));
    if (stateNodeToEnter.type === "final") {
      const parent = stateNodeToEnter.parent;
      let ancestorMarker = parent?.type === "parallel" ? parent : parent?.parent;
      let rootCompletionNode = ancestorMarker || stateNodeToEnter;
      if (parent?.type === "compound") {
        internalQueue.push(createDoneStateEvent(parent.id, stateNodeToEnter.output !== void 0 ? resolveOutput(stateNodeToEnter.output, nextSnapshot.context, event2, actorScope.self) : void 0));
      }
      while (ancestorMarker?.type === "parallel" && !completedNodes.has(ancestorMarker) && isInFinalState(mutStateNodeSet, ancestorMarker)) {
        completedNodes.add(ancestorMarker);
        internalQueue.push(createDoneStateEvent(ancestorMarker.id));
        rootCompletionNode = ancestorMarker;
        ancestorMarker = ancestorMarker.parent;
      }
      if (ancestorMarker) {
        continue;
      }
      nextSnapshot = cloneMachineSnapshot(nextSnapshot, {
        status: "done",
        output: getMachineOutput(nextSnapshot, event2, actorScope, nextSnapshot.machine.root, rootCompletionNode)
      });
    }
  }
  return nextSnapshot;
}
function computeEntrySet(transitions, historyValue, statesForDefaultEntry, statesToEnter) {
  for (const t of transitions) {
    const domain = getTransitionDomain(t, historyValue);
    for (const s of t.target || []) {
      if (!isHistoryNode(s) && // if the target is different than the source then it will *definitely* be entered
      (t.source !== s || // we know that the domain can't lie within the source
      // if it's different than the source then it's outside of it and it means that the target has to be entered as well
      t.source !== domain || // reentering transitions always enter the target, even if it's the source itself
      t.reenter)) {
        statesToEnter.add(s);
        statesForDefaultEntry.add(s);
      }
      addDescendantStatesToEnter(s, historyValue, statesForDefaultEntry, statesToEnter);
    }
    const targetStates = getEffectiveTargetStates(t, historyValue);
    for (const s of targetStates) {
      const ancestors = getProperAncestors(s, domain);
      if (domain?.type === "parallel") {
        ancestors.push(domain);
      }
      addAncestorStatesToEnter(statesToEnter, historyValue, statesForDefaultEntry, ancestors, !t.source.parent && t.reenter ? void 0 : domain);
    }
  }
}
function addDescendantStatesToEnter(stateNode, historyValue, statesForDefaultEntry, statesToEnter) {
  if (isHistoryNode(stateNode)) {
    if (historyValue[stateNode.id]) {
      const historyStateNodes = historyValue[stateNode.id];
      for (const s of historyStateNodes) {
        statesToEnter.add(s);
        addDescendantStatesToEnter(s, historyValue, statesForDefaultEntry, statesToEnter);
      }
      for (const s of historyStateNodes) {
        addProperAncestorStatesToEnter(s, stateNode.parent, statesToEnter, historyValue, statesForDefaultEntry);
      }
    } else {
      const historyDefaultTransition = resolveHistoryDefaultTransition(stateNode);
      for (const s of historyDefaultTransition.target) {
        statesToEnter.add(s);
        if (historyDefaultTransition === stateNode.parent?.initial) {
          statesForDefaultEntry.add(stateNode.parent);
        }
        addDescendantStatesToEnter(s, historyValue, statesForDefaultEntry, statesToEnter);
      }
      for (const s of historyDefaultTransition.target) {
        addProperAncestorStatesToEnter(s, stateNode.parent, statesToEnter, historyValue, statesForDefaultEntry);
      }
    }
  } else {
    if (stateNode.type === "compound") {
      const [initialState] = stateNode.initial.target;
      if (!isHistoryNode(initialState)) {
        statesToEnter.add(initialState);
        statesForDefaultEntry.add(initialState);
      }
      addDescendantStatesToEnter(initialState, historyValue, statesForDefaultEntry, statesToEnter);
      addProperAncestorStatesToEnter(initialState, stateNode, statesToEnter, historyValue, statesForDefaultEntry);
    } else {
      if (stateNode.type === "parallel") {
        for (const child of getChildren(stateNode).filter((sn) => !isHistoryNode(sn))) {
          if (![...statesToEnter].some((s) => isDescendant(s, child))) {
            if (!isHistoryNode(child)) {
              statesToEnter.add(child);
              statesForDefaultEntry.add(child);
            }
            addDescendantStatesToEnter(child, historyValue, statesForDefaultEntry, statesToEnter);
          }
        }
      }
    }
  }
}
function addAncestorStatesToEnter(statesToEnter, historyValue, statesForDefaultEntry, ancestors, reentrancyDomain) {
  for (const anc of ancestors) {
    if (!reentrancyDomain || isDescendant(anc, reentrancyDomain)) {
      statesToEnter.add(anc);
    }
    if (anc.type === "parallel") {
      for (const child of getChildren(anc).filter((sn) => !isHistoryNode(sn))) {
        if (![...statesToEnter].some((s) => isDescendant(s, child))) {
          statesToEnter.add(child);
          addDescendantStatesToEnter(child, historyValue, statesForDefaultEntry, statesToEnter);
        }
      }
    }
  }
}
function addProperAncestorStatesToEnter(stateNode, toStateNode, statesToEnter, historyValue, statesForDefaultEntry) {
  addAncestorStatesToEnter(statesToEnter, historyValue, statesForDefaultEntry, getProperAncestors(stateNode, toStateNode));
}
function exitStates(currentSnapshot, event2, actorScope, transitions, mutStateNodeSet, historyValue, internalQueue, _actionExecutor) {
  let nextSnapshot = currentSnapshot;
  const statesToExit = computeExitSet(transitions, mutStateNodeSet, historyValue);
  statesToExit.sort((a, b) => b.order - a.order);
  let changedHistory;
  for (const exitStateNode of statesToExit) {
    for (const historyNode of getHistoryNodes(exitStateNode)) {
      let predicate;
      if (historyNode.history === "deep") {
        predicate = (sn) => isAtomicStateNode(sn) && isDescendant(sn, exitStateNode);
      } else {
        predicate = (sn) => {
          return sn.parent === exitStateNode;
        };
      }
      changedHistory ??= {
        ...historyValue
      };
      changedHistory[historyNode.id] = Array.from(mutStateNodeSet).filter(predicate);
    }
  }
  for (const s of statesToExit) {
    nextSnapshot = resolveActionsAndContext(nextSnapshot, event2, actorScope, [...s.exit, ...s.invoke.map((def) => stopChild(def.id))], internalQueue, void 0);
    mutStateNodeSet.delete(s);
  }
  return [nextSnapshot, changedHistory || historyValue];
}
function getAction(machine, actionType) {
  return machine.implementations.actions[actionType];
}
function resolveAndExecuteActionsWithContext(currentSnapshot, event2, actorScope, actions, extra, retries) {
  const {
    machine
  } = currentSnapshot;
  let intermediateSnapshot = currentSnapshot;
  for (const action of actions) {
    const isInline = typeof action === "function";
    const resolvedAction = isInline ? action : (
      // the existing type of `.actions` assumes non-nullable `TExpressionAction`
      // it's fine to cast this here to get a common type and lack of errors in the rest of the code
      // our logic below makes sure that we call those 2 "variants" correctly
      getAction(machine, typeof action === "string" ? action : action.type)
    );
    const actionArgs = {
      context: intermediateSnapshot.context,
      event: event2,
      self: actorScope.self,
      system: actorScope.system
    };
    const actionParams = isInline || typeof action === "string" ? void 0 : "params" in action ? typeof action.params === "function" ? action.params({
      context: intermediateSnapshot.context,
      event: event2
    }) : action.params : void 0;
    if (!resolvedAction || !("resolve" in resolvedAction)) {
      actorScope.actionExecutor({
        type: typeof action === "string" ? action : typeof action === "object" ? action.type : action.name || "(anonymous)",
        info: actionArgs,
        params: actionParams,
        exec: resolvedAction
      });
      continue;
    }
    const builtinAction = resolvedAction;
    const [nextState, params, actions2] = builtinAction.resolve(
      actorScope,
      intermediateSnapshot,
      actionArgs,
      actionParams,
      resolvedAction,
      // this holds all params
      extra
    );
    intermediateSnapshot = nextState;
    if ("retryResolve" in builtinAction) {
      retries?.push([builtinAction, params]);
    }
    if ("execute" in builtinAction) {
      actorScope.actionExecutor({
        type: builtinAction.type,
        info: actionArgs,
        params,
        exec: builtinAction.execute.bind(null, actorScope, params)
      });
    }
    if (actions2) {
      intermediateSnapshot = resolveAndExecuteActionsWithContext(intermediateSnapshot, event2, actorScope, actions2, extra, retries);
    }
  }
  return intermediateSnapshot;
}
function resolveActionsAndContext(currentSnapshot, event2, actorScope, actions, internalQueue, deferredActorIds) {
  const retries = deferredActorIds ? [] : void 0;
  const nextState = resolveAndExecuteActionsWithContext(currentSnapshot, event2, actorScope, actions, {
    internalQueue,
    deferredActorIds
  }, retries);
  retries?.forEach(([builtinAction, params]) => {
    builtinAction.retryResolve(actorScope, nextState, params);
  });
  return nextState;
}
function macrostep(snapshot2, event2, actorScope, internalQueue) {
  let nextSnapshot = snapshot2;
  const microstates = [];
  function addMicrostate(microstate, event3, transitions) {
    actorScope.system._sendInspectionEvent({
      type: "@xstate.microstep",
      actorRef: actorScope.self,
      event: event3,
      snapshot: microstate,
      _transitions: transitions
    });
    microstates.push(microstate);
  }
  if (event2.type === XSTATE_STOP) {
    nextSnapshot = cloneMachineSnapshot(stopChildren(nextSnapshot, event2, actorScope), {
      status: "stopped"
    });
    addMicrostate(nextSnapshot, event2, []);
    return {
      snapshot: nextSnapshot,
      microstates
    };
  }
  let nextEvent = event2;
  if (nextEvent.type !== XSTATE_INIT) {
    const currentEvent = nextEvent;
    const isErr = isErrorActorEvent(currentEvent);
    const transitions = selectTransitions(currentEvent, nextSnapshot);
    if (isErr && !transitions.length) {
      nextSnapshot = cloneMachineSnapshot(snapshot2, {
        status: "error",
        error: currentEvent.error
      });
      addMicrostate(nextSnapshot, currentEvent, []);
      return {
        snapshot: nextSnapshot,
        microstates
      };
    }
    nextSnapshot = microstep(
      transitions,
      snapshot2,
      actorScope,
      nextEvent,
      false,
      // isInitial
      internalQueue
    );
    addMicrostate(nextSnapshot, currentEvent, transitions);
  }
  let shouldSelectEventlessTransitions = true;
  while (nextSnapshot.status === "active") {
    let enabledTransitions = shouldSelectEventlessTransitions ? selectEventlessTransitions(nextSnapshot, nextEvent) : [];
    const previousState = enabledTransitions.length ? nextSnapshot : void 0;
    if (!enabledTransitions.length) {
      if (!internalQueue.length) {
        break;
      }
      nextEvent = internalQueue.shift();
      enabledTransitions = selectTransitions(nextEvent, nextSnapshot);
    }
    nextSnapshot = microstep(enabledTransitions, nextSnapshot, actorScope, nextEvent, false, internalQueue);
    shouldSelectEventlessTransitions = nextSnapshot !== previousState;
    addMicrostate(nextSnapshot, nextEvent, enabledTransitions);
  }
  if (nextSnapshot.status !== "active") {
    stopChildren(nextSnapshot, nextEvent, actorScope);
  }
  return {
    snapshot: nextSnapshot,
    microstates
  };
}
function stopChildren(nextState, event2, actorScope) {
  return resolveActionsAndContext(nextState, event2, actorScope, Object.values(nextState.children).map((child) => stopChild(child)), [], void 0);
}
function selectTransitions(event2, nextState) {
  return nextState.machine.getTransitionData(nextState, event2);
}
function selectEventlessTransitions(nextState, event2) {
  const enabledTransitionSet = /* @__PURE__ */ new Set();
  const atomicStates = nextState._nodes.filter(isAtomicStateNode);
  for (const stateNode of atomicStates) {
    loop: for (const s of [stateNode].concat(getProperAncestors(stateNode, void 0))) {
      if (!s.always) {
        continue;
      }
      for (const transition of s.always) {
        if (transition.guard === void 0 || evaluateGuard(transition.guard, nextState.context, event2, nextState)) {
          enabledTransitionSet.add(transition);
          break loop;
        }
      }
    }
  }
  return removeConflictingTransitions(Array.from(enabledTransitionSet), new Set(nextState._nodes), nextState.historyValue);
}
function resolveStateValue(rootNode, stateValue) {
  const allStateNodes = getAllStateNodes(getStateNodes(rootNode, stateValue));
  return getStateValue(rootNode, [...allStateNodes]);
}
function isMachineSnapshot(value) {
  return !!value && typeof value === "object" && "machine" in value && "value" in value;
}
const machineSnapshotMatches = function matches(testValue) {
  return matchesState(testValue, this.value);
};
const machineSnapshotHasTag = function hasTag(tag) {
  return this.tags.has(tag);
};
const machineSnapshotCan = function can(event2) {
  const transitionData = this.machine.getTransitionData(this, event2);
  return !!transitionData?.length && // Check that at least one transition is not forbidden
  transitionData.some((t) => t.target !== void 0 || t.actions.length);
};
const machineSnapshotToJSON = function toJSON() {
  const {
    _nodes: nodes,
    tags,
    machine,
    getMeta: getMeta2,
    toJSON: toJSON2,
    can: can2,
    hasTag: hasTag2,
    matches: matches2,
    ...jsonValues
  } = this;
  return {
    ...jsonValues,
    tags: Array.from(tags)
  };
};
const machineSnapshotGetMeta = function getMeta() {
  return this._nodes.reduce((acc, stateNode) => {
    if (stateNode.meta !== void 0) {
      acc[stateNode.id] = stateNode.meta;
    }
    return acc;
  }, {});
};
function createMachineSnapshot(config2, machine) {
  return {
    status: config2.status,
    output: config2.output,
    error: config2.error,
    machine,
    context: config2.context,
    _nodes: config2._nodes,
    value: getStateValue(machine.root, config2._nodes),
    tags: new Set(config2._nodes.flatMap((sn) => sn.tags)),
    children: config2.children,
    historyValue: config2.historyValue || {},
    matches: machineSnapshotMatches,
    hasTag: machineSnapshotHasTag,
    can: machineSnapshotCan,
    getMeta: machineSnapshotGetMeta,
    toJSON: machineSnapshotToJSON
  };
}
function cloneMachineSnapshot(snapshot2, config2 = {}) {
  return createMachineSnapshot({
    ...snapshot2,
    ...config2
  }, snapshot2.machine);
}
function getPersistedSnapshot(snapshot2, options) {
  const {
    _nodes: nodes,
    tags,
    machine,
    children,
    context: context2,
    can: can2,
    hasTag: hasTag2,
    matches: matches2,
    getMeta: getMeta2,
    toJSON: toJSON2,
    ...jsonValues
  } = snapshot2;
  const childrenJson = {};
  for (const id in children) {
    const child = children[id];
    childrenJson[id] = {
      snapshot: child.getPersistedSnapshot(options),
      src: child.src,
      systemId: child._systemId,
      syncSnapshot: child._syncSnapshot
    };
  }
  const persisted = {
    ...jsonValues,
    context: persistContext(context2),
    children: childrenJson
  };
  return persisted;
}
function persistContext(contextPart) {
  let copy;
  for (const key in contextPart) {
    const value = contextPart[key];
    if (value && typeof value === "object") {
      if ("sessionId" in value && "send" in value && "ref" in value) {
        copy ??= Array.isArray(contextPart) ? contextPart.slice() : {
          ...contextPart
        };
        copy[key] = {
          xstate$$type: $$ACTOR_TYPE,
          id: value.id
        };
      } else {
        const result = persistContext(value);
        if (result !== value) {
          copy ??= Array.isArray(contextPart) ? contextPart.slice() : {
            ...contextPart
          };
          copy[key] = result;
        }
      }
    }
  }
  return copy ?? contextPart;
}
function resolveRaise(_2, snapshot2, args, actionParams, {
  event: eventOrExpr,
  id,
  delay
}, {
  internalQueue
}) {
  const delaysMap = snapshot2.machine.implementations.delays;
  if (typeof eventOrExpr === "string") {
    throw new Error(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `Only event objects may be used with raise; use raise({ type: "${eventOrExpr}" }) instead`
    );
  }
  const resolvedEvent = typeof eventOrExpr === "function" ? eventOrExpr(args, actionParams) : eventOrExpr;
  let resolvedDelay;
  if (typeof delay === "string") {
    const configDelay = delaysMap && delaysMap[delay];
    resolvedDelay = typeof configDelay === "function" ? configDelay(args, actionParams) : configDelay;
  } else {
    resolvedDelay = typeof delay === "function" ? delay(args, actionParams) : delay;
  }
  if (typeof resolvedDelay !== "number") {
    internalQueue.push(resolvedEvent);
  }
  return [snapshot2, {
    event: resolvedEvent,
    id,
    delay: resolvedDelay
  }, void 0];
}
function executeRaise(actorScope, params) {
  const {
    event: event2,
    delay,
    id
  } = params;
  if (typeof delay === "number") {
    actorScope.defer(() => {
      const self2 = actorScope.self;
      actorScope.system.scheduler.schedule(self2, self2, event2, delay, id);
    });
    return;
  }
}
function raise(eventOrExpr, options) {
  function raise2(_args, _params) {
  }
  raise2.type = "xstate.raise";
  raise2.event = eventOrExpr;
  raise2.id = options?.id;
  raise2.delay = options?.delay;
  raise2.resolve = resolveRaise;
  raise2.execute = executeRaise;
  return raise2;
}
const XSTATE_PROMISE_RESOLVE = "xstate.promise.resolve";
const XSTATE_PROMISE_REJECT = "xstate.promise.reject";
const controllerMap = /* @__PURE__ */ new WeakMap();
function fromPromise(promiseCreator) {
  const logic = {
    config: promiseCreator,
    transition: (state, event2, scope) => {
      if (state.status !== "active") {
        return state;
      }
      switch (event2.type) {
        case XSTATE_PROMISE_RESOLVE: {
          const resolvedValue = event2.data;
          return {
            ...state,
            status: "done",
            output: resolvedValue,
            input: void 0
          };
        }
        case XSTATE_PROMISE_REJECT:
          return {
            ...state,
            status: "error",
            error: event2.data,
            input: void 0
          };
        case XSTATE_STOP: {
          controllerMap.get(scope.self)?.abort();
          return {
            ...state,
            status: "stopped",
            input: void 0
          };
        }
        default:
          return state;
      }
    },
    start: (state, {
      self: self2,
      system,
      emit
    }) => {
      if (state.status !== "active") {
        return;
      }
      const controller = new AbortController();
      controllerMap.set(self2, controller);
      const resolvedPromise = Promise.resolve(promiseCreator({
        input: state.input,
        system,
        self: self2,
        signal: controller.signal,
        emit
      }));
      resolvedPromise.then((response) => {
        if (self2.getSnapshot().status !== "active") {
          return;
        }
        controllerMap.delete(self2);
        system._relay(self2, self2, {
          type: XSTATE_PROMISE_RESOLVE,
          data: response
        });
      }, (errorData) => {
        if (self2.getSnapshot().status !== "active") {
          return;
        }
        controllerMap.delete(self2);
        system._relay(self2, self2, {
          type: XSTATE_PROMISE_REJECT,
          data: errorData
        });
      });
    },
    getInitialSnapshot: (_2, input) => {
      return {
        status: "active",
        output: void 0,
        error: void 0,
        input
      };
    },
    getPersistedSnapshot: (snapshot2) => snapshot2,
    restoreSnapshot: (snapshot2) => snapshot2
  };
  return logic;
}
function createSpawner(actorScope, {
  machine,
  context: context2
}, event2, spawnedChildren) {
  const spawn = (src, options) => {
    if (typeof src === "string") {
      const logic = resolveReferencedActor(machine, src);
      if (!logic) {
        throw new Error(`Actor logic '${src}' not implemented in machine '${machine.id}'`);
      }
      const actorRef = createActor(logic, {
        id: options?.id,
        parent: actorScope.self,
        syncSnapshot: options?.syncSnapshot,
        input: typeof options?.input === "function" ? options.input({
          context: context2,
          event: event2,
          self: actorScope.self
        }) : options?.input,
        src,
        systemId: options?.systemId
      });
      spawnedChildren[actorRef.id] = actorRef;
      return actorRef;
    } else {
      const actorRef = createActor(src, {
        id: options?.id,
        parent: actorScope.self,
        syncSnapshot: options?.syncSnapshot,
        input: options?.input,
        src,
        systemId: options?.systemId
      });
      return actorRef;
    }
  };
  return (src, options) => {
    const actorRef = spawn(src, options);
    spawnedChildren[actorRef.id] = actorRef;
    actorScope.defer(() => {
      if (actorRef._processingStatus === ProcessingStatus.Stopped) {
        return;
      }
      actorRef.start();
    });
    return actorRef;
  };
}
function resolveAssign(actorScope, snapshot2, actionArgs, actionParams, {
  assignment
}) {
  if (!snapshot2.context) {
    throw new Error("Cannot assign to undefined `context`. Ensure that `context` is defined in the machine config.");
  }
  const spawnedChildren = {};
  const assignArgs = {
    context: snapshot2.context,
    event: actionArgs.event,
    spawn: createSpawner(actorScope, snapshot2, actionArgs.event, spawnedChildren),
    self: actorScope.self,
    system: actorScope.system
  };
  let partialUpdate = {};
  if (typeof assignment === "function") {
    partialUpdate = assignment(assignArgs, actionParams);
  } else {
    for (const key of Object.keys(assignment)) {
      const propAssignment = assignment[key];
      partialUpdate[key] = typeof propAssignment === "function" ? propAssignment(assignArgs, actionParams) : propAssignment;
    }
  }
  const updatedContext = Object.assign({}, snapshot2.context, partialUpdate);
  return [cloneMachineSnapshot(snapshot2, {
    context: updatedContext,
    children: Object.keys(spawnedChildren).length ? {
      ...snapshot2.children,
      ...spawnedChildren
    } : snapshot2.children
  }), void 0, void 0];
}
function assign(assignment) {
  function assign2(_args, _params) {
  }
  assign2.type = "xstate.assign";
  assign2.assignment = assignment;
  assign2.resolve = resolveAssign;
  return assign2;
}
const cache = /* @__PURE__ */ new WeakMap();
function memo(object, key, fn) {
  let memoizedData = cache.get(object);
  if (!memoizedData) {
    memoizedData = {
      [key]: fn()
    };
    cache.set(object, memoizedData);
  } else if (!(key in memoizedData)) {
    memoizedData[key] = fn();
  }
  return memoizedData[key];
}
const EMPTY_OBJECT = {};
const toSerializableAction = (action) => {
  if (typeof action === "string") {
    return {
      type: action
    };
  }
  if (typeof action === "function") {
    if ("resolve" in action) {
      return {
        type: action.type
      };
    }
    return {
      type: action.name
    };
  }
  return action;
};
class StateNode {
  constructor(config2, options) {
    this.config = config2;
    this.key = void 0;
    this.id = void 0;
    this.type = void 0;
    this.path = void 0;
    this.states = void 0;
    this.history = void 0;
    this.entry = void 0;
    this.exit = void 0;
    this.parent = void 0;
    this.machine = void 0;
    this.meta = void 0;
    this.output = void 0;
    this.order = -1;
    this.description = void 0;
    this.tags = [];
    this.transitions = void 0;
    this.always = void 0;
    this.parent = options._parent;
    this.key = options._key;
    this.machine = options._machine;
    this.path = this.parent ? this.parent.path.concat(this.key) : [];
    this.id = this.config.id || [this.machine.id, ...this.path].join(STATE_DELIMITER);
    this.type = this.config.type || (this.config.states && Object.keys(this.config.states).length ? "compound" : this.config.history ? "history" : "atomic");
    this.description = this.config.description;
    this.order = this.machine.idMap.size;
    this.machine.idMap.set(this.id, this);
    this.states = this.config.states ? mapValues(this.config.states, (stateConfig2, key) => {
      const stateNode = new StateNode(stateConfig2, {
        _parent: this,
        _key: key,
        _machine: this.machine
      });
      return stateNode;
    }) : EMPTY_OBJECT;
    if (this.type === "compound" && !this.config.initial) {
      throw new Error(`No initial state specified for compound state node "#${this.id}". Try adding { initial: "${Object.keys(this.states)[0]}" } to the state config.`);
    }
    this.history = this.config.history === true ? "shallow" : this.config.history || false;
    this.entry = toArray(this.config.entry).slice();
    this.exit = toArray(this.config.exit).slice();
    this.meta = this.config.meta;
    this.output = this.type === "final" || !this.parent ? this.config.output : void 0;
    this.tags = toArray(config2.tags).slice();
  }
  /** @internal */
  _initialize() {
    this.transitions = formatTransitions(this);
    if (this.config.always) {
      this.always = toTransitionConfigArray(this.config.always).map((t) => formatTransition(this, NULL_EVENT, t));
    }
    Object.keys(this.states).forEach((key) => {
      this.states[key]._initialize();
    });
  }
  /** The well-structured state node definition. */
  get definition() {
    return {
      id: this.id,
      key: this.key,
      version: this.machine.version,
      type: this.type,
      initial: this.initial ? {
        target: this.initial.target,
        source: this,
        actions: this.initial.actions.map(toSerializableAction),
        eventType: null,
        reenter: false,
        toJSON: () => ({
          target: this.initial.target.map((t) => `#${t.id}`),
          source: `#${this.id}`,
          actions: this.initial.actions.map(toSerializableAction),
          eventType: null
        })
      } : void 0,
      history: this.history,
      states: mapValues(this.states, (state) => {
        return state.definition;
      }),
      on: this.on,
      transitions: [...this.transitions.values()].flat().map((t) => ({
        ...t,
        actions: t.actions.map(toSerializableAction)
      })),
      entry: this.entry.map(toSerializableAction),
      exit: this.exit.map(toSerializableAction),
      meta: this.meta,
      order: this.order || -1,
      output: this.output,
      invoke: this.invoke,
      description: this.description,
      tags: this.tags
    };
  }
  /** @internal */
  toJSON() {
    return this.definition;
  }
  /** The logic invoked as actors by this state node. */
  get invoke() {
    return memo(this, "invoke", () => toArray(this.config.invoke).map((invokeConfig, i) => {
      const {
        src,
        systemId
      } = invokeConfig;
      const resolvedId = invokeConfig.id ?? createInvokeId(this.id, i);
      const sourceName = typeof src === "string" ? src : `xstate.invoke.${createInvokeId(this.id, i)}`;
      return {
        ...invokeConfig,
        src: sourceName,
        id: resolvedId,
        systemId,
        toJSON() {
          const {
            onDone,
            onError,
            ...invokeDefValues
          } = invokeConfig;
          return {
            ...invokeDefValues,
            type: "xstate.invoke",
            src: sourceName,
            id: resolvedId
          };
        }
      };
    }));
  }
  /** The mapping of events to transitions. */
  get on() {
    return memo(this, "on", () => {
      const transitions = this.transitions;
      return [...transitions].flatMap(([descriptor, t]) => t.map((t2) => [descriptor, t2])).reduce((map, [descriptor, transition]) => {
        map[descriptor] = map[descriptor] || [];
        map[descriptor].push(transition);
        return map;
      }, {});
    });
  }
  get after() {
    return memo(this, "delayedTransitions", () => getDelayedTransitions(this));
  }
  get initial() {
    return memo(this, "initial", () => formatInitialTransition(this, this.config.initial));
  }
  /** @internal */
  next(snapshot2, event2) {
    const eventType = event2.type;
    const actions = [];
    let selectedTransition;
    const candidates = memo(this, `candidates-${eventType}`, () => getCandidates(this, eventType));
    for (const candidate of candidates) {
      const {
        guard
      } = candidate;
      const resolvedContext = snapshot2.context;
      let guardPassed = false;
      try {
        guardPassed = !guard || evaluateGuard(guard, resolvedContext, event2, snapshot2);
      } catch (err) {
        const guardType = typeof guard === "string" ? guard : typeof guard === "object" ? guard.type : void 0;
        throw new Error(`Unable to evaluate guard ${guardType ? `'${guardType}' ` : ""}in transition for event '${eventType}' in state node '${this.id}':
${err.message}`);
      }
      if (guardPassed) {
        actions.push(...candidate.actions);
        selectedTransition = candidate;
        break;
      }
    }
    return selectedTransition ? [selectedTransition] : void 0;
  }
  /** All the event types accepted by this state node and its descendants. */
  get events() {
    return memo(this, "events", () => {
      const {
        states
      } = this;
      const events = new Set(this.ownEvents);
      if (states) {
        for (const stateId of Object.keys(states)) {
          const state = states[stateId];
          if (state.states) {
            for (const event2 of state.events) {
              events.add(`${event2}`);
            }
          }
        }
      }
      return Array.from(events);
    });
  }
  /**
   * All the events that have transitions directly from this state node.
   *
   * Excludes any inert events.
   */
  get ownEvents() {
    const events = new Set([...this.transitions.keys()].filter((descriptor) => {
      return this.transitions.get(descriptor).some((transition) => !(!transition.target && !transition.actions.length && !transition.reenter));
    }));
    return Array.from(events);
  }
}
const STATE_IDENTIFIER = "#";
class StateMachine {
  constructor(config2, implementations) {
    this.config = config2;
    this.version = void 0;
    this.schemas = void 0;
    this.implementations = void 0;
    this.__xstatenode = true;
    this.idMap = /* @__PURE__ */ new Map();
    this.root = void 0;
    this.id = void 0;
    this.states = void 0;
    this.events = void 0;
    this.id = config2.id || "(machine)";
    this.implementations = {
      actors: implementations?.actors ?? {},
      actions: implementations?.actions ?? {},
      delays: implementations?.delays ?? {},
      guards: implementations?.guards ?? {}
    };
    this.version = this.config.version;
    this.schemas = this.config.schemas;
    this.transition = this.transition.bind(this);
    this.getInitialSnapshot = this.getInitialSnapshot.bind(this);
    this.getPersistedSnapshot = this.getPersistedSnapshot.bind(this);
    this.restoreSnapshot = this.restoreSnapshot.bind(this);
    this.start = this.start.bind(this);
    this.root = new StateNode(config2, {
      _key: this.id,
      _machine: this
    });
    this.root._initialize();
    this.states = this.root.states;
    this.events = this.root.events;
  }
  /**
   * Clones this state machine with the provided implementations and merges the
   * `context` (if provided).
   *
   * @param implementations Options (`actions`, `guards`, `actors`, `delays`,
   *   `context`) to recursively merge with the existing options.
   * @returns A new `StateMachine` instance with the provided implementations.
   */
  provide(implementations) {
    const {
      actions,
      guards,
      actors,
      delays
    } = this.implementations;
    return new StateMachine(this.config, {
      actions: {
        ...actions,
        ...implementations.actions
      },
      guards: {
        ...guards,
        ...implementations.guards
      },
      actors: {
        ...actors,
        ...implementations.actors
      },
      delays: {
        ...delays,
        ...implementations.delays
      }
    });
  }
  resolveState(config2) {
    const resolvedStateValue = resolveStateValue(this.root, config2.value);
    const nodeSet = getAllStateNodes(getStateNodes(this.root, resolvedStateValue));
    return createMachineSnapshot({
      _nodes: [...nodeSet],
      context: config2.context || {},
      children: {},
      status: isInFinalState(nodeSet, this.root) ? "done" : config2.status || "active",
      output: config2.output,
      error: config2.error,
      historyValue: config2.historyValue
    }, this);
  }
  /**
   * Determines the next snapshot given the current `snapshot` and received
   * `event`. Calculates a full macrostep from all microsteps.
   *
   * @param snapshot The current snapshot
   * @param event The received event
   */
  transition(snapshot2, event2, actorScope) {
    return macrostep(snapshot2, event2, actorScope, []).snapshot;
  }
  /**
   * Determines the next state given the current `state` and `event`. Calculates
   * a microstep.
   *
   * @param state The current state
   * @param event The received event
   */
  microstep(snapshot2, event2, actorScope) {
    return macrostep(snapshot2, event2, actorScope, []).microstates;
  }
  getTransitionData(snapshot2, event2) {
    return transitionNode(this.root, snapshot2.value, snapshot2, event2) || [];
  }
  /**
   * The initial state _before_ evaluating any microsteps. This "pre-initial"
   * state is provided to initial actions executed in the initial state.
   */
  getPreInitialState(actorScope, initEvent, internalQueue) {
    const {
      context: context2
    } = this.config;
    const preInitial = createMachineSnapshot({
      context: typeof context2 !== "function" && context2 ? context2 : {},
      _nodes: [this.root],
      children: {},
      status: "active"
    }, this);
    if (typeof context2 === "function") {
      const assignment = ({
        spawn,
        event: event2,
        self: self2
      }) => context2({
        spawn,
        input: event2.input,
        self: self2
      });
      return resolveActionsAndContext(preInitial, initEvent, actorScope, [assign(assignment)], internalQueue, void 0);
    }
    return preInitial;
  }
  /**
   * Returns the initial `State` instance, with reference to `self` as an
   * `ActorRef`.
   */
  getInitialSnapshot(actorScope, input) {
    const initEvent = createInitEvent(input);
    const internalQueue = [];
    const preInitialState = this.getPreInitialState(actorScope, initEvent, internalQueue);
    const nextState = microstep([{
      target: [...getInitialStateNodes(this.root)],
      source: this.root,
      reenter: true,
      actions: [],
      eventType: null,
      toJSON: null
      // TODO: fix
    }], preInitialState, actorScope, initEvent, true, internalQueue);
    const {
      snapshot: macroState
    } = macrostep(nextState, initEvent, actorScope, internalQueue);
    return macroState;
  }
  start(snapshot2) {
    Object.values(snapshot2.children).forEach((child) => {
      if (child.getSnapshot().status === "active") {
        child.start();
      }
    });
  }
  getStateNodeById(stateId) {
    const fullPath = toStatePath(stateId);
    const relativePath = fullPath.slice(1);
    const resolvedStateId = isStateId(fullPath[0]) ? fullPath[0].slice(STATE_IDENTIFIER.length) : fullPath[0];
    const stateNode = this.idMap.get(resolvedStateId);
    if (!stateNode) {
      throw new Error(`Child state node '#${resolvedStateId}' does not exist on machine '${this.id}'`);
    }
    return getStateNodeByPath(stateNode, relativePath);
  }
  get definition() {
    return this.root.definition;
  }
  toJSON() {
    return this.definition;
  }
  getPersistedSnapshot(snapshot2, options) {
    return getPersistedSnapshot(snapshot2, options);
  }
  restoreSnapshot(snapshot2, _actorScope) {
    const children = {};
    const snapshotChildren = snapshot2.children;
    Object.keys(snapshotChildren).forEach((actorId) => {
      const actorData = snapshotChildren[actorId];
      const childState = actorData.snapshot;
      const src = actorData.src;
      const logic = typeof src === "string" ? resolveReferencedActor(this, src) : src;
      if (!logic) {
        return;
      }
      const actorRef = createActor(logic, {
        id: actorId,
        parent: _actorScope.self,
        syncSnapshot: actorData.syncSnapshot,
        snapshot: childState,
        src,
        systemId: actorData.systemId
      });
      children[actorId] = actorRef;
    });
    const restoredSnapshot = createMachineSnapshot({
      ...snapshot2,
      children,
      _nodes: Array.from(getAllStateNodes(getStateNodes(this.root, snapshot2.value)))
    }, this);
    const seen = /* @__PURE__ */ new Set();
    function reviveContext(contextPart, children2) {
      if (seen.has(contextPart)) {
        return;
      }
      seen.add(contextPart);
      for (const key in contextPart) {
        const value = contextPart[key];
        if (value && typeof value === "object") {
          if ("xstate$$type" in value && value.xstate$$type === $$ACTOR_TYPE) {
            contextPart[key] = children2[value.id];
            continue;
          }
          reviveContext(value, children2);
        }
      }
    }
    reviveContext(restoredSnapshot.context, children);
    return restoredSnapshot;
  }
}
function createMachine(config2, implementations) {
  return new StateMachine(config2, implementations);
}
function setup({
  schemas,
  actors,
  actions,
  guards,
  delays
}) {
  return {
    createMachine: (config2) => createMachine({
      ...config2,
      schemas
    }, {
      actors,
      actions,
      guards,
      delays
    })
  };
}
const context = {
  bet: null,
  rawBet: null
};
const STATE_RENDERING = "rendering";
const STATE_IDLE = "idle";
const STATE_BET = "bet";
const STATE_AUTOBET = "autoBet";
const STATE_RESUME_BET = "resumeBet";
const stateRendering = {
  on: {
    RENDERED: {
      target: "idle"
    }
  }
};
const stateIdle = {
  on: {
    RESUME_BET: {
      target: "resumeBet"
    },
    BET: {
      target: "bet"
    },
    AUTO_BET: {
      target: "autoBet"
    }
  }
};
const stateResumeBet = {
  invoke: {
    id: "resumeBet",
    src: "resumeBet",
    onDone: "idle"
  }
};
const stateBet = {
  invoke: {
    id: "bet",
    src: "bet",
    onDone: "idle"
  }
};
const stateAutoBet = {
  invoke: {
    id: "autoBet",
    src: "autoBet",
    onDone: "idle"
  }
};
const createGameActor = (intermediateMachines2) => {
  const gameMachine = setup({
    actors: {
      bet: intermediateMachines2.bet,
      autoBet: intermediateMachines2.autoBet,
      resumeBet: intermediateMachines2.resumeBet
    }
  }).createMachine({
    context,
    initial: "rendering",
    states: {
      [STATE_RENDERING]: stateRendering,
      [STATE_IDLE]: stateIdle,
      // Note: No intermediateMachines.idle exists
      [STATE_BET]: stateBet,
      [STATE_AUTOBET]: stateAutoBet,
      [STATE_RESUME_BET]: stateResumeBet
    }
  });
  const gameActor2 = createActor(gameMachine);
  return gameActor2;
};
const handleRequestBet = async ({ onError }) => {
  const requestedMode = stateBet$1.activeBetModeKey;
  try {
    const data = await requestBet({
      rgsUrl: stateUrlDerived.rgsUrl(),
      sessionID: stateUrlDerived.sessionID(),
      currency: stateBet$1.currency,
      mode: requestedMode,
      amount: stateBet$1.betAmount
    });
    if (data?.error) {
      throw data;
    }
    if (data?.round?.state && data?.round?.state?.length > 0) {
      stateBet$1.wageredBetAmount = stateBet$1.betAmount;
      if (requestedMode.toUpperCase() === "SUPERSPINS") stateBet$1.activeBetModeKey = "BASE";
      return data;
    } else {
      throw {
        error: "Empty state in data.round",
        message: JSON.stringify({ data })
      };
    }
  } catch (error) {
    onError();
    stateBet$1.autoSpinsCounter = 0;
    stateModal.modal = { name: "error", error };
    console.error(error);
    throw error;
  }
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const handleRequestEndRound = async ({ attempts = 3 } = {}) => {
  if (stateUrlDerived.replay()) return;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const data = await requestEndRound({
        sessionID: stateUrlDerived.sessionID(),
        rgsUrl: stateUrlDerived.rgsUrl()
      });
      if (data?.error) {
        throw data;
      }
      if (data?.balance?.amount !== void 0) {
        console.info("[end-round] round settled; balance credited.");
        return data;
      }
      throw {
        error: "Empty amount in data.balance",
        message: JSON.stringify({ data })
      };
    } catch (error) {
      lastError = error;
      console.error(`[end-round] attempt ${attempt}/${attempts} failed`, error);
      if (attempt < attempts) await sleep(400 * attempt);
    }
  }
  stateModal.modal = { name: "error", error: lastError };
};
const handleUpdateBalance = ({ balanceAmountFromApi }) => {
  stateBet$1.balanceAmount = balanceAmountFromApi / API_AMOUNT_MULTIPLIER;
};
function createPrimaryMachines(options) {
  const {
    onNewGameStart,
    onNewGameError,
    onPlayGame,
    checkIsBonusGame
  } = options;
  let balanceAmountFromApiHolder = null;
  const BET_TYPE_METHODS_MAP = {
    noWin: {
      newGame: async () => void 0,
      endGame: async () => void 0
    },
    singleRoundWin: {
      newGame: async () => {
        const endRoundData = await handleRequestEndRound();
        if (endRoundData?.balance) {
          balanceAmountFromApiHolder = endRoundData.balance.amount;
        }
      },
      endGame: async () => {
        if (balanceAmountFromApiHolder !== null) {
          handleUpdateBalance({ balanceAmountFromApi: balanceAmountFromApiHolder });
          balanceAmountFromApiHolder = null;
        }
      }
    },
    bonusWin: {
      newGame: async () => void 0,
      endGame: async () => {
        const data = await handleRequestEndRound();
        if (data?.balance) {
          handleUpdateBalance({ balanceAmountFromApi: data.balance.amount });
          balanceAmountFromApiHolder = null;
        }
      }
    }
  };
  const getBetType = ({ bet }) => {
    const isBonusGame = checkIsBonusGame(bet);
    if (bet.active === true) {
      if (isBonusGame) return "bonusWin";
    }
    if (bet.payoutMultiplier && bet.payoutMultiplier > 0) {
      if (isBonusGame) return "bonusWin";
      return "singleRoundWin";
    }
    return "noWin";
  };
  const newGame = fromPromise(async () => {
    await onNewGameStart();
    const data = await handleRequestBet({ onError: onNewGameError });
    if (data) {
      if (data.balance) {
        handleUpdateBalance({ balanceAmountFromApi: data.balance.amount });
      }
      const bet = data.round;
      const betType = getBetType({ bet });
      await BET_TYPE_METHODS_MAP[betType].newGame();
      return { bet };
    }
    return { bet: null };
  });
  const resumeGame = fromPromise(async () => {
    throw new Error("inactive Bet");
  });
  const playGame = fromPromise(async ({ input }) => {
    if (input.bet) await onPlayGame(input.bet);
  });
  const endGame = fromPromise(
    async ({ input }) => {
      const targetBet = input.rawBet || input.bet;
      if (targetBet) {
        const betType = getBetType({ bet: targetBet });
        await BET_TYPE_METHODS_MAP[betType].endGame();
      }
    }
  );
  return {
    newGame,
    playGame,
    endGame,
    resumeGame
  };
}
const checkSpaceHold = fromPromise(async () => {
  if (stateBet$1.isSpaceHold) {
    if (stateBetDerived.activeBetMode()?.type === "buy") {
      stateBet$1.activeBetModeKey = "BASE";
      return;
    }
    return;
  }
  throw Error("end bet");
});
const createIntermediateMachineBet = ({
  newGame,
  playGame,
  endGame
}) => {
  const machine = (
    /** @xstate-layout N4IgpgJg5mDOIC5QCMwBcB0BLCAbMAxAEICiAKoqAA4D2sWaWNAdpSAB6ICMATAGwYADMMFcA7Dy4BWQQBZZgsQBoQAT24BmMRlkBOfQA4+fXWNl8pu2QF9rK1JgBm6AMYALLMygEILMNmYANxoAa38AWwBXNABDRhYidDZaenjWJA5EKQ0BWS0pHlMNGTE+FXUELlEMGRENXV4pKtFbe3QMZzR3T28wACc+mj6MKlw4xyHwjCjYtMS0ZLoGJnTQTgRs3PzCsWLFMrVEHjFBHX1TWXEzDQ0DGzsQBxGx1R8-AOCw55iK6iW0tjrKxcDAGRo8MEnRQ8crcHinc76QpSMxg3R8WwPZg0CBwNhPHD4RapFaAxCyGGHSoaEGI0oFPT1XStR7tTrdLzE5YsMkIeEGDC6O71LQGYSyMXKKlVXKIvhGc5cUwsp6jH5cgEZdYSXQYDQQrjmBrCKQHCq6U4iYQ0jQiMUaFXtMDMCAa0la7iKbSSAxiX2m4ToykVXgaQXnE5+iwNIyOhYZFLc1aZSoGWGpoRWrNWsSY6xAA */
    setup({
      actors: {
        newGame,
        playGame,
        endGame,
        checkSpaceHold
      }
    }).createMachine({
      context,
      id: "bet",
      initial: "fetching",
      states: {
        fetching: {
          invoke: {
            id: "newGame",
            src: "newGame",
            onDone: [
              {
                actions: assign(({ context: _2, event: event2 }) => event2.output),
                target: "play"
              }
            ],
            // output: ,
            onError: [
              {
                target: "end"
              }
            ]
          }
        },
        play: {
          invoke: {
            id: "playGame",
            src: "playGame",
            input: ({ context: context2 }) => ({
              bet: context2.bet
            }),
            onDone: [
              {
                target: "ending"
              }
            ]
          }
        },
        ending: {
          invoke: {
            id: "endGame",
            src: "endGame",
            input: ({ context: context2 }) => ({
              bet: context2.bet,
              rawBet: context2.rawBet
            }),
            onDone: [
              {
                target: "checkSpaceHold"
              }
            ]
          }
        },
        checkSpaceHold: {
          invoke: {
            id: "checkSpaceHold",
            src: "checkSpaceHold",
            onDone: "fetching",
            onError: "end"
          }
        },
        end: {
          type: "final"
        }
      }
    })
  );
  return machine;
};
let oldbalanceAmount = 0;
const init = fromPromise(async () => {
  stateBet$1.winBookEventAmount = 0;
  stateBet$1.autoSpinsLoss = 0;
  oldbalanceAmount = stateBet$1.balanceAmount;
});
const checkInsufficientFunds = fromPromise(async () => {
  if (stateBetDerived.isBetCostAvailable()) return "continue";
  stateBet$1.autoSpinsCounter = 0;
  stateModal.modal = { name: "autoSpinMessage", message: "insufficientFunds" };
  throw Error("End auto bet with insufficientFunds");
});
const checkLossLimit = fromPromise(async () => {
  if (stateBet$1.autoSpinsLossLimitAmount === Infinity) return "continue";
  const newBalance = stateBet$1.balanceAmount;
  const loss = Math.round((oldbalanceAmount - newBalance) * 100) / 100;
  stateBet$1.autoSpinsLoss = loss;
  if (stateBet$1.autoSpinsLossLimitAmount > loss) return "continue";
  stateBet$1.autoSpinsCounter = 0;
  stateModal.modal = { name: "autoSpinMessage", message: "lossLimitReached" };
  throw Error("End auto bet with lossLimitReached");
});
const checkIfSingleWinLimit = fromPromise(async () => {
  if (stateBet$1.autoSpinsSingleWinLimitAmount === Infinity) return "continue";
  if (stateBet$1.autoSpinsSingleWinLimitAmount > bookEventAmountToNormalisedAmount(stateBet$1.winBookEventAmount))
    return "continue";
  stateBet$1.autoSpinsCounter = 0;
  stateModal.modal = { name: "autoSpinMessage", message: "singleWinLimitReached" };
  throw Error("End auto bet with singleWinLimitReached");
});
const checkAutoSpinsCounter = fromPromise(async () => {
  if (stateBet$1.autoSpinsCounter > 0) return "continue";
  throw Error("End auto bet with autoSpinsCounter being 0");
});
const updateAutoSpinsCounter = fromPromise(async () => {
  const newValue = stateBet$1.autoSpinsCounter - 1;
  stateBet$1.autoSpinsCounter = newValue > 0 ? newValue : 0;
});
const createIntermediateMachineAutoBet = ({ bet }) => {
  const machine = (
    /** @xstate-layout N4IgpgJg5mDOIC5QCMwBcB0BLCAbMAxAEICiAKoqAA4D2sWaWNAdpSAB6ICMATAGwYADMMFcA7Dy4BWQQBZZgsQBoQAT24BmMRlkBOfQA4+fXWNl8pu2QF9rK1JgBm6AMYALLMygEILMNmYANxoAa38AWwBXNABDRhYidDZaenjWJA5EKQ0BWS0pHlMNGTE+FXUELlEMGRENXV4pKtFbe3QMZzR3T28wACc+mj6MKlw4xyHwjCjYtMS0ZLoGJnTQTgRs3PzCsWLFMrVEHjFBHX1TWXEzDQ0DGzsQBxGx1R8-AOCw55iK6iW0tjrKxcDAGRo8MEnRQ8crcHinc76QpSMxg3R8WwPZg0CBwNhPHD4RapFaAxCyGGHSoaEGI0oFPT1XStR7tTrdLzE5YsMkIeEGDC6O71LQGYSyMXKKlVXKIvhGc5cUwsp6jH5cgEZdYSXQYDQQrjmBrCKQHCq6U4iYQ0jQiMUaFXtMDMCAa0la7iKbSSAxiX2m4ToykVXgaQXnE5+iwNIyOhYZFLc1aZSoGWGpoRWrNWsSY6xAA */
    setup({
      actors: {
        init,
        checkInsufficientFunds,
        checkLossLimit,
        checkIfSingleWinLimit,
        checkAutoSpinsCounter,
        bet,
        updateAutoSpinsCounter
      }
    }).createMachine({
      context,
      id: "autoBet",
      initial: "init",
      states: {
        init: {
          invoke: {
            id: "init",
            src: "init",
            onDone: "checkInsufficientFunds",
            onError: "end"
          }
        },
        checkInsufficientFunds: {
          invoke: {
            id: "checkInsufficientFunds",
            src: "checkInsufficientFunds",
            onDone: "checkLossLimit",
            onError: "end"
          }
        },
        checkLossLimit: {
          invoke: {
            id: "checkLossLimit",
            src: "checkLossLimit",
            onDone: "checkIfSingleWinLimit",
            onError: "end"
          }
        },
        checkIfSingleWinLimit: {
          invoke: {
            id: "checkIfSingleWinLimit",
            src: "checkIfSingleWinLimit",
            onDone: "checkAutoSpinsCounter",
            onError: "end"
          }
        },
        checkAutoSpinsCounter: {
          invoke: {
            id: "checkAutoSpinsCounter",
            src: "checkAutoSpinsCounter",
            onDone: "playing",
            onError: "end"
          }
        },
        playing: {
          invoke: {
            id: "bet",
            src: "bet",
            onDone: "updateAutoSpinsCounter"
          }
        },
        updateAutoSpinsCounter: {
          invoke: {
            id: "updateAutoSpinsCounter",
            src: "updateAutoSpinsCounter",
            onDone: "checkInsufficientFunds"
          }
        },
        end: {
          type: "final"
        }
      }
    })
  );
  return machine;
};
const createIntermediateMachineResumeBet = (actors) => {
  const machine = (
    /** @xstate-layout N4IgpgJg5mDOIC5QCMwBcB0BLCAbMAxAEICiAKoqAA4D2sWaWNAdpSAB6ICMATAGwYADMMFcA7Dy4BWQQBZZgsQBoQAT24BmMRlkBOfQA4+fXWNl8pu2QF9rK1JgBm6AMYALLMygEILMNmYANxoAa38AWwBXNABDRhYidDZaenjWJA5EKQ0BWS0pHlMNGTE+FXUELlEMGRENXV4pKtFbe3QMZzR3T28wACc+mj6MKlw4xyHwjCjYtMS0ZLoGJnTQTgRs3PzCsWLFMrVEHjFBHX1TWXEzDQ0DGzsQBxGx1R8-AOCw55iK6iW0tjrKxcDAGRo8MEnRQ8crcHinc76QpSMxg3R8WwPZg0CBwNhPHD4RapFaAxCyGGHSoaEGI0oFPT1XStR7tTrdLzE5YsMkIeEGDC6O71LQGYSyMXKKlVXKIvhGc5cUwsp6jH5cgEZdYSXQYDQQrjmBrCKQHCq6U4iYQ0jQiMUaFXtMDMCAa0la7iKbSSAxiX2m4ToykVXgaQXnE5+iwNIyOhYZFLc1aZSoGWGpoRWrNWsSY6xAA */
    setup({
      actors
    }).createMachine({
      context,
      id: "resumeBet",
      initial: "resumeGame",
      states: {
        resumeGame: {
          invoke: {
            id: "resumeGame",
            src: "resumeGame",
            onDone: [
              {
                actions: assign(({ context: _2, event: event2 }) => event2.output),
                target: "play"
              }
            ],
            onError: [
              {
                target: "end"
              }
            ]
          }
        },
        play: {
          invoke: {
            id: "playGame",
            src: "playGame",
            input: ({ context: context2 }) => ({
              bet: context2.bet
            }),
            onDone: [
              {
                target: "ending"
              }
            ]
          }
        },
        ending: {
          invoke: {
            id: "endGame",
            src: "endGame",
            input: ({ context: context2 }) => ({
              bet: context2.bet,
              rawBet: context2.rawBet
            }),
            onDone: [
              {
                target: "end"
              }
            ]
          }
        },
        end: {
          type: "final"
        }
      }
    })
  );
  return machine;
};
const createIntermediateMachines = ({
  resumeGame,
  newGame,
  playGame,
  endGame
}) => {
  const bet = createIntermediateMachineBet({ newGame, playGame, endGame });
  const autoBet = createIntermediateMachineAutoBet({ bet });
  const resumeBet = createIntermediateMachineResumeBet({ resumeGame, playGame, endGame });
  return {
    bet,
    autoBet,
    resumeBet
  };
};
const createXstate = () => {
  const matchesXstate = (state) => matchesState(state, stateXstate2.value);
  const stateXstate2 = { value: "" };
  const stateXstateDerived2 = {
    matchesXstate,
    isRendering: () => matchesXstate(STATE_RENDERING),
    isIdle: () => matchesXstate(STATE_IDLE),
    isBetting: () => matchesXstate(STATE_BET),
    isAutoBetting: () => matchesXstate(STATE_AUTOBET),
    isResumingBet: () => matchesXstate(STATE_RESUME_BET),
    isPlaying: () => !matchesXstate(STATE_RENDERING) && !matchesXstate(STATE_IDLE)
  };
  return { stateXstate: stateXstate2, stateXstateDerived: stateXstateDerived2 };
};
const XSTATE_NS = "@@xstate";
function setContextXstate(value) {
  setContext$1(XSTATE_NS, value);
}
function getContextXstate() {
  return getContext$1(XSTATE_NS);
}
const { eventEmitter } = createEventEmitter();
const { stateXstate, stateXstateDerived } = createXstate();
const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;
const FREE_SPINS_BANNER_SIZE = { width: 1448, height: 1086 };
const FREE_SPINS_BANNER_ASPECT = FREE_SPINS_BANNER_SIZE.width / FREE_SPINS_BANNER_SIZE.height;
const REEL_FRAME_BASE_IMAGE_SIZE = { width: 1448, height: 1086 };
const REEL_FRAME_FREE_SPINS_IMAGE_SIZE = { width: 1448, height: 1086 };
const GAZE_METER_IMAGE_SIZE = { width: 481, height: 1061 };
const GAZE_METER_MAX_CHARGE = 10;
const GAZE_METER_MULTIPLIER_COLOR = 16770720;
const GAZE_METER_LAYOUT = {
  imageWidth: GAZE_METER_IMAGE_SIZE.width,
  imageHeight: GAZE_METER_IMAGE_SIZE.height,
  // Transparent chamber that receives the code-rendered liquid and ten segment fills.
  inner: { left: 0.245, right: 0.755, top: 0.285, bottom: 0.84, radius: 0.08 },
  // The sliced Eye/FX artwork is deliberately untrimmed. These are its intended display
  // coordinates in the frame, not the centre of the atlas cell.
  eye: { x: 0.5, y: 0.13 },
  // Bottom panel for the dynamic Gaze multiplier.
  plaque: { x: 0.5, y: 0.915 }
};
const getGazeMeterDisplayWidth = (displayHeight) => displayHeight * (GAZE_METER_LAYOUT.imageWidth / GAZE_METER_LAYOUT.imageHeight);
const REEL_Y = 0;
const MOBILE_REEL_DISPLAY_SCALE = 1.45;
const REEL_FRAME_BASE_DISPLAY_WIDTH = 1380;
const REEL_FRAME_FREE_SPINS_DISPLAY_WIDTH = 1360;
const REEL_FRAME_BASE_GRID = {
  x: 152,
  y: 168,
  width: 1144,
  height: 782
};
const REEL_FRAME_FREE_SPINS_GRID = {
  x: 132,
  y: 134,
  width: 1176,
  height: 846
};
const REEL_LAYOUT_BASE = {
  imageWidth: REEL_FRAME_BASE_IMAGE_SIZE.width,
  imageHeight: REEL_FRAME_BASE_IMAGE_SIZE.height,
  displayWidth: REEL_FRAME_BASE_DISPLAY_WIDTH,
  columns: 6,
  rows: 5,
  gridX: REEL_FRAME_BASE_GRID.x,
  gridY: REEL_FRAME_BASE_GRID.y,
  gridWidth: REEL_FRAME_BASE_GRID.width,
  gridHeight: REEL_FRAME_BASE_GRID.height,
  symbolFill: 0.86
};
const REEL_LAYOUT_FREE_SPINS = {
  imageWidth: REEL_FRAME_FREE_SPINS_IMAGE_SIZE.width,
  imageHeight: REEL_FRAME_FREE_SPINS_IMAGE_SIZE.height,
  displayWidth: REEL_FRAME_FREE_SPINS_DISPLAY_WIDTH,
  columns: 6,
  rows: 5,
  gridX: REEL_FRAME_FREE_SPINS_GRID.x,
  gridY: REEL_FRAME_FREE_SPINS_GRID.y,
  gridWidth: REEL_FRAME_FREE_SPINS_GRID.width,
  gridHeight: REEL_FRAME_FREE_SPINS_GRID.height,
  symbolFill: 0.86
};
const getReelDisplayScale = (layout) => layout.displayWidth / layout.imageWidth;
const getReelPosition = (layout) => ({
  x: (GAME_WIDTH - layout.displayWidth) / 2,
  y: REEL_Y
});
const getReelDisplayGrid = (layout) => ({
  x: layout.gridX * getReelDisplayScale(layout),
  y: layout.gridY * getReelDisplayScale(layout),
  width: layout.gridWidth * getReelDisplayScale(layout),
  height: layout.gridHeight * getReelDisplayScale(layout)
});
const REEL_DISPLAY_GRID = getReelDisplayGrid(REEL_LAYOUT_BASE);
const REEL_CELL_WIDTH = REEL_DISPLAY_GRID.width / REEL_LAYOUT_BASE.columns;
const REEL_CELL_HEIGHT = REEL_DISPLAY_GRID.height / REEL_LAYOUT_BASE.rows;
const SYMBOL_SIZE = REEL_CELL_HEIGHT;
const INITIAL_BOARD = [
  [
    { name: "L1" },
    { name: "H1" },
    { name: "L3" },
    { name: "L2" },
    { name: "H4" },
    { name: "L1" },
    { name: "L4" }
  ],
  [
    { name: "L3" },
    { name: "H2" },
    { name: "L2" },
    { name: "S", scatter: true },
    { name: "L1" },
    { name: "H3" },
    { name: "L2" }
  ],
  [
    { name: "L2" },
    { name: "H3" },
    { name: "L5" },
    { name: "L3" },
    { name: "L4" },
    { name: "L2" },
    { name: "H1" }
  ],
  [
    { name: "L4" },
    { name: "H4" },
    { name: "L1" },
    { name: "EYE", eye: true },
    { name: "H2" },
    { name: "L3" },
    { name: "H1" }
  ],
  [
    { name: "H3" },
    { name: "L2" },
    { name: "L4" },
    { name: "H2" },
    { name: "S", scatter: true },
    { name: "L1" },
    { name: "L3" }
  ],
  [
    { name: "H2" },
    { name: "L1" },
    { name: "S", scatter: true },
    { name: "L3" },
    { name: "H1" },
    { name: "L4" },
    { name: "L2" }
  ]
];
const BOARD_DIMENSIONS = { x: REEL_LAYOUT_BASE.columns, y: REEL_LAYOUT_BASE.rows };
const BOARD_SIZES = {
  width: REEL_DISPLAY_GRID.width,
  height: REEL_DISPLAY_GRID.height
};
const VISIBLE_ROW_START = 1;
const getSymbolFill = (symbolName) => {
  if (symbolName === "S") return 0.9;
  if (symbolName === "EYE") return 1.2;
  if (symbolName.startsWith("H")) return 0.95;
  if (symbolName.startsWith("L")) return 0.74;
  return REEL_LAYOUT_BASE.symbolFill;
};
const EYE_FRAME = {
  close: "CLOSE_EYE",
  add: "ADD_EYE",
  mult: "MULT_EYE"
};
const EYE_ASPECT = 393 / 415;
const EYE_LABEL_OFFSET = { x: -0.025, y: -0.041 };
const EYE_VALUE_FILL = { add: 14679039, mul: 16770669 };
const eyeValueTextStyle = ({
  fontSize,
  fill
}) => ({
  fontFamily: "Cinzel, Georgia, serif",
  fontWeight: "900",
  fontSize,
  fill,
  align: "center",
  stroke: { color: 465453, width: Math.max(3, fontSize * 0.06) },
  dropShadow: { color: 0, blur: 4, distance: 2, alpha: 0.8 }
});
const SYMBOL_SOURCE_SIZES = {
  H1: { width: 393, height: 415 },
  H2: { width: 393, height: 415 },
  H3: { width: 393, height: 415 },
  H4: { width: 393, height: 415 },
  L1: { width: 393, height: 415 },
  L2: { width: 393, height: 415 },
  L3: { width: 393, height: 415 },
  L4: { width: 393, height: 415 },
  L5: { width: 393, height: 415 },
  S: { width: 393, height: 415 },
  EYE: { width: 393, height: 415 }
};
const INITIAL_SYMBOL_STATE = "static";
const SYMBOL_COLORS = {
  H1: { color: 12730636, label: "H1" },
  // Anglerfish
  H2: { color: 14251782, label: "H2" },
  // Nautilus
  H3: { color: 11817737, label: "H3" },
  // Diving Helmet
  H4: { color: 14362487, label: "H4" },
  // Jellyfish
  L1: { color: 2285823, label: "L1" },
  // Cyan gem
  L2: { color: 2078374, label: "L2" },
  // Teal gem
  L3: { color: 3900150, label: "L3" },
  // Sapphire gem
  L4: { color: 9133302, label: "L4" },
  // Violet gem
  L5: { color: 6220500, label: "L5" },
  // Aqua gem
  S: { color: 16757052, glow: 16765562, label: "S" },
  // Leviathan (scatter)
  EYE: { color: 662062, glow: 16498468, label: "EYE" }
  // The Eye
};
const SYMBOL_STATES_ALL = [
  "static",
  "spin",
  "land",
  "win",
  "postWinStatic",
  "explosion"
];
const buildPlaceholderInfo = (name) => {
  const { color, glow, label } = SYMBOL_COLORS[name];
  const info = {
    type: "placeholder",
    label,
    color,
    glow,
    sizeRatios: { width: 1, height: 1 }
  };
  return Object.fromEntries(SYMBOL_STATES_ALL.map((state) => [state, info]));
};
const SYMBOL_INFO_MAP = {
  H1: buildPlaceholderInfo("H1"),
  H2: buildPlaceholderInfo("H2"),
  H3: buildPlaceholderInfo("H3"),
  H4: buildPlaceholderInfo("H4"),
  L1: buildPlaceholderInfo("L1"),
  L2: buildPlaceholderInfo("L2"),
  L3: buildPlaceholderInfo("L3"),
  L4: buildPlaceholderInfo("L4"),
  L5: buildPlaceholderInfo("L5"),
  S: buildPlaceholderInfo("S"),
  EYE: buildPlaceholderInfo("EYE")
};
const SPIN_OPTIONS_SHARED = {
  reelFallInDelay: 80,
  reelPaddingMultiplierNormal: 1.25,
  reelPaddingMultiplierAnticipated: 18,
  reelFallOutDelay: 145
};
const SPIN_OPTIONS_DEFAULT = {
  ...SPIN_OPTIONS_SHARED,
  symbolFallInSpeed: 3.5,
  symbolFallInInterval: 30,
  symbolFallInBounceSpeed: 0.15,
  symbolFallInBounceSizeMulti: 0.5,
  symbolFallOutSpeed: 3.5,
  symbolFallOutInterval: 20
};
const SPIN_OPTIONS_FAST = {
  ...SPIN_OPTIONS_SHARED,
  symbolFallInSpeed: 7,
  symbolFallInInterval: 0,
  symbolFallInBounceSpeed: 0.3,
  symbolFallInBounceSizeMulti: 0.25,
  symbolFallOutSpeed: 7,
  symbolFallOutInterval: 0
};
const SCATTER_LAND_SOUND_MAP = {
  1: "sfx_scatter_stop_1",
  2: "sfx_scatter_stop_2",
  3: "sfx_scatter_stop_3",
  4: "sfx_scatter_stop_4",
  5: "sfx_scatter_stop_5"
};
const { stateLayout, stateLayoutDerived } = createLayout({
  backgroundRatio: {
    normal: 2039 / 1e3,
    portrait: 1242 / 2208
  },
  mainSizesMap: {
    desktop: { width: GAME_WIDTH, height: GAME_HEIGHT },
    tablet: { width: GAME_WIDTH, height: GAME_HEIGHT },
    landscape: { width: GAME_WIDTH, height: GAME_HEIGHT },
    portrait: { width: GAME_WIDTH, height: GAME_HEIGHT }
  }
});
const assets = {
  // Abyssal's own art only. Every cloned scatter-template asset has been removed and
  // replaced by Abyssal-specific art or code-drawn placeholders.
  backgroundBase: {
    type: "sprite",
    src: new URL("../../assets/background/background-base.png", import.meta.url).href,
    preload: true
  },
  backgroundFs: {
    type: "sprite",
    src: new URL("../../assets/background/background-fs.png", import.meta.url).href,
    preload: true
  },
  // Current frame PNGs include the inner dark reel background and vertical separators.
  reelFrameBase: {
    type: "sprite",
    src: new URL("../../assets/frame/reel_frame_base.png", import.meta.url).href,
    preload: true
  },
  reelFrameFs: {
    type: "sprite",
    src: new URL("../../assets/frame/reel_frame_fs.png", import.meta.url).href,
    preload: true
  },
  // Layered Gaze meter kit. The component composes its frame, Eye and FX at runtime so the
  // ten charge steps and multiplier remain fully driven by game state.
  gazeMeter: {
    type: "sprites",
    src: new URL("../../assets/frame/fram/spritesheet.json", import.meta.url).href,
    preload: true
  },
  // Free-spins counterpart of the Gaze kit. Its frame names are FS-prefixed in the atlas
  // so both skins can be preloaded without replacing each other's textures.
  gazeMeterFs: {
    type: "sprites",
    src: new URL("../../assets/frame/frame_fs/frame_fs.json", import.meta.url).href,
    preload: true
  },
  // Provider logo used as the buy-bonus glyph on the control bar.
  providerLogo: {
    type: "sprite",
    src: new URL("../../assets/provider_logo.png", import.meta.url).href,
    preload: true
  },
  // TexturePacker symbol atlas. Frames are addressed by name, such as `H1` / `SCATTER` /
  // `ADD_EYE` / `MULT_EYE` / `CLOSE_EYE`.
  symbols: {
    type: "sprites",
    src: new URL("../../assets/symbols/eye/eye.json", import.meta.url).href,
    preload: true
  },
  bigWin: {
    type: "sprite",
    src: new URL("../../assets/wins/big_win.png", import.meta.url).href,
    preload: true
  },
  megaWin: {
    type: "sprite",
    src: new URL("../../assets/wins/mega_win.png", import.meta.url).href,
    preload: true
  },
  epicWin: {
    type: "sprite",
    src: new URL("../../assets/wins/epic_win.png", import.meta.url).href,
    preload: true
  },
  maxWin: {
    type: "sprite",
    src: new URL("../../assets/wins/max_win.png", import.meta.url).href,
    preload: true
  },
  freeSpinsBanner: {
    type: "sprite",
    src: new URL("../../assets/wins/freespins.png", import.meta.url).href,
    preload: true
  },
  freeSpinsRetrigger: {
    type: "sprite",
    src: new URL("../../assets/wins/retrigger.png", import.meta.url).href,
    preload: true
  }
};
const { stateApp } = createApp({ assets });
function createReelForCascading(reelOptions) {
  const getSymbolY2 = (symbolIndexOfBoard) => (symbolIndexOfBoard + 0.5) * reelOptions.symbolHeight;
  const createReelSymbol = (reelSymbolOptions) => {
    const symbolIndexOfBoard = reelSymbolOptions.symbolIndex - 1;
    const rawSymbol = reelSymbolOptions.rawSymbol;
    const symbolState = reelOptions.initialSymbolState;
    const initY = getSymbolY2(symbolIndexOfBoard);
    const symbolY = new Tween(initY);
    const oncomplete = () => {
    };
    const reelSymbol = {
      rawSymbol,
      symbolIndexOfBoard,
      symbolY,
      symbolState,
      oncomplete
    };
    return reelSymbol;
  };
  const createReelSymbols = (rawSymbols) => {
    const reelSymbols = rawSymbols.map((rawSymbol, symbolIndex) => createReelSymbol({ rawSymbol, symbolIndex }));
    return reelSymbols;
  };
  const updateSymbols = (value) => reelState.symbols.map((reelSymbol, symbolIndex) => {
    reelSymbol.rawSymbol = value[symbolIndex];
    reelSymbol.symbolState = "static";
  });
  const reelLength = reelOptions.initialSymbols.length;
  const reelLengthInBoard = reelLength - 2;
  const interruptible = createInterruptible();
  const reelState = {
    symbols: createReelSymbols(reelOptions.initialSymbols),
    motion: "stopped",
    spinType: "normal",
    anticipating: false,
    readyToSpin: () => {
    },
    spinOptions: () => ({})
  };
  const basePaddingSize = () => reelLength * reelState.spinOptions().reelPaddingMultiplierNormal;
  const anticipatedPaddingSize = () => reelLength * reelState.spinOptions().reelPaddingMultiplierAnticipated;
  let targetSymbols = reelOptions.initialSymbols;
  let onSpinFinishing = () => {
  };
  let noStop = false;
  let paddingSize = 0;
  const delaySpinByReelIndex = async () => {
    await waitForTimeout(reelState.spinOptions().reelFallOutDelay * reelOptions.reelIndex);
  };
  const preSpin = async ({ isTurboBeforeAll }) => {
    reelState.spinType = isTurboBeforeAll ? "fast" : "normal";
    if (!isTurboBeforeAll) await delaySpinByReelIndex();
    await fallOut();
  };
  const moveAllSymbolsWith = async (moveSymbol) => {
    await Promise.all(reelState.symbols.map(moveSymbol));
  };
  const fallOut = async () => {
    reelState.motion = "fallingOut";
    await moveAllSymbolsWith(async (reelSymbol) => {
      const oldSymbolY = reelSymbol.symbolY.current;
      const newSymbolY = getSymbolY2(reelSymbol.symbolIndexOfBoard + reelLength);
      const distance = newSymbolY - oldSymbolY;
      const duration = distance / reelState.spinOptions().symbolFallOutSpeed;
      const delay = reelState.spinOptions().symbolFallOutInterval * (reelLengthInBoard - reelSymbol.symbolIndexOfBoard);
      await waitForTimeout(delay);
      reelSymbol.symbolState = "spin";
      await reelSymbol.symbolY.set(newSymbolY, { duration });
    });
    reelState.motion = "hanging";
  };
  const hanging = async () => {
    updateSymbols(targetSymbols);
    await moveAllSymbolsWith(async (reelSymbol) => {
      const newSymbolY = getSymbolY2(reelSymbol.symbolIndexOfBoard - reelLength + 0.5);
      const duration = 0;
      await reelSymbol.symbolY.set(newSymbolY, { duration });
    });
  };
  const fallIn = async () => {
    const fallInDelayMultiplier = paddingSize / reelLength - 1;
    const waitToStartFallingIn = async () => await waitForTimeout(reelState.spinOptions().reelFallInDelay * fallInDelayMultiplier);
    if (noStop) {
      await waitToStartFallingIn();
    } else if (stateBet$1.isTurbo) ;
    else {
      await interruptible.add(waitToStartFallingIn);
    }
    reelState.motion = "fallingIn";
    await moveAllSymbolsWith(async (reelSymbol) => {
      const oldSymbolY = reelSymbol.symbolY.current;
      const newSymbolY = getSymbolY2(reelSymbol.symbolIndexOfBoard);
      const distance = newSymbolY - oldSymbolY;
      const delay = reelState.spinOptions().symbolFallInInterval * (reelLengthInBoard - reelSymbol.symbolIndexOfBoard);
      const bounceDistance = reelOptions.symbolHeight * reelState.spinOptions().symbolFallInBounceSizeMulti;
      const bounceDuration = bounceDistance / reelState.spinOptions().symbolFallInBounceSpeed;
      const landDuration = (distance - bounceDistance) / reelState.spinOptions().symbolFallInSpeed;
      await reelSymbol.symbolY.set(newSymbolY - bounceDistance, { duration: landDuration, delay });
      reelSymbol.symbolState = "land";
      reelOptions.onSymbolLand({ rawSymbol: reelSymbol.rawSymbol });
      if (reelSymbol.symbolIndexOfBoard === reelLengthInBoard - 1) {
        onSpinFinishing();
      }
      await reelSymbol.symbolY.set(newSymbolY, { duration: bounceDuration, easing: backOut });
    });
    reelState.motion = "stopped";
  };
  const generalSpin = async () => {
    const isHanging = reelState.motion === "hanging";
    if (!isHanging) await fallOut();
    await hanging();
    await fallIn();
  };
  const fastSpin = () => generalSpin();
  const normalSpin = () => generalSpin();
  const anticipatedSpin = () => generalSpin();
  const SPIN_MAP = {
    fast: fastSpin,
    normal: normalSpin,
    anticipated: anticipatedSpin
  };
  const prepareToSpin = (prepareToSpinOptions) => {
    reelState.spinType = prepareToSpinOptions.spinType;
    noStop = prepareToSpinOptions.noStop;
    targetSymbols = prepareToSpinOptions.symbols;
    onSpinFinishing = prepareToSpinOptions.onSpinFinishing;
    const GET_PADDING_SIZE_MAP = {
      fast: 0,
      normal: prepareToSpinOptions.previousPaddingSize + basePaddingSize(),
      anticipated: prepareToSpinOptions.previousPaddingSize + anticipatedPaddingSize()
    };
    paddingSize = GET_PADDING_SIZE_MAP[prepareToSpinOptions.spinType];
    return paddingSize;
  };
  const spin = async () => {
    await SPIN_MAP[reelState.spinType]();
  };
  const setSymbolsWithRawSymbols = (value) => {
    reelState.motion = "stopped";
    if (value) {
      updateSymbols(value);
    }
  };
  const stop = () => {
    interruptible.interrupt();
  };
  const readyToSpinEffect = () => {
  };
  return {
    // from options
    reelIndex: reelOptions.reelIndex,
    symbolHeight: reelOptions.symbolHeight,
    onReelStopping: reelOptions.onReelStopping,
    reelLength,
    // reactive states
    reelState,
    // methods
    preSpin,
    prepareToSpin,
    spin,
    stop,
    setSymbolsWithRawSymbols,
    readyToSpinEffect
  };
}
const stateSlots = { isPreSpinning: false };
function createEnhanceBoardPreSpin({
  board: board2
}) {
  const preSpin = async ({ paddingBoard }) => {
    stateSlots.isPreSpinning = true;
    const isTurboBeforeAll = stateBet$1.isTurbo;
    await Promise.all(
      board2.map((reel, reelIndex) => {
        return reel.preSpin({ isTurboBeforeAll, preSpinPaddingReel: paddingBoard?.[reelIndex] });
      })
    );
  };
  return { preSpin };
}
function createEnhanceBoardSpin({
  board: board2
}) {
  async function spin({
    revealEvent,
    paddingBoard
  }) {
    if (stateSlots.isPreSpinning) {
      await Promise.all(
        board2.map(async (reel) => {
          await waitForResolve((resolve) => reel.reelState.readyToSpin = resolve);
        })
      );
    }
    stateSlots.isPreSpinning = false;
    const globalSpinType = stateBet$1.isTurbo ? "fast" : "normal";
    const globalHasAnticipation = revealEvent.anticipation.some(Boolean);
    const firstAnticipatedReelIndex = revealEvent.anticipation.findIndex(Boolean);
    const getSpinType = ({
      noStop,
      isAnticipated
    }) => {
      if (isAnticipated) return "anticipated";
      if (noStop) return "normal";
      return globalSpinType;
    };
    board2.reduce((previousPaddingSize, reel, reelIndex) => {
      const noStop = globalHasAnticipation && reelIndex >= firstAnticipatedReelIndex;
      const isAnticipated = (revealEvent.anticipation?.[reelIndex] || 0) > 0;
      const spinType = getSpinType({ noStop, isAnticipated });
      const symbols = revealEvent.board[reelIndex];
      const paddingReel = paddingBoard?.[reelIndex];
      const paddingPosition = revealEvent?.paddingPositions?.[reelIndex];
      const paddingSize = reel.prepareToSpin({
        noStop,
        spinType,
        symbols,
        // @ts-ignore Ignored because paddingReel is not required by createCascadingReel
        paddingReel,
        // @ts-ignore Ignored because paddingPosition is not required by createCascadingReel
        paddingPosition,
        previousPaddingSize,
        onSpinFinishing: () => {
          reel.onReelStopping();
          const nextReelIndex = reelIndex + 1;
          const isNextReelAnticipated = (revealEvent.anticipation?.[nextReelIndex] || 0) > 0;
          if (isNextReelAnticipated) board2[nextReelIndex].reelState.anticipating = true;
        }
      });
      return paddingSize;
    }, 0);
    await Promise.all(
      board2.map(async (reel) => {
        await reel.spin();
      })
    );
  }
  return { spin };
}
function createEnhanceBoard() {
  function enhanceBoard2({ board: board2 }) {
    const { preSpin } = createEnhanceBoardPreSpin({ board: board2 });
    const { spin } = createEnhanceBoardSpin({ board: board2 });
    const settle = (rawBoard) => board2.forEach((reel, reelIndex) => {
      const rawSymbols = rawBoard?.[reelIndex] || [];
      reel.setSymbolsWithRawSymbols(rawSymbols);
    });
    const stop = () => board2.forEach((reel) => reel.stop());
    const readyToSpinEffect = () => {
      board2.forEach((reel) => reel.readyToSpinEffect());
    };
    return {
      board: board2,
      preSpin,
      spin,
      settle,
      stop,
      readyToSpinEffect
    };
  }
  return { enhanceBoard: enhanceBoard2 };
}
function createGetWinLevelDataByWinLevelAlias({ winLevelMap: winLevelMap2 }) {
  const getWinLevelDataByWinLevelAlias2 = (winLevelAlias) => {
    const winLevelData = _.values(winLevelMap2).find(
      (data) => data.alias === winLevelAlias
    );
    return winLevelData;
  };
  return { getWinLevelDataByWinLevelAlias: getWinLevelDataByWinLevelAlias2 };
}
const winLevelMap = {
  1: {
    level: 1,
    alias: "zero",
    type: "small",
    text: null,
    presentDuration: 0,
    sound: { sfx: void 0, bgm: void 0 },
    animation: void 0
  },
  2: {
    level: 2,
    alias: "standard",
    type: "small",
    text: null,
    presentDuration: 0.6 * SECOND,
    sound: { sfx: void 0, bgm: void 0 },
    animation: void 0
  },
  3: {
    level: 3,
    alias: "small",
    type: "small",
    text: null,
    presentDuration: 1 * SECOND,
    sound: { sfx: void 0, bgm: void 0 },
    animation: void 0
  },
  4: {
    level: 4,
    alias: "nice",
    type: "medium",
    text: null,
    presentDuration: 1.5 * SECOND,
    sound: { sfx: void 0, bgm: void 0 },
    animation: void 0
  },
  5: {
    level: 5,
    alias: "substantial",
    type: "medium",
    text: null,
    presentDuration: 2 * SECOND,
    sound: { sfx: void 0, bgm: void 0 },
    animation: void 0
  },
  6: {
    level: 6,
    alias: "big",
    type: "big",
    text: "BIG WIN",
    presentDuration: 6 * SECOND,
    sound: { sfx: void 0, bgm: "bgm_winlevel_big" },
    animation: { intro: "big_win_intro", idle: "big_win_idle", outro: "big_win_exit" }
  },
  7: {
    level: 7,
    alias: "superwin",
    type: "big",
    text: "SUPER WIN",
    presentDuration: 18 * SECOND,
    sound: { sfx: void 0, bgm: "bgm_winlevel_superwin" },
    animation: { intro: "super_win_intro", idle: "super_win_idle", outro: "super_win_exit" }
  },
  8: {
    level: 8,
    alias: "mega",
    type: "big",
    text: "MEGA WIN",
    presentDuration: 20 * SECOND,
    sound: { sfx: void 0, bgm: "bgm_winlevel_mega" },
    animation: { intro: "mega_win_intro", idle: "mega_win_idle", outro: "mega_win_exit" }
  },
  9: {
    level: 9,
    alias: "epic",
    type: "big",
    text: "EPIC WIN!",
    presentDuration: 26 * SECOND,
    sound: { sfx: void 0, bgm: "bgm_winlevel_epic" },
    animation: { intro: "epic_win_intro", idle: "epic_win_idle", outro: "epic_win_exit" }
  },
  10: {
    level: 10,
    alias: "max",
    type: "big",
    text: "MAX WIN",
    presentDuration: 32 * SECOND,
    sound: { sfx: void 0, bgm: "bgm_winlevel_max" },
    animation: { intro: "max_win_intro", idle: "max_win_idle", outro: "max_win_exit" }
  }
};
const onSymbolLand = ({ rawSymbol }) => {
  if (rawSymbol.name === "S") {
    eventEmitter.broadcast({ type: "reelFrameScatterLand" });
    eventEmitter.broadcast({ type: "soundScatterCounterIncrease" });
    eventEmitter.broadcast({
      type: "soundOnce",
      name: SCATTER_LAND_SOUND_MAP[scatterLandIndex()]
    });
  }
  if (rawSymbol.name === "EYE") eventEmitter.broadcast({ type: "reelFrameEyeLand" });
};
const board = _.range(BOARD_DIMENSIONS.x).map((reelIndex) => {
  const reel = createReelForCascading({
    reelIndex,
    symbolHeight: REEL_CELL_HEIGHT,
    initialSymbols: INITIAL_BOARD[reelIndex],
    initialSymbolState: INITIAL_SYMBOL_STATE,
    onReelStopping: () => {
      eventEmitter.broadcast({
        type: "soundOnce",
        name: "sfx_reel_stop_1",
        forcePlay: !stateBet$1.isTurbo
      });
      const reelHasEye = board[reelIndex].reelState.symbols.some((reelSymbol) => reelSymbol.rawSymbol.name === "EYE");
      if (reelHasEye) eventEmitter.broadcast({ type: "boardEyeImpact" });
    },
    onSymbolLand
  });
  reel.reelState.spinOptions = () => reel.reelState.spinType === "fast" ? SPIN_OPTIONS_FAST : SPIN_OPTIONS_DEFAULT;
  return reel;
});
const stateGame = {
  board,
  gameType: "basegame",
  tumbleBoardAdding: [],
  tumbleBoardBase: [],
  scatterCounter: 0,
  // True while the board is anticipating the free-spins trigger (3+ scatters down). Scatters
  // pulse harder and the board dims/holds while we wait for the next one.
  scatterAnticipating: false,
  // The Eye's Gaze charge for the current spin (driven by `gazeStep`); reset each reveal.
  gazeCharge: 0,
  // Tracks whether the current spin already resolved an Eye. If charge exists and this
  // stays false by settlement, the meter drains as the intended no-Eye near miss.
  eyeResolvedThisSpin: false,
  // Snowball persistent multiplier `M` during a feature (driven by `setPersistentMult`).
  persistentMult: 1,
  // Keeps the game scene blurred while the free-spins congratulations banner is awaiting a press.
  freeSpinIntroActive: false
};
const reelLayout = () => stateGame.gameType === "freegame" ? REEL_LAYOUT_FREE_SPINS : REEL_LAYOUT_BASE;
const boardLayout = () => {
  const layout = reelLayout();
  const grid = getReelDisplayGrid(layout);
  const position = getReelPosition(layout);
  return {
    x: position.x + grid.x + grid.width / 2,
    y: position.y + grid.y + grid.height / 2,
    anchor: { x: 0.5, y: 0.5 },
    pivot: { x: grid.width / 2, y: grid.height / 2 },
    width: grid.width,
    height: grid.height
  };
};
const boardRaw = () => board.map((reel) => reel.reelState.symbols.map((reelSymbol) => reelSymbol.rawSymbol));
const tumbleBoardCombined = () => {
  const tumbleBoardCombined2 = stateGame.tumbleBoardBase.map((tumbleReelBase, reelIndex) => {
    const tumbleReelAdding = stateGame.tumbleBoardAdding[reelIndex] ?? [];
    return [...tumbleReelAdding, ...tumbleReelBase];
  });
  return tumbleBoardCombined2;
};
const scatterLandIndex = () => {
  if (stateGame.scatterCounter > 5) return 5;
  if (stateGame.scatterCounter < 1) return 1;
  return stateGame.scatterCounter;
};
const { enhanceBoard } = createEnhanceBoard();
const enhancedBoard = enhanceBoard({ board: stateGame.board });
const speedUpCurrentSpin = () => {
  enhancedBoard.board.forEach((reel) => reel.reelState.spinType = "fast");
  enhancedBoard.stop();
};
const enableTurbo = () => {
  stateBetDerived.updateIsTurbo(true, { persistent: true });
  speedUpCurrentSpin();
};
const { getWinLevelDataByWinLevelAlias } = createGetWinLevelDataByWinLevelAlias({ winLevelMap });
const stateGameDerived = {
  onSymbolLand,
  reelLayout,
  boardLayout,
  boardRaw,
  tumbleBoardCombined,
  scatterLandIndex,
  enhancedBoard,
  speedUpCurrentSpin,
  enableTurbo,
  getWinLevelDataByWinLevelAlias
};
const providerLogo = new URL("../../assets/provider_logo.png", import.meta.url).href;
const HERO = {
  ANTE: new URL("../../assets/bonus/ante.png", import.meta.url).href,
  SUPERSPINS: new URL("../../assets/bonus/superspins.png", import.meta.url).href,
  BONUS: new URL("../../assets/bonus/bonus.png", import.meta.url).href,
  ULTIMATE: new URL("../../assets/bonus/utlimate.png", import.meta.url).href,
  SUPERBONUS: new URL("../../assets/bonus/superbonus.png", import.meta.url).href
};
const WIN_CAP = 15e3;
const baseAssets = {
  icon: providerLogo,
  // Celest Studios mark on every bet-mode / buy-bonus card
  volatility: "",
  button: "",
  dialogImage: "",
  dialogVolatility: ""
};
const mode = (data) => ({
  parent: "",
  children: "",
  maxWin: WIN_CAP,
  assets: baseAssets,
  text: {
    title: data.mode,
    dialog: "",
    button: "",
    tickerIdle: "",
    tickerSpin: "GOOD LUCK"
  },
  ...data
});
const ABYSSAL_BET_MODE_META = {
  BASE: mode({
    mode: "BASE",
    costMultiplier: 1,
    type: "default",
    text: {
      title: "BASE",
      dialog: "The standard Abyssal spin. The Eye is rare and mostly ADD.",
      button: "",
      tickerIdle: "PLACE YOUR BET",
      tickerSpin: "GOOD LUCK"
    }
  }),
  ANTE: mode({
    mode: "ANTE",
    costMultiplier: 1.25,
    type: "activate",
    assets: { ...baseAssets, dialogImage: HERO.ANTE, volatility: "2" },
    text: {
      title: "ANTE",
      description: "Raise the tide — more frequent Eyes and Scatters.",
      dialog: "Increases the Eye and Scatter frequency for 1.25× the bet. ANTE BET stays active until disabled.",
      button: "ACTIVATE",
      betAmountLabel: "ANTE BET",
      tickerIdle: "ANTE BET IS ACTIVE",
      tickerSpin: "GOOD LUCK"
    }
  }),
  SUPERSPINS: mode({
    mode: "SUPERSPINS",
    costMultiplier: 20,
    type: "activate",
    assets: { ...baseAssets, dialogImage: HERO.SUPERSPINS, volatility: "3" },
    text: {
      title: "EYE SPINS",
      description: "One guaranteed-Eye spin — a single build-and-release.",
      dialog: "A single spin for 20× the bet with the Eye guaranteed to land. No snowball — one punchy build and release.",
      button: "ACTIVATE",
      tickerIdle: "SUPER SPINS IS ACTIVE",
      tickerSpin: "GOOD LUCK"
    }
  }),
  BONUS: mode({
    mode: "BONUS",
    costMultiplier: 100,
    type: "buy",
    assets: { ...baseAssets, dialogImage: HERO.BONUS, volatility: "4" },
    text: {
      title: "BONUS",
      description: "Buy straight into the Free Spins snowball feature.",
      dialog: "Triggers Free Spins for 100× the bet. The persistent multiplier (M) snowballs across the feature as the Eye lands.",
      button: "BUY",
      tickerIdle: "PLACE YOUR BET",
      tickerSpin: "FREE SPINS PURCHASED"
    }
  }),
  ULTIMATE: mode({
    mode: "ULTIMATE",
    costMultiplier: 300,
    type: "activate",
    assets: { ...baseAssets, dialogImage: HERO.ULTIMATE, volatility: "4" },
    text: {
      title: "ULTIMATE",
      description: "The multi-Eye finale — several Eyes resolve at once.",
      dialog: "The only mode where multiple Eyes open together for 300× the bet, combining their ADD and MUL values in one resolution.",
      button: "ACTIVATE",
      tickerIdle: "ULTIMATE IS ACTIVE",
      tickerSpin: "GOOD LUCK"
    }
  }),
  SUPERBONUS: mode({
    mode: "SUPERBONUS",
    costMultiplier: 500,
    type: "buy",
    assets: { ...baseAssets, dialogImage: HERO.SUPERBONUS, volatility: "5" },
    text: {
      title: "SUPER BONUS",
      description: "The tail mode — charge +2 and MUL common.",
      dialog: "Buys the Free Spins feature for 500× the bet with +2 Gaze charge per connection and MUL Eyes common. The mode that most often approaches the 15,000× cap.",
      button: "BUY",
      tickerIdle: "PLACE YOUR BET",
      tickerSpin: "SUPER BONUS PURCHASED"
    }
  })
};
const i18nDerived$1 = {
  audio: () => stateI18nDerived.translate("AUDIO"),
  balance: () => stateI18nDerived.translate("BALANCE"),
  win: () => stateI18nDerived.translate("WIN"),
  bet: () => stateUrlDerived.social() ? "SPIN" : stateI18nDerived.translate("BET"),
  stop: () => stateI18nDerived.translate("STOP"),
  buyBonus: () => stateUrlDerived.social() ? "PLAY BONUS" : stateI18nDerived.translate("BUY BONUS"),
  disable: () => stateI18nDerived.translate("DISABLE"),
  freeSpins: () => stateI18nDerived.translate("FREE SPINS"),
  //
  decrease: () => stateI18nDerived.translate("-"),
  increase: () => stateI18nDerived.translate("+"),
  menu: () => stateI18nDerived.translate("MENU"),
  turbo: () => stateI18nDerived.translate("TURBO"),
  autoSpin: () => stateI18nDerived.translate("AUTO SPIN"),
  payTable: () => stateI18nDerived.translate("PAYTABLE"),
  info: () => stateI18nDerived.translate("INFO"),
  settings: () => stateI18nDerived.translate("SETTINGS"),
  soundOn: () => stateI18nDerived.translate("SOUND ON"),
  soundOff: () => stateI18nDerived.translate("SOUND OFF"),
  menuExit: () => stateI18nDerived.translate("EXIT")
};
const en$1 = {
  SETTINGS: "SETTINGS"
};
const zh$1 = {
  SETTINGS: "设置"
};
const messagesMap$1 = {
  en: en$1,
  zh: zh$1
};
const i18nDerived = {
  ...i18nDerived$1,
  ...i18nDerived$2,
  home: () => stateI18nDerived.translate("HOME"),
  notTranslated: () => stateI18nDerived.translate("NOT TRANSLATED"),
  loaderSubtitle: () => stateI18nDerived.translate("LOADER_SUBTITLE"),
  loaderLogo: () => stateI18nDerived.translate("LOADER_LOGO"),
  loaderCard1Title: () => stateI18nDerived.translate("LOADER_CARD_1_TITLE"),
  loaderCard1Body: () => stateI18nDerived.translate("LOADER_CARD_1_BODY"),
  loaderCard2Title: () => stateI18nDerived.translate("LOADER_CARD_2_TITLE"),
  loaderCard2Body: () => stateI18nDerived.translate("LOADER_CARD_2_BODY"),
  loaderCard3Title: () => stateI18nDerived.translate("LOADER_CARD_3_TITLE"),
  loaderCard3Body: () => stateI18nDerived.translate("LOADER_CARD_3_BODY"),
  loaderCta: () => stateI18nDerived.translate("LOADER_CTA"),
  loaderLoading: () => stateI18nDerived.translate("LOADER_LOADING"),
  loaderCardsLabel: () => stateI18nDerived.translate("LOADER_CARDS_LABEL"),
  loaderPreviousCard: () => stateI18nDerived.translate("LOADER_PREVIOUS_CARD"),
  loaderNextCard: () => stateI18nDerived.translate("LOADER_NEXT_CARD"),
  freeSpinsTapToPlay: () => stateI18nDerived.translate("FREE_SPINS_TAP_TO_PLAY"),
  freeSpinsTapToSkip: () => stateI18nDerived.translate("FREE_SPINS_TAP_TO_SKIP")
};
const setContext = () => {
  setContextEventEmitter({ eventEmitter });
  setContextXstate({ stateXstate, stateXstateDerived });
  setContextLayout({ stateLayout, stateLayoutDerived });
  setContextApp({ stateApp });
  stateMeta.betModeMeta = ABYSSAL_BET_MODE_META;
};
const getContext = () => ({
  ...getContextEventEmitter(),
  ...getContextLayout(),
  ...getContextXstate(),
  ...getContextApp(),
  stateGame,
  stateGameDerived,
  i18nDerived
});
var howler = {};
/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */
var hasRequiredHowler;
function requireHowler() {
  if (hasRequiredHowler) return howler;
  hasRequiredHowler = 1;
  (function(exports) {
    (function() {
      var HowlerGlobal2 = function() {
        this.init();
      };
      HowlerGlobal2.prototype = {
        /**
         * Initialize the global Howler object.
         * @return {Howler}
         */
        init: function() {
          var self2 = this || Howler2;
          self2._counter = 1e3;
          self2._html5AudioPool = [];
          self2.html5PoolSize = 10;
          self2._codecs = {};
          self2._howls = [];
          self2._muted = false;
          self2._volume = 1;
          self2._canPlayEvent = "canplaythrough";
          self2._navigator = typeof window !== "undefined" && window.navigator ? window.navigator : null;
          self2.masterGain = null;
          self2.noAudio = false;
          self2.usingWebAudio = true;
          self2.autoSuspend = true;
          self2.ctx = null;
          self2.autoUnlock = true;
          self2._setup();
          return self2;
        },
        /**
         * Get/set the global volume for all sounds.
         * @param  {Float} vol Volume from 0.0 to 1.0.
         * @return {Howler/Float}     Returns self or current volume.
         */
        volume: function(vol) {
          var self2 = this || Howler2;
          vol = parseFloat(vol);
          if (!self2.ctx) {
            setupAudioContext();
          }
          if (typeof vol !== "undefined" && vol >= 0 && vol <= 1) {
            self2._volume = vol;
            if (self2._muted) {
              return self2;
            }
            if (self2.usingWebAudio) {
              self2.masterGain.gain.setValueAtTime(vol, Howler2.ctx.currentTime);
            }
            for (var i = 0; i < self2._howls.length; i++) {
              if (!self2._howls[i]._webAudio) {
                var ids = self2._howls[i]._getSoundIds();
                for (var j = 0; j < ids.length; j++) {
                  var sound2 = self2._howls[i]._soundById(ids[j]);
                  if (sound2 && sound2._node) {
                    sound2._node.volume = sound2._volume * vol;
                  }
                }
              }
            }
            return self2;
          }
          return self2._volume;
        },
        /**
         * Handle muting and unmuting globally.
         * @param  {Boolean} muted Is muted or not.
         */
        mute: function(muted) {
          var self2 = this || Howler2;
          if (!self2.ctx) {
            setupAudioContext();
          }
          self2._muted = muted;
          if (self2.usingWebAudio) {
            self2.masterGain.gain.setValueAtTime(muted ? 0 : self2._volume, Howler2.ctx.currentTime);
          }
          for (var i = 0; i < self2._howls.length; i++) {
            if (!self2._howls[i]._webAudio) {
              var ids = self2._howls[i]._getSoundIds();
              for (var j = 0; j < ids.length; j++) {
                var sound2 = self2._howls[i]._soundById(ids[j]);
                if (sound2 && sound2._node) {
                  sound2._node.muted = muted ? true : sound2._muted;
                }
              }
            }
          }
          return self2;
        },
        /**
         * Handle stopping all sounds globally.
         */
        stop: function() {
          var self2 = this || Howler2;
          for (var i = 0; i < self2._howls.length; i++) {
            self2._howls[i].stop();
          }
          return self2;
        },
        /**
         * Unload and destroy all currently loaded Howl objects.
         * @return {Howler}
         */
        unload: function() {
          var self2 = this || Howler2;
          for (var i = self2._howls.length - 1; i >= 0; i--) {
            self2._howls[i].unload();
          }
          if (self2.usingWebAudio && self2.ctx && typeof self2.ctx.close !== "undefined") {
            self2.ctx.close();
            self2.ctx = null;
            setupAudioContext();
          }
          return self2;
        },
        /**
         * Check for codec support of specific extension.
         * @param  {String} ext Audio file extention.
         * @return {Boolean}
         */
        codecs: function(ext) {
          return (this || Howler2)._codecs[ext.replace(/^x-/, "")];
        },
        /**
         * Setup various state values for global tracking.
         * @return {Howler}
         */
        _setup: function() {
          var self2 = this || Howler2;
          self2.state = self2.ctx ? self2.ctx.state || "suspended" : "suspended";
          self2._autoSuspend();
          if (!self2.usingWebAudio) {
            if (typeof Audio !== "undefined") {
              try {
                var test = new Audio();
                if (typeof test.oncanplaythrough === "undefined") {
                  self2._canPlayEvent = "canplay";
                }
              } catch (e) {
                self2.noAudio = true;
              }
            } else {
              self2.noAudio = true;
            }
          }
          try {
            var test = new Audio();
            if (test.muted) {
              self2.noAudio = true;
            }
          } catch (e) {
          }
          if (!self2.noAudio) {
            self2._setupCodecs();
          }
          return self2;
        },
        /**
         * Check for browser support for various codecs and cache the results.
         * @return {Howler}
         */
        _setupCodecs: function() {
          var self2 = this || Howler2;
          var audioTest = null;
          try {
            audioTest = typeof Audio !== "undefined" ? new Audio() : null;
          } catch (err) {
            return self2;
          }
          if (!audioTest || typeof audioTest.canPlayType !== "function") {
            return self2;
          }
          var mpegTest = audioTest.canPlayType("audio/mpeg;").replace(/^no$/, "");
          var ua = self2._navigator ? self2._navigator.userAgent : "";
          var checkOpera = ua.match(/OPR\/(\d+)/g);
          var isOldOpera = checkOpera && parseInt(checkOpera[0].split("/")[1], 10) < 33;
          var checkSafari = ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1;
          var safariVersion = ua.match(/Version\/(.*?) /);
          var isOldSafari = checkSafari && safariVersion && parseInt(safariVersion[1], 10) < 15;
          self2._codecs = {
            mp3: !!(!isOldOpera && (mpegTest || audioTest.canPlayType("audio/mp3;").replace(/^no$/, ""))),
            mpeg: !!mpegTest,
            opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ""),
            ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
            oga: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
            wav: !!(audioTest.canPlayType('audio/wav; codecs="1"') || audioTest.canPlayType("audio/wav")).replace(/^no$/, ""),
            aac: !!audioTest.canPlayType("audio/aac;").replace(/^no$/, ""),
            caf: !!audioTest.canPlayType("audio/x-caf;").replace(/^no$/, ""),
            m4a: !!(audioTest.canPlayType("audio/x-m4a;") || audioTest.canPlayType("audio/m4a;") || audioTest.canPlayType("audio/aac;")).replace(/^no$/, ""),
            m4b: !!(audioTest.canPlayType("audio/x-m4b;") || audioTest.canPlayType("audio/m4b;") || audioTest.canPlayType("audio/aac;")).replace(/^no$/, ""),
            mp4: !!(audioTest.canPlayType("audio/x-mp4;") || audioTest.canPlayType("audio/mp4;") || audioTest.canPlayType("audio/aac;")).replace(/^no$/, ""),
            weba: !!(!isOldSafari && audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
            webm: !!(!isOldSafari && audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
            dolby: !!audioTest.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ""),
            flac: !!(audioTest.canPlayType("audio/x-flac;") || audioTest.canPlayType("audio/flac;")).replace(/^no$/, "")
          };
          return self2;
        },
        /**
         * Some browsers/devices will only allow audio to be played after a user interaction.
         * Attempt to automatically unlock audio on the first user interaction.
         * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
         * @return {Howler}
         */
        _unlockAudio: function() {
          var self2 = this || Howler2;
          if (self2._audioUnlocked || !self2.ctx) {
            return;
          }
          self2._audioUnlocked = false;
          self2.autoUnlock = false;
          if (!self2._mobileUnloaded && self2.ctx.sampleRate !== 44100) {
            self2._mobileUnloaded = true;
            self2.unload();
          }
          self2._scratchBuffer = self2.ctx.createBuffer(1, 1, 22050);
          var unlock = function(e) {
            while (self2._html5AudioPool.length < self2.html5PoolSize) {
              try {
                var audioNode = new Audio();
                audioNode._unlocked = true;
                self2._releaseHtml5Audio(audioNode);
              } catch (e2) {
                self2.noAudio = true;
                break;
              }
            }
            for (var i = 0; i < self2._howls.length; i++) {
              if (!self2._howls[i]._webAudio) {
                var ids = self2._howls[i]._getSoundIds();
                for (var j = 0; j < ids.length; j++) {
                  var sound2 = self2._howls[i]._soundById(ids[j]);
                  if (sound2 && sound2._node && !sound2._node._unlocked) {
                    sound2._node._unlocked = true;
                    sound2._node.load();
                  }
                }
              }
            }
            self2._autoResume();
            var source2 = self2.ctx.createBufferSource();
            source2.buffer = self2._scratchBuffer;
            source2.connect(self2.ctx.destination);
            if (typeof source2.start === "undefined") {
              source2.noteOn(0);
            } else {
              source2.start(0);
            }
            if (typeof self2.ctx.resume === "function") {
              self2.ctx.resume();
            }
            source2.onended = function() {
              source2.disconnect(0);
              self2._audioUnlocked = true;
              document.removeEventListener("touchstart", unlock, true);
              document.removeEventListener("touchend", unlock, true);
              document.removeEventListener("click", unlock, true);
              document.removeEventListener("keydown", unlock, true);
              for (var i2 = 0; i2 < self2._howls.length; i2++) {
                self2._howls[i2]._emit("unlock");
              }
            };
          };
          document.addEventListener("touchstart", unlock, true);
          document.addEventListener("touchend", unlock, true);
          document.addEventListener("click", unlock, true);
          document.addEventListener("keydown", unlock, true);
          return self2;
        },
        /**
         * Get an unlocked HTML5 Audio object from the pool. If none are left,
         * return a new Audio object and throw a warning.
         * @return {Audio} HTML5 Audio object.
         */
        _obtainHtml5Audio: function() {
          var self2 = this || Howler2;
          if (self2._html5AudioPool.length) {
            return self2._html5AudioPool.pop();
          }
          var testPlay = new Audio().play();
          if (testPlay && typeof Promise !== "undefined" && (testPlay instanceof Promise || typeof testPlay.then === "function")) {
            testPlay.catch(function() {
              console.warn("HTML5 Audio pool exhausted, returning potentially locked audio object.");
            });
          }
          return new Audio();
        },
        /**
         * Return an activated HTML5 Audio object to the pool.
         * @return {Howler}
         */
        _releaseHtml5Audio: function(audio) {
          var self2 = this || Howler2;
          if (audio._unlocked) {
            self2._html5AudioPool.push(audio);
          }
          return self2;
        },
        /**
         * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
         * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
         * @return {Howler}
         */
        _autoSuspend: function() {
          var self2 = this;
          if (!self2.autoSuspend || !self2.ctx || typeof self2.ctx.suspend === "undefined" || !Howler2.usingWebAudio) {
            return;
          }
          for (var i = 0; i < self2._howls.length; i++) {
            if (self2._howls[i]._webAudio) {
              for (var j = 0; j < self2._howls[i]._sounds.length; j++) {
                if (!self2._howls[i]._sounds[j]._paused) {
                  return self2;
                }
              }
            }
          }
          if (self2._suspendTimer) {
            clearTimeout(self2._suspendTimer);
          }
          self2._suspendTimer = setTimeout(function() {
            if (!self2.autoSuspend) {
              return;
            }
            self2._suspendTimer = null;
            self2.state = "suspending";
            var handleSuspension = function() {
              self2.state = "suspended";
              if (self2._resumeAfterSuspend) {
                delete self2._resumeAfterSuspend;
                self2._autoResume();
              }
            };
            self2.ctx.suspend().then(handleSuspension, handleSuspension);
          }, 3e4);
          return self2;
        },
        /**
         * Automatically resume the Web Audio AudioContext when a new sound is played.
         * @return {Howler}
         */
        _autoResume: function() {
          var self2 = this;
          if (!self2.ctx || typeof self2.ctx.resume === "undefined" || !Howler2.usingWebAudio) {
            return;
          }
          if (self2.state === "running" && self2.ctx.state !== "interrupted" && self2._suspendTimer) {
            clearTimeout(self2._suspendTimer);
            self2._suspendTimer = null;
          } else if (self2.state === "suspended" || self2.state === "running" && self2.ctx.state === "interrupted") {
            self2.ctx.resume().then(function() {
              self2.state = "running";
              for (var i = 0; i < self2._howls.length; i++) {
                self2._howls[i]._emit("resume");
              }
            });
            if (self2._suspendTimer) {
              clearTimeout(self2._suspendTimer);
              self2._suspendTimer = null;
            }
          } else if (self2.state === "suspending") {
            self2._resumeAfterSuspend = true;
          }
          return self2;
        }
      };
      var Howler2 = new HowlerGlobal2();
      var Howl2 = function(o) {
        var self2 = this;
        if (!o.src || o.src.length === 0) {
          console.error("An array of source files must be passed with any new Howl.");
          return;
        }
        self2.init(o);
      };
      Howl2.prototype = {
        /**
         * Initialize a new Howl group object.
         * @param  {Object} o Passed in properties for this group.
         * @return {Howl}
         */
        init: function(o) {
          var self2 = this;
          if (!Howler2.ctx) {
            setupAudioContext();
          }
          self2._autoplay = o.autoplay || false;
          self2._format = typeof o.format !== "string" ? o.format : [o.format];
          self2._html5 = o.html5 || false;
          self2._muted = o.mute || false;
          self2._loop = o.loop || false;
          self2._pool = o.pool || 5;
          self2._preload = typeof o.preload === "boolean" || o.preload === "metadata" ? o.preload : true;
          self2._rate = o.rate || 1;
          self2._sprite = o.sprite || {};
          self2._src = typeof o.src !== "string" ? o.src : [o.src];
          self2._volume = o.volume !== void 0 ? o.volume : 1;
          self2._xhr = {
            method: o.xhr && o.xhr.method ? o.xhr.method : "GET",
            headers: o.xhr && o.xhr.headers ? o.xhr.headers : null,
            withCredentials: o.xhr && o.xhr.withCredentials ? o.xhr.withCredentials : false
          };
          self2._duration = 0;
          self2._state = "unloaded";
          self2._sounds = [];
          self2._endTimers = {};
          self2._queue = [];
          self2._playLock = false;
          self2._onend = o.onend ? [{ fn: o.onend }] : [];
          self2._onfade = o.onfade ? [{ fn: o.onfade }] : [];
          self2._onload = o.onload ? [{ fn: o.onload }] : [];
          self2._onloaderror = o.onloaderror ? [{ fn: o.onloaderror }] : [];
          self2._onplayerror = o.onplayerror ? [{ fn: o.onplayerror }] : [];
          self2._onpause = o.onpause ? [{ fn: o.onpause }] : [];
          self2._onplay = o.onplay ? [{ fn: o.onplay }] : [];
          self2._onstop = o.onstop ? [{ fn: o.onstop }] : [];
          self2._onmute = o.onmute ? [{ fn: o.onmute }] : [];
          self2._onvolume = o.onvolume ? [{ fn: o.onvolume }] : [];
          self2._onrate = o.onrate ? [{ fn: o.onrate }] : [];
          self2._onseek = o.onseek ? [{ fn: o.onseek }] : [];
          self2._onunlock = o.onunlock ? [{ fn: o.onunlock }] : [];
          self2._onresume = [];
          self2._webAudio = Howler2.usingWebAudio && !self2._html5;
          if (typeof Howler2.ctx !== "undefined" && Howler2.ctx && Howler2.autoUnlock) {
            Howler2._unlockAudio();
          }
          Howler2._howls.push(self2);
          if (self2._autoplay) {
            self2._queue.push({
              event: "play",
              action: function() {
                self2.play();
              }
            });
          }
          if (self2._preload && self2._preload !== "none") {
            self2.load();
          }
          return self2;
        },
        /**
         * Load the audio file.
         * @return {Howler}
         */
        load: function() {
          var self2 = this;
          var url = null;
          if (Howler2.noAudio) {
            self2._emit("loaderror", null, "No audio support.");
            return;
          }
          if (typeof self2._src === "string") {
            self2._src = [self2._src];
          }
          for (var i = 0; i < self2._src.length; i++) {
            var ext, str;
            if (self2._format && self2._format[i]) {
              ext = self2._format[i];
            } else {
              str = self2._src[i];
              if (typeof str !== "string") {
                self2._emit("loaderror", null, "Non-string found in selected audio sources - ignoring.");
                continue;
              }
              ext = /^data:audio\/([^;,]+);/i.exec(str);
              if (!ext) {
                ext = /\.([^.]+)$/.exec(str.split("?", 1)[0]);
              }
              if (ext) {
                ext = ext[1].toLowerCase();
              }
            }
            if (!ext) {
              console.warn('No file extension was found. Consider using the "format" property or specify an extension.');
            }
            if (ext && Howler2.codecs(ext)) {
              url = self2._src[i];
              break;
            }
          }
          if (!url) {
            self2._emit("loaderror", null, "No codec support for selected audio sources.");
            return;
          }
          self2._src = url;
          self2._state = "loading";
          if (window.location.protocol === "https:" && url.slice(0, 5) === "http:") {
            self2._html5 = true;
            self2._webAudio = false;
          }
          new Sound2(self2);
          if (self2._webAudio) {
            loadBuffer(self2);
          }
          return self2;
        },
        /**
         * Play a sound or resume previous playback.
         * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Number}          Sound ID.
         */
        play: function(sprite, internal) {
          var self2 = this;
          var id = null;
          if (typeof sprite === "number") {
            id = sprite;
            sprite = null;
          } else if (typeof sprite === "string" && self2._state === "loaded" && !self2._sprite[sprite]) {
            return null;
          } else if (typeof sprite === "undefined") {
            sprite = "__default";
            if (!self2._playLock) {
              var num = 0;
              for (var i = 0; i < self2._sounds.length; i++) {
                if (self2._sounds[i]._paused && !self2._sounds[i]._ended) {
                  num++;
                  id = self2._sounds[i]._id;
                }
              }
              if (num === 1) {
                sprite = null;
              } else {
                id = null;
              }
            }
          }
          var sound2 = id ? self2._soundById(id) : self2._inactiveSound();
          if (!sound2) {
            return null;
          }
          if (id && !sprite) {
            sprite = sound2._sprite || "__default";
          }
          if (self2._state !== "loaded") {
            sound2._sprite = sprite;
            sound2._ended = false;
            var soundId = sound2._id;
            self2._queue.push({
              event: "play",
              action: function() {
                self2.play(soundId);
              }
            });
            return soundId;
          }
          if (id && !sound2._paused) {
            if (!internal) {
              self2._loadQueue("play");
            }
            return sound2._id;
          }
          if (self2._webAudio) {
            Howler2._autoResume();
          }
          var seek = Math.max(0, sound2._seek > 0 ? sound2._seek : self2._sprite[sprite][0] / 1e3);
          var duration = Math.max(0, (self2._sprite[sprite][0] + self2._sprite[sprite][1]) / 1e3 - seek);
          var timeout = duration * 1e3 / Math.abs(sound2._rate);
          var start = self2._sprite[sprite][0] / 1e3;
          var stop = (self2._sprite[sprite][0] + self2._sprite[sprite][1]) / 1e3;
          sound2._sprite = sprite;
          sound2._ended = false;
          var setParams = function() {
            sound2._paused = false;
            sound2._seek = seek;
            sound2._start = start;
            sound2._stop = stop;
            sound2._loop = !!(sound2._loop || self2._sprite[sprite][2]);
          };
          if (seek >= stop) {
            self2._ended(sound2);
            return;
          }
          var node = sound2._node;
          if (self2._webAudio) {
            var playWebAudio = function() {
              self2._playLock = false;
              setParams();
              self2._refreshBuffer(sound2);
              var vol = sound2._muted || self2._muted ? 0 : sound2._volume;
              node.gain.setValueAtTime(vol, Howler2.ctx.currentTime);
              sound2._playStart = Howler2.ctx.currentTime;
              if (typeof node.bufferSource.start === "undefined") {
                sound2._loop ? node.bufferSource.noteGrainOn(0, seek, 86400) : node.bufferSource.noteGrainOn(0, seek, duration);
              } else {
                sound2._loop ? node.bufferSource.start(0, seek, 86400) : node.bufferSource.start(0, seek, duration);
              }
              if (timeout !== Infinity) {
                self2._endTimers[sound2._id] = setTimeout(self2._ended.bind(self2, sound2), timeout);
              }
              if (!internal) {
                setTimeout(function() {
                  self2._emit("play", sound2._id);
                  self2._loadQueue();
                }, 0);
              }
            };
            if (Howler2.state === "running" && Howler2.ctx.state !== "interrupted") {
              playWebAudio();
            } else {
              self2._playLock = true;
              self2.once("resume", playWebAudio);
              self2._clearTimer(sound2._id);
            }
          } else {
            var playHtml5 = function() {
              node.currentTime = seek;
              node.muted = sound2._muted || self2._muted || Howler2._muted || node.muted;
              node.volume = sound2._volume * Howler2.volume();
              node.playbackRate = sound2._rate;
              try {
                var play = node.play();
                if (play && typeof Promise !== "undefined" && (play instanceof Promise || typeof play.then === "function")) {
                  self2._playLock = true;
                  setParams();
                  play.then(function() {
                    self2._playLock = false;
                    node._unlocked = true;
                    if (!internal) {
                      self2._emit("play", sound2._id);
                    } else {
                      self2._loadQueue();
                    }
                  }).catch(function() {
                    self2._playLock = false;
                    self2._emit("playerror", sound2._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                    sound2._ended = true;
                    sound2._paused = true;
                  });
                } else if (!internal) {
                  self2._playLock = false;
                  setParams();
                  self2._emit("play", sound2._id);
                }
                node.playbackRate = sound2._rate;
                if (node.paused) {
                  self2._emit("playerror", sound2._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                  return;
                }
                if (sprite !== "__default" || sound2._loop) {
                  self2._endTimers[sound2._id] = setTimeout(self2._ended.bind(self2, sound2), timeout);
                } else {
                  self2._endTimers[sound2._id] = function() {
                    self2._ended(sound2);
                    node.removeEventListener("ended", self2._endTimers[sound2._id], false);
                  };
                  node.addEventListener("ended", self2._endTimers[sound2._id], false);
                }
              } catch (err) {
                self2._emit("playerror", sound2._id, err);
              }
            };
            if (node.src === "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA") {
              node.src = self2._src;
              node.load();
            }
            var loadedNoReadyState = window && window.ejecta || !node.readyState && Howler2._navigator.isCocoonJS;
            if (node.readyState >= 3 || loadedNoReadyState) {
              playHtml5();
            } else {
              self2._playLock = true;
              self2._state = "loading";
              var listener = function() {
                self2._state = "loaded";
                playHtml5();
                node.removeEventListener(Howler2._canPlayEvent, listener, false);
              };
              node.addEventListener(Howler2._canPlayEvent, listener, false);
              self2._clearTimer(sound2._id);
            }
          }
          return sound2._id;
        },
        /**
         * Pause playback and save current position.
         * @param  {Number} id The sound ID (empty to pause all in group).
         * @return {Howl}
         */
        pause: function(id) {
          var self2 = this;
          if (self2._state !== "loaded" || self2._playLock) {
            self2._queue.push({
              event: "pause",
              action: function() {
                self2.pause(id);
              }
            });
            return self2;
          }
          var ids = self2._getSoundIds(id);
          for (var i = 0; i < ids.length; i++) {
            self2._clearTimer(ids[i]);
            var sound2 = self2._soundById(ids[i]);
            if (sound2 && !sound2._paused) {
              sound2._seek = self2.seek(ids[i]);
              sound2._rateSeek = 0;
              sound2._paused = true;
              self2._stopFade(ids[i]);
              if (sound2._node) {
                if (self2._webAudio) {
                  if (!sound2._node.bufferSource) {
                    continue;
                  }
                  if (typeof sound2._node.bufferSource.stop === "undefined") {
                    sound2._node.bufferSource.noteOff(0);
                  } else {
                    sound2._node.bufferSource.stop(0);
                  }
                  self2._cleanBuffer(sound2._node);
                } else if (!isNaN(sound2._node.duration) || sound2._node.duration === Infinity) {
                  sound2._node.pause();
                }
              }
            }
            if (!arguments[1]) {
              self2._emit("pause", sound2 ? sound2._id : null);
            }
          }
          return self2;
        },
        /**
         * Stop playback and reset to start.
         * @param  {Number} id The sound ID (empty to stop all in group).
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Howl}
         */
        stop: function(id, internal) {
          var self2 = this;
          if (self2._state !== "loaded" || self2._playLock) {
            self2._queue.push({
              event: "stop",
              action: function() {
                self2.stop(id);
              }
            });
            return self2;
          }
          var ids = self2._getSoundIds(id);
          for (var i = 0; i < ids.length; i++) {
            self2._clearTimer(ids[i]);
            var sound2 = self2._soundById(ids[i]);
            if (sound2) {
              sound2._seek = sound2._start || 0;
              sound2._rateSeek = 0;
              sound2._paused = true;
              sound2._ended = true;
              self2._stopFade(ids[i]);
              if (sound2._node) {
                if (self2._webAudio) {
                  if (sound2._node.bufferSource) {
                    if (typeof sound2._node.bufferSource.stop === "undefined") {
                      sound2._node.bufferSource.noteOff(0);
                    } else {
                      sound2._node.bufferSource.stop(0);
                    }
                    self2._cleanBuffer(sound2._node);
                  }
                } else if (!isNaN(sound2._node.duration) || sound2._node.duration === Infinity) {
                  sound2._node.currentTime = sound2._start || 0;
                  sound2._node.pause();
                  if (sound2._node.duration === Infinity) {
                    self2._clearSound(sound2._node);
                  }
                }
              }
              if (!internal) {
                self2._emit("stop", sound2._id);
              }
            }
          }
          return self2;
        },
        /**
         * Mute/unmute a single sound or all sounds in this Howl group.
         * @param  {Boolean} muted Set to true to mute and false to unmute.
         * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
         * @return {Howl}
         */
        mute: function(muted, id) {
          var self2 = this;
          if (self2._state !== "loaded" || self2._playLock) {
            self2._queue.push({
              event: "mute",
              action: function() {
                self2.mute(muted, id);
              }
            });
            return self2;
          }
          if (typeof id === "undefined") {
            if (typeof muted === "boolean") {
              self2._muted = muted;
            } else {
              return self2._muted;
            }
          }
          var ids = self2._getSoundIds(id);
          for (var i = 0; i < ids.length; i++) {
            var sound2 = self2._soundById(ids[i]);
            if (sound2) {
              sound2._muted = muted;
              if (sound2._interval) {
                self2._stopFade(sound2._id);
              }
              if (self2._webAudio && sound2._node) {
                sound2._node.gain.setValueAtTime(muted ? 0 : sound2._volume, Howler2.ctx.currentTime);
              } else if (sound2._node) {
                sound2._node.muted = Howler2._muted ? true : muted;
              }
              self2._emit("mute", sound2._id);
            }
          }
          return self2;
        },
        /**
         * Get/set the volume of this sound or of the Howl group. This method can optionally take 0, 1 or 2 arguments.
         *   volume() -> Returns the group's volume value.
         *   volume(id) -> Returns the sound id's current volume.
         *   volume(vol) -> Sets the volume of all sounds in this Howl group.
         *   volume(vol, id) -> Sets the volume of passed sound id.
         * @return {Howl/Number} Returns self or current volume.
         */
        volume: function() {
          var self2 = this;
          var args = arguments;
          var vol, id;
          if (args.length === 0) {
            return self2._volume;
          } else if (args.length === 1 || args.length === 2 && typeof args[1] === "undefined") {
            var ids = self2._getSoundIds();
            var index = ids.indexOf(args[0]);
            if (index >= 0) {
              id = parseInt(args[0], 10);
            } else {
              vol = parseFloat(args[0]);
            }
          } else if (args.length >= 2) {
            vol = parseFloat(args[0]);
            id = parseInt(args[1], 10);
          }
          var sound2;
          if (typeof vol !== "undefined" && vol >= 0 && vol <= 1) {
            if (self2._state !== "loaded" || self2._playLock) {
              self2._queue.push({
                event: "volume",
                action: function() {
                  self2.volume.apply(self2, args);
                }
              });
              return self2;
            }
            if (typeof id === "undefined") {
              self2._volume = vol;
            }
            id = self2._getSoundIds(id);
            for (var i = 0; i < id.length; i++) {
              sound2 = self2._soundById(id[i]);
              if (sound2) {
                sound2._volume = vol;
                if (!args[2]) {
                  self2._stopFade(id[i]);
                }
                if (self2._webAudio && sound2._node && !sound2._muted) {
                  sound2._node.gain.setValueAtTime(vol, Howler2.ctx.currentTime);
                } else if (sound2._node && !sound2._muted) {
                  sound2._node.volume = vol * Howler2.volume();
                }
                self2._emit("volume", sound2._id);
              }
            }
          } else {
            sound2 = id ? self2._soundById(id) : self2._sounds[0];
            return sound2 ? sound2._volume : 0;
          }
          return self2;
        },
        /**
         * Fade a currently playing sound between two volumes (if no id is passed, all sounds will fade).
         * @param  {Number} from The value to fade from (0.0 to 1.0).
         * @param  {Number} to   The volume to fade to (0.0 to 1.0).
         * @param  {Number} len  Time in milliseconds to fade.
         * @param  {Number} id   The sound id (omit to fade all sounds).
         * @return {Howl}
         */
        fade: function(from, to, len, id) {
          var self2 = this;
          if (self2._state !== "loaded" || self2._playLock) {
            self2._queue.push({
              event: "fade",
              action: function() {
                self2.fade(from, to, len, id);
              }
            });
            return self2;
          }
          from = Math.min(Math.max(0, parseFloat(from)), 1);
          to = Math.min(Math.max(0, parseFloat(to)), 1);
          len = parseFloat(len);
          self2.volume(from, id);
          var ids = self2._getSoundIds(id);
          for (var i = 0; i < ids.length; i++) {
            var sound2 = self2._soundById(ids[i]);
            if (sound2) {
              if (!id) {
                self2._stopFade(ids[i]);
              }
              if (self2._webAudio && !sound2._muted) {
                var currentTime = Howler2.ctx.currentTime;
                var end = currentTime + len / 1e3;
                sound2._volume = from;
                sound2._node.gain.setValueAtTime(from, currentTime);
                sound2._node.gain.linearRampToValueAtTime(to, end);
              }
              self2._startFadeInterval(sound2, from, to, len, ids[i], typeof id === "undefined");
            }
          }
          return self2;
        },
        /**
         * Starts the internal interval to fade a sound.
         * @param  {Object} sound Reference to sound to fade.
         * @param  {Number} from The value to fade from (0.0 to 1.0).
         * @param  {Number} to   The volume to fade to (0.0 to 1.0).
         * @param  {Number} len  Time in milliseconds to fade.
         * @param  {Number} id   The sound id to fade.
         * @param  {Boolean} isGroup   If true, set the volume on the group.
         */
        _startFadeInterval: function(sound2, from, to, len, id, isGroup) {
          var self2 = this;
          var vol = from;
          var diff = to - from;
          var steps = Math.abs(diff / 0.01);
          var stepLen = Math.max(4, steps > 0 ? len / steps : len);
          var lastTick = Date.now();
          sound2._fadeTo = to;
          sound2._interval = setInterval(function() {
            var tick2 = (Date.now() - lastTick) / len;
            lastTick = Date.now();
            vol += diff * tick2;
            vol = Math.round(vol * 100) / 100;
            if (diff < 0) {
              vol = Math.max(to, vol);
            } else {
              vol = Math.min(to, vol);
            }
            if (self2._webAudio) {
              sound2._volume = vol;
            } else {
              self2.volume(vol, sound2._id, true);
            }
            if (isGroup) {
              self2._volume = vol;
            }
            if (to < from && vol <= to || to > from && vol >= to) {
              clearInterval(sound2._interval);
              sound2._interval = null;
              sound2._fadeTo = null;
              self2.volume(to, sound2._id);
              self2._emit("fade", sound2._id);
            }
          }, stepLen);
        },
        /**
         * Internal method that stops the currently playing fade when
         * a new fade starts, volume is changed or the sound is stopped.
         * @param  {Number} id The sound id.
         * @return {Howl}
         */
        _stopFade: function(id) {
          var self2 = this;
          var sound2 = self2._soundById(id);
          if (sound2 && sound2._interval) {
            if (self2._webAudio) {
              sound2._node.gain.cancelScheduledValues(Howler2.ctx.currentTime);
            }
            clearInterval(sound2._interval);
            sound2._interval = null;
            self2.volume(sound2._fadeTo, id);
            sound2._fadeTo = null;
            self2._emit("fade", id);
          }
          return self2;
        },
        /**
         * Get/set the loop parameter on a sound. This method can optionally take 0, 1 or 2 arguments.
         *   loop() -> Returns the group's loop value.
         *   loop(id) -> Returns the sound id's loop value.
         *   loop(loop) -> Sets the loop value for all sounds in this Howl group.
         *   loop(loop, id) -> Sets the loop value of passed sound id.
         * @return {Howl/Boolean} Returns self or current loop value.
         */
        loop: function() {
          var self2 = this;
          var args = arguments;
          var loop2, id, sound2;
          if (args.length === 0) {
            return self2._loop;
          } else if (args.length === 1) {
            if (typeof args[0] === "boolean") {
              loop2 = args[0];
              self2._loop = loop2;
            } else {
              sound2 = self2._soundById(parseInt(args[0], 10));
              return sound2 ? sound2._loop : false;
            }
          } else if (args.length === 2) {
            loop2 = args[0];
            id = parseInt(args[1], 10);
          }
          var ids = self2._getSoundIds(id);
          for (var i = 0; i < ids.length; i++) {
            sound2 = self2._soundById(ids[i]);
            if (sound2) {
              sound2._loop = loop2;
              if (self2._webAudio && sound2._node && sound2._node.bufferSource) {
                sound2._node.bufferSource.loop = loop2;
                if (loop2) {
                  sound2._node.bufferSource.loopStart = sound2._start || 0;
                  sound2._node.bufferSource.loopEnd = sound2._stop;
                  if (self2.playing(ids[i])) {
                    self2.pause(ids[i], true);
                    self2.play(ids[i], true);
                  }
                }
              }
            }
          }
          return self2;
        },
        /**
         * Get/set the playback rate of a sound. This method can optionally take 0, 1 or 2 arguments.
         *   rate() -> Returns the first sound node's current playback rate.
         *   rate(id) -> Returns the sound id's current playback rate.
         *   rate(rate) -> Sets the playback rate of all sounds in this Howl group.
         *   rate(rate, id) -> Sets the playback rate of passed sound id.
         * @return {Howl/Number} Returns self or the current playback rate.
         */
        rate: function() {
          var self2 = this;
          var args = arguments;
          var rate, id;
          if (args.length === 0) {
            id = self2._sounds[0]._id;
          } else if (args.length === 1) {
            var ids = self2._getSoundIds();
            var index = ids.indexOf(args[0]);
            if (index >= 0) {
              id = parseInt(args[0], 10);
            } else {
              rate = parseFloat(args[0]);
            }
          } else if (args.length === 2) {
            rate = parseFloat(args[0]);
            id = parseInt(args[1], 10);
          }
          var sound2;
          if (typeof rate === "number") {
            if (self2._state !== "loaded" || self2._playLock) {
              self2._queue.push({
                event: "rate",
                action: function() {
                  self2.rate.apply(self2, args);
                }
              });
              return self2;
            }
            if (typeof id === "undefined") {
              self2._rate = rate;
            }
            id = self2._getSoundIds(id);
            for (var i = 0; i < id.length; i++) {
              sound2 = self2._soundById(id[i]);
              if (sound2) {
                if (self2.playing(id[i])) {
                  sound2._rateSeek = self2.seek(id[i]);
                  sound2._playStart = self2._webAudio ? Howler2.ctx.currentTime : sound2._playStart;
                }
                sound2._rate = rate;
                if (self2._webAudio && sound2._node && sound2._node.bufferSource) {
                  sound2._node.bufferSource.playbackRate.setValueAtTime(rate, Howler2.ctx.currentTime);
                } else if (sound2._node) {
                  sound2._node.playbackRate = rate;
                }
                var seek = self2.seek(id[i]);
                var duration = (self2._sprite[sound2._sprite][0] + self2._sprite[sound2._sprite][1]) / 1e3 - seek;
                var timeout = duration * 1e3 / Math.abs(sound2._rate);
                if (self2._endTimers[id[i]] || !sound2._paused) {
                  self2._clearTimer(id[i]);
                  self2._endTimers[id[i]] = setTimeout(self2._ended.bind(self2, sound2), timeout);
                }
                self2._emit("rate", sound2._id);
              }
            }
          } else {
            sound2 = self2._soundById(id);
            return sound2 ? sound2._rate : self2._rate;
          }
          return self2;
        },
        /**
         * Get/set the seek position of a sound. This method can optionally take 0, 1 or 2 arguments.
         *   seek() -> Returns the first sound node's current seek position.
         *   seek(id) -> Returns the sound id's current seek position.
         *   seek(seek) -> Sets the seek position of the first sound node.
         *   seek(seek, id) -> Sets the seek position of passed sound id.
         * @return {Howl/Number} Returns self or the current seek position.
         */
        seek: function() {
          var self2 = this;
          var args = arguments;
          var seek, id;
          if (args.length === 0) {
            if (self2._sounds.length) {
              id = self2._sounds[0]._id;
            }
          } else if (args.length === 1) {
            var ids = self2._getSoundIds();
            var index = ids.indexOf(args[0]);
            if (index >= 0) {
              id = parseInt(args[0], 10);
            } else if (self2._sounds.length) {
              id = self2._sounds[0]._id;
              seek = parseFloat(args[0]);
            }
          } else if (args.length === 2) {
            seek = parseFloat(args[0]);
            id = parseInt(args[1], 10);
          }
          if (typeof id === "undefined") {
            return 0;
          }
          if (typeof seek === "number" && (self2._state !== "loaded" || self2._playLock)) {
            self2._queue.push({
              event: "seek",
              action: function() {
                self2.seek.apply(self2, args);
              }
            });
            return self2;
          }
          var sound2 = self2._soundById(id);
          if (sound2) {
            if (typeof seek === "number" && seek >= 0) {
              var playing = self2.playing(id);
              if (playing) {
                self2.pause(id, true);
              }
              sound2._seek = seek;
              sound2._ended = false;
              self2._clearTimer(id);
              if (!self2._webAudio && sound2._node && !isNaN(sound2._node.duration)) {
                sound2._node.currentTime = seek;
              }
              var seekAndEmit = function() {
                if (playing) {
                  self2.play(id, true);
                }
                self2._emit("seek", id);
              };
              if (playing && !self2._webAudio) {
                var emitSeek = function() {
                  if (!self2._playLock) {
                    seekAndEmit();
                  } else {
                    setTimeout(emitSeek, 0);
                  }
                };
                setTimeout(emitSeek, 0);
              } else {
                seekAndEmit();
              }
            } else {
              if (self2._webAudio) {
                var realTime = self2.playing(id) ? Howler2.ctx.currentTime - sound2._playStart : 0;
                var rateSeek = sound2._rateSeek ? sound2._rateSeek - sound2._seek : 0;
                return sound2._seek + (rateSeek + realTime * Math.abs(sound2._rate));
              } else {
                return sound2._node.currentTime;
              }
            }
          }
          return self2;
        },
        /**
         * Check if a specific sound is currently playing or not (if id is provided), or check if at least one of the sounds in the group is playing or not.
         * @param  {Number}  id The sound id to check. If none is passed, the whole sound group is checked.
         * @return {Boolean} True if playing and false if not.
         */
        playing: function(id) {
          var self2 = this;
          if (typeof id === "number") {
            var sound2 = self2._soundById(id);
            return sound2 ? !sound2._paused : false;
          }
          for (var i = 0; i < self2._sounds.length; i++) {
            if (!self2._sounds[i]._paused) {
              return true;
            }
          }
          return false;
        },
        /**
         * Get the duration of this sound. Passing a sound id will return the sprite duration.
         * @param  {Number} id The sound id to check. If none is passed, return full source duration.
         * @return {Number} Audio duration in seconds.
         */
        duration: function(id) {
          var self2 = this;
          var duration = self2._duration;
          var sound2 = self2._soundById(id);
          if (sound2) {
            duration = self2._sprite[sound2._sprite][1] / 1e3;
          }
          return duration;
        },
        /**
         * Returns the current loaded state of this Howl.
         * @return {String} 'unloaded', 'loading', 'loaded'
         */
        state: function() {
          return this._state;
        },
        /**
         * Unload and destroy the current Howl object.
         * This will immediately stop all sound instances attached to this group.
         */
        unload: function() {
          var self2 = this;
          var sounds = self2._sounds;
          for (var i = 0; i < sounds.length; i++) {
            if (!sounds[i]._paused) {
              self2.stop(sounds[i]._id);
            }
            if (!self2._webAudio) {
              self2._clearSound(sounds[i]._node);
              sounds[i]._node.removeEventListener("error", sounds[i]._errorFn, false);
              sounds[i]._node.removeEventListener(Howler2._canPlayEvent, sounds[i]._loadFn, false);
              sounds[i]._node.removeEventListener("ended", sounds[i]._endFn, false);
              Howler2._releaseHtml5Audio(sounds[i]._node);
            }
            delete sounds[i]._node;
            self2._clearTimer(sounds[i]._id);
          }
          var index = Howler2._howls.indexOf(self2);
          if (index >= 0) {
            Howler2._howls.splice(index, 1);
          }
          var remCache = true;
          for (i = 0; i < Howler2._howls.length; i++) {
            if (Howler2._howls[i]._src === self2._src || self2._src.indexOf(Howler2._howls[i]._src) >= 0) {
              remCache = false;
              break;
            }
          }
          if (cache2 && remCache) {
            delete cache2[self2._src];
          }
          Howler2.noAudio = false;
          self2._state = "unloaded";
          self2._sounds = [];
          self2 = null;
          return null;
        },
        /**
         * Listen to a custom event.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to call.
         * @param  {Number}   id    (optional) Only listen to events for this sound.
         * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
         * @return {Howl}
         */
        on: function(event2, fn, id, once) {
          var self2 = this;
          var events = self2["_on" + event2];
          if (typeof fn === "function") {
            events.push(once ? { id, fn, once } : { id, fn });
          }
          return self2;
        },
        /**
         * Remove a custom event. Call without parameters to remove all events.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to remove. Leave empty to remove all.
         * @param  {Number}   id    (optional) Only remove events for this sound.
         * @return {Howl}
         */
        off: function(event2, fn, id) {
          var self2 = this;
          var events = self2["_on" + event2];
          var i = 0;
          if (typeof fn === "number") {
            id = fn;
            fn = null;
          }
          if (fn || id) {
            for (i = 0; i < events.length; i++) {
              var isId = id === events[i].id;
              if (fn === events[i].fn && isId || !fn && isId) {
                events.splice(i, 1);
                break;
              }
            }
          } else if (event2) {
            self2["_on" + event2] = [];
          } else {
            var keys = Object.keys(self2);
            for (i = 0; i < keys.length; i++) {
              if (keys[i].indexOf("_on") === 0 && Array.isArray(self2[keys[i]])) {
                self2[keys[i]] = [];
              }
            }
          }
          return self2;
        },
        /**
         * Listen to a custom event and remove it once fired.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to call.
         * @param  {Number}   id    (optional) Only listen to events for this sound.
         * @return {Howl}
         */
        once: function(event2, fn, id) {
          var self2 = this;
          self2.on(event2, fn, id, 1);
          return self2;
        },
        /**
         * Emit all events of a specific type and pass the sound id.
         * @param  {String} event Event name.
         * @param  {Number} id    Sound ID.
         * @param  {Number} msg   Message to go with event.
         * @return {Howl}
         */
        _emit: function(event2, id, msg) {
          var self2 = this;
          var events = self2["_on" + event2];
          for (var i = events.length - 1; i >= 0; i--) {
            if (!events[i].id || events[i].id === id || event2 === "load") {
              setTimeout(function(fn) {
                fn.call(this, id, msg);
              }.bind(self2, events[i].fn), 0);
              if (events[i].once) {
                self2.off(event2, events[i].fn, events[i].id);
              }
            }
          }
          self2._loadQueue(event2);
          return self2;
        },
        /**
         * Queue of actions initiated before the sound has loaded.
         * These will be called in sequence, with the next only firing
         * after the previous has finished executing (even if async like play).
         * @return {Howl}
         */
        _loadQueue: function(event2) {
          var self2 = this;
          if (self2._queue.length > 0) {
            var task = self2._queue[0];
            if (task.event === event2) {
              self2._queue.shift();
              self2._loadQueue();
            }
            if (!event2) {
              task.action();
            }
          }
          return self2;
        },
        /**
         * Fired when playback ends at the end of the duration.
         * @param  {Sound} sound The sound object to work with.
         * @return {Howl}
         */
        _ended: function(sound2) {
          var self2 = this;
          var sprite = sound2._sprite;
          if (!self2._webAudio && sound2._node && !sound2._node.paused && !sound2._node.ended && sound2._node.currentTime < sound2._stop) {
            setTimeout(self2._ended.bind(self2, sound2), 100);
            return self2;
          }
          var loop2 = !!(sound2._loop || self2._sprite[sprite][2]);
          self2._emit("end", sound2._id);
          if (!self2._webAudio && loop2) {
            self2.stop(sound2._id, true).play(sound2._id);
          }
          if (self2._webAudio && loop2) {
            self2._emit("play", sound2._id);
            sound2._seek = sound2._start || 0;
            sound2._rateSeek = 0;
            sound2._playStart = Howler2.ctx.currentTime;
            var timeout = (sound2._stop - sound2._start) * 1e3 / Math.abs(sound2._rate);
            self2._endTimers[sound2._id] = setTimeout(self2._ended.bind(self2, sound2), timeout);
          }
          if (self2._webAudio && !loop2) {
            sound2._paused = true;
            sound2._ended = true;
            sound2._seek = sound2._start || 0;
            sound2._rateSeek = 0;
            self2._clearTimer(sound2._id);
            self2._cleanBuffer(sound2._node);
            Howler2._autoSuspend();
          }
          if (!self2._webAudio && !loop2) {
            self2.stop(sound2._id, true);
          }
          return self2;
        },
        /**
         * Clear the end timer for a sound playback.
         * @param  {Number} id The sound ID.
         * @return {Howl}
         */
        _clearTimer: function(id) {
          var self2 = this;
          if (self2._endTimers[id]) {
            if (typeof self2._endTimers[id] !== "function") {
              clearTimeout(self2._endTimers[id]);
            } else {
              var sound2 = self2._soundById(id);
              if (sound2 && sound2._node) {
                sound2._node.removeEventListener("ended", self2._endTimers[id], false);
              }
            }
            delete self2._endTimers[id];
          }
          return self2;
        },
        /**
         * Return the sound identified by this ID, or return null.
         * @param  {Number} id Sound ID
         * @return {Object}    Sound object or null.
         */
        _soundById: function(id) {
          var self2 = this;
          for (var i = 0; i < self2._sounds.length; i++) {
            if (id === self2._sounds[i]._id) {
              return self2._sounds[i];
            }
          }
          return null;
        },
        /**
         * Return an inactive sound from the pool or create a new one.
         * @return {Sound} Sound playback object.
         */
        _inactiveSound: function() {
          var self2 = this;
          self2._drain();
          for (var i = 0; i < self2._sounds.length; i++) {
            if (self2._sounds[i]._ended) {
              return self2._sounds[i].reset();
            }
          }
          return new Sound2(self2);
        },
        /**
         * Drain excess inactive sounds from the pool.
         */
        _drain: function() {
          var self2 = this;
          var limit = self2._pool;
          var cnt = 0;
          var i = 0;
          if (self2._sounds.length < limit) {
            return;
          }
          for (i = 0; i < self2._sounds.length; i++) {
            if (self2._sounds[i]._ended) {
              cnt++;
            }
          }
          for (i = self2._sounds.length - 1; i >= 0; i--) {
            if (cnt <= limit) {
              return;
            }
            if (self2._sounds[i]._ended) {
              if (self2._webAudio && self2._sounds[i]._node) {
                self2._sounds[i]._node.disconnect(0);
              }
              self2._sounds.splice(i, 1);
              cnt--;
            }
          }
        },
        /**
         * Get all ID's from the sounds pool.
         * @param  {Number} id Only return one ID if one is passed.
         * @return {Array}    Array of IDs.
         */
        _getSoundIds: function(id) {
          var self2 = this;
          if (typeof id === "undefined") {
            var ids = [];
            for (var i = 0; i < self2._sounds.length; i++) {
              ids.push(self2._sounds[i]._id);
            }
            return ids;
          } else {
            return [id];
          }
        },
        /**
         * Load the sound back into the buffer source.
         * @param  {Sound} sound The sound object to work with.
         * @return {Howl}
         */
        _refreshBuffer: function(sound2) {
          var self2 = this;
          sound2._node.bufferSource = Howler2.ctx.createBufferSource();
          sound2._node.bufferSource.buffer = cache2[self2._src];
          if (sound2._panner) {
            sound2._node.bufferSource.connect(sound2._panner);
          } else {
            sound2._node.bufferSource.connect(sound2._node);
          }
          sound2._node.bufferSource.loop = sound2._loop;
          if (sound2._loop) {
            sound2._node.bufferSource.loopStart = sound2._start || 0;
            sound2._node.bufferSource.loopEnd = sound2._stop || 0;
          }
          sound2._node.bufferSource.playbackRate.setValueAtTime(sound2._rate, Howler2.ctx.currentTime);
          return self2;
        },
        /**
         * Prevent memory leaks by cleaning up the buffer source after playback.
         * @param  {Object} node Sound's audio node containing the buffer source.
         * @return {Howl}
         */
        _cleanBuffer: function(node) {
          var self2 = this;
          var isIOS = Howler2._navigator && Howler2._navigator.vendor.indexOf("Apple") >= 0;
          if (!node.bufferSource) {
            return self2;
          }
          if (Howler2._scratchBuffer && node.bufferSource) {
            node.bufferSource.onended = null;
            node.bufferSource.disconnect(0);
            if (isIOS) {
              try {
                node.bufferSource.buffer = Howler2._scratchBuffer;
              } catch (e) {
              }
            }
          }
          node.bufferSource = null;
          return self2;
        },
        /**
         * Set the source to a 0-second silence to stop any downloading (except in IE).
         * @param  {Object} node Audio node to clear.
         */
        _clearSound: function(node) {
          var checkIE = /MSIE |Trident\//.test(Howler2._navigator && Howler2._navigator.userAgent);
          if (!checkIE) {
            node.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
          }
        }
      };
      var Sound2 = function(howl) {
        this._parent = howl;
        this.init();
      };
      Sound2.prototype = {
        /**
         * Initialize a new Sound object.
         * @return {Sound}
         */
        init: function() {
          var self2 = this;
          var parent = self2._parent;
          self2._muted = parent._muted;
          self2._loop = parent._loop;
          self2._volume = parent._volume;
          self2._rate = parent._rate;
          self2._seek = 0;
          self2._paused = true;
          self2._ended = true;
          self2._sprite = "__default";
          self2._id = ++Howler2._counter;
          parent._sounds.push(self2);
          self2.create();
          return self2;
        },
        /**
         * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
         * @return {Sound}
         */
        create: function() {
          var self2 = this;
          var parent = self2._parent;
          var volume = Howler2._muted || self2._muted || self2._parent._muted ? 0 : self2._volume;
          if (parent._webAudio) {
            self2._node = typeof Howler2.ctx.createGain === "undefined" ? Howler2.ctx.createGainNode() : Howler2.ctx.createGain();
            self2._node.gain.setValueAtTime(volume, Howler2.ctx.currentTime);
            self2._node.paused = true;
            self2._node.connect(Howler2.masterGain);
          } else if (!Howler2.noAudio) {
            self2._node = Howler2._obtainHtml5Audio();
            self2._errorFn = self2._errorListener.bind(self2);
            self2._node.addEventListener("error", self2._errorFn, false);
            self2._loadFn = self2._loadListener.bind(self2);
            self2._node.addEventListener(Howler2._canPlayEvent, self2._loadFn, false);
            self2._endFn = self2._endListener.bind(self2);
            self2._node.addEventListener("ended", self2._endFn, false);
            self2._node.src = parent._src;
            self2._node.preload = parent._preload === true ? "auto" : parent._preload;
            self2._node.volume = volume * Howler2.volume();
            self2._node.load();
          }
          return self2;
        },
        /**
         * Reset the parameters of this sound to the original state (for recycle).
         * @return {Sound}
         */
        reset: function() {
          var self2 = this;
          var parent = self2._parent;
          self2._muted = parent._muted;
          self2._loop = parent._loop;
          self2._volume = parent._volume;
          self2._rate = parent._rate;
          self2._seek = 0;
          self2._rateSeek = 0;
          self2._paused = true;
          self2._ended = true;
          self2._sprite = "__default";
          self2._id = ++Howler2._counter;
          return self2;
        },
        /**
         * HTML5 Audio error listener callback.
         */
        _errorListener: function() {
          var self2 = this;
          self2._parent._emit("loaderror", self2._id, self2._node.error ? self2._node.error.code : 0);
          self2._node.removeEventListener("error", self2._errorFn, false);
        },
        /**
         * HTML5 Audio canplaythrough listener callback.
         */
        _loadListener: function() {
          var self2 = this;
          var parent = self2._parent;
          parent._duration = Math.ceil(self2._node.duration * 10) / 10;
          if (Object.keys(parent._sprite).length === 0) {
            parent._sprite = { __default: [0, parent._duration * 1e3] };
          }
          if (parent._state !== "loaded") {
            parent._state = "loaded";
            parent._emit("load");
            parent._loadQueue();
          }
          self2._node.removeEventListener(Howler2._canPlayEvent, self2._loadFn, false);
        },
        /**
         * HTML5 Audio ended listener callback.
         */
        _endListener: function() {
          var self2 = this;
          var parent = self2._parent;
          if (parent._duration === Infinity) {
            parent._duration = Math.ceil(self2._node.duration * 10) / 10;
            if (parent._sprite.__default[1] === Infinity) {
              parent._sprite.__default[1] = parent._duration * 1e3;
            }
            parent._ended(self2);
          }
          self2._node.removeEventListener("ended", self2._endFn, false);
        }
      };
      var cache2 = {};
      var loadBuffer = function(self2) {
        var url = self2._src;
        if (cache2[url]) {
          self2._duration = cache2[url].duration;
          loadSound(self2);
          return;
        }
        if (/^data:[^;]+;base64,/.test(url)) {
          var data = atob(url.split(",")[1]);
          var dataView = new Uint8Array(data.length);
          for (var i = 0; i < data.length; ++i) {
            dataView[i] = data.charCodeAt(i);
          }
          decodeAudioData(dataView.buffer, self2);
        } else {
          var xhr = new XMLHttpRequest();
          xhr.open(self2._xhr.method, url, true);
          xhr.withCredentials = self2._xhr.withCredentials;
          xhr.responseType = "arraybuffer";
          if (self2._xhr.headers) {
            Object.keys(self2._xhr.headers).forEach(function(key) {
              xhr.setRequestHeader(key, self2._xhr.headers[key]);
            });
          }
          xhr.onload = function() {
            var code = (xhr.status + "")[0];
            if (code !== "0" && code !== "2" && code !== "3") {
              self2._emit("loaderror", null, "Failed loading audio file with status: " + xhr.status + ".");
              return;
            }
            decodeAudioData(xhr.response, self2);
          };
          xhr.onerror = function() {
            if (self2._webAudio) {
              self2._html5 = true;
              self2._webAudio = false;
              self2._sounds = [];
              delete cache2[url];
              self2.load();
            }
          };
          safeXhrSend(xhr);
        }
      };
      var safeXhrSend = function(xhr) {
        try {
          xhr.send();
        } catch (e) {
          xhr.onerror();
        }
      };
      var decodeAudioData = function(arraybuffer, self2) {
        var error = function() {
          self2._emit("loaderror", null, "Decoding audio data failed.");
        };
        var success = function(buffer) {
          if (buffer && self2._sounds.length > 0) {
            cache2[self2._src] = buffer;
            loadSound(self2, buffer);
          } else {
            error();
          }
        };
        if (typeof Promise !== "undefined" && Howler2.ctx.decodeAudioData.length === 1) {
          Howler2.ctx.decodeAudioData(arraybuffer).then(success).catch(error);
        } else {
          Howler2.ctx.decodeAudioData(arraybuffer, success, error);
        }
      };
      var loadSound = function(self2, buffer) {
        if (buffer && !self2._duration) {
          self2._duration = buffer.duration;
        }
        if (Object.keys(self2._sprite).length === 0) {
          self2._sprite = { __default: [0, self2._duration * 1e3] };
        }
        if (self2._state !== "loaded") {
          self2._state = "loaded";
          self2._emit("load");
          self2._loadQueue();
        }
      };
      var setupAudioContext = function() {
        if (!Howler2.usingWebAudio) {
          return;
        }
        try {
          if (typeof AudioContext !== "undefined") {
            Howler2.ctx = new AudioContext();
          } else if (typeof webkitAudioContext !== "undefined") {
            Howler2.ctx = new webkitAudioContext();
          } else {
            Howler2.usingWebAudio = false;
          }
        } catch (e) {
          Howler2.usingWebAudio = false;
        }
        if (!Howler2.ctx) {
          Howler2.usingWebAudio = false;
        }
        var iOS = /iP(hone|od|ad)/.test(Howler2._navigator && Howler2._navigator.platform);
        var appVersion = Howler2._navigator && Howler2._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
        var version2 = appVersion ? parseInt(appVersion[1], 10) : null;
        if (iOS && version2 && version2 < 9) {
          var safari = /safari/.test(Howler2._navigator && Howler2._navigator.userAgent.toLowerCase());
          if (Howler2._navigator && !safari) {
            Howler2.usingWebAudio = false;
          }
        }
        if (Howler2.usingWebAudio) {
          Howler2.masterGain = typeof Howler2.ctx.createGain === "undefined" ? Howler2.ctx.createGainNode() : Howler2.ctx.createGain();
          Howler2.masterGain.gain.setValueAtTime(Howler2._muted ? 0 : Howler2._volume, Howler2.ctx.currentTime);
          Howler2.masterGain.connect(Howler2.ctx.destination);
        }
        Howler2._setup();
      };
      {
        exports.Howler = Howler2;
        exports.Howl = Howl2;
      }
      if (typeof commonjsGlobal !== "undefined") {
        commonjsGlobal.HowlerGlobal = HowlerGlobal2;
        commonjsGlobal.Howler = Howler2;
        commonjsGlobal.Howl = Howl2;
        commonjsGlobal.Sound = Sound2;
      } else if (typeof window !== "undefined") {
        window.HowlerGlobal = HowlerGlobal2;
        window.Howler = Howler2;
        window.Howl = Howl2;
        window.Sound = Sound2;
      }
    })();
    /*!
     *  Spatial Plugin - Adds support for stereo and 3D audio where Web Audio is supported.
     *  
     *  howler.js v2.2.4
     *  howlerjs.com
     *
     *  (c) 2013-2020, James Simpson of GoldFire Studios
     *  goldfirestudios.com
     *
     *  MIT License
     */
    (function() {
      HowlerGlobal.prototype._pos = [0, 0, 0];
      HowlerGlobal.prototype._orientation = [0, 0, -1, 0, 1, 0];
      HowlerGlobal.prototype.stereo = function(pan) {
        var self2 = this;
        if (!self2.ctx || !self2.ctx.listener) {
          return self2;
        }
        for (var i = self2._howls.length - 1; i >= 0; i--) {
          self2._howls[i].stereo(pan);
        }
        return self2;
      };
      HowlerGlobal.prototype.pos = function(x, y, z) {
        var self2 = this;
        if (!self2.ctx || !self2.ctx.listener) {
          return self2;
        }
        y = typeof y !== "number" ? self2._pos[1] : y;
        z = typeof z !== "number" ? self2._pos[2] : z;
        if (typeof x === "number") {
          self2._pos = [x, y, z];
          if (typeof self2.ctx.listener.positionX !== "undefined") {
            self2.ctx.listener.positionX.setTargetAtTime(self2._pos[0], Howler.ctx.currentTime, 0.1);
            self2.ctx.listener.positionY.setTargetAtTime(self2._pos[1], Howler.ctx.currentTime, 0.1);
            self2.ctx.listener.positionZ.setTargetAtTime(self2._pos[2], Howler.ctx.currentTime, 0.1);
          } else {
            self2.ctx.listener.setPosition(self2._pos[0], self2._pos[1], self2._pos[2]);
          }
        } else {
          return self2._pos;
        }
        return self2;
      };
      HowlerGlobal.prototype.orientation = function(x, y, z, xUp, yUp, zUp) {
        var self2 = this;
        if (!self2.ctx || !self2.ctx.listener) {
          return self2;
        }
        var or = self2._orientation;
        y = typeof y !== "number" ? or[1] : y;
        z = typeof z !== "number" ? or[2] : z;
        xUp = typeof xUp !== "number" ? or[3] : xUp;
        yUp = typeof yUp !== "number" ? or[4] : yUp;
        zUp = typeof zUp !== "number" ? or[5] : zUp;
        if (typeof x === "number") {
          self2._orientation = [x, y, z, xUp, yUp, zUp];
          if (typeof self2.ctx.listener.forwardX !== "undefined") {
            self2.ctx.listener.forwardX.setTargetAtTime(x, Howler.ctx.currentTime, 0.1);
            self2.ctx.listener.forwardY.setTargetAtTime(y, Howler.ctx.currentTime, 0.1);
            self2.ctx.listener.forwardZ.setTargetAtTime(z, Howler.ctx.currentTime, 0.1);
            self2.ctx.listener.upX.setTargetAtTime(xUp, Howler.ctx.currentTime, 0.1);
            self2.ctx.listener.upY.setTargetAtTime(yUp, Howler.ctx.currentTime, 0.1);
            self2.ctx.listener.upZ.setTargetAtTime(zUp, Howler.ctx.currentTime, 0.1);
          } else {
            self2.ctx.listener.setOrientation(x, y, z, xUp, yUp, zUp);
          }
        } else {
          return or;
        }
        return self2;
      };
      Howl.prototype.init = /* @__PURE__ */ function(_super) {
        return function(o) {
          var self2 = this;
          self2._orientation = o.orientation || [1, 0, 0];
          self2._stereo = o.stereo || null;
          self2._pos = o.pos || null;
          self2._pannerAttr = {
            coneInnerAngle: typeof o.coneInnerAngle !== "undefined" ? o.coneInnerAngle : 360,
            coneOuterAngle: typeof o.coneOuterAngle !== "undefined" ? o.coneOuterAngle : 360,
            coneOuterGain: typeof o.coneOuterGain !== "undefined" ? o.coneOuterGain : 0,
            distanceModel: typeof o.distanceModel !== "undefined" ? o.distanceModel : "inverse",
            maxDistance: typeof o.maxDistance !== "undefined" ? o.maxDistance : 1e4,
            panningModel: typeof o.panningModel !== "undefined" ? o.panningModel : "HRTF",
            refDistance: typeof o.refDistance !== "undefined" ? o.refDistance : 1,
            rolloffFactor: typeof o.rolloffFactor !== "undefined" ? o.rolloffFactor : 1
          };
          self2._onstereo = o.onstereo ? [{ fn: o.onstereo }] : [];
          self2._onpos = o.onpos ? [{ fn: o.onpos }] : [];
          self2._onorientation = o.onorientation ? [{ fn: o.onorientation }] : [];
          return _super.call(this, o);
        };
      }(Howl.prototype.init);
      Howl.prototype.stereo = function(pan, id) {
        var self2 = this;
        if (!self2._webAudio) {
          return self2;
        }
        if (self2._state !== "loaded") {
          self2._queue.push({
            event: "stereo",
            action: function() {
              self2.stereo(pan, id);
            }
          });
          return self2;
        }
        var pannerType = typeof Howler.ctx.createStereoPanner === "undefined" ? "spatial" : "stereo";
        if (typeof id === "undefined") {
          if (typeof pan === "number") {
            self2._stereo = pan;
            self2._pos = [pan, 0, 0];
          } else {
            return self2._stereo;
          }
        }
        var ids = self2._getSoundIds(id);
        for (var i = 0; i < ids.length; i++) {
          var sound2 = self2._soundById(ids[i]);
          if (sound2) {
            if (typeof pan === "number") {
              sound2._stereo = pan;
              sound2._pos = [pan, 0, 0];
              if (sound2._node) {
                sound2._pannerAttr.panningModel = "equalpower";
                if (!sound2._panner || !sound2._panner.pan) {
                  setupPanner(sound2, pannerType);
                }
                if (pannerType === "spatial") {
                  if (typeof sound2._panner.positionX !== "undefined") {
                    sound2._panner.positionX.setValueAtTime(pan, Howler.ctx.currentTime);
                    sound2._panner.positionY.setValueAtTime(0, Howler.ctx.currentTime);
                    sound2._panner.positionZ.setValueAtTime(0, Howler.ctx.currentTime);
                  } else {
                    sound2._panner.setPosition(pan, 0, 0);
                  }
                } else {
                  sound2._panner.pan.setValueAtTime(pan, Howler.ctx.currentTime);
                }
              }
              self2._emit("stereo", sound2._id);
            } else {
              return sound2._stereo;
            }
          }
        }
        return self2;
      };
      Howl.prototype.pos = function(x, y, z, id) {
        var self2 = this;
        if (!self2._webAudio) {
          return self2;
        }
        if (self2._state !== "loaded") {
          self2._queue.push({
            event: "pos",
            action: function() {
              self2.pos(x, y, z, id);
            }
          });
          return self2;
        }
        y = typeof y !== "number" ? 0 : y;
        z = typeof z !== "number" ? -0.5 : z;
        if (typeof id === "undefined") {
          if (typeof x === "number") {
            self2._pos = [x, y, z];
          } else {
            return self2._pos;
          }
        }
        var ids = self2._getSoundIds(id);
        for (var i = 0; i < ids.length; i++) {
          var sound2 = self2._soundById(ids[i]);
          if (sound2) {
            if (typeof x === "number") {
              sound2._pos = [x, y, z];
              if (sound2._node) {
                if (!sound2._panner || sound2._panner.pan) {
                  setupPanner(sound2, "spatial");
                }
                if (typeof sound2._panner.positionX !== "undefined") {
                  sound2._panner.positionX.setValueAtTime(x, Howler.ctx.currentTime);
                  sound2._panner.positionY.setValueAtTime(y, Howler.ctx.currentTime);
                  sound2._panner.positionZ.setValueAtTime(z, Howler.ctx.currentTime);
                } else {
                  sound2._panner.setPosition(x, y, z);
                }
              }
              self2._emit("pos", sound2._id);
            } else {
              return sound2._pos;
            }
          }
        }
        return self2;
      };
      Howl.prototype.orientation = function(x, y, z, id) {
        var self2 = this;
        if (!self2._webAudio) {
          return self2;
        }
        if (self2._state !== "loaded") {
          self2._queue.push({
            event: "orientation",
            action: function() {
              self2.orientation(x, y, z, id);
            }
          });
          return self2;
        }
        y = typeof y !== "number" ? self2._orientation[1] : y;
        z = typeof z !== "number" ? self2._orientation[2] : z;
        if (typeof id === "undefined") {
          if (typeof x === "number") {
            self2._orientation = [x, y, z];
          } else {
            return self2._orientation;
          }
        }
        var ids = self2._getSoundIds(id);
        for (var i = 0; i < ids.length; i++) {
          var sound2 = self2._soundById(ids[i]);
          if (sound2) {
            if (typeof x === "number") {
              sound2._orientation = [x, y, z];
              if (sound2._node) {
                if (!sound2._panner) {
                  if (!sound2._pos) {
                    sound2._pos = self2._pos || [0, 0, -0.5];
                  }
                  setupPanner(sound2, "spatial");
                }
                if (typeof sound2._panner.orientationX !== "undefined") {
                  sound2._panner.orientationX.setValueAtTime(x, Howler.ctx.currentTime);
                  sound2._panner.orientationY.setValueAtTime(y, Howler.ctx.currentTime);
                  sound2._panner.orientationZ.setValueAtTime(z, Howler.ctx.currentTime);
                } else {
                  sound2._panner.setOrientation(x, y, z);
                }
              }
              self2._emit("orientation", sound2._id);
            } else {
              return sound2._orientation;
            }
          }
        }
        return self2;
      };
      Howl.prototype.pannerAttr = function() {
        var self2 = this;
        var args = arguments;
        var o, id, sound2;
        if (!self2._webAudio) {
          return self2;
        }
        if (args.length === 0) {
          return self2._pannerAttr;
        } else if (args.length === 1) {
          if (typeof args[0] === "object") {
            o = args[0];
            if (typeof id === "undefined") {
              if (!o.pannerAttr) {
                o.pannerAttr = {
                  coneInnerAngle: o.coneInnerAngle,
                  coneOuterAngle: o.coneOuterAngle,
                  coneOuterGain: o.coneOuterGain,
                  distanceModel: o.distanceModel,
                  maxDistance: o.maxDistance,
                  refDistance: o.refDistance,
                  rolloffFactor: o.rolloffFactor,
                  panningModel: o.panningModel
                };
              }
              self2._pannerAttr = {
                coneInnerAngle: typeof o.pannerAttr.coneInnerAngle !== "undefined" ? o.pannerAttr.coneInnerAngle : self2._coneInnerAngle,
                coneOuterAngle: typeof o.pannerAttr.coneOuterAngle !== "undefined" ? o.pannerAttr.coneOuterAngle : self2._coneOuterAngle,
                coneOuterGain: typeof o.pannerAttr.coneOuterGain !== "undefined" ? o.pannerAttr.coneOuterGain : self2._coneOuterGain,
                distanceModel: typeof o.pannerAttr.distanceModel !== "undefined" ? o.pannerAttr.distanceModel : self2._distanceModel,
                maxDistance: typeof o.pannerAttr.maxDistance !== "undefined" ? o.pannerAttr.maxDistance : self2._maxDistance,
                refDistance: typeof o.pannerAttr.refDistance !== "undefined" ? o.pannerAttr.refDistance : self2._refDistance,
                rolloffFactor: typeof o.pannerAttr.rolloffFactor !== "undefined" ? o.pannerAttr.rolloffFactor : self2._rolloffFactor,
                panningModel: typeof o.pannerAttr.panningModel !== "undefined" ? o.pannerAttr.panningModel : self2._panningModel
              };
            }
          } else {
            sound2 = self2._soundById(parseInt(args[0], 10));
            return sound2 ? sound2._pannerAttr : self2._pannerAttr;
          }
        } else if (args.length === 2) {
          o = args[0];
          id = parseInt(args[1], 10);
        }
        var ids = self2._getSoundIds(id);
        for (var i = 0; i < ids.length; i++) {
          sound2 = self2._soundById(ids[i]);
          if (sound2) {
            var pa = sound2._pannerAttr;
            pa = {
              coneInnerAngle: typeof o.coneInnerAngle !== "undefined" ? o.coneInnerAngle : pa.coneInnerAngle,
              coneOuterAngle: typeof o.coneOuterAngle !== "undefined" ? o.coneOuterAngle : pa.coneOuterAngle,
              coneOuterGain: typeof o.coneOuterGain !== "undefined" ? o.coneOuterGain : pa.coneOuterGain,
              distanceModel: typeof o.distanceModel !== "undefined" ? o.distanceModel : pa.distanceModel,
              maxDistance: typeof o.maxDistance !== "undefined" ? o.maxDistance : pa.maxDistance,
              refDistance: typeof o.refDistance !== "undefined" ? o.refDistance : pa.refDistance,
              rolloffFactor: typeof o.rolloffFactor !== "undefined" ? o.rolloffFactor : pa.rolloffFactor,
              panningModel: typeof o.panningModel !== "undefined" ? o.panningModel : pa.panningModel
            };
            var panner = sound2._panner;
            if (!panner) {
              if (!sound2._pos) {
                sound2._pos = self2._pos || [0, 0, -0.5];
              }
              setupPanner(sound2, "spatial");
              panner = sound2._panner;
            }
            panner.coneInnerAngle = pa.coneInnerAngle;
            panner.coneOuterAngle = pa.coneOuterAngle;
            panner.coneOuterGain = pa.coneOuterGain;
            panner.distanceModel = pa.distanceModel;
            panner.maxDistance = pa.maxDistance;
            panner.refDistance = pa.refDistance;
            panner.rolloffFactor = pa.rolloffFactor;
            panner.panningModel = pa.panningModel;
          }
        }
        return self2;
      };
      Sound.prototype.init = /* @__PURE__ */ function(_super) {
        return function() {
          var self2 = this;
          var parent = self2._parent;
          self2._orientation = parent._orientation;
          self2._stereo = parent._stereo;
          self2._pos = parent._pos;
          self2._pannerAttr = parent._pannerAttr;
          _super.call(this);
          if (self2._stereo) {
            parent.stereo(self2._stereo);
          } else if (self2._pos) {
            parent.pos(self2._pos[0], self2._pos[1], self2._pos[2], self2._id);
          }
        };
      }(Sound.prototype.init);
      Sound.prototype.reset = /* @__PURE__ */ function(_super) {
        return function() {
          var self2 = this;
          var parent = self2._parent;
          self2._orientation = parent._orientation;
          self2._stereo = parent._stereo;
          self2._pos = parent._pos;
          self2._pannerAttr = parent._pannerAttr;
          if (self2._stereo) {
            parent.stereo(self2._stereo);
          } else if (self2._pos) {
            parent.pos(self2._pos[0], self2._pos[1], self2._pos[2], self2._id);
          } else if (self2._panner) {
            self2._panner.disconnect(0);
            self2._panner = void 0;
            parent._refreshBuffer(self2);
          }
          return _super.call(this);
        };
      }(Sound.prototype.reset);
      var setupPanner = function(sound2, type) {
        type = type || "spatial";
        if (type === "spatial") {
          sound2._panner = Howler.ctx.createPanner();
          sound2._panner.coneInnerAngle = sound2._pannerAttr.coneInnerAngle;
          sound2._panner.coneOuterAngle = sound2._pannerAttr.coneOuterAngle;
          sound2._panner.coneOuterGain = sound2._pannerAttr.coneOuterGain;
          sound2._panner.distanceModel = sound2._pannerAttr.distanceModel;
          sound2._panner.maxDistance = sound2._pannerAttr.maxDistance;
          sound2._panner.refDistance = sound2._pannerAttr.refDistance;
          sound2._panner.rolloffFactor = sound2._pannerAttr.rolloffFactor;
          sound2._panner.panningModel = sound2._pannerAttr.panningModel;
          if (typeof sound2._panner.positionX !== "undefined") {
            sound2._panner.positionX.setValueAtTime(sound2._pos[0], Howler.ctx.currentTime);
            sound2._panner.positionY.setValueAtTime(sound2._pos[1], Howler.ctx.currentTime);
            sound2._panner.positionZ.setValueAtTime(sound2._pos[2], Howler.ctx.currentTime);
          } else {
            sound2._panner.setPosition(sound2._pos[0], sound2._pos[1], sound2._pos[2]);
          }
          if (typeof sound2._panner.orientationX !== "undefined") {
            sound2._panner.orientationX.setValueAtTime(sound2._orientation[0], Howler.ctx.currentTime);
            sound2._panner.orientationY.setValueAtTime(sound2._orientation[1], Howler.ctx.currentTime);
            sound2._panner.orientationZ.setValueAtTime(sound2._orientation[2], Howler.ctx.currentTime);
          } else {
            sound2._panner.setOrientation(sound2._orientation[0], sound2._orientation[1], sound2._orientation[2]);
          }
        } else {
          sound2._panner = Howler.ctx.createStereoPanner();
          sound2._panner.pan.setValueAtTime(sound2._stereo, Howler.ctx.currentTime);
        }
        sound2._panner.connect(sound2._node);
        if (!sound2._paused) {
          sound2._parent.pause(sound2._id, true).play(sound2._id, true);
        }
      };
    })();
  })(howler);
  return howler;
}
var howlerExports = requireHowler();
function createPlayer(playerOptions) {
  let soundMap = {};
  let playerVolume = 1;
  const newSound = (soundName) => ({
    soundName,
    soundId: 0,
    soundState: "new",
    soundConfig: playerOptions.loadedAudio.config[soundName] ?? { volume: 1 },
    soundVolume: 1
  });
  const initSoundVolume = (soundName) => {
    const existingSound = soundMap[soundName];
    if (existingSound) {
      playerOptions.howl.volume(playerVolume * existingSound.soundVolume * existingSound.soundConfig.volume, existingSound.soundId);
    }
  };
  const { play } = playerOptions.createPlay({
    howl: playerOptions.howl,
    newSound,
    getSoundMap: () => soundMap,
    initSoundVolume: (soundName) => initSoundVolume(soundName)
  });
  const stop = (stopOptions) => {
    const existingSound = soundMap[stopOptions.name];
    if (existingSound) {
      playerOptions.howl.stop(existingSound.soundId);
      delete soundMap[existingSound.soundName];
    }
  };
  const fade = async (fadeOptions) => {
    const existingSound = soundMap[fadeOptions.name];
    if (existingSound) {
      existingSound.soundVolume = fadeOptions.to;
      playerOptions.howl.fade(fadeOptions.from * playerVolume * existingSound.soundConfig.volume, fadeOptions.to * playerVolume * existingSound.soundConfig.volume, fadeOptions.duration, existingSound.soundId);
    }
  };
  const rate = (rateOptions) => {
    const existingSound = soundMap[rateOptions.name];
    if (existingSound) {
      playerOptions.howl.rate(rateOptions.rate, existingSound.soundId);
    }
  };
  const volume = (volume2) => {
    playerVolume = volume2;
    Object.values(soundMap).forEach((sound2) => {
      playerOptions.howl.volume(playerVolume * sound2.soundVolume * sound2.soundConfig.volume, sound2.soundId);
    });
  };
  const debug = () => {
    console.log(snapshot(soundMap));
  };
  return {
    play,
    stop,
    fade,
    volume,
    rate,
    howl: playerOptions.howl,
    debug
  };
}
function createPlayMusic(options) {
  const pauseAllMusic = () => {
    Object.values(options.getSoundMap()).forEach((existingSound) => {
      options.howl.pause(existingSound.soundId);
      options.getSoundMap()[existingSound.soundName] = { ...existingSound, soundState: "paused" };
    });
  };
  const newMusic = (sound2) => {
    pauseAllMusic();
    const soundId = options.howl.play(sound2.soundName);
    options.getSoundMap()[sound2.soundName] = { ...sound2, soundId, soundState: "playing" };
    options.initSoundVolume(sound2.soundName);
  };
  const resumeMusic = (sound2) => {
    pauseAllMusic();
    options.howl.play(sound2.soundId);
    options.getSoundMap()[sound2.soundName] = { ...sound2, soundState: "playing" };
  };
  const soundPlayMap = {
    new: (sound2) => newMusic(sound2),
    paused: (sound2) => resumeMusic(sound2),
    playing: (_2) => {
    }
  };
  const play = (playOptions) => {
    const existingSound = options.getSoundMap()[playOptions.name];
    const sound2 = existingSound ?? options.newSound(playOptions.name);
    soundPlayMap[sound2.soundState](sound2);
  };
  return { play };
}
function createPlayLoop(options) {
  const playLoop = (sound2) => {
    const soundId = options.howl.play(sound2.soundName);
    options.getSoundMap()[sound2.soundName] = { ...sound2, soundId, soundState: "playing" };
    options.initSoundVolume(sound2.soundName);
  };
  const soundPlayMap = {
    new: (sound2) => playLoop(sound2),
    paused: (sound2) => playLoop(sound2),
    playing: (_2) => {
    }
  };
  const play = (playOptions) => {
    const existingSound = options.getSoundMap()[playOptions.name];
    const sound2 = existingSound ?? options.newSound(playOptions.name);
    soundPlayMap[sound2.soundState](sound2);
  };
  return { play };
}
function createPlayOnce(options) {
  const playOnce = (sound2) => {
    const soundId = options.howl.play(sound2.soundName);
    options.getSoundMap()[sound2.soundName] = { ...sound2, soundId, soundState: "playing" };
    options.initSoundVolume(sound2.soundName);
    options.howl.on("end", (soundIdOnEnd) => {
      if (soundIdOnEnd === soundId) {
        options.howl.stop(soundId);
        delete options.getSoundMap()[sound2.soundName];
      }
    });
  };
  const soundPlayMap = {
    new: (sound2) => playOnce(sound2),
    paused: (sound2) => playOnce(sound2),
    playing: (sound2, options2) => {
      if (options2.forcePlay) playOnce(sound2);
    }
  };
  const play = (playOptions) => {
    const existingSound = options.getSoundMap()[playOptions.name];
    const sound2 = existingSound ?? options.newSound(playOptions.name);
    soundPlayMap[sound2.soundState](sound2, { forcePlay: playOptions.forcePlay });
  };
  return { play };
}
function createSound() {
  let loadedAudio;
  let players;
  const load = (loadedAudioValue) => {
    loadedAudio = loadedAudioValue;
    const howl = new Howl({
      src: loadedAudio.src,
      sprite: loadedAudio.sprite,
      volume: 1
    });
    players = {
      music: createPlayer({
        loadedAudio,
        loop: true,
        howl,
        createPlay: createPlayMusic
      }),
      // prettier-ignore
      loop: createPlayer({
        loadedAudio,
        loop: true,
        howl,
        createPlay: createPlayLoop
      }),
      // prettier-ignore
      once: createPlayer({
        loadedAudio,
        loop: false,
        howl,
        createPlay: createPlayOnce
      })
      //  prettier-ignore
    };
    const onAudioContextChange = () => howlerExports.Howler.ctx.state;
    const onVisibilityStateChange = () => document.visibilityState;
    howlerExports.Howler.ctx.addEventListener("statechange", onAudioContextChange);
    document.addEventListener("visibilitychange", onVisibilityStateChange);
    const destroy = () => {
      howlerExports.Howler.ctx.removeEventListener("statechange", onAudioContextChange);
      document.removeEventListener("visibilitychange", onVisibilityStateChange);
      if (players) {
        players.music.howl.unload();
        players.loop.howl.unload();
        players.once.howl.unload();
      }
    };
    return { destroy };
  };
  const stop = (stopOptions) => {
    if (players) {
      players.music.stop(stopOptions);
      players.loop.stop(stopOptions);
      players.once.stop(stopOptions);
    }
  };
  const fade = async (fadeOptions) => {
    if (players) {
      const getPromises = () => [
        players.music.fade(fadeOptions),
        players.loop.fade(fadeOptions),
        players.once.fade(fadeOptions)
      ];
      await Promise.all(getPromises());
    }
  };
  const rate = (rateOptions) => {
    if (players) {
      players.music.rate(rateOptions);
      players.loop.rate(rateOptions);
      players.once.rate(rateOptions);
    }
  };
  const enableEffect = () => {
  };
  const volumeEffect = () => {
  };
  return {
    load,
    stop,
    fade,
    rate,
    volumeEffect,
    enableEffect,
    get players() {
      return players;
    }
  };
}
const sound = createSound();
function EnableSound($$payload, $$props) {
  push();
  pop();
}
function TurboSpaceHold($$payload, $$props) {
  push();
  const context2 = getContext();
  let turboEnabledBeforeHold = false;
  const enableHoldTurbo = () => {
    if (stateBet$1.isSpaceHold) return;
    turboEnabledBeforeHold = stateBet$1.isTurbo;
    stateBet$1.autoSpinsCounter = 0;
    stateBet$1.isSpaceHold = true;
    context2.stateGameDerived.enableTurbo();
  };
  const disableHoldTurbo = () => {
    if (!stateBet$1.isSpaceHold) return;
    stateBet$1.isSpaceHold = false;
    stateBetDerived.updateIsTurbo(turboEnabledBeforeHold, { persistent: true });
  };
  OnHotkey($$payload, {
    hotkey: "Space",
    onhold: enableHoldTurbo,
    onholdend: disableHoldTurbo
  });
  pop();
}
function recordBookEvent({
  bookEvent
}) {
  if (stateUrlDerived.replay()) {
    console.log("mock request end-event:", { index: bookEvent.index, type: bookEvent.type });
    return;
  }
  try {
    requestEndEvent({
      eventIndex: bookEvent.index,
      rgsUrl: stateUrlDerived.rgsUrl(),
      sessionID: stateUrlDerived.sessionID()
    });
  } catch (error) {
    console.error(error);
  }
}
function checkIsMultipleRevealEvents({
  bookEvents
}) {
  const revealEventCount = bookEvents.filter((bookEvent) => bookEvent.type === "reveal").length;
  const isMultipleReveals = revealEventCount > 1;
  return isMultipleReveals;
}
async function sequence(itemList, itemHandler) {
  const results = [];
  for (const [index, item] of itemList.entries()) {
    const result = await itemHandler(item, index, itemList);
    results.push(result);
  }
  return results;
}
function createPlayBookUtils({
  bookEventHandlerMap: bookEventHandlerMap2,
  debug
}) {
  const playBookEvent = async (bookEvent, bookEventContext) => {
    const bookEventHandler = bookEventHandlerMap2?.[bookEvent.type];
    if (bookEventHandler) {
      if (debug) console.log(bookEvent);
      await bookEventHandler(bookEvent, bookEventContext);
    } else {
      console.error('Missing bookEventHandler in "bookEventHandlerMap" for: ', bookEvent);
    }
  };
  const playBookEvents2 = async (bookEvents, bookEventContext) => {
    const finalBookEventContext = bookEventContext || {};
    await sequence(bookEvents, async (bookEvent) => {
      await playBookEvent(bookEvent, { ...finalBookEventContext, bookEvents });
    });
  };
  return {
    playBookEvent,
    playBookEvents: playBookEvents2
  };
}
const WIN_PRESENT_MIN_MULTIPLIER = 20;
const winLevelSoundsPlay = ({ winLevelData }) => {
  if (winLevelData?.alias === "max") eventEmitter.broadcastAsync({ type: "uiHide" });
  if (winLevelData?.sound?.sfx) {
    eventEmitter.broadcast({ type: "soundOnce", name: winLevelData.sound.sfx });
  }
  if (winLevelData?.sound?.bgm) {
    eventEmitter.broadcast({ type: "soundMusic", name: winLevelData.sound.bgm });
  }
  if (winLevelData?.type === "big") {
    eventEmitter.broadcast({ type: "soundLoop", name: "sfx_bigwin_coinloop" });
  }
};
const winLevelSoundsStop = () => {
  eventEmitter.broadcast({ type: "soundStop", name: "sfx_bigwin_coinloop" });
  if (stateGame.gameType === "freegame") {
    eventEmitter.broadcast({ type: "soundMusic", name: "bgm_freespin" });
  } else {
    eventEmitter.broadcast({ type: "soundMusic", name: "bgm_main" });
  }
  eventEmitter.broadcastAsync({ type: "uiShow" });
};
const animateSymbols = async ({ positions }) => {
  eventEmitter.broadcast({ type: "boardShow" });
  await eventEmitter.broadcastAsync({
    type: "boardWithAnimateSymbols",
    symbolPositions: positions
  });
};
const bookEventHandlerMap = {
  reveal: async (bookEvent, { bookEvents }) => {
    eventEmitter.broadcast({ type: "tumbleWinAmountReset" });
    const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
    if (isBonusGame) {
      eventEmitter.broadcast({ type: "stopButtonEnable" });
      recordBookEvent({ bookEvent });
    }
    stateGame.gazeCharge = 0;
    stateGame.eyeResolvedThisSpin = false;
    eventEmitter.broadcast({ type: "gazeMeterReset" });
    eventEmitter.broadcast({ type: "gazeMeterShow" });
    eventEmitter.broadcast({ type: "eyeHide" });
    const revealEvent = bookEvent;
    stateGame.gameType = bookEvent.gameType;
    await stateGameDerived.enhancedBoard.spin({ revealEvent });
    eventEmitter.broadcast({ type: "reelFrameScatterAnticipationEnd" });
    eventEmitter.broadcast({ type: "soundScatterCounterClear" });
  },
  winInfo: async (bookEvent) => {
    const promiseAnimate = async () => {
      eventEmitter.broadcast({ type: "soundOnce", name: "sfx_winlevel_small" });
      await animateSymbols({ positions: _.flatten(bookEvent.wins.map((win) => win.positions)) });
    };
    const promiseAmounts = async () => {
      await eventEmitter.broadcastAsync({
        type: "showClusterWinAmounts",
        wins: bookEvent.wins.map((win) => ({
          win: win.win,
          reel: win.meta.overlay.reel,
          row: win.meta.overlay.row
        }))
      });
    };
    await Promise.all([promiseAnimate(), promiseAmounts()]);
  },
  updateTumbleWin: async (bookEvent) => {
    if (bookEvent.amount > 0) {
      eventEmitter.broadcast({ type: "tumbleWinAmountShow" });
      eventEmitter.broadcast({
        type: "tumbleWinAmountUpdate",
        amount: bookEvent.amount,
        animate: false
      });
    }
  },
  gazeStep: async (bookEvent) => {
    stateGame.gazeCharge = bookEvent.charge;
    await eventEmitter.broadcastAsync({
      type: "gazeMeterFill",
      fromPositions: bookEvent.fromPositions,
      charge: bookEvent.charge
    });
  },
  // Instant scatter pay (4 = 3×, 5 = 5×, 6 = 100× the bet). The amount is already rolled into
  // the round's running totals (setTotalWin / finalWin); here we celebrate it.
  scatterPay: async (bookEvent) => {
    await eventEmitter.broadcastAsync({
      type: "scatterPayShow",
      count: bookEvent.count,
      amount: bookEvent.amount
    });
  },
  tumbleBoard: async (bookEvent) => {
    eventEmitter.broadcast({ type: "boardHide" });
    eventEmitter.broadcast({ type: "tumbleBoardShow" });
    eventEmitter.broadcast({ type: "tumbleBoardInit", addingBoard: bookEvent.newSymbols });
    await eventEmitter.broadcastAsync({
      type: "tumbleBoardExplode",
      explodingPositions: bookEvent.explodingSymbols
    });
    eventEmitter.broadcast({ type: "tumbleBoardRemoveExploded" });
    await eventEmitter.broadcastAsync({ type: "tumbleBoardSlideDown" });
    eventEmitter.broadcast({ type: "reelFrameScatterAnticipationEnd" });
    eventEmitter.broadcast({
      type: "boardSettle",
      board: stateGameDerived.tumbleBoardCombined().map((tumbleReel) => tumbleReel.map((tumbleSymbol) => tumbleSymbol.rawSymbol))
    });
    eventEmitter.broadcast({ type: "tumbleBoardReset" });
    eventEmitter.broadcast({ type: "tumbleBoardHide" });
    eventEmitter.broadcast({ type: "boardShow" });
  },
  setWin: async (bookEvent) => {
    const winLevelData = winLevelMap[bookEvent.winLevel];
    if (stateGame.gazeCharge > 0 && !stateGame.eyeResolvedThisSpin) {
      await eventEmitter.broadcastAsync({ type: "gazeMeterDrain" });
      stateGame.gazeCharge = 0;
    }
    if (bookEvent.amount < WIN_PRESENT_MIN_MULTIPLIER * BOOK_AMOUNT_MULTIPLIER) return;
    eventEmitter.broadcast({ type: "winShow" });
    winLevelSoundsPlay({ winLevelData });
    await eventEmitter.broadcastAsync({
      type: "winUpdate",
      amount: bookEvent.amount,
      winLevelData
    });
    winLevelSoundsStop();
    eventEmitter.broadcast({ type: "winHide" });
  },
  setTotalWin: async (bookEvent) => {
    stateBet$1.winBookEventAmount = bookEvent.amount;
  },
  finalWin: async (_bookEvent) => {
    eventEmitter.broadcast({ type: "tumbleWinAmountHide" });
  },
  // --- The Eye (end of a winning tumble sequence) -----------------------------------
  eyeReveal: async (bookEvent) => {
    const landedEye = stateGame.board[bookEvent.position.reel]?.reelState.symbols[bookEvent.position.row];
    if (landedEye?.rawSymbol.name === "EYE") {
      landedEye.rawSymbol = {
        ...landedEye.rawSymbol,
        eye: true,
        eyeType: bookEvent.eyeType,
        startValue: bookEvent.startValue
      };
    }
    eventEmitter.broadcast({
      type: "eyeShow",
      reel: bookEvent.position.reel,
      row: bookEvent.position.row,
      eyeType: bookEvent.eyeType,
      startValue: bookEvent.startValue
    });
  },
  eyeResolve: async (bookEvent) => {
    stateGame.eyeResolvedThisSpin = true;
    await eventEmitter.broadcastAsync({ type: "gazeMeterToEye" });
    await eventEmitter.broadcastAsync({
      type: "eyeBurst",
      totalMult: bookEvent.totalMult,
      charge: bookEvent.charge,
      startValue: bookEvent.startValue,
      eyeType: bookEvent.eyeType
    });
    eventEmitter.broadcast({ type: "eyeHide" });
    stateGame.gazeCharge = 0;
    eventEmitter.broadcast({ type: "gazeMeterReset" });
  },
  // Snowball persistent multiplier (snowball features only; absent in superspins).
  setPersistentMult: async (bookEvent) => {
    stateGame.persistentMult = bookEvent.mult;
    eventEmitter.broadcast({ type: "snowballShow" });
    await eventEmitter.broadcastAsync({ type: "snowballUpdate", mult: bookEvent.mult });
  },
  // --- Win-cap (15,000×) ------------------------------------------------------------
  wincap: async (bookEvent) => {
    await eventEmitter.broadcastAsync({ type: "winCapTrigger", amount: bookEvent.amount });
  },
  // --- Free Spins lifecycle ---------------------------------------------------------
  freeSpinTrigger: async (bookEvent) => {
    eventEmitter.broadcast({ type: "soundOnce", name: "sfx_scatter_win_v2" });
    await animateSymbols({ positions: bookEvent.positions });
    await eventEmitter.broadcastAsync({ type: "scatterCelebrate", positions: bookEvent.positions });
    await eventEmitter.broadcastAsync({ type: "uiHide" });
    await eventEmitter.broadcastAsync({ type: "transition" });
    stateGame.freeSpinIntroActive = true;
    eventEmitter.broadcast({ type: "freeSpinIntroShow" });
    eventEmitter.broadcast({ type: "soundMusic", name: "bgm_freespin" });
    await eventEmitter.broadcastAsync({
      type: "freeSpinIntroUpdate",
      totalFreeSpins: bookEvent.totalFs
    });
    stateGame.gameType = "freegame";
    await eventEmitter.broadcastAsync({ type: "freeSpinIntroHide" });
    stateGame.freeSpinIntroActive = false;
    eventEmitter.broadcast({ type: "reelFrameGlowShow" });
    stateGame.persistentMult = 1;
    eventEmitter.broadcast({ type: "snowballShow" });
    eventEmitter.broadcast({ type: "snowballUpdate", mult: 1 });
    eventEmitter.broadcast({ type: "freeSpinCounterShow" });
    eventEmitter.broadcast({
      type: "freeSpinCounterUpdate",
      current: void 0,
      total: bookEvent.totalFs
    });
    await eventEmitter.broadcastAsync({ type: "uiShow" });
  },
  updateFreeSpin: async (bookEvent) => {
    eventEmitter.broadcast({ type: "freeSpinCounterShow" });
    eventEmitter.broadcast({
      type: "freeSpinCounterUpdate",
      current: bookEvent.amount,
      total: bookEvent.total
    });
  },
  freeSpinRetrigger: async (bookEvent) => {
    eventEmitter.broadcast({ type: "soundOnce", name: "sfx_scatter_win_v2" });
    await animateSymbols({ positions: bookEvent.positions });
    await eventEmitter.broadcastAsync({
      type: "freeSpinRetriggerShow",
      totalFreeSpins: bookEvent.totalFs
    });
    eventEmitter.broadcast({ type: "freeSpinCounterUpdate", total: bookEvent.totalFs });
  },
  freeSpinEnd: async (bookEvent) => {
    const winLevelData = winLevelMap[bookEvent.winLevel];
    await eventEmitter.broadcastAsync({ type: "uiHide" });
    eventEmitter.broadcast({ type: "reelFrameGlowHide" });
    eventEmitter.broadcast({ type: "snowballHide" });
    eventEmitter.broadcast({ type: "freeSpinOutroShow" });
    winLevelSoundsPlay({ winLevelData });
    await eventEmitter.broadcastAsync({
      type: "freeSpinOutroCountUp",
      amount: bookEvent.amount,
      winLevelData
    });
    winLevelSoundsStop();
    eventEmitter.broadcast({ type: "freeSpinOutroHide" });
    eventEmitter.broadcast({ type: "freeSpinCounterHide" });
    eventEmitter.broadcast({ type: "tumbleWinAmountHide" });
    await eventEmitter.broadcastAsync({ type: "freeSpinExitCover" });
    stateGame.gameType = "basegame";
    await eventEmitter.broadcastAsync({ type: "freeSpinExitReveal" });
    await eventEmitter.broadcastAsync({ type: "uiShow" });
  },
  // customised — reconstruct the on-screen state at a mid-round resume point WITHOUT
  // re-animating everything that came before. We settle the last board instantly and
  // restore the feature HUD (counter / glow / snowball) + running total, then the
  // post-resume events (appended by `convertTorResumableBet`) play on from there.
  createBonusSnapshot: async (bookEvent) => {
    const { bookEvents } = bookEvent;
    function findLastBookEvent(type) {
      return _.findLast(bookEvents, (event2) => event2.type === type);
    }
    const lastReveal = findLastBookEvent("reveal");
    const lastFreeSpinTrigger = findLastBookEvent("freeSpinTrigger");
    const lastUpdateFreeSpin = findLastBookEvent("updateFreeSpin");
    const lastSetPersistentMult = findLastBookEvent("setPersistentMult");
    const lastSetTotalWin = findLastBookEvent("setTotalWin");
    if (lastReveal) {
      stateGame.gameType = lastReveal.gameType;
      stateGameDerived.enhancedBoard.settle(lastReveal.board);
    }
    eventEmitter.broadcast({ type: "gazeMeterReset" });
    eventEmitter.broadcast({ type: "gazeMeterShow" });
    if (lastFreeSpinTrigger) {
      stateGame.gameType = "freegame";
      eventEmitter.broadcast({ type: "reelFrameGlowShow" });
      eventEmitter.broadcast({ type: "freeSpinCounterShow" });
      eventEmitter.broadcast({
        type: "freeSpinCounterUpdate",
        current: lastUpdateFreeSpin?.amount,
        total: lastUpdateFreeSpin?.total ?? lastFreeSpinTrigger.totalFs
      });
      stateGame.persistentMult = lastSetPersistentMult?.mult ?? 1;
      eventEmitter.broadcast({ type: "snowballShow" });
      eventEmitter.broadcast({ type: "snowballUpdate", mult: stateGame.persistentMult });
    }
    if (lastSetTotalWin) stateBet$1.winBookEventAmount = lastSetTotalWin.amount;
  }
};
const { playBookEvents } = createPlayBookUtils({ bookEventHandlerMap });
const playBet = async (bet) => {
  stateBet$1.winBookEventAmount = 0;
  await playBookEvents(bet.state);
  eventEmitter.broadcast({ type: "stopButtonEnable" });
};
const getSymbolX = (reelIndex) => REEL_CELL_WIDTH * (reelIndex + 0.5);
const getSymbolY = (symbolIndexOfBoard) => (symbolIndexOfBoard + 0.5) * REEL_CELL_HEIGHT;
const getVisibleRowIndex = (row) => row - VISIBLE_ROW_START;
const getPaddedRowIndex = (row) => row;
const getPositionX = (reel) => getSymbolX(reel);
const getPositionY = (row) => getSymbolY(getVisibleRowIndex(row));
const getSymbolKey = ({ rawSymbol }) => rawSymbol.name;
const getSymbolInfo = ({
  rawSymbol,
  state
}) => {
  const symbolKey = getSymbolKey({ rawSymbol });
  return SYMBOL_INFO_MAP[symbolKey][state];
};
const STICKY_BET_MODE_KEYS = /* @__PURE__ */ new Set(["ANTE", "SUPERSPINS"]);
let stickyBetModeKey = null;
const rememberStickyBetMode = () => {
  const modeKey = stateBet$1.activeBetModeKey.toUpperCase();
  stickyBetModeKey = STICKY_BET_MODE_KEYS.has(modeKey) ? stateBet$1.activeBetModeKey : null;
};
const restoreStickyBetMode = () => {
  if (stickyBetModeKey) stateBet$1.activeBetModeKey = stickyBetModeKey;
};
const primaryMachines = createPrimaryMachines({
  onNewGameStart: async () => {
    rememberStickyBetMode();
    if (stateBet$1.isTurbo && stateXstateDerived.isAutoBetting() || stateBet$1.isSpaceHold) return;
    stateBet$1.winBookEventAmount = 0;
    eventEmitter.broadcast({ type: "reelFrameSpinLaunch" });
    await stateGameDerived.enhancedBoard.preSpin({});
  },
  onNewGameError: () => {
    restoreStickyBetMode();
    stateGameDerived.enhancedBoard.settle();
  },
  onPlayGame: async (bet) => {
    restoreStickyBetMode();
    await playBet(bet);
  },
  checkIsBonusGame: (bet) => checkIsMultipleRevealEvents({ bookEvents: bet.state })
});
const intermediateMachines = createIntermediateMachines(primaryMachines);
const gameActor = createGameActor(intermediateMachines);
function EnableGameActor($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const context2 = getContext();
  context2.eventEmitter.subscribeOnMount({
    // Connect every actor with app.eventEmitter to avoid call actor directly
    bet: () => gameActor.send({ type: "BET" }),
    autoBet: () => gameActor.send({ type: "AUTO_BET" }),
    resumeBet: () => gameActor.send({ type: "RESUME_BET" })
  });
  if (props.debug) {
    $$payload.out += "<!--[-->";
    Text($$payload, {
      x: context2.stateLayoutDerived.canvasSizes().width,
      anchor: { x: 1, y: 0 },
      style: { fill: 16777215 },
      text: JSON.stringify(context2.stateXstate.value, void 0, 2)
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function ResumeBet($$payload, $$props) {
  push();
  getContext();
  pop();
}
function Sound$1($$payload, $$props) {
  push();
  const context2 = getContext();
  context2.eventEmitter.subscribeOnMount({
    // ui
    soundBetMode: async ({ betModeKey }) => {
      if (betModeKey === "SUPERSPINS") {
        sound.players?.once?.play({ name: "sfx_winlevel_end" });
        await waitForTimeout(SECOND);
        sound.players?.music?.play({ name: "bgm_freespin" });
      } else {
        sound.players?.music?.play({ name: "bgm_main" });
      }
    },
    soundPressGeneral: () => sound.players?.once?.play({ name: "sfx_btn_general" }),
    soundPressBet: () => sound.players?.once?.play({ name: "sfx_btn_spin" }),
    // scatterCounter
    soundScatterCounterIncrease: () => context2.stateGame.scatterCounter = context2.stateGame.scatterCounter + 1,
    // prettier-ignore
    soundScatterCounterClear: () => context2.stateGame.scatterCounter = 0,
    // game
    soundMusic: ({ name }) => sound.players?.music?.play({ name }),
    soundLoop: ({ name }) => sound.players?.loop?.play({ name }),
    soundOnce: ({ name, forcePlay }) => sound.players?.once?.play({ name, forcePlay }),
    soundStop: ({ name }) => sound.stop({ name }),
    soundFade: async ({ name, duration, from, to }) => await sound.fade({ name, duration, from, to })
    // prettier-ignore
  });
  pop();
}
function Background($$payload, $$props) {
  push();
  const context2 = getContext();
  const IMAGE_RATIO = 1538 / 1026;
  const PARTICLES = Array.from({ length: 28 }, (_2, i) => ({
    x: i * 137 % 1e3,
    y: i * 251 % 1e3,
    r: 1.4 + i % 5 * 0.7,
    speed: 0.018 + i % 7 * 6e-3,
    alpha: 0.14 + i % 4 * 0.05,
    phase: i * 0.77
  }));
  let t = 0;
  const sizes = context2.stateLayoutDerived.canvasSizes();
  const feature = context2.stateGame.gameType === "freegame";
  const featureMix = new Tween(0, { duration: 720 });
  const driftX = Math.sin(t * 0.06) * 14;
  const driftY = Math.cos(t * 0.045) * 10;
  const breathe = 1 + Math.sin(t * 0.08) * 0.014;
  const cover = (() => {
    const { width: cw, height: ch } = sizes;
    let w = cw;
    let h = cw / IMAGE_RATIO;
    if (h < ch) {
      h = ch;
      w = ch * IMAGE_RATIO;
    }
    return {
      cx: cw / 2 + driftX,
      cy: ch / 2 + driftY,
      w: w * 1.06 * breathe,
      h: h * 1.06 * breathe
    };
  })();
  const drawGodRays = (g) => {
    const { width, height } = sizes;
    const top = height * -0.05;
    const sway = Math.sin(t * 0.055) * width * 0.035;
    const color = feature ? 12576511 : 10517503;
    for (let i = 0; i < 6; i++) {
      const x = width * (0.16 + i * 0.14) + sway * (i % 2 ? -1 : 1);
      const w = width * (0.05 + i % 3 * 0.014);
      const pulse = 0.55 + Math.sin(t * 0.4 + i) * 0.45;
      g.moveTo(x, top).lineTo(x + w, top).lineTo(x + w * 2.6, height * 0.8).lineTo(x - w * 1.4, height * 0.8).fill({ color, alpha: 0.04 * pulse });
    }
  };
  const drawParticles = (g) => {
    const { width, height } = sizes;
    for (const p of PARTICLES) {
      const px = (p.x / 1e3 * width + Math.sin(t * 0.21 + p.phase) * 26) % width;
      const py = (p.y / 1e3 * height - t * height * p.speed) % height + height * 0.02;
      const pulse = 0.65 + Math.sin(t * 1.1 + p.phase) * 0.35;
      g.circle(px, py < 0 ? py + height : py, p.r * pulse).fill({ color: 14350847, alpha: p.alpha });
    }
  };
  Rectangle$1($$payload, spread_props([
    sizes,
    { backgroundColor: 329743, zIndex: -3 }
  ]));
  $$payload.out += `<!----> `;
  Sprite($$payload, {
    key: "backgroundBase",
    anchor: 0.5,
    x: cover.cx,
    y: cover.cy,
    width: cover.w,
    height: cover.h,
    alpha: 1 - featureMix.current,
    filters: [],
    zIndex: -2
  });
  $$payload.out += `<!----> `;
  Sprite($$payload, {
    key: "backgroundFs",
    anchor: 0.5,
    x: cover.cx,
    y: cover.cy,
    width: cover.w,
    height: cover.h,
    alpha: featureMix.current,
    filters: [],
    zIndex: -2
  });
  $$payload.out += `<!----> `;
  Graphics($$payload, { draw: drawGodRays, zIndex: -1.95 });
  $$payload.out += `<!----> `;
  Container($$payload, {
    zIndex: -1.8,
    children: ($$payload2) => {
      Graphics($$payload2, { draw: drawParticles });
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!---->`;
  pop();
}
function ReelFrame($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const context2 = getContext();
  const feature = context2.stateGame.gameType === "freegame";
  const featureMix = new Tween(0, { duration: 620 });
  const frame = {
    glowColor: feature ? 16731416 : 8336895
  };
  const frameVariants = [
    {
      key: "reelFrameBase",
      layout: REEL_LAYOUT_BASE,
      alpha: 1 - featureMix.current
    },
    {
      key: "reelFrameFs",
      layout: REEL_LAYOUT_FREE_SPINS,
      alpha: featureMix.current
    }
  ];
  const layer = props.layer ?? "background";
  const mobileReelScale = context2.stateLayoutDerived.layoutType() === "portrait" ? MOBILE_REEL_DISPLAY_SCALE : 1;
  let now2 = 0;
  let boosted = false;
  let launchStartedAt = -1;
  let scatterStartedAt = -1;
  let eyeStartedAt = -1;
  let scatterAnticipationStartedAt = -1;
  let scatterAnticipationReleasedAt = -1;
  let scatterAnticipationReleaseFrom = 0;
  const t = now2 / 1e3;
  context2.eventEmitter.subscribeOnMount({
    reelFrameGlowShow: () => boosted = true,
    reelFrameGlowHide: () => boosted = false,
    reelFrameSpinLaunch: () => launchStartedAt = performance.now(),
    reelFrameScatterLand: () => scatterStartedAt = performance.now(),
    reelFrameEyeLand: () => eyeStartedAt = performance.now(),
    reelFrameScatterAnticipationStart: () => {
      scatterAnticipationStartedAt = performance.now();
      scatterAnticipationReleasedAt = -1;
    },
    reelFrameScatterAnticipationEnd: () => {
      scatterAnticipationReleaseFrom = scatterAnticipationProgress;
      scatterAnticipationReleasedAt = performance.now();
    }
  });
  const getBurstEnergy = (startedAt, duration) => {
    const elapsed = startedAt < 0 ? Infinity : (now2 - startedAt) / 1e3;
    return elapsed < duration ? Math.max(0, 1 - elapsed / duration) : 0;
  };
  const launchEnergy = getBurstEnergy(launchStartedAt, 0.62);
  const scatterEnergy = getBurstEnergy(scatterStartedAt, 0.52);
  const eyeEnergy = getBurstEnergy(eyeStartedAt, 0.76);
  const specialEnergy = Math.max(scatterEnergy, eyeEnergy);
  const effectEnergy = Math.max(launchEnergy, specialEnergy);
  const effectColor = eyeEnergy > scatterEnergy ? 14182143 : scatterEnergy > 0 ? 5041407 : frame.glowColor;
  const launchMotion = launchEnergy > 0 ? Math.sin((1 - launchEnergy) * Math.PI) : 0;
  const scatterAnticipationProgress = (() => {
    if (scatterAnticipationReleasedAt >= 0) {
      const releaseElapsed = (now2 - scatterAnticipationReleasedAt) / 1e3;
      return Math.max(0, scatterAnticipationReleaseFrom * (1 - releaseElapsed / 0.2));
    }
    if (scatterAnticipationStartedAt < 0) return 0;
    const progress = Math.min(1, (now2 - scatterAnticipationStartedAt) / 1e3);
    return progress * progress * (3 - 2 * progress);
  })();
  const frameShakeY = launchMotion * 42;
  const getFrameTransform = (layout) => {
    const position = getReelPosition(layout);
    const displayScale = getReelDisplayScale(layout);
    return {
      x: position.x + (layout.gridX + layout.gridWidth / 2) * displayScale,
      y: position.y + (layout.gridY + layout.gridHeight / 2) * displayScale + frameShakeY,
      pivot: {
        x: layout.gridX + layout.gridWidth / 2,
        y: layout.gridY + layout.gridHeight / 2
      },
      scale: displayScale * mobileReelScale * (1 + launchMotion * 0.045 + scatterAnticipationProgress * 0.06)
    };
  };
  const getGlintX = (layout) => layout.gridX + t * 180 % Math.max(layout.gridWidth, 1);
  const drawOverlayMask = (g, layout) => {
    g.rect(0, 0, layout.imageWidth, layout.imageHeight).fill(16777215).rect(layout.gridX, layout.gridY, layout.gridWidth, layout.gridHeight).cut();
  };
  const drawEffectMask = (g, layout) => {
    g.rect(layout.gridX, layout.gridY, layout.gridWidth, layout.gridHeight).fill(16777215);
  };
  const drawBottomSurge = (g, layout) => {
    const bottom = layout.gridY + layout.gridHeight;
    const cellWidth = layout.gridWidth / layout.columns;
    for (let index = 0; index < layout.columns; index++) {
      const x = layout.gridX + cellWidth * (index + 0.5);
      const height = 26 + index * 11 % 18;
      const y = bottom + 10;
      g.ellipse(x, y, cellWidth * 0.46, height).fill({ color: effectColor, alpha: 0.28 });
      g.ellipse(x + cellWidth * 0.1, y - height * 0.22, cellWidth * 0.24, height * 0.62).fill({ color: 16777215, alpha: 0.2 });
      g.roundRect(x - cellWidth * 0.32, bottom - 9, cellWidth * 0.64, 8, 4).fill({ color: effectColor, alpha: 0.7 });
    }
  };
  const drawGlint = (g) => {
    g.moveTo(-13, 0).lineTo(13, 0).stroke({ width: 2, color: 16777215, alpha: 0.9 });
    g.moveTo(0, -8).lineTo(0, 8).stroke({ width: 2, color: 16777215, alpha: 0.9 });
    g.circle(0, 0, 3).fill({ color: effectColor, alpha: 1 });
  };
  const drawDebugGrid = (g, layout) => {
    g.rect(layout.gridX, layout.gridY, layout.gridWidth, layout.gridHeight).stroke({ color: 16711935, width: 3, alpha: 0.9 });
    const cellWidth = layout.gridWidth / layout.columns;
    const cellHeight = layout.gridHeight / layout.rows;
    for (let c = 1; c < layout.columns; c++) {
      const x = layout.gridX + c * cellWidth;
      g.moveTo(x, layout.gridY).lineTo(x, layout.gridY + layout.gridHeight);
    }
    for (let r = 1; r < layout.rows; r++) {
      const y = layout.gridY + r * cellHeight;
      g.moveTo(layout.gridX, y).lineTo(layout.gridX + layout.gridWidth, y);
    }
    g.stroke({ color: 65535, width: 1, alpha: 0.65 });
  };
  const each_array = ensure_array_like(frameVariants);
  $$payload.out += `<!--[-->`;
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let variant = each_array[$$index];
    const transform = getFrameTransform(variant.layout);
    Container($$payload, {
      x: transform.x,
      y: transform.y,
      pivot: transform.pivot,
      scale: transform.scale,
      alpha: variant.alpha,
      children: ($$payload2) => {
        if (layer === "background") {
          $$payload2.out += "<!--[-->";
          Sprite($$payload2, {
            key: variant.key,
            width: variant.layout.imageWidth,
            height: variant.layout.imageHeight
          });
        } else {
          $$payload2.out += "<!--[!-->";
          Container($$payload2, {
            children: ($$payload3) => {
              Graphics($$payload3, {
                draw: (g) => drawOverlayMask(g, variant.layout),
                isMask: true
              });
              $$payload3.out += `<!----> `;
              Sprite($$payload3, {
                key: variant.key,
                width: variant.layout.imageWidth,
                height: variant.layout.imageHeight
              });
              $$payload3.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload2.out += `<!----> `;
          Container($$payload2, {
            children: ($$payload3) => {
              Graphics($$payload3, {
                draw: (g) => drawEffectMask(g, variant.layout),
                isMask: true
              });
              $$payload3.out += `<!----> `;
              Graphics($$payload3, {
                draw: (g) => drawBottomSurge(g, variant.layout),
                alpha: effectEnergy,
                blendMode: "add"
              });
              $$payload3.out += `<!----> `;
              Graphics($$payload3, {
                x: getGlintX(variant.layout),
                y: variant.layout.gridY + 12,
                draw: (g) => drawGlint(g),
                alpha: 0.08 + effectEnergy * 0.72 + (boosted ? 0.16 : 0),
                blendMode: "add"
              });
              $$payload3.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload2.out += `<!----> `;
          if (props.debug) {
            $$payload2.out += "<!--[-->";
            Graphics($$payload2, {
              draw: (g) => drawDebugGrid(g, variant.layout)
            });
          } else {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]-->`;
        }
        $$payload2.out += `<!--]-->`;
      },
      $$slots: { default: true }
    });
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function BoardContainer($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const context2 = getContext();
  const mobileReelScale = context2.stateLayoutDerived.layoutType() === "portrait" ? MOBILE_REEL_DISPLAY_SCALE : 1;
  const activeGrid = getReelDisplayGrid(context2.stateGameDerived.reelLayout());
  const frameGridScale = {
    x: activeGrid.width / REEL_DISPLAY_GRID.width,
    y: activeGrid.height / REEL_DISPLAY_GRID.height
  };
  let now2 = 0;
  let launchStartedAt = -1;
  let scatterAnticipationStartedAt = -1;
  let scatterAnticipationReleasedAt = -1;
  let scatterAnticipationReleaseFrom = 0;
  const eyeImpact = {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0
  };
  let eyeImpactTimeline;
  context2.eventEmitter.subscribeOnMount({
    reelFrameSpinLaunch: () => launchStartedAt = performance.now(),
    reelFrameScatterAnticipationStart: () => {
      scatterAnticipationStartedAt = performance.now();
      scatterAnticipationReleasedAt = -1;
    },
    reelFrameScatterAnticipationEnd: () => {
      scatterAnticipationReleaseFrom = scatterAnticipationProgress;
      scatterAnticipationReleasedAt = performance.now();
    },
    boardEyeImpact: () => {
      eyeImpactTimeline?.kill();
      eyeImpactTimeline = gsap.timeline().set(eyeImpact, {
        x: 0,
        y: -8,
        scaleX: 0.985,
        scaleY: 1.025,
        rotation: 0
      }).to(eyeImpact, {
        y: 15,
        scaleX: 1.035,
        scaleY: 0.965,
        rotation: -0.012,
        duration: 0.09,
        ease: "power3.in"
      }).to(eyeImpact, {
        x: -12,
        y: -5,
        rotation: 9e-3,
        duration: 0.045,
        ease: "power2.out"
      }).to(eyeImpact, {
        x: 10,
        y: 3,
        rotation: -7e-3,
        duration: 0.05,
        ease: "power2.out"
      }).to(eyeImpact, {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        duration: 0.18,
        ease: "back.out(1.8)"
      });
    }
  });
  const launchEnergy = (() => {
    const elapsed = launchStartedAt < 0 ? Infinity : (now2 - launchStartedAt) / 1e3;
    return elapsed < 0.62 ? Math.max(0, 1 - elapsed / 0.62) : 0;
  })();
  const launchMotion = launchEnergy > 0 ? Math.sin((1 - launchEnergy) * Math.PI) : 0;
  const scatterAnticipationProgress = (() => {
    if (scatterAnticipationReleasedAt >= 0) {
      const releaseElapsed = (now2 - scatterAnticipationReleasedAt) / 1e3;
      return Math.max(0, scatterAnticipationReleaseFrom * (1 - releaseElapsed / 0.2));
    }
    if (scatterAnticipationStartedAt < 0) return 0;
    const progress = Math.min(1, (now2 - scatterAnticipationStartedAt) / 1e3);
    return progress * progress * (3 - 2 * progress);
  })();
  const boardShakeY = launchMotion * 42;
  const boardScale = {
    x: mobileReelScale * frameGridScale.x * (1 + launchMotion * 0.045 + scatterAnticipationProgress * 0.06) * eyeImpact.scaleX,
    y: mobileReelScale * frameGridScale.y * (1 + launchMotion * 0.045 + scatterAnticipationProgress * 0.06) * eyeImpact.scaleY
  };
  Container($$payload, {
    x: context2.stateGameDerived.boardLayout().x + eyeImpact.x,
    y: context2.stateGameDerived.boardLayout().y + boardShakeY + eyeImpact.y,
    pivot: {
      x: REEL_DISPLAY_GRID.width / 2,
      y: REEL_DISPLAY_GRID.height / 2
    },
    rotation: eyeImpact.rotation,
    scale: boardScale,
    children: ($$payload2) => {
      props.children($$payload2);
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  pop();
}
function BoardMask($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  if (props.debug) {
    $$payload.out += "<!--[-->";
    Rectangle$1($$payload, {
      alpha: 0.5,
      backgroundColor: 16777215,
      width: REEL_DISPLAY_GRID.width,
      height: REEL_DISPLAY_GRID.height
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  Rectangle$1($$payload, {
    isMask: true,
    width: REEL_DISPLAY_GRID.width,
    height: REEL_DISPLAY_GRID.height
  });
  $$payload.out += `<!---->`;
  pop();
}
function AbyssalEye($$payload, $$props) {
  push();
  const EYE_COLORS = {
    add: 2285567,
    mult: 16722458,
    close: 4172031,
    charged: 10106367,
    warning: 16755234,
    idle: 4172031
  };
  const { $$slots, $$events, ...props } = $$props;
  const width = props.size * EYE_ASPECT;
  const height = props.size;
  const variant = props.variant ?? (props.preset === "mult" ? "mult" : props.preset === "close" ? "close" : "add");
  const frame = EYE_FRAME[variant];
  const effectColor = EYE_COLORS[props.preset ?? variant];
  const labelX = width * EYE_LABEL_OFFSET.x;
  const labelY = props.textY ?? height * EYE_LABEL_OFFSET.y;
  const isMultiplierEye = variant === "mult";
  const intensity = Math.min(Math.max(props.intensity ?? 0, 0), 1);
  const labelStyle = props.textStyle ?? eyeValueTextStyle({
    fontSize: props.size * 0.5,
    fill: isMultiplierEye ? EYE_VALUE_FILL.mul : EYE_VALUE_FILL.add
  });
  const maxLabelWidth = width * 0.72;
  const labelFitScale = (() => {
    if (!props.text) return 1;
    const measured = CanvasTextMetrics.measureText(props.text, new TextStyle(labelStyle));
    return Math.min(1, maxLabelWidth / Math.max(measured.width, 1));
  })();
  const idleFx = { alpha: 1 };
  const pulseFx = { scale: 1, textScale: 1, flashAlpha: 0 };
  const burstFx = { alpha: 0, scale: 0.55, glow: 0 };
  const landingFx = { x: 0, y: 0, scale: 1, rotation: 0 };
  const revealFx = {
    baseAlpha: 1,
    textAlpha: 1,
    textScale: 1,
    glow: 0
  };
  const glowFx = { scale: 1, alpha: 0.55 };
  const haloFx = { scaleBoost: 0, boost: 0 };
  const swayFx = { x: 0, y: 0, rotation: 0 };
  const shockFx = { scale: 0.25, alpha: 0 };
  let glowPulse = 0;
  const rootScale = landingFx.scale * pulseFx.scale * (1 + intensity * 0.04);
  const labelScale = labelFitScale * revealFx.textScale * pulseFx.textScale;
  const haloScale = 1 + intensity * 0.1 + haloFx.scaleBoost + burstFx.glow * 0.04;
  const haloAlpha = Math.min(0.6, 0.03 + glowPulse * 0.03 + intensity * 0.22 + haloFx.boost * 0.6 + revealFx.glow * 0.05 + burstFx.glow * 0.04);
  const drawHalo = (g) => {
    const r = width * 0.68;
    const steps = 5;
    for (let i = steps; i >= 1; i--) {
      const t = i / steps;
      g.circle(0, 0, r * t).fill({
        color: effectColor,
        alpha: 0.1 * (1 - t) + 0.03
      });
    }
  };
  const drawShock = (g) => {
    g.circle(0, 0, props.size * 0.5).stroke({
      width: Math.max(3, props.size * 0.04),
      color: effectColor,
      alpha: 1
    });
  };
  const drawParticles = (g) => {
    return;
  };
  Container($$payload, {
    x: landingFx.x + swayFx.x,
    y: landingFx.y + swayFx.y,
    rotation: landingFx.rotation + swayFx.rotation,
    scale: rootScale,
    children: ($$payload2) => {
      Container($$payload2, {
        scale: haloScale,
        alpha: haloAlpha,
        blendMode: "add",
        children: ($$payload3) => {
          Graphics($$payload3, { draw: drawHalo });
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      if (props.showCore !== false) {
        $$payload2.out += "<!--[-->";
        Container($$payload2, {
          children: ($$payload3) => {
            Sprite($$payload3, {
              key: frame,
              anchor: 0.5,
              width: width * glowFx.scale,
              height: height * glowFx.scale,
              alpha: idleFx.alpha * glowFx.alpha,
              tint: effectColor,
              blendMode: "add"
            });
            $$payload3.out += `<!----> `;
            Sprite($$payload3, {
              key: frame,
              anchor: 0.5,
              width,
              height,
              alpha: idleFx.alpha * revealFx.baseAlpha
            });
            $$payload3.out += `<!----> `;
            Sprite($$payload3, {
              key: frame,
              anchor: 0.5,
              width,
              height,
              alpha: pulseFx.flashAlpha,
              tint: effectColor,
              blendMode: "add"
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--> `;
      Sprite($$payload2, {
        key: frame,
        anchor: 0.5,
        width: width * burstFx.scale,
        height: height * burstFx.scale,
        alpha: burstFx.alpha,
        tint: effectColor,
        blendMode: "add"
      });
      $$payload2.out += `<!----> `;
      Container($$payload2, {
        scale: shockFx.scale,
        alpha: shockFx.alpha,
        blendMode: "add",
        children: ($$payload3) => {
          Graphics($$payload3, { draw: drawShock });
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      Container($$payload2, {
        blendMode: "add",
        children: ($$payload3) => {
          Graphics($$payload3, { draw: drawParticles });
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      if (props.text) {
        $$payload2.out += "<!--[-->";
        Text($$payload2, {
          anchor: 0.5,
          x: labelX,
          y: labelY,
          text: props.text,
          alpha: revealFx.textAlpha,
          scale: labelScale,
          style: labelStyle
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]-->`;
    },
    $$slots: { default: true }
  });
  bind_props($$props, { EYE_COLORS });
  pop();
}
function Symbol$1($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const context2 = getContext();
  const SYMBOL_FRAME = {
    H1: "H1",
    // Anglerfish
    H2: "H2",
    // Nautilus
    H3: "H3",
    // Diving helmet
    H4: "H4",
    // Jellyfish
    L1: "L1",
    // Cyan gem
    L2: "L2",
    // Teal gem
    L3: "L3",
    // Sapphire gem
    L4: "L4",
    // Violet gem
    L5: "L5",
    // Aqua gem
    S: "SCATTER"
    // Leviathan scatter
  };
  const frame = SYMBOL_FRAME[props.rawSymbol.name];
  const eyeNumber = props.rawSymbol.name === "EYE" && props.rawSymbol.eyeType && props.rawSymbol.startValue !== void 0 ? `${props.rawSymbol.startValue}` : void 0;
  const isUnresolvedEye = props.rawSymbol.name === "EYE" && !props.rawSymbol.eyeType;
  const isResolvedEye = props.rawSymbol.name === "EYE" && !!props.rawSymbol.eyeType;
  const symbolSize = (() => {
    const sourceSize = SYMBOL_SOURCE_SIZES[props.rawSymbol.name];
    const fill = getSymbolFill(props.rawSymbol.name);
    const scale2 = Math.min(REEL_CELL_WIDTH * fill / sourceSize.width, REEL_CELL_HEIGHT * fill / sourceSize.height);
    return {
      width: sourceSize.width * scale2,
      height: sourceSize.height * scale2
    };
  })();
  const info = getSymbolInfo({
    rawSymbol: props.rawSymbol,
    state: props.state
  });
  const PAD = SYMBOL_SIZE * 0.06;
  const scale = new Tween(1, { duration: 120 });
  const alpha = new Tween(1, { duration: 120 });
  const isEye = isUnresolvedEye || isResolvedEye;
  const winFx = { glow: 0, squashX: 1, squashY: 1 };
  const boomFx = { flash: 0 };
  const elecFx = { t: 0, glow: 0 };
  const isScatter = props.rawSymbol.name === "S";
  const electricOn = !isEye && !isScatter && (props.state === "win" || props.state === "postWinStatic");
  const scatterFx = { breathe: 1, flare: 0, ring: 0, connect: 0 };
  isScatter && (props.state === "win" || props.state === "postWinStatic");
  onDestroy(() => {
    gsap.killTweensOf(winFx);
    gsap.killTweensOf(boomFx);
    gsap.killTweensOf(elecFx);
    gsap.killTweensOf(scatterFx);
  });
  let gazeIntensity = 0;
  context2.eventEmitter.subscribeOnMount({
    gazeMeterFill: (e) => gazeIntensity = Math.min(1, e.charge / GAZE_METER_MAX_CHARGE),
    gazeMeterReset: () => gazeIntensity = 0,
    gazeMeterDrain: () => gazeIntensity = 0
  });
  const isSpecial = info.glow !== void 0;
  const draw = (g) => {
    const w = symbolSize.width;
    const h = symbolSize.height;
    g.roundRect(-w / 2 + PAD, -h / 2 + PAD, w - PAD * 2, h - PAD * 2, 14).fill({ color: info.color });
    g.roundRect(-w / 2 + PAD, -h / 2 + PAD, w - PAD * 2, (h - PAD * 2) * 0.5, 14).fill({ color: 16777215, alpha: 0.08 });
    if (isSpecial) {
      g.roundRect(-w / 2 + PAD * 0.5, -h / 2 + PAD * 0.5, w - PAD, h - PAD, 16).stroke({ width: 4, color: info.glow, alpha: 0.9 });
    }
  };
  const eyeSize = Math.max(symbolSize.width, symbolSize.height) * 1.08;
  const ELEC_COLOR = 8377599;
  const cellW = REEL_CELL_WIDTH * 0.92;
  const cellH = REEL_CELL_HEIGHT * 0.92;
  const drawElectric = (g) => {
    const w = cellW;
    const h = cellH;
    const t = elecFx.t;
    const glow = elecFx.glow;
    g.roundRect(-w / 2, -h / 2, w, h, 12).fill({ color: ELEC_COLOR, alpha: 0.06 + glow * 0.07 });
    g.roundRect(-w / 2, -h / 2, w, h, 12).stroke({
      width: 2 + glow * 2.5,
      color: ELEC_COLOR,
      alpha: 0.4 + glow * 0.5
    });
    const edges = [
      {
        ax: -w / 2,
        ay: -h / 2,
        bx: w / 2,
        by: -h / 2
      },
      { ax: w / 2, ay: -h / 2, bx: w / 2, by: h / 2 },
      { ax: w / 2, ay: h / 2, bx: -w / 2, by: h / 2 },
      {
        ax: -w / 2,
        ay: h / 2,
        bx: -w / 2,
        by: -h / 2
      }
    ];
    const segs = 6;
    const amp = h * 0.07;
    edges.forEach((e, ei) => {
      const dx = e.bx - e.ax;
      const dy = e.by - e.ay;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      g.moveTo(e.ax, e.ay);
      for (let s = 1; s < segs; s++) {
        const f = s / segs;
        const off = Math.sin(t * 9 + ei * 2.3 + s * 1.7) * amp;
        g.lineTo(e.ax + dx * f + nx * off, e.ay + dy * f + ny * off);
      }
      g.lineTo(e.bx, e.by);
    });
    g.stroke({
      width: 2,
      color: 16777215,
      alpha: 0.45 + glow * 0.45
    });
  };
  const drawScatterRing = (g) => {
    const p = scatterFx.ring;
    if (p <= 0 || p >= 1) return;
    const base = Math.max(symbolSize.width, symbolSize.height) * 0.55;
    const r = base * (0.7 + p * 1);
    g.circle(0, 0, r).stroke({
      width: Math.max(1, 5 * (1 - p)),
      color: 16770726,
      alpha: (1 - p) * 0.9
    });
  };
  Container($$payload, {
    x: props.x,
    y: props.y,
    scale: {
      x: scale.current * winFx.squashX,
      y: scale.current * winFx.squashY
    },
    alpha: alpha.current,
    children: ($$payload2) => {
      if (isResolvedEye) {
        $$payload2.out += "<!--[-->";
        AbyssalEye($$payload2, {
          size: eyeSize,
          variant: props.rawSymbol.eyeType === "MUL" ? "mult" : "add",
          text: eyeNumber,
          land: props.state === "land",
          reveal: Boolean(eyeNumber),
          pulse: props.state === "land",
          intensity: gazeIntensity
        });
      } else {
        $$payload2.out += "<!--[!-->";
        if (isUnresolvedEye) {
          $$payload2.out += "<!--[-->";
          AbyssalEye($$payload2, {
            size: eyeSize,
            variant: "close",
            land: props.state === "land",
            reveal: false,
            pulse: false,
            intensity: gazeIntensity
          });
        } else {
          $$payload2.out += "<!--[!-->";
          if (electricOn) {
            $$payload2.out += "<!--[-->";
            Container($$payload2, {
              blendMode: "add",
              children: ($$payload3) => {
                Graphics($$payload3, { draw: drawElectric });
              },
              $$slots: { default: true }
            });
          } else {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]--> `;
          if (frame) {
            $$payload2.out += "<!--[-->";
            if (isScatter) {
              $$payload2.out += "<!--[-->";
              if (scatterFx.connect > 0) {
                $$payload2.out += "<!--[-->";
                Sprite($$payload2, {
                  key: frame,
                  anchor: 0.5,
                  width: symbolSize.width * 1.16 * scatterFx.breathe,
                  height: symbolSize.height * 1.16 * scatterFx.breathe,
                  alpha: scatterFx.connect * 0.55,
                  tint: 16770726,
                  blendMode: "add"
                });
              } else {
                $$payload2.out += "<!--[!-->";
              }
              $$payload2.out += `<!--]--> `;
              Sprite($$payload2, {
                key: frame,
                anchor: 0.5,
                width: symbolSize.width * scatterFx.breathe,
                height: symbolSize.height * scatterFx.breathe
              });
              $$payload2.out += `<!----> `;
              if (scatterFx.flare > 0) {
                $$payload2.out += "<!--[-->";
                Sprite($$payload2, {
                  key: frame,
                  anchor: 0.5,
                  width: symbolSize.width * scatterFx.breathe,
                  height: symbolSize.height * scatterFx.breathe,
                  alpha: scatterFx.flare,
                  tint: 16777215,
                  blendMode: "add"
                });
              } else {
                $$payload2.out += "<!--[!-->";
              }
              $$payload2.out += `<!--]--> `;
              if (scatterFx.ring > 0 && scatterFx.ring < 1) {
                $$payload2.out += "<!--[-->";
                Container($$payload2, {
                  blendMode: "add",
                  children: ($$payload3) => {
                    Graphics($$payload3, { draw: drawScatterRing });
                  },
                  $$slots: { default: true }
                });
              } else {
                $$payload2.out += "<!--[!-->";
              }
              $$payload2.out += `<!--]-->`;
            } else {
              $$payload2.out += "<!--[!-->";
              Sprite($$payload2, {
                key: frame,
                anchor: 0.5,
                width: symbolSize.width,
                height: symbolSize.height
              });
            }
            $$payload2.out += `<!--]-->`;
          } else {
            $$payload2.out += "<!--[!-->";
            Graphics($$payload2, { draw });
            $$payload2.out += `<!----> `;
            Text($$payload2, {
              anchor: 0.5,
              text: info.label,
              style: {
                fontFamily: "sans-serif",
                fontWeight: "700",
                fontSize: SYMBOL_SIZE * (info.label.length > 2 ? 0.24 : 0.34),
                fill: isSpecial ? info.glow : 329743
              }
            });
            $$payload2.out += `<!---->`;
          }
          $$payload2.out += `<!--]--> `;
          if (winFx.glow > 0 && frame) {
            $$payload2.out += "<!--[-->";
            Sprite($$payload2, {
              key: frame,
              anchor: 0.5,
              width: symbolSize.width * 1.12,
              height: symbolSize.height * 1.12,
              alpha: winFx.glow,
              tint: 16777215,
              blendMode: "add"
            });
          } else {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]--> `;
          if (boomFx.flash > 0) {
            $$payload2.out += "<!--[-->";
            if (frame) {
              $$payload2.out += "<!--[-->";
              Sprite($$payload2, {
                key: frame,
                anchor: 0.5,
                width: symbolSize.width,
                height: symbolSize.height,
                alpha: boomFx.flash,
                tint: 16777215,
                blendMode: "add"
              });
            } else {
              $$payload2.out += "<!--[!-->";
              Graphics($$payload2, {
                alpha: boomFx.flash,
                blendMode: "add",
                draw: (g) => g.roundRect(-symbolSize.width / 2 + PAD, -symbolSize.height / 2 + PAD, symbolSize.width - PAD * 2, symbolSize.height - PAD * 2, 14).fill({ color: 16777215 })
              });
            }
            $$payload2.out += `<!--]-->`;
          } else {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]-->`;
        }
        $$payload2.out += `<!--]-->`;
      }
      $$payload2.out += `<!--]-->`;
    },
    $$slots: { default: true }
  });
  pop();
}
function SymbolWrap($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const boardContext = getContextBoard();
  const show = boardContext.animate && props.animating || !boardContext.animate && !props.animating;
  const top = 0;
  const bottom = BOARD_SIZES.height;
  const inFrame = props.y >= top && props.y <= bottom;
  if (show && inFrame) {
    $$payload.out += "<!--[-->";
    Container($$payload, {
      x: props.x,
      y: props.y,
      children: ($$payload2) => {
        props.children($$payload2);
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function ReelSymbol($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const symbolInfo = getSymbolInfo({
    rawSymbol: props.reelSymbol.rawSymbol,
    state: props.reelSymbol.symbolState
  });
  SymbolWrap($$payload, {
    x: getSymbolX(props.reelIndex),
    y: props.reelSymbol.symbolY.current,
    animating: symbolInfo.type === "spine" && (props.reelSymbol.symbolState === "land" || props.reelSymbol.symbolState === "win"),
    children: ($$payload2) => {
      Symbol$1($$payload2, {
        state: props.reelSymbol.symbolState,
        rawSymbol: props.reelSymbol.rawSymbol,
        oncomplete: () => {
          if (props.reelSymbol.symbolState === "win") props.reelSymbol.oncomplete();
          if (props.reelSymbol.symbolState === "land") props.reelSymbol.symbolState = "static";
        }
      });
    },
    $$slots: { default: true }
  });
  pop();
}
function BoardBase($$payload, $$props) {
  push();
  const context2 = getContext();
  const each_array = ensure_array_like(context2.stateGame.board);
  $$payload.out += `<!--[-->`;
  for (let reelIndex = 0, $$length = each_array.length; reelIndex < $$length; reelIndex++) {
    let reel = each_array[reelIndex];
    const each_array_1 = ensure_array_like(reel.reelState.symbols);
    $$payload.out += `<!--[-->`;
    for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
      let reelSymbol = each_array_1[$$index];
      ReelSymbol($$payload, { reelIndex, reelSymbol });
    }
    $$payload.out += `<!--]-->`;
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function Board($$payload, $$props) {
  push();
  const context2 = getContext();
  let show = true;
  context2.eventEmitter.subscribeOnMount({
    stopButtonClick: () => context2.stateGameDerived.enhancedBoard.stop(),
    boardSettle: ({ board: board2 }) => context2.stateGameDerived.enhancedBoard.settle(board2),
    boardShow: () => show = true,
    boardHide: () => show = false,
    boardWithAnimateSymbols: async ({ symbolPositions }) => {
      const uniquePositions = _.uniqBy(symbolPositions, ({ reel, row }) => `${reel}-${row}`);
      const getPromises = () => uniquePositions.map(async (position) => {
        const reelSymbol = context2.stateGame.board[position.reel]?.reelState.symbols[getPaddedRowIndex(position.row)];
        if (!reelSymbol) return;
        reelSymbol.symbolState = "win";
        await waitForResolve((resolve) => reelSymbol.oncomplete = resolve);
        reelSymbol.symbolState = "postWinStatic";
      });
      await Promise.all(getPromises());
    }
  });
  context2.stateGameDerived.enhancedBoard.readyToSpinEffect();
  if (show) {
    $$payload.out += "<!--[-->";
    BoardContext($$payload, {
      animate: false,
      children: ($$payload2) => {
        BoardContainer($$payload2, {
          children: ($$payload3) => {
            BoardMask($$payload3, {});
            $$payload3.out += `<!----> `;
            BoardBase($$payload3);
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!----> `;
    BoardContext($$payload, {
      animate: true,
      children: ($$payload2) => {
        BoardContainer($$payload2, {
          children: ($$payload3) => {
            BoardBase($$payload3);
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function Anticipation($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  pop();
}
function Anticipations($$payload, $$props) {
  push();
  const context2 = getContext();
  const hasAnticipation = context2.stateGame.board.some((reel) => reel.reelState.anticipating);
  const each_array = ensure_array_like(context2.stateGame.board);
  if (hasAnticipation) {
    $$payload.out += "<!--[-->";
    OnMount($$payload, {
      onmount: () => {
        context2.eventEmitter.broadcast({ type: "reelFrameScatterAnticipationStart" });
        return () => context2.eventEmitter.broadcast({ type: "reelFrameScatterAnticipationEnd" });
      }
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <!--[-->`;
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let reel = each_array[$$index];
    if (reel.reelState.anticipating) {
      $$payload.out += "<!--[-->";
      Anticipation($$payload, {
        reel,
        oncomplete: () => reel.reelState.anticipating = false
      });
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]-->`;
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function ClusterWinAmount($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const y = new Tween(0);
  const scale = new Tween(0.4, { duration: 180, easing: backOut });
  let show = true;
  FadeContainer($$payload, {
    show,
    duration: 180,
    oncomplete: () => {
    },
    children: ($$payload2) => {
      Text($$payload2, {
        x: getPositionX(props.win.reel),
        y: getPositionY(props.win.row) + y.current,
        scale: scale.current,
        text: bookEventAmountToCurrencyString(props.win.win),
        anchor: 0.5,
        style: {
          fontFamily: "sans-serif",
          fontWeight: "800",
          fontSize: SYMBOL_SIZE * 0.5,
          fill: 16765562
        }
      });
    },
    $$slots: { default: true }
  });
  pop();
}
function ClusterWinAmounts($$payload, $$props) {
  push();
  const context2 = getContext();
  let wins = [];
  context2.eventEmitter.subscribeOnMount({
    showClusterWinAmounts: async (emitterEvent) => {
      wins = emitterEvent.wins.map((rawWin) => ({ ...rawWin, oncomplete: () => {
      } }));
      const gerPromises = () => wins.map(async (win) => {
        await waitForResolve((resolve) => win.oncomplete = resolve);
      });
      await Promise.all(gerPromises());
      wins = [];
    }
  });
  BoardContainer($$payload, {
    children: ($$payload2) => {
      const each_array = ensure_array_like(wins);
      $$payload2.out += `<!--[-->`;
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let win = each_array[$$index];
        ClusterWinAmount($$payload2, { win });
      }
      $$payload2.out += `<!--]-->`;
    },
    $$slots: { default: true }
  });
  pop();
}
function TumbleSymbol($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const symbolInfo = getSymbolInfo({
    rawSymbol: props.tumbleSymbol.rawSymbol,
    state: props.tumbleSymbol.symbolState
  });
  SymbolWrap($$payload, {
    x: getSymbolX(props.reelIndex),
    y: props.tumbleSymbol.symbolY.current,
    animating: symbolInfo.type === "spine",
    children: ($$payload2) => {
      Symbol$1($$payload2, {
        state: props.tumbleSymbol.symbolState,
        rawSymbol: props.tumbleSymbol.rawSymbol,
        oncomplete: props.tumbleSymbol.oncomplete
      });
    },
    $$slots: { default: true }
  });
  pop();
}
function TumbleBoardBase($$payload, $$props) {
  push();
  const context2 = getContext();
  const each_array = ensure_array_like(context2.stateGameDerived.tumbleBoardCombined());
  $$payload.out += `<!--[-->`;
  for (let reelIndex = 0, $$length = each_array.length; reelIndex < $$length; reelIndex++) {
    let tumbleSymbols = each_array[reelIndex];
    const each_array_1 = ensure_array_like(tumbleSymbols);
    $$payload.out += `<!--[-->`;
    for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
      let tumbleSymbol = each_array_1[$$index];
      TumbleSymbol($$payload, { reelIndex, tumbleSymbol });
    }
    $$payload.out += `<!--]-->`;
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function TumbleBoard($$payload, $$props) {
  push();
  const context2 = getContext();
  let show = false;
  const createTumbleSymbol = ({ initY, rawSymbol }) => {
    const symbolY = new Tween(initY);
    const oncomplete = () => {
    };
    const tumbleSymbol = {
      symbolY,
      rawSymbol,
      symbolState: "static",
      oncomplete
    };
    return tumbleSymbol;
  };
  const initTumbleBoardAdding = ({ addingBoard }) => {
    return context2.stateGameDerived.boardRaw().map((_2, reelIndex) => {
      const addingReel = addingBoard[reelIndex] ?? [];
      const tumbleReelAdding = addingReel.map((rawSymbol, symbolIndex) => {
        const initY = getSymbolY(symbolIndex - 1 - addingReel.length);
        return createTumbleSymbol({ initY, rawSymbol });
      });
      return tumbleReelAdding;
    });
  };
  const initTumbleBoardBase = () => {
    return context2.stateGameDerived.boardRaw().map((rawSymbolReel) => {
      const tumbleReelBase = rawSymbolReel.map((rawSymbol, symbolIndex) => {
        const initY = getSymbolY(symbolIndex - 1);
        return createTumbleSymbol({ initY, rawSymbol });
      });
      return tumbleReelBase;
    });
  };
  context2.eventEmitter.subscribeOnMount({
    tumbleBoardShow: () => show = true,
    tumbleBoardHide: () => show = false,
    tumbleBoardInit: ({ addingBoard }) => {
      context2.stateGame.tumbleBoardAdding = initTumbleBoardAdding({ addingBoard });
      context2.stateGame.tumbleBoardBase = initTumbleBoardBase();
    },
    tumbleBoardReset: () => {
      context2.stateGame.tumbleBoardAdding = [];
      context2.stateGame.tumbleBoardBase = [];
    },
    tumbleBoardExplode: async ({ explodingPositions }) => {
      const uniquePositions = _.uniqBy(explodingPositions, ({ reel, row }) => `${reel}-${row}`);
      context2.eventEmitter.broadcast({
        type: "boardDebris",
        cells: uniquePositions.flatMap((position) => {
          const tumbleSymbol = context2.stateGame.tumbleBoardBase[position.reel]?.[getPaddedRowIndex(position.row)];
          if (!tumbleSymbol) return [];
          return [
            {
              reel: position.reel,
              row: position.row,
              color: getSymbolInfo({
                rawSymbol: tumbleSymbol.rawSymbol,
                state: "explosion"
              }).color
            }
          ];
        })
      });
      const getPromises = () => uniquePositions.map(async (position) => {
        const tumbleSymbol = context2.stateGame.tumbleBoardBase[position.reel]?.[getPaddedRowIndex(position.row)];
        if (!tumbleSymbol) return;
        tumbleSymbol.symbolState = "explosion";
        await waitForResolve((resolve) => tumbleSymbol.oncomplete = resolve);
      });
      await Promise.all(getPromises());
    },
    tumbleBoardRemoveExploded: () => {
      context2.stateGame.tumbleBoardBase.forEach((tumbleReel, reelIndex) => {
        context2.stateGame.tumbleBoardBase[reelIndex] = tumbleReel.filter((tumbleSymbol) => tumbleSymbol.symbolState !== "explosion");
      });
    },
    tumbleBoardSlideDown: async () => {
      const COLUMN_STAGGER = 80;
      const ts = stateBetDerived.timeScale();
      const getPromises = () => context2.stateGameDerived.tumbleBoardCombined().map(async (tumbleReel, reelIndex) => {
        if (reelIndex > 0) await waitForTimeout(reelIndex * COLUMN_STAGGER / ts);
        await Promise.all(tumbleReel.map(async (tumbleSymbol, symbolIndex) => {
          const targetY = getSymbolY(symbolIndex - 1);
          if (targetY === tumbleSymbol.symbolY.current) return;
          await tumbleSymbol.symbolY.set(targetY, { duration: 200, easing: backOut });
          const isInner = symbolIndex > 0 && symbolIndex < tumbleReel.length - 1;
          if (isInner && tumbleSymbol.rawSymbol.name !== "EYE") {
            tumbleSymbol.symbolState = "land";
            context2.stateGameDerived.onSymbolLand({ rawSymbol: tumbleSymbol.rawSymbol });
            await waitForResolve((resolve) => {
              tumbleSymbol.oncomplete = () => {
                tumbleSymbol.symbolState = "static";
                resolve();
              };
            });
          }
        }));
      });
      await Promise.all(getPromises());
    }
  });
  if (show) {
    $$payload.out += "<!--[-->";
    BoardContext($$payload, {
      animate: false,
      children: ($$payload2) => {
        BoardContainer($$payload2, {
          children: ($$payload3) => {
            BoardMask($$payload3, {});
            $$payload3.out += `<!----> `;
            TumbleBoardBase($$payload3);
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!----> `;
    BoardContext($$payload, {
      animate: true,
      children: ($$payload2) => {
        BoardContainer($$payload2, {
          children: ($$payload3) => {
            TumbleBoardBase($$payload3);
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function BoardDebris($$payload, $$props) {
  push();
  const context2 = getContext();
  let now2 = performance.now();
  let bursts = [];
  let nextId = 0;
  context2.eventEmitter.subscribeOnMount({
    boardDebris: ({ cells }) => {
      const t = performance.now();
      const duration = 620 / stateBetDerived.timeScale();
      const spawned = cells.map((cell) => {
        const count = 11;
        const shards = Array.from({ length: count }, (_2, i) => ({
          angle: i / count * Math.PI * 2 + Math.random() * 0.55,
          dist: SYMBOL_SIZE * (0.6 + Math.random() * 1),
          size: SYMBOL_SIZE * (0.07 + Math.random() * 0.08)
        }));
        return {
          id: nextId++,
          x: getPositionX(cell.reel),
          y: getPositionY(cell.row),
          color: cell.color,
          start: t,
          duration,
          shards
        };
      });
      bursts = [...bursts, ...spawned];
    }
  });
  const easeOut = (p) => 1 - (1 - p) * (1 - p);
  const drawBurst = (g, burst) => {
    const p = Math.min(1, (now2 - burst.start) / burst.duration);
    if (p >= 1) return;
    const e = easeOut(p);
    const fade = 1 - p;
    const gravity = SYMBOL_SIZE * 1 * p * p;
    for (const s of burst.shards) {
      const dist = s.dist * e;
      const x = Math.cos(s.angle) * dist;
      const y = Math.sin(s.angle) * dist + gravity;
      const r = s.size * (1 - p * 0.55);
      const tail = s.size * 2.2;
      g.moveTo(x - Math.cos(s.angle) * tail, y - Math.sin(s.angle) * tail).lineTo(x, y).stroke({
        width: Math.max(1, r * 0.7),
        color: burst.color,
        alpha: fade * 0.8
      });
      g.circle(x, y, r * 0.55).fill({ color: 16777215, alpha: fade });
    }
  };
  BoardContainer($$payload, {
    children: ($$payload2) => {
      Container($$payload2, {
        blendMode: "add",
        children: ($$payload3) => {
          const each_array = ensure_array_like(bursts);
          $$payload3.out += `<!--[-->`;
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let burst = each_array[$$index];
            Container($$payload3, {
              x: burst.x,
              y: burst.y,
              children: ($$payload4) => {
                Graphics($$payload4, { draw: (g) => drawBurst(g, burst) });
              },
              $$slots: { default: true }
            });
          }
          $$payload3.out += `<!--]-->`;
        },
        $$slots: { default: true }
      });
    },
    $$slots: { default: true }
  });
  pop();
}
function TumbleWinAmountWrap($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const context2 = getContext();
  const desktopPosition = {
    x: context2.stateGameDerived.boardLayout().width * 0.5,
    y: -SYMBOL_SIZE * 0.8 * 0.58
  };
  const portraitPosition = {
    x: context2.stateGameDerived.boardLayout().width * (context2.stateGame.gameType === "basegame" ? 0.5 : 0.37),
    y: -SYMBOL_SIZE * 0.8 * 0.68
  };
  const position = context2.stateLayoutDerived.isStacked() ? portraitPosition : desktopPosition;
  const scale = context2.stateLayoutDerived.isStacked() ? 1.28 : 1;
  FadeContainer($$payload, {
    show: props.show,
    children: ($$payload2) => {
      BoardContainer($$payload2, {
        children: ($$payload3) => {
          Container($$payload3, spread_props([
            position,
            {
              scale,
              children: ($$payload4) => {
                props.children($$payload4);
                $$payload4.out += `<!---->`;
              },
              $$slots: { default: true }
            }
          ]));
        },
        $$slots: { default: true }
      });
    },
    $$slots: { default: true }
  });
  pop();
}
function TumbleWinAmountFrame($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const TITLE_RATIO = 532 / 143;
  const TITLE_HEIGHT = SYMBOL_SIZE * 0.28;
  const TITLE_SIZES = {
    width: TITLE_HEIGHT * TITLE_RATIO,
    height: TITLE_HEIGHT
  };
  const PANEL_RATIO = 1442 / 374;
  const PANEL_HEIGHT = SYMBOL_SIZE * 0.8;
  const PANEL_SIZES = {
    width: PANEL_HEIGHT * PANEL_RATIO,
    height: PANEL_HEIGHT
  };
  Graphics($$payload, {
    draw: (g) => {
      g.roundRect(-PANEL_SIZES.width / 2, -PANEL_SIZES.height / 2, PANEL_SIZES.width, PANEL_SIZES.height, 14).fill({ color: 329743, alpha: 0.78 });
      g.roundRect(-PANEL_SIZES.width / 2, -PANEL_SIZES.height / 2, PANEL_SIZES.width, PANEL_SIZES.height, 14).stroke({ width: 2, color: 2285823, alpha: 0.6 });
    }
  });
  $$payload.out += `<!----> `;
  Container($$payload, {
    y: -TITLE_HEIGHT * 1.2,
    children: ($$payload2) => {
      Graphics($$payload2, {
        draw: (g) => {
          g.roundRect(-TITLE_SIZES.width / 2, -TITLE_SIZES.height / 2, TITLE_SIZES.width, TITLE_SIZES.height, 8).fill({ color: 2285823, alpha: 0.9 });
        }
      });
      $$payload2.out += `<!----> `;
      Text($$payload2, {
        anchor: 0.5,
        y: -TITLE_HEIGHT * 0.025,
        text: "TUMBLE WIN",
        style: {
          fontFamily: "sans-serif",
          fontWeight: "800",
          fontSize: TITLE_HEIGHT * 0.45,
          fill: 329743
        }
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----> `;
  props.children($$payload, { frameSizes: PANEL_SIZES });
  $$payload.out += `<!---->`;
  pop();
}
function TumbleWinAmountText($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const amount2 = new Tween(0);
  const scale = new Tween(1, { duration: 160, easing: backOut });
  Container($$payload, {
    scale: scale.current,
    children: ($$payload2) => {
      ResponsiveText($$payload2, {
        anchor: 0.5,
        maxWidth: props.width,
        text: bookEventAmountToCurrencyString(amount2.current),
        style: {
          fontFamily: "sans-serif",
          fontWeight: "800",
          fontSize: 0.65 * SYMBOL_SIZE,
          fill: 16765562
        }
      });
    },
    $$slots: { default: true }
  });
  pop();
}
function TumbleWinAmount($$payload, $$props) {
  push();
  const context2 = getContext();
  let show = false;
  let amount2 = 0;
  let animate = false;
  let oncomplete = () => {
  };
  context2.eventEmitter.subscribeOnMount({
    tumbleWinAmountShow: () => show = true,
    tumbleWinAmountHide: () => show = false,
    tumbleWinAmountReset: () => {
      amount2 = 0;
      animate = false;
      oncomplete = () => {
      };
    },
    tumbleWinAmountUpdate: async (emitterEvent) => {
      if (amount2 !== emitterEvent.amount) {
        amount2 = emitterEvent.amount;
        animate = emitterEvent.animate;
        await waitForResolve((resolve) => oncomplete = resolve);
      }
    }
  });
  TumbleWinAmountWrap($$payload, {
    show,
    children: ($$payload2) => {
      {
        let children = function($$payload3, { frameSizes }) {
          TumbleWinAmountText($$payload3, {
            amount: amount2,
            animate,
            oncomplete,
            width: frameSizes.width
          });
        };
        TumbleWinAmountFrame($$payload2, { children, $$slots: { default: true } });
      }
    },
    $$slots: { default: true }
  });
  pop();
}
function GazeMeter($$payload, $$props) {
  push();
  const context2 = getContext();
  let show = false;
  let charge = 0;
  let sourcePositions = [];
  let eyeCell = { reel: 3, row: 3 };
  let flying = false;
  let eyeIdle = { alpha: 0.92 };
  let fx = {
    eyeScale: 1,
    burst: 0,
    burstScale: 0.9,
    particle: 0,
    textScale: 1,
    overcharge: 0
  };
  const animations = /* @__PURE__ */ new Set();
  const fill = new Tween(0, { duration: 320 });
  const energy = new Tween(0, { duration: 260 });
  const toEye = new Tween(0, { duration: 1 });
  const skinAlpha = new Tween(1, { duration: 500 });
  const isMobile = context2.stateLayoutDerived.layoutType() === "portrait";
  const gazeSkin = context2.stateGame.gameType === "freegame" ? {
    frame: "gaze_meter_fs_frame_empty",
    eye: "gaze_meter_fs_eye_top",
    glow: "gaze_meter_fs_glow_soft",
    particle: "gaze_meter_fs_particle_burst",
    liquidTop: 16738675,
    liquidMid: 11738925,
    liquidBottom: 3671306,
    chamber: 3212553,
    meniscus: 16761801,
    bubble: 16764112,
    energy: 14235206,
    rim: 16753322
  } : {
    frame: "gaze_meter_frame_empty",
    eye: "gaze_meter_eye_top",
    glow: "gaze_meter_glow_soft",
    particle: "gaze_meter_particle_burst",
    liquidTop: 5227743,
    liquidMid: 2325673,
    liquidBottom: 534854,
    chamber: 335156,
    meniscus: 11464447,
    bubble: 10807545,
    energy: 1472424,
    rim: 4040664
  };
  const gazeH = BOARD_SIZES.height * (isMobile ? 0.43 : 0.78);
  const gazeW = getGazeMeterDisplayWidth(gazeH);
  const position = {
    x: isMobile ? -gazeW * 0.1 : -gazeW - SYMBOL_SIZE * 0.5,
    // Portrait HUD sits entirely above the reel bounds, with a small scaled gap.
    y: isMobile ? -gazeH - SYMBOL_SIZE * 0.16 : (BOARD_SIZES.height - gazeH) / 2 - SYMBOL_SIZE * 1.3
  };
  const tubeX = gazeW * GAZE_METER_LAYOUT.inner.left;
  const tubeW = gazeW * (GAZE_METER_LAYOUT.inner.right - GAZE_METER_LAYOUT.inner.left);
  const tubeTop = gazeH * GAZE_METER_LAYOUT.inner.top;
  const tubeH = gazeH * (GAZE_METER_LAYOUT.inner.bottom - GAZE_METER_LAYOUT.inner.top);
  const tubeRadius = tubeW * GAZE_METER_LAYOUT.inner.radius;
  const segmentH = tubeH / GAZE_METER_MAX_CHARGE;
  const eyeX = gazeW * GAZE_METER_LAYOUT.eye.x;
  const eyeY = gazeH * GAZE_METER_LAYOUT.eye.y;
  const eyeArtworkOffsetY = eyeY - gazeH * 0.5;
  const meterEnergyX = position.x + eyeX;
  const meterEnergyY = position.y + eyeY;
  const showMultiplier = charge > 0 && !flying;
  const segmentFill = Array.from({ length: GAZE_METER_MAX_CHARGE }, (_2, index) => Math.min(Math.max(fill.current * GAZE_METER_MAX_CHARGE - index, 0), 1));
  const track = (animation) => {
    animations.add(animation);
    animation.eventCallback("onComplete", () => animations.delete(animation));
    return animation;
  };
  const playChargeFx = (overcharged = false) => {
    gsap.killTweensOf(fx);
    const timeline = gsap.timeline();
    track(timeline);
    timeline.set(fx, {
      eyeScale: 1,
      burst: 0,
      burstScale: 0.86,
      particle: 0,
      textScale: 0.9
    }).to(fx, {
      eyeScale: overcharged ? 1.16 : 1.1,
      burst: 0.92,
      burstScale: 1.08,
      particle: 1,
      textScale: 1.12,
      duration: 0.14,
      ease: "power2.out"
    }).to(fx, {
      eyeScale: 1,
      burst: 0,
      burstScale: overcharged ? 1.55 : 1.35,
      particle: 0,
      textScale: 1,
      duration: overcharged ? 0.5 : 0.32,
      ease: "power2.out"
    });
    if (overcharged) {
      track(gsap.fromTo(fx, { overcharge: 0 }, {
        overcharge: 1,
        duration: 0.36,
        repeat: 1,
        yoyo: true,
        ease: "sine.inOut"
      }));
    }
  };
  const setCharge = async (value) => {
    charge = value;
    await fill.set(Math.min(value / GAZE_METER_MAX_CHARGE, 1));
  };
  context2.eventEmitter.subscribeOnMount({
    gazeMeterShow: () => show = true,
    gazeMeterHide: () => show = false,
    gazeMeterReset: () => {
      charge = 0;
      sourcePositions = [];
      flying = false;
      gsap.killTweensOf(fx);
      Object.assign(fx, {
        eyeScale: 1,
        burst: 0,
        burstScale: 0.9,
        particle: 0,
        textScale: 1,
        overcharge: 0
      });
      fill.set(0, { duration: 0 });
      energy.set(0, { duration: 0 });
      toEye.set(0, { duration: 0 });
    },
    gazeMeterFill: async (emitterEvent) => {
      show = true;
      sourcePositions = emitterEvent.fromPositions;
      context2.eventEmitter.broadcast({
        type: "soundOnce",
        name: "sfx_reel_stop_1",
        forcePlay: !stateBetDerived.isContinuousBet()
      });
      energy.set(1, { duration: 0 });
      await setCharge(emitterEvent.charge);
      playChargeFx(emitterEvent.charge > GAZE_METER_MAX_CHARGE);
      await energy.set(0);
    },
    // remember where the Eye is so the connect energy knows its target
    eyeShow: (e) => eyeCell = { reel: e.reel, row: e.row },
    // the Eye connects: launch the charge from the meter into the Eye, then drain the bar
    gazeMeterToEye: async () => {
      if (charge <= 0) return;
      flying = true;
      toEye.set(0, { duration: 0 });
      await toEye.set(1, { duration: 540, easing: cubicOut });
      await fill.set(0, { duration: 300 });
      flying = false;
      toEye.set(0, { duration: 0 });
    },
    gazeMeterDrain: async () => {
      await fill.set(0, { duration: 420 });
      await waitForResolve((resolve) => setTimeout(resolve, 120));
      charge = 0;
      sourcePositions = [];
    }
  });
  const drawEnergyIn = (g) => {
    if (energy.current <= 0) return;
    const alpha = energy.current * 0.5;
    for (const source2 of sourcePositions.slice(0, 18)) {
      const sx = getPositionX(source2.reel);
      const sy = getPositionY(source2.row);
      const midX = sx + (meterEnergyX - sx) * 0.6;
      const midY = sy + (meterEnergyY - sy) * 0.45 - SYMBOL_SIZE * 0.35;
      g.moveTo(sx, sy).quadraticCurveTo(midX, midY, meterEnergyX, meterEnergyY).stroke({ width: 2.4, color: gazeSkin.energy, alpha });
    }
  };
  const drawEnergyOut = (g) => {
    if (!flying) return;
    const t = toEye.current;
    const ex = getPositionX(eyeCell.reel);
    const ey = getPositionY(eyeCell.row);
    const headX = meterEnergyX + (ex - meterEnergyX) * t;
    const headY = meterEnergyY + (ey - meterEnergyY) * t - Math.sin(t * Math.PI) * SYMBOL_SIZE * 0.6;
    g.moveTo(meterEnergyX, meterEnergyY).quadraticCurveTo((meterEnergyX + ex) / 2, Math.min(meterEnergyY, ey) - SYMBOL_SIZE * 0.6, headX, headY).stroke({
      width: 3,
      color: gazeSkin.rim,
      alpha: 0.5 * (1 - t * 0.4)
    });
  };
  const flyT = toEye.current;
  const flyX = meterEnergyX + (getPositionX(eyeCell.reel) - meterEnergyX) * flyT;
  const flyY = meterEnergyY + (getPositionY(eyeCell.row) - meterEnergyY) * flyT - Math.sin(flyT * Math.PI) * SYMBOL_SIZE * 0.6;
  const flyAlpha = flyT < 0.82 ? 1 : Math.max(0, 1 - (flyT - 0.82) / 0.18);
  const drawTubeMask = (g) => {
    g.roundRect(tubeX, tubeTop, tubeW, tubeH, tubeRadius).fill(16777215);
  };
  const drawSegment = (g) => {
    const outerRadius = Math.min(10, segmentH * 0.18);
    const innerRadius = Math.min(7, segmentH * 0.12);
    const innerX = 8;
    const innerY = 5;
    const innerW = tubeW - innerX * 2;
    const innerH = segmentH - innerY * 2;
    const liquid = new FillGradient({
      textureSpace: "local",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: gazeSkin.liquidTop },
        { offset: 0.24, color: gazeSkin.liquidMid },
        { offset: 1, color: gazeSkin.liquidBottom }
      ]
    });
    g.roundRect(2, 2, tubeW - 4, segmentH - 4, outerRadius).fill({ color: gazeSkin.chamber, alpha: 0.88 });
    g.roundRect(innerX, innerY, innerW, innerH, innerRadius).fill(liquid);
    g.roundRect(innerX + 3, innerY + 3, innerW - 6, Math.min(5, innerH * 0.22), innerRadius).fill({ color: gazeSkin.meniscus, alpha: 0.58 });
    g.circle(innerX + innerW * 0.3, innerY + innerH * 0.64, Math.min(3, innerW * 0.055)).fill({ color: gazeSkin.bubble, alpha: 0.24 });
    g.circle(innerX + innerW * 0.68, innerY + innerH * 0.38, Math.min(2, innerW * 0.04)).fill({ color: gazeSkin.meniscus, alpha: 0.36 });
  };
  const drawFrontDividers = (g) => {
    for (let index = 1; index < GAZE_METER_MAX_CHARGE; index++) {
      const y = tubeTop + index * segmentH;
      g.roundRect(tubeX + 5, y - 2, tubeW - 10, 4, 2).fill({ color: 16766315, alpha: 0.78 });
      g.roundRect(tubeX + 10, y - 0.75, tubeW - 20, 1.5, 0.75).fill({ color: 16777215, alpha: 0.62 });
    }
  };
  FadeContainer($$payload, {
    show,
    children: ($$payload2) => {
      BoardContainer($$payload2, {
        children: ($$payload3) => {
          Graphics($$payload3, { draw: drawEnergyIn });
          $$payload3.out += `<!----> `;
          Graphics($$payload3, { draw: drawEnergyOut });
          $$payload3.out += `<!----> `;
          Container($$payload3, {
            x: position.x,
            y: position.y,
            children: ($$payload4) => {
              Container($$payload4, {
                alpha: skinAlpha.current,
                children: ($$payload5) => {
                  $$payload5.out += `<!---->`;
                  {
                    Sprite($$payload5, {
                      key: gazeSkin.frame,
                      anchor: 0,
                      width: gazeW,
                      height: gazeH
                    });
                    $$payload5.out += `<!----> `;
                    Container($$payload5, {
                      children: ($$payload6) => {
                        const each_array = ensure_array_like(segmentFill);
                        Graphics($$payload6, { draw: drawTubeMask, isMask: true });
                        $$payload6.out += `<!----> <!--[-->`;
                        for (let index = 0, $$length = each_array.length; index < $$length; index++) {
                          let amount2 = each_array[index];
                          Container($$payload6, {
                            x: tubeX,
                            y: tubeTop + tubeH - index * segmentH,
                            pivot: { x: 0, y: segmentH },
                            scale: { x: 1, y: amount2 },
                            alpha: 0.76 + fx.overcharge * 0.2,
                            blendMode: "add",
                            children: ($$payload7) => {
                              Graphics($$payload7, { draw: drawSegment });
                            },
                            $$slots: { default: true }
                          });
                        }
                        $$payload6.out += `<!--]-->`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload5.out += `<!----> `;
                    Graphics($$payload5, { draw: drawFrontDividers });
                    $$payload5.out += `<!----> `;
                    Container($$payload5, {
                      x: eyeX,
                      y: eyeY,
                      pivot: { x: eyeX, y: eyeY },
                      scale: fx.eyeScale,
                      alpha: eyeIdle.alpha,
                      children: ($$payload6) => {
                        Sprite($$payload6, {
                          key: gazeSkin.eye,
                          x: 0,
                          y: eyeArtworkOffsetY,
                          width: gazeW,
                          height: gazeH
                        });
                      },
                      $$slots: { default: true }
                    });
                    $$payload5.out += `<!----> `;
                    Container($$payload5, {
                      x: eyeX,
                      y: eyeY,
                      pivot: { x: eyeX, y: eyeY },
                      scale: fx.burstScale,
                      alpha: fx.burst,
                      blendMode: "add",
                      children: ($$payload6) => {
                        Sprite($$payload6, {
                          key: gazeSkin.glow,
                          x: 0,
                          y: eyeArtworkOffsetY,
                          width: gazeW,
                          height: gazeH
                        });
                      },
                      $$slots: { default: true }
                    });
                    $$payload5.out += `<!----> `;
                    Container($$payload5, {
                      x: eyeX,
                      y: eyeY,
                      pivot: { x: eyeX, y: eyeY },
                      scale: fx.burstScale,
                      alpha: fx.particle,
                      blendMode: "add",
                      children: ($$payload6) => {
                        Sprite($$payload6, {
                          key: gazeSkin.particle,
                          x: 0,
                          y: eyeArtworkOffsetY,
                          width: gazeW,
                          height: gazeH
                        });
                      },
                      $$slots: { default: true }
                    });
                    $$payload5.out += `<!----> `;
                    if (showMultiplier) {
                      $$payload5.out += "<!--[-->";
                      Container($$payload5, {
                        x: gazeW * GAZE_METER_LAYOUT.plaque.x,
                        y: gazeH * GAZE_METER_LAYOUT.plaque.y,
                        scale: fx.textScale,
                        children: ($$payload6) => {
                          Text($$payload6, {
                            y: -gazeH * 0.015,
                            anchor: 0.5,
                            text: `${charge}x`,
                            style: {
                              fontFamily: "Cinzel, Georgia, serif",
                              fontWeight: "900",
                              fontSize: gazeH * 0.08,
                              fill: GAZE_METER_MULTIPLIER_COLOR,
                              stroke: { color: 465453, width: gazeH * 5e-3 },
                              dropShadow: {
                                color: 0,
                                blur: 4,
                                distance: 2,
                                alpha: 0.8
                              }
                            }
                          });
                        },
                        $$slots: { default: true }
                      });
                    } else {
                      $$payload5.out += "<!--[!-->";
                    }
                    $$payload5.out += `<!--]-->`;
                  }
                  $$payload5.out += `<!---->`;
                },
                $$slots: { default: true }
              });
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> `;
          if (flying) {
            $$payload3.out += "<!--[-->";
            Text($$payload3, {
              x: flyX,
              y: flyY,
              anchor: 0.5,
              alpha: flyAlpha,
              text: `×${charge}`,
              style: {
                fontFamily: "sans-serif",
                fontWeight: "900",
                fontSize: SYMBOL_SIZE * 0.34,
                fill: GAZE_METER_MULTIPLIER_COLOR,
                stroke: { color: 2755919, width: 5 },
                dropShadow: {
                  color: 0,
                  blur: 4,
                  distance: 2,
                  alpha: 0.8
                }
              }
            });
          } else {
            $$payload3.out += "<!--[!-->";
          }
          $$payload3.out += `<!--]-->`;
        },
        $$slots: { default: true }
      });
    },
    $$slots: { default: true }
  });
  pop();
}
function Eye($$payload, $$props) {
  push();
  const context2 = getContext();
  let show = false;
  let cell = { reel: 3, row: 3 };
  let isMul = false;
  let resolving = false;
  let total = 0;
  let displayTotal = 0;
  const eyeScale = new Tween(1, { duration: 180 });
  const numFx = { y: 0, alpha: 0, scale: 1, flash: 0 };
  const dimFx = { alpha: 0 };
  const convergeFx = { progress: 0 };
  let convergeParticles = [];
  const animations = /* @__PURE__ */ new Set();
  const track = (a) => {
    animations.add(a);
    a.eventCallback("onComplete", () => animations.delete(a));
    return a;
  };
  context2.eventEmitter.subscribeOnMount({
    eyeShow: (e) => {
      cell = { reel: e.reel, row: e.row };
      isMul = e.eyeType === "MUL";
      e.startValue;
      resolving = false;
      total = 0;
      displayTotal = 0;
      gsap.killTweensOf(numFx);
      Object.assign(numFx, { y: 0, alpha: 0, scale: 1, flash: 0 });
      show = false;
      context2.eventEmitter.broadcast({
        type: "soundOnce",
        name: isMul ? "sfx_multiplier_explosion_b" : "sfx_multiplier_win"
      });
      eyeScale.set(1.16, { duration: 0 });
      eyeScale.set(1, { duration: 180, easing: backOut });
    },
    // the eye drops in already showing its number (+N for ADD, ×N for MUL)
    // the eye connects: the Gaze flies up into the eye, combines (add/mult), then the
    // resulting multiplier rises toward the payout.
    eyeBurst: async (e) => {
      isMul = e.eyeType === "MUL";
      e.startValue;
      total = e.totalMult;
      displayTotal = Math.max(0, e.charge || 0);
      resolving = true;
      show = true;
      context2.eventEmitter.broadcast({
        type: "soundOnce",
        name: "sfx_multiplier_explosion_a"
      });
      gsap.killTweensOf(dimFx);
      track(gsap.timeline().to(dimFx, {
        alpha: isMul ? 0.82 : 0.62,
        duration: 0.14,
        ease: "power2.out"
      }).to(dimFx, { alpha: 0, duration: 0.5, ease: "power2.in" }, "+=0.45"));
      const count = isMul ? 18 : 12;
      convergeParticles = Array.from({ length: count }, (_2, i) => ({
        angle: i / count * Math.PI * 2 + Math.random() * 0.4,
        radius: SYMBOL_SIZE * (1.4 + Math.random() * 0.9),
        size: SYMBOL_SIZE * (0.04 + Math.random() * 0.04)
      }));
      gsap.killTweensOf(convergeFx);
      track(gsap.timeline().set(convergeFx, { progress: 0 }).to(convergeFx, {
        progress: 1,
        duration: 0.32,
        ease: "power2.in"
      }));
      await eyeScale.set(isMul ? 1.7 : 1.55, { duration: 170, easing: backOut });
      eyeScale.set(1, { duration: 280 });
      await new Promise((resolve) => {
        let timeline;
        timeline = gsap.timeline({
          onComplete: () => {
            animations.delete(timeline);
            resolve();
          }
        });
        animations.add(timeline);
        timeline.set(numFx, { y: 0, alpha: 1, scale: 0.5, flash: 0 }).to(numFx, {
          scale: 1.05,
          duration: 0.2,
          ease: "back.out(2.2)"
        }).to(
          { v: displayTotal },
          {
            v: total,
            duration: 0.26,
            ease: "power1.out",
            onUpdate() {
              displayTotal = Math.round(this.targets()[0].v);
            }
          },
          "<"
        ).set(numFx, { flash: 0.9 }).to(numFx, {
          scale: isMul ? 1.5 : 1.32,
          duration: 0.12,
          ease: "power3.out"
        }).to(numFx, { flash: 0, duration: 0.22, ease: "power2.out" }, "<").to(numFx, {
          scale: 1.1,
          duration: 0.1,
          ease: "power1.inOut"
        }).to(numFx, {
          y: -SYMBOL_SIZE * 1.9,
          alpha: 0,
          duration: 0.6,
          ease: "power2.out"
        });
      });
    },
    eyeHide: () => {
      show = false;
      resolving = false;
      gsap.killTweensOf(dimFx);
      dimFx.alpha = 0;
    }
  });
  const color = isMul ? 16722458 : 2285567;
  const x = getPositionX(cell.reel);
  const y = getPositionY(cell.row);
  const EYE_SIZE = SYMBOL_SIZE * 1.32;
  const numLabelX = EYE_SIZE * EYE_ASPECT * EYE_LABEL_OFFSET.x;
  const numLabelY = EYE_SIZE * EYE_LABEL_OFFSET.y;
  const numStyle = (size, fill) => eyeValueTextStyle({ fontSize: size, fill });
  const drawVignette = (g) => {
    g.rect(0, 0, BOARD_SIZES.width, BOARD_SIZES.height).fill({ color: isMul ? 1703938 : 132623, alpha: 1 });
  };
  const drawConverge = (g) => {
    const p = convergeFx.progress;
    if (p <= 0 || p >= 1) return;
    for (const m of convergeParticles) {
      const rad = m.radius * (1 - p);
      const alpha = p < 0.8 ? Math.min(1, p + 0.25) : Math.max(0, (1 - p) / 0.2);
      g.circle(Math.cos(m.angle) * rad, Math.sin(m.angle) * rad, m.size * (0.5 + p * 0.6)).fill({ color, alpha });
    }
  };
  FadeContainer($$payload, {
    show,
    children: ($$payload2) => {
      BoardContainer($$payload2, {
        children: ($$payload3) => {
          if (resolving) {
            $$payload3.out += "<!--[-->";
            Container($$payload3, {
              alpha: dimFx.alpha,
              children: ($$payload4) => {
                Graphics($$payload4, { draw: drawVignette });
              },
              $$slots: { default: true }
            });
          } else {
            $$payload3.out += "<!--[!-->";
          }
          $$payload3.out += `<!--]--> `;
          Container($$payload3, {
            x,
            y,
            children: ($$payload4) => {
              Container($$payload4, {
                blendMode: "add",
                children: ($$payload5) => {
                  Graphics($$payload5, { draw: drawConverge });
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Container($$payload4, {
                scale: eyeScale.current,
                children: ($$payload5) => {
                  AbyssalEye($$payload5, {
                    size: EYE_SIZE,
                    variant: isMul ? "mult" : "add",
                    pulse: resolving,
                    burst: resolving,
                    idle: false
                  });
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              if (resolving) {
                $$payload4.out += "<!--[-->";
                Container($$payload4, {
                  x: numLabelX,
                  y: numLabelY + numFx.y,
                  alpha: numFx.alpha,
                  scale: numFx.scale,
                  filters: [],
                  children: ($$payload5) => {
                    Text($$payload5, {
                      anchor: 0.5,
                      text: `${displayTotal}`,
                      style: numStyle(SYMBOL_SIZE * 0.62, isMul ? EYE_VALUE_FILL.mul : EYE_VALUE_FILL.add)
                    });
                    $$payload5.out += `<!----> `;
                    if (numFx.flash > 0) {
                      $$payload5.out += "<!--[-->";
                      Text($$payload5, {
                        anchor: 0.5,
                        alpha: numFx.flash,
                        scale: 1.25,
                        text: `${displayTotal}`,
                        style: numStyle(SYMBOL_SIZE * 0.62, 16777215)
                      });
                    } else {
                      $$payload5.out += "<!--[!-->";
                    }
                    $$payload5.out += `<!--]-->`;
                  },
                  $$slots: { default: true }
                });
              } else {
                $$payload4.out += "<!--[!-->";
              }
              $$payload4.out += `<!--]-->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
    },
    $$slots: { default: true }
  });
  pop();
}
function PersistentMultiplier($$payload, $$props) {
  push();
  const context2 = getContext();
  let show = false;
  let mult = 1;
  const pop$1 = new Tween(1, { duration: 160 });
  context2.eventEmitter.subscribeOnMount({
    snowballShow: () => show = true,
    snowballHide: () => show = false,
    snowballUpdate: async (e) => {
      const climbed = e.mult > mult;
      mult = e.mult;
      if (climbed) {
        context2.eventEmitter.broadcast({ type: "soundOnce", name: "sfx_multiplier_up" });
        await pop$1.set(1.35);
        await pop$1.set(1);
      }
    }
  });
  const draw = (g) => {
    g.roundRect(-95, -36, 190, 72, 18).fill({ color: 662062, alpha: 0.85 });
    g.roundRect(-95, -36, 190, 72, 18).stroke({ width: 3, color: 16757052, alpha: 0.9 });
  };
  FadeContainer($$payload, {
    show,
    children: ($$payload2) => {
      BoardContainer($$payload2, {
        children: ($$payload3) => {
          Container($$payload3, {
            x: BOARD_SIZES.width / 2,
            y: -SYMBOL_SIZE * 0.72,
            scale: pop$1.current,
            children: ($$payload4) => {
              Graphics($$payload4, { draw });
              $$payload4.out += `<!----> `;
              Text($$payload4, {
                anchor: 0.5,
                text: `M  ×${mult}`,
                style: {
                  fontFamily: "sans-serif",
                  fontWeight: "700",
                  fontSize: SYMBOL_SIZE * 0.34,
                  fill: 16757052
                }
              });
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
        },
        $$slots: { default: true }
      });
    },
    $$slots: { default: true }
  });
  pop();
}
function ScatterFx($$payload, $$props) {
  push();
  const context2 = getContext();
  const dim = new Tween(0, { duration: 320 });
  const celebrate = { link: 0, flash: 0 };
  let positions = [];
  const stopAnticipation = () => {
    context2.stateGame.scatterAnticipating = false;
    void dim.set(0);
    context2.eventEmitter.broadcast({ type: "soundStop", name: "sfx_anticipation" });
  };
  context2.eventEmitter.subscribeOnMount({
    reelFrameScatterAnticipationStart: () => {
      context2.stateGame.scatterAnticipating = true;
      void dim.set(0.4);
      context2.eventEmitter.broadcast({
        type: "soundOnce",
        name: "sfx_anticipation_start"
      });
      context2.eventEmitter.broadcast({ type: "soundLoop", name: "sfx_anticipation" });
    },
    reelFrameScatterAnticipationEnd: () => stopAnticipation(),
    scatterCelebrate: async (emitterEvent) => {
      positions = emitterEvent.positions;
      stopAnticipation();
      gsap.killTweensOf(celebrate);
      await new Promise((resolve) => {
        gsap.timeline({ onComplete: resolve }).set(celebrate, { link: 0, flash: 0 }).to(celebrate, { link: 1, duration: 0.4, ease: "power2.out" }).to(celebrate, { flash: 0.85, duration: 0.1 }, "-=0.06").to(celebrate, { flash: 0, duration: 0.4, ease: "power2.out" }).to(celebrate, { link: 0, duration: 0.3 }, "<");
      });
    }
  });
  const drawLinks = (g) => {
    const p = celebrate.link;
    if (p <= 0) return;
    const points = positions.map((pos) => ({
      x: getPositionX(pos.reel),
      y: getPositionY(pos.row)
    }));
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        g.moveTo(points[i].x, points[i].y).lineTo(points[j].x, points[j].y).stroke({
          width: 3 * p,
          color: 16770726,
          alpha: 0.45 * p
        });
      }
    }
    for (const point of points) {
      g.circle(point.x, point.y, 12 * p).fill({ color: 16777215, alpha: 0.7 * p });
    }
  };
  if (dim.current > 1e-3) {
    $$payload.out += "<!--[-->";
    CanvasSizeRectangle($$payload, {
      backgroundColor: 198158,
      backgroundAlpha: dim.current
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  if (celebrate.link > 0) {
    $$payload.out += "<!--[-->";
    MainContainer($$payload, {
      children: ($$payload2) => {
        BoardContainer($$payload2, {
          children: ($$payload3) => {
            Container($$payload3, {
              blendMode: "add",
              children: ($$payload4) => {
                Graphics($$payload4, { draw: drawLinks });
              },
              $$slots: { default: true }
            });
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  if (celebrate.flash > 0) {
    $$payload.out += "<!--[-->";
    CanvasSizeRectangle($$payload, {
      backgroundColor: 16777215,
      backgroundAlpha: celebrate.flash
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function WinBackdrop($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const color = props.color ?? 16757052;
  let rot = 0;
  let glow = 0.5;
  let raf2 = 0;
  onDestroy(() => cancelAnimationFrame(raf2));
  const RAYS = 14;
  const raysDraw = (g) => {
    const R = props.radius * 1.8;
    for (let i = 0; i < RAYS; i++) {
      const a0 = i / RAYS * Math.PI * 2;
      const a1 = a0 + Math.PI * 2 / RAYS * 0.5;
      g.moveTo(0, 0).lineTo(Math.cos(a0) * R, Math.sin(a0) * R).lineTo(Math.cos(a1) * R, Math.sin(a1) * R).fill({ color, alpha: 0.05 });
    }
  };
  const glowDraw = (g) => {
    const R = props.radius;
    g.circle(0, 0, R).fill({ color, alpha: 0.16 });
    g.circle(0, 0, R * 0.6).fill({ color, alpha: 0.18 });
  };
  Container($$payload, {
    rotation: rot,
    children: ($$payload2) => {
      Graphics($$payload2, { draw: raysDraw });
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----> `;
  Container($$payload, {
    alpha: 0.45 + glow * 0.4,
    scale: 0.9 + glow * 0.14,
    children: ($$payload2) => {
      Graphics($$payload2, { draw: glowDraw });
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!---->`;
  pop();
}
function ScatterPay($$payload, $$props) {
  push();
  const context2 = getContext();
  let show = false;
  let count = 4;
  let mult = 3;
  const fx = { scale: 0.6, alpha: 0, flash: 0 };
  context2.stateLayoutDerived.canvasSizes();
  const boardLayout2 = context2.stateGameDerived.boardLayout();
  const isHero = count >= 6;
  const color = isHero ? 16738876 : count >= 5 ? 10185983 : 16757052;
  context2.eventEmitter.subscribeOnMount({
    scatterPayShow: async (emitterEvent) => {
      count = emitterEvent.count;
      mult = Math.round(emitterEvent.amount / BOOK_AMOUNT_MULTIPLIER);
      show = true;
      context2.eventEmitter.broadcast({ type: "soundOnce", name: "sfx_scatter_win_v2" });
      gsap.killTweensOf(fx);
      await new Promise((resolve) => {
        const timeline = gsap.timeline({ onComplete: resolve });
        timeline.set(fx, {
          scale: 0.6,
          alpha: 0,
          flash: isHero ? 0.85 : 0
        }).to(fx, { alpha: 1, duration: 0.12 }).to(
          fx,
          {
            scale: isHero ? 1.18 : 1.06,
            duration: 0.32,
            ease: "back.out(2.4)"
          },
          "<"
        ).to(fx, { flash: 0, duration: 0.4, ease: "power2.out" }, "<").to(fx, { scale: 1, duration: 0.2 });
      });
      await waitForTimeout((isHero ? 2200 : 1400) / stateBetDerived.timeScale());
      await new Promise((resolve) => {
        gsap.timeline({ onComplete: resolve }).to(fx, {
          alpha: 0,
          scale: 1.12,
          duration: 0.3,
          ease: "power2.in"
        });
      });
      show = false;
    }
  });
  FadeContainer($$payload, {
    show,
    zIndex: 46,
    children: ($$payload2) => {
      CanvasSizeRectangle($$payload2, {
        backgroundColor: 329743,
        backgroundAlpha: isHero ? 0.7 : 0.42
      });
      $$payload2.out += `<!----> `;
      MainContainer($$payload2, {
        children: ($$payload3) => {
          Container($$payload3, {
            x: boardLayout2.x,
            y: boardLayout2.y,
            scale: fx.scale,
            alpha: fx.alpha,
            children: ($$payload4) => {
              WinBackdrop($$payload4, {
                radius: SYMBOL_SIZE * (isHero ? 4 : 2.6),
                color
              });
              $$payload4.out += `<!----> `;
              Text($$payload4, {
                anchor: 0.5,
                y: -SYMBOL_SIZE * 0.78,
                text: `${count} SCATTERS`,
                style: {
                  fontFamily: "sans-serif",
                  fontWeight: "800",
                  fontSize: SYMBOL_SIZE * 0.36,
                  letterSpacing: 2,
                  fill: 15398655,
                  stroke: { color: 329743, width: 5 }
                }
              });
              $$payload4.out += `<!----> `;
              Text($$payload4, {
                anchor: 0.5,
                y: SYMBOL_SIZE * 0.34,
                text: `×${mult}`,
                style: {
                  fontFamily: "sans-serif",
                  fontWeight: "900",
                  fontSize: SYMBOL_SIZE * (isHero ? 1.6 : 1.15),
                  fill: color,
                  stroke: { color: 329743, width: 7 },
                  dropShadow: {
                    color: 0,
                    blur: 6,
                    distance: 3,
                    alpha: 0.85
                  }
                }
              });
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      if (fx.flash > 0) {
        $$payload2.out += "<!--[-->";
        CanvasSizeRectangle($$payload2, {
          backgroundColor: 16777215,
          backgroundAlpha: fx.flash
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]-->`;
    },
    $$slots: { default: true }
  });
  pop();
}
function WinCapCelebration($$payload, $$props) {
  push();
  const context2 = getContext();
  let show = false;
  let amount2 = 0;
  context2.eventEmitter.subscribeOnMount({
    winCapTrigger: async (e) => {
      amount2 = e.amount;
      show = true;
      context2.eventEmitter.broadcast({ type: "soundOnce", name: "sfx_youwon_panel" });
      await waitForTimeout(3500);
      show = false;
    }
  });
  const sizes = context2.stateLayoutDerived.canvasSizes();
  FadeContainer($$payload, {
    show,
    zIndex: 50,
    children: ($$payload2) => {
      Rectangle$1($$payload2, spread_props([
        sizes,
        {
          backgroundColor: 329743,
          backgroundAlpha: 0.86
        }
      ]));
      $$payload2.out += `<!----> `;
      Container($$payload2, {
        x: sizes.width / 2,
        y: sizes.height / 2,
        children: ($$payload3) => {
          Text($$payload3, {
            anchor: 0.5,
            y: -70,
            text: "MAX WIN",
            style: {
              fontFamily: "sans-serif",
              fontWeight: "800",
              fontSize: 110,
              fill: 16757052
            }
          });
          $$payload3.out += `<!----> `;
          Text($$payload3, {
            anchor: 0.5,
            y: 50,
            text: bookEventAmountToCurrencyString(amount2),
            style: {
              fontFamily: "sans-serif",
              fontWeight: "800",
              fontSize: 76,
              fill: 2285823
            }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  pop();
}
function WinCoins($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const context2 = getContext();
  let raf2 = 0;
  context2.stateLayoutDerived.canvasSizes();
  props.levelAlias === "max" ? 1.6 : props.levelAlias === "epic" ? 1.3 : props.levelAlias === "mega" ? 1.1 : 0.9;
  onDestroy(() => cancelAnimationFrame(raf2));
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function WinBanner($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const scale = new Tween(1, { duration: 240, easing: backOut });
  Container($$payload, {
    scale: scale.current,
    children: ($$payload2) => {
      Sprite($$payload2, {
        anchor: 0.5,
        key: props.tierKey,
        width: props.width,
        height: props.height
      });
    },
    $$slots: { default: true }
  });
  pop();
}
function PressToContinue($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  const context2 = getContext();
  MainContainer($$payload, {
    alignVertical: "bottom",
    children: ($$payload2) => {
      Text($$payload2, {
        anchor: { x: 0.5, y: 1 },
        x: context2.stateLayoutDerived.mainLayout().width * 0.5,
        y: context2.stateLayoutDerived.mainLayout().height - 60,
        text: "TAP TO CONTINUE",
        style: {
          fontFamily: "sans-serif",
          fontWeight: "800",
          fontSize: 38,
          fill: 15398655,
          letterSpacing: 3
        }
      });
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----> `;
  OnHotkey($$payload, {
    hotkey: "Space",
    onpress: () => props.onpress()
  });
  $$payload.out += `<!----> `;
  OnPressFullScreen($$payload, { onpress: () => props.onpress() });
  $$payload.out += `<!---->`;
  pop();
}
function Win($$payload, $$props) {
  push();
  const context2 = getContext();
  const WIN_TIERS = [
    { min: 15e3, key: "maxWin", seconds: 7 },
    { min: 150, key: "epicWin", seconds: 5.5 },
    { min: 50, key: "megaWin", seconds: 4.5 },
    { min: 20, key: "bigWin", seconds: 3.5 }
  ];
  const TIER_COLOR = {
    bigWin: 16757052,
    // gold
    megaWin: 2285823,
    // cyan
    epicWin: 10185983,
    // violet
    maxWin: 16738876
    // ember
  };
  const tierFor = (mult) => WIN_TIERS.find((t) => mult >= t.min);
  const lowestTier = WIN_TIERS[WIN_TIERS.length - 1];
  const amountStyle = {
    fontFamily: "Cinzel, Georgia, serif",
    fontWeight: "900",
    fontSize: SYMBOL_SIZE * 0.95,
    align: "center",
    fill: 16770726,
    stroke: { color: 2757632, width: 8 },
    dropShadow: {
      color: 0,
      blur: 10,
      distance: 5,
      alpha: 0.6
    }
  };
  let show = false;
  let amount2 = 0;
  let winLevelData = void 0;
  let oncomplete = () => {
  };
  const ts = () => stateBetDerived.timeScale();
  const multiplier = amount2 / BOOK_AMOUNT_MULTIPLIER;
  const finalTier = tierFor(multiplier);
  const duration = (finalTier ? finalTier.seconds * SECOND : 0) / ts();
  const boardWidth = context2.stateGameDerived.boardLayout().width;
  const imgW = boardWidth * 1.05;
  const imgH = imgW / 1.5;
  const countUp = new Tween(0);
  const interruptible = createInterruptible();
  let countUpCompleted = false;
  const countEase = (t) => 1 - Math.pow(1 - t, 1.6);
  const runCount = () => countUp.set(amount2, { duration, easing: countEase });
  const finishCountUp = () => interruptible.interrupt();
  const startCountUp = async () => {
    await interruptible.add(runCount);
    await countUp.set(amount2, { duration: 0 });
    interruptible.clear();
  };
  const liveMult = countUp.current / BOOK_AMOUNT_MULTIPLIER;
  const bannerTier = tierFor(liveMult) ?? lowestTier;
  const numFx = { scale: 1, flash: 0 };
  const groupFx = { scale: 0.6, alpha: 0 };
  const shake = { x: 0, y: 0 };
  let burstKey = 0;
  const triggerShake = (power) => {
    gsap.killTweensOf(shake);
    const tl = gsap.timeline({
      onComplete: () => {
        shake.x = 0;
        shake.y = 0;
      }
    });
    const kicks = 5;
    for (let i = 0; i < kicks; i++) {
      const decay = 1 - i / kicks;
      tl.to(shake, {
        x: (Math.random() - 0.5) * power * decay,
        y: (Math.random() - 0.5) * power * decay,
        duration: 0.045,
        ease: "power1.inOut"
      });
    }
    tl.to(shake, {
      x: 0,
      y: 0,
      duration: 0.12,
      ease: "power2.out"
    });
  };
  const playEntrance = () => {
    gsap.killTweensOf(groupFx);
    gsap.timeline().set(groupFx, { scale: 0.6, alpha: 0 }).to(groupFx, { alpha: 1, duration: 0.2, ease: "power2.out" }).to(
      groupFx,
      {
        scale: 1,
        duration: 0.7,
        ease: "elastic.out(1, 0.55)"
      },
      0
    );
  };
  const playLock = () => {
    gsap.killTweensOf(numFx);
    gsap.timeline().set(numFx, { scale: 1, flash: 0 }).to(numFx, {
      scale: 1.4,
      duration: 0.12,
      ease: "back.out(3)"
    }).to(numFx, {
      scale: 1,
      duration: 0.7,
      ease: "elastic.out(1, 0.45)"
    }).set(numFx, { flash: 0.95 }, 0).to(numFx, { flash: 0, duration: 0.45, ease: "power2.out" }, 0);
    burstKey++;
    triggerShake(SYMBOL_SIZE * 0.26);
    context2.eventEmitter.broadcast({ type: "soundOnce", name: "sfx_winlevel_end" });
  };
  context2.eventEmitter.subscribeOnMount({
    winShow: () => show = true,
    winHide: () => show = false,
    winUpdate: async (emitterEvent) => {
      amount2 = emitterEvent.amount;
      winLevelData = emitterEvent.winLevelData;
      await waitForResolve((resolve) => oncomplete = resolve);
    }
  });
  const present = async () => {
    countUpCompleted = false;
    numFx.scale = 1;
    numFx.flash = 0;
    shake.x = 0;
    shake.y = 0;
    await countUp.set(0, { duration: 0 });
    playEntrance();
    await startCountUp();
    playLock();
    countUpCompleted = true;
    await waitForTimeout(SECOND * 0.5 / ts());
    oncomplete();
  };
  FadeContainer($$payload, {
    show,
    children: ($$payload2) => {
      if (winLevelData && finalTier) {
        $$payload2.out += "<!--[-->";
        OnMount($$payload2, { onmount: present });
        $$payload2.out += `<!----> `;
        CanvasSizeRectangle($$payload2, {
          backgroundColor: 0,
          backgroundAlpha: 0.6 * groupFx.alpha
        });
        $$payload2.out += `<!----> `;
        WinCoins($$payload2, { burstKey, levelAlias: winLevelData.alias });
        $$payload2.out += `<!----> `;
        MainContainer($$payload2, {
          children: ($$payload3) => {
            Container($$payload3, {
              x: context2.stateGameDerived.boardLayout().x + shake.x,
              y: context2.stateGameDerived.boardLayout().y + shake.y,
              scale: groupFx.scale,
              alpha: groupFx.alpha,
              children: ($$payload4) => {
                WinBackdrop($$payload4, {
                  radius: imgW * 0.6,
                  color: TIER_COLOR[bannerTier.key]
                });
                $$payload4.out += `<!----> `;
                WinBanner($$payload4, {
                  tierKey: bannerTier.key,
                  width: imgW,
                  height: imgH
                });
                $$payload4.out += `<!----> `;
                Container($$payload4, {
                  scale: numFx.scale,
                  children: ($$payload5) => {
                    ResponsiveText($$payload5, {
                      anchor: 0.5,
                      y: imgH * 0.17,
                      maxWidth: imgW * 0.6,
                      text: bookEventAmountToCurrencyString(countUp.current),
                      style: amountStyle
                    });
                    $$payload5.out += `<!----> `;
                    if (numFx.flash > 0) {
                      $$payload5.out += "<!--[-->";
                      Container($$payload5, {
                        alpha: numFx.flash,
                        children: ($$payload6) => {
                          ResponsiveText($$payload6, {
                            anchor: 0.5,
                            y: imgH * 0.17,
                            maxWidth: imgW * 0.6,
                            text: bookEventAmountToCurrencyString(countUp.current),
                            style: { ...amountStyle, fill: 16777215 }
                          });
                        },
                        $$slots: { default: true }
                      });
                    } else {
                      $$payload5.out += "<!--[!-->";
                    }
                    $$payload5.out += `<!--]-->`;
                  },
                  $$slots: { default: true }
                });
                $$payload4.out += `<!---->`;
              },
              $$slots: { default: true }
            });
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!----> `;
        PressToContinue($$payload2, {
          onpress: () => countUpCompleted ? oncomplete() : finishCountUp()
        });
        $$payload2.out += `<!---->`;
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]-->`;
    },
    $$slots: { default: true }
  });
  pop();
}
function FreeSpinIntro($$payload, $$props) {
  push();
  const context2 = getContext();
  let show = false;
  let total = 0;
  let oncomplete = () => {
  };
  let confirmed = false;
  let animation = void 0;
  let fx = {
    backdrop: 0,
    alpha: 0,
    scale: 0.82,
    y: 48,
    hint: 0
  };
  const playIntro = () => {
    animation?.kill();
    Object.assign(fx, {
      backdrop: 0,
      alpha: 0,
      scale: 0.82,
      y: 48,
      hint: 0
    });
    animation = gsap.timeline({ defaults: { ease: "power2.out" } }).to(fx, { backdrop: 0.72, duration: 0.28 }).to(
      fx,
      {
        alpha: 1,
        scale: 1,
        y: 0,
        duration: 0.62,
        ease: "back.out(1.3)"
      },
      "<0.04"
    ).to(fx, { hint: 1, duration: 0.22 }, "-=0.12");
  };
  const playOutro = () => new Promise((resolve) => {
    animation?.kill();
    animation = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: resolve
    }).to(fx, { hint: 0, duration: 0.12 }).to(fx, {
      alpha: 0,
      scale: 1.08,
      y: -28,
      duration: 0.3
    }).to(fx, { backdrop: 0, duration: 0.26 }, "<0.08");
  });
  const confirm = () => {
    if (confirmed) return;
    confirmed = true;
    context2.eventEmitter.broadcast({ type: "soundPressGeneral" });
    oncomplete();
  };
  context2.eventEmitter.subscribeOnMount({
    freeSpinIntroShow: () => {
      confirmed = false;
      show = true;
      playIntro();
    },
    freeSpinIntroHide: async () => {
      if (!show) return;
      await playOutro();
      show = false;
    },
    freeSpinIntroUpdate: async (emitterEvent) => {
      total = emitterEvent.totalFreeSpins;
      await waitForResolve((resolve) => oncomplete = resolve);
    }
  });
  const sizes = context2.stateLayoutDerived.canvasSizes();
  const tapToPlay = i18nDerived.freeSpinsTapToPlay();
  const imgW = Math.min(sizes.width * 0.82, sizes.height * 0.68 * FREE_SPINS_BANNER_ASPECT);
  const imgH = imgW / FREE_SPINS_BANNER_ASPECT;
  const countY = imgH * 0.13;
  if (show) {
    $$payload.out += "<!--[-->";
    Container($$payload, {
      zIndex: 45,
      children: ($$payload2) => {
        Rectangle$1($$payload2, spread_props([
          sizes,
          {
            backgroundColor: 329743,
            backgroundAlpha: fx.backdrop,
            eventMode: "static",
            cursor: "pointer",
            onpointerup: confirm
          }
        ]));
        $$payload2.out += `<!----> `;
        Container($$payload2, {
          x: sizes.width / 2,
          y: sizes.height / 2 + fx.y,
          scale: fx.scale,
          alpha: fx.alpha,
          eventMode: "static",
          cursor: "pointer",
          onpointerup: confirm,
          children: ($$payload3) => {
            Sprite($$payload3, {
              anchor: 0.5,
              key: "freeSpinsBanner",
              width: imgW,
              height: imgH,
              eventMode: "static",
              cursor: "pointer",
              onpointerup: confirm
            });
            $$payload3.out += `<!----> `;
            Graphics($$payload3, {
              draw: (g) => {
                g.roundRect(-imgW * 0.14, countY - imgH * 0.105, imgW * 0.28, imgH * 0.21, imgH * 0.035).fill({ color: 399421, alpha: 0.94 });
                g.roundRect(-imgW * 0.14, countY - imgH * 0.105, imgW * 0.28, imgH * 0.21, imgH * 0.035).stroke({
                  width: Math.max(2, imgH * 7e-3),
                  color: 7531263,
                  alpha: 0.9
                });
              }
            });
            $$payload3.out += `<!----> `;
            Text($$payload3, {
              anchor: 0.5,
              y: countY,
              text: `${total}`,
              style: {
                fontFamily: "Cinzel, Georgia, serif",
                fontWeight: "900",
                fontSize: imgH * 0.16,
                fill: 16770726,
                stroke: {
                  color: 2428928,
                  width: Math.max(3, imgH * 8e-3)
                },
                dropShadow: {
                  color: 0,
                  alpha: 0.9,
                  blur: 6,
                  distance: 2
                }
              }
            });
            $$payload3.out += `<!----> `;
            Text($$payload3, {
              anchor: 0.5,
              y: imgH * 0.62,
              alpha: fx.hint,
              text: tapToPlay,
              style: {
                fontFamily: "sans-serif",
                fontWeight: "800",
                fontSize: imgH * 0.055,
                letterSpacing: imgH * 6e-3,
                fill: 15400191,
                stroke: { color: 1443080, width: 4 },
                dropShadow: {
                  color: 0,
                  alpha: 0.85,
                  blur: 5,
                  distance: 2
                }
              }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function FreeSpinRetrigger($$payload, $$props) {
  push();
  const DISPLAY_MS = 2200;
  const context2 = getContext();
  let show = false;
  let dismissing = false;
  let oncomplete = () => {
  };
  let timeoutId = void 0;
  let animation = void 0;
  let fx = {
    backdrop: 0,
    alpha: 0,
    scale: 0.74,
    y: 52,
    hint: 0
  };
  const playIntro = () => {
    animation?.kill();
    Object.assign(fx, {
      backdrop: 0,
      alpha: 0,
      scale: 0.74,
      y: 52,
      hint: 0
    });
    animation = gsap.timeline({ defaults: { ease: "power2.out" } }).to(fx, { backdrop: 0.78, duration: 0.22 }).to(
      fx,
      {
        alpha: 1,
        scale: 1,
        y: 0,
        duration: 0.52,
        ease: "back.out(1.45)"
      },
      "<0.03"
    ).to(fx, { hint: 1, duration: 0.18 }, "-=0.06");
  };
  const playOutro = () => new Promise((resolve) => {
    animation?.kill();
    animation = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: resolve
    }).to(fx, { hint: 0, duration: 0.1 }).to(fx, {
      alpha: 0,
      scale: 1.06,
      y: -20,
      duration: 0.32
    }).to(fx, { backdrop: 0, duration: 0.22 }, "<0.08");
  });
  const finish = () => {
    if (!show || dismissing) return;
    dismissing = true;
    if (timeoutId) clearTimeout(timeoutId);
    void playOutro().then(() => {
      show = false;
      dismissing = false;
      oncomplete();
    });
  };
  context2.eventEmitter.subscribeOnMount({
    freeSpinRetriggerShow: async () => {
      dismissing = false;
      show = true;
      playIntro();
      await waitForResolve((resolve) => {
        oncomplete = resolve;
        timeoutId = setTimeout(finish, DISPLAY_MS);
      });
    }
  });
  const sizes = context2.stateLayoutDerived.canvasSizes();
  const tapToSkip = i18nDerived.freeSpinsTapToSkip();
  const imgW = Math.min(sizes.width * 0.76, sizes.height * 0.67 * FREE_SPINS_BANNER_ASPECT);
  const imgH = imgW / FREE_SPINS_BANNER_ASPECT;
  if (show) {
    $$payload.out += "<!--[-->";
    Container($$payload, {
      zIndex: 46,
      children: ($$payload2) => {
        Rectangle$1($$payload2, spread_props([
          sizes,
          {
            backgroundColor: 198679,
            backgroundAlpha: fx.backdrop,
            eventMode: "static",
            cursor: "pointer",
            onpointerup: finish
          }
        ]));
        $$payload2.out += `<!----> `;
        Container($$payload2, {
          x: sizes.width / 2,
          y: sizes.height / 2 + fx.y,
          scale: fx.scale,
          alpha: fx.alpha,
          eventMode: "static",
          cursor: "pointer",
          onpointerup: finish,
          children: ($$payload3) => {
            Sprite($$payload3, {
              anchor: 0.5,
              key: "freeSpinsRetrigger",
              width: imgW,
              height: imgH
            });
            $$payload3.out += `<!----> `;
            Text($$payload3, {
              anchor: 0.5,
              y: imgH * 0.58,
              alpha: fx.hint,
              text: tapToSkip,
              style: {
                fontFamily: "Arial, Helvetica, sans-serif",
                fontWeight: "900",
                fontSize: imgH * 0.044,
                letterSpacing: imgH * 6e-3,
                fill: 15400191,
                stroke: {
                  color: 524308,
                  width: Math.max(2, imgH * 5e-3)
                },
                dropShadow: {
                  color: 0,
                  alpha: 0.9,
                  blur: 5,
                  distance: 2
                }
              }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function FreeSpinCounter($$payload, $$props) {
  push();
  const context2 = getContext();
  const PANEL_RATIO_DESKTOP = 824 / 622;
  const panelWidth = SYMBOL_SIZE * 2;
  const panelSizes = {
    width: panelWidth,
    height: panelWidth / PANEL_RATIO_DESKTOP
  };
  const multiplierPanelSizes = {
    width: panelSizes.width * 0.84,
    height: SYMBOL_SIZE * 0.52
  };
  const scale = 1;
  const boardLayout2 = context2.stateGameDerived.boardLayout();
  const position = {
    x: boardLayout2.x + boardLayout2.width * 0.5 + SYMBOL_SIZE * 0.35,
    y: boardLayout2.y - boardLayout2.height * 0.5
  };
  const fontSize = SYMBOL_SIZE * 0.275;
  let show = false;
  let current = 0;
  let total = 0;
  let titleSizes = { width: 0, height: 0 };
  let counterSizes = { height: 0 };
  const textContainerSizes = {
    width: titleSizes.width,
    height: titleSizes.height + counterSizes.height
  };
  const counterPosition = { x: titleSizes.width / 2, y: titleSizes.height };
  context2.eventEmitter.subscribeOnMount({
    freeSpinCounterShow: () => show = true,
    freeSpinCounterHide: () => show = false,
    freeSpinCounterUpdate: (emitterEvent) => {
      if (emitterEvent.current !== void 0) current = emitterEvent.current;
      if (emitterEvent.total !== void 0) total = emitterEvent.total;
    }
  });
  MainContainer($$payload, {
    children: ($$payload2) => {
      FadeContainer($$payload2, spread_props([
        { show },
        position,
        {
          scale,
          children: ($$payload3) => {
            Container($$payload3, {
              x: panelSizes.width * 0.5,
              y: -multiplierPanelSizes.height * 0.5 - SYMBOL_SIZE * 0.14,
              children: ($$payload4) => {
                Graphics($$payload4, {
                  draw: (g) => {
                    g.roundRect(-multiplierPanelSizes.width * 0.5, -multiplierPanelSizes.height * 0.5, multiplierPanelSizes.width, multiplierPanelSizes.height, 14).fill({ color: 662062, alpha: 0.92 });
                    g.roundRect(-multiplierPanelSizes.width * 0.5, -multiplierPanelSizes.height * 0.5, multiplierPanelSizes.width, multiplierPanelSizes.height, 14).stroke({ width: 2.5, color: 16757052, alpha: 0.9 });
                  }
                });
                $$payload4.out += `<!----> `;
                Text($$payload4, {
                  text: "TOTAL MULT",
                  x: -multiplierPanelSizes.width * 0.31,
                  anchor: { x: 0, y: 0.5 },
                  style: {
                    fontFamily: "sans-serif",
                    fontWeight: "800",
                    fontSize: SYMBOL_SIZE * 0.16,
                    fill: 9432831
                  }
                });
                $$payload4.out += `<!----> `;
                Text($$payload4, {
                  text: `×${context2.stateGame.persistentMult}`,
                  x: multiplierPanelSizes.width * 0.34,
                  anchor: { x: 0.5, y: 0.5 },
                  style: {
                    fontFamily: "sans-serif",
                    fontWeight: "900",
                    fontSize: SYMBOL_SIZE * 0.28,
                    fill: 16765562
                  }
                });
                $$payload4.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            Graphics($$payload3, {
              draw: (g) => {
                g.roundRect(0, 0, panelSizes.width, panelSizes.height, 16).fill({ color: 662062, alpha: 0.92 });
                g.roundRect(0, 0, panelSizes.width, panelSizes.height, 16).stroke({ width: 2.5, color: 2285823, alpha: 0.8 });
              }
            });
            $$payload3.out += `<!----> `;
            Container($$payload3, {
              x: panelSizes.width * 0.5,
              y: panelSizes.height * 0.48,
              pivot: anchorToPivot({
                sizes: textContainerSizes,
                anchor: { x: 0.5, y: 0.5 }
              }),
              children: ($$payload4) => {
                Text($$payload4, {
                  text: "FREE SPIN",
                  style: {
                    fontFamily: "sans-serif",
                    fontWeight: "800",
                    fontSize,
                    fill: 2285823,
                    wordWrap: false
                  },
                  onresize: (sizes) => titleSizes = sizes
                });
                $$payload4.out += `<!----> `;
                Text($$payload4, spread_props([
                  { text: `${current} OF ${total}` },
                  counterPosition,
                  {
                    anchor: { x: 0.5, y: 0 },
                    style: {
                      fontFamily: "sans-serif",
                      fontWeight: "800",
                      fontSize,
                      fill: 16765562
                    },
                    onresize: (sizes) => counterSizes = sizes
                  }
                ]));
                $$payload4.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        }
      ]));
    },
    $$slots: { default: true }
  });
  pop();
}
function FreeSpinOutro($$payload, $$props) {
  push();
  const context2 = getContext();
  let show = false;
  let amount2 = 0;
  context2.eventEmitter.subscribeOnMount({
    freeSpinOutroShow: () => show = true,
    freeSpinOutroHide: () => show = false,
    freeSpinOutroCountUp: async (emitterEvent) => {
      amount2 = emitterEvent.amount;
      await waitForTimeout(2200 / stateBetDerived.timeScale());
    }
  });
  const sizes = context2.stateLayoutDerived.canvasSizes();
  FadeContainer($$payload, {
    show,
    zIndex: 45,
    children: ($$payload2) => {
      Rectangle$1($$payload2, spread_props([
        sizes,
        {
          backgroundColor: 329743,
          backgroundAlpha: 0.78
        }
      ]));
      $$payload2.out += `<!----> `;
      Container($$payload2, {
        x: sizes.width / 2,
        y: sizes.height / 2,
        children: ($$payload3) => {
          Text($$payload3, {
            anchor: 0.5,
            y: -56,
            text: "TOTAL WIN",
            style: {
              fontFamily: "sans-serif",
              fontWeight: "800",
              fontSize: 72,
              fill: 2285823
            }
          });
          $$payload3.out += `<!----> `;
          Text($$payload3, {
            anchor: 0.5,
            y: 48,
            text: bookEventAmountToCurrencyString(amount2),
            style: {
              fontFamily: "sans-serif",
              fontWeight: "800",
              fontSize: 104,
              fill: 16757052
            }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  pop();
}
function Transition($$payload, $$props) {
  push();
  const context2 = getContext();
  const alpha = new Tween(0, { duration: 320 });
  const irisProgress = new Tween(0, { duration: 680 });
  const FREE_SPIN_EXIT_COVER_DURATION = 350;
  const FREE_SPIN_EXIT_REVEAL_DURATION = 1650;
  let irisActive = false;
  const sizes = context2.stateLayoutDerived.canvasSizes();
  const irisRadius = (Math.hypot(sizes.width, sizes.height) * 0.5 + 4) * irisProgress.current;
  context2.eventEmitter.subscribeOnMount({
    transition: async () => {
      const duration = 320 / stateBetDerived.timeScale();
      await alpha.set(1, { duration });
      await alpha.set(0, { duration });
    },
    freeSpinExitCover: async () => {
      irisActive = false;
      void irisProgress.set(0, { duration: 0 });
      void alpha.set(1, { duration: FREE_SPIN_EXIT_COVER_DURATION });
      await waitForTimeout(FREE_SPIN_EXIT_COVER_DURATION);
    },
    freeSpinExitReveal: async () => {
      irisActive = true;
      void irisProgress.set(1, { duration: FREE_SPIN_EXIT_REVEAL_DURATION });
      await waitForTimeout(FREE_SPIN_EXIT_REVEAL_DURATION);
      void alpha.set(0, { duration: 0 });
      irisActive = false;
    }
  });
  if (irisActive) {
    $$payload.out += "<!--[-->";
    Graphics($$payload, {
      zIndex: 40,
      draw: (g) => {
        const centerX = sizes.width * 0.5;
        const centerY = sizes.height * 0.5;
        const top = Math.max(0, centerY - irisRadius);
        const bottom = Math.min(sizes.height, centerY + irisRadius);
        const fill = { color: 329743, alpha: 1 };
        if (irisRadius < 1) {
          g.rect(0, 0, sizes.width, sizes.height).fill(fill);
          return;
        }
        if (top > 0) g.rect(0, 0, sizes.width, top).fill(fill);
        if (bottom < sizes.height) g.rect(0, bottom, sizes.width, sizes.height - bottom).fill(fill);
        const left = [{ x: 0, y: top }];
        const right = [{ x: sizes.width, y: top }];
        const steps = 28;
        for (let index = 0; index <= steps; index += 1) {
          const y = top + (bottom - top) * index / steps;
          const halfChord = Math.sqrt(Math.max(0, irisRadius ** 2 - (y - centerY) ** 2));
          left.push({ x: Math.max(0, centerX - halfChord), y });
          right.push({
            x: Math.min(sizes.width, centerX + halfChord),
            y
          });
        }
        left.push({ x: 0, y: bottom });
        right.push({ x: sizes.width, y: bottom });
        g.poly(left).fill(fill);
        g.poly(right).fill(fill);
      }
    });
  } else {
    $$payload.out += "<!--[!-->";
    if (alpha.current > 1e-3) {
      $$payload.out += "<!--[-->";
      Rectangle$1($$payload, spread_props([
        sizes,
        {
          backgroundColor: 329743,
          backgroundAlpha: alpha.current,
          zIndex: 40
        }
      ]));
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]-->`;
  }
  $$payload.out += `<!--]-->`;
  pop();
}
const ABYSSAL_CONTROL_BAR_LAYOUT = {
  design: { w: 1920, h: 1080 },
  left: {
    menu: { size: 112 },
    balance: { w: 260, h: 112 },
    buyBonus: { w: 210, h: 142 }
  },
  right: {
    autoplay: { size: 72 },
    turbo: { size: 72 },
    spin: { size: 212 },
    bet: { w: 360, h: 100 }
  }
};
const WHITE = 16777215;
const alphaOf = (options) => options.disabled ? 0.42 : 1;
const strokeLine = (g, width, color, alpha, cap = "round") => {
  g.stroke({ width, color, alpha, cap, join: "round" });
};
const drawArcStroke = (g, radius, from, to, width, color, alpha) => {
  g.beginPath();
  g.arc(0, 0, radius, from, to);
  strokeLine(g, width, color, alpha);
};
const drawGlowArc = (g, radius, from, to, width, alpha) => {
  drawArcStroke(g, radius, from, to, width + 10, 0, alpha * 0.28);
  drawArcStroke(g, radius, from, to, width, WHITE, alpha);
};
const drawArrowHead = (g, x, y, angle, size, alpha, color = WHITE) => {
  const points = [
    { x: size * 0.72, y: 0 },
    { x: -size * 0.46, y: -size * 0.46 },
    { x: -size * 0.18, y: 0 },
    { x: -size * 0.46, y: size * 0.46 }
  ];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotated = points.flatMap((point) => [
    x + point.x * cos - point.y * sin,
    y + point.x * sin + point.y * cos
  ]);
  g.poly(rotated, true).fill({ color: 0, alpha: alpha * 0.32 });
  g.poly(rotated, true).fill({ color, alpha });
};
const drawBar = (g, x, y, w, h, alpha) => {
  g.roundRect(x - w / 2, y - h / 2, w, h, h / 2).fill({ color: 0, alpha: alpha * 0.5 });
  g.roundRect(x - w / 2, y - h / 2, w, h, h / 2).fill({ color: WHITE, alpha });
};
const drawControlGlyph = (g, key, size, options = {}) => {
  const alpha = alphaOf(options);
  const s = size;
  const color = options.color ?? WHITE;
  if (key === "menu") {
    const h = s * 0.105;
    for (const y of [-s * 0.24, 0, s * 0.24]) drawBar(g, 0, y, s * 0.66, h, alpha);
    return;
  }
  if (key === "minus") {
    drawBar(g, 0, 0, s * 0.66, s * 0.105, alpha);
    return;
  }
  if (key === "plus") {
    const h = s * 0.105;
    drawBar(g, 0, 0, s * 0.66, h, alpha);
    drawBar(g, 0, 0, h, s * 0.66, alpha);
    return;
  }
  if (key === "turbo") {
    const bolt = [
      s * 0.08,
      -s * 0.5,
      -s * 0.32,
      s * 0.02,
      -s * 0.05,
      s * 0.02,
      -s * 0.12,
      s * 0.5,
      s * 0.34,
      -s * 0.12,
      s * 0.06,
      -s * 0.1
    ];
    g.poly(bolt, true).fill({ color: 0, alpha: alpha * 0.28 });
    if (options.active) {
      g.poly(bolt, true).fill({ color, alpha });
    } else {
      g.poly(bolt, true).stroke({
        width: s * 0.08,
        color,
        alpha: alpha * 0.86,
        join: "round"
      });
    }
    return;
  }
  if (key === "autoplay") {
    const r2 = s * 0.35;
    const start = -Math.PI * 0.78;
    const end = Math.PI * 1.08;
    if (options.active) drawArcStroke(g, r2, start, end, s * 0.22, color, alpha * 0.24);
    drawArcStroke(g, r2, start, end, s * 0.16, 0, alpha * 0.34);
    drawArcStroke(g, r2, start, end, s * 0.105, color, alpha);
    drawArrowHead(g, Math.cos(end) * r2, Math.sin(end) * r2, Math.PI * 1.58, s * 0.26, alpha, color);
    g.poly([-s * 0.12, -s * 0.18, -s * 0.12, s * 0.18, s * 0.18, 0], true).fill({
      color: 0,
      alpha: alpha * 0.26
    });
    g.poly([-s * 0.1, -s * 0.16, -s * 0.1, s * 0.16, s * 0.16, 0], true).fill({
      color,
      alpha
    });
    return;
  }
  const r = s * 0.34;
  drawGlowArc(g, r, -Math.PI * 0.28, Math.PI * 1.32, s * 0.14, alpha);
  drawArrowHead(
    g,
    Math.cos(Math.PI * 1.32) * r,
    Math.sin(Math.PI * 1.32) * r,
    Math.PI * 1.82,
    s * 0.31,
    alpha
  );
  if (options.stop) {
    g.roundRect(-s * 0.12, -s * 0.12, s * 0.24, s * 0.24, s * 0.035).fill({
      color: WHITE,
      alpha: alpha * 0.94
    });
    g.roundRect(-s * 0.12, -s * 0.12, s * 0.24, s * 0.24, s * 0.035).stroke({
      width: s * 0.025,
      color: WHITE,
      alpha: alpha * 0.72
    });
  }
};
const icons = {
  // play triangle
  spin: (g, s, c) => {
    g.poly([-s * 0.22, -s * 0.34, -s * 0.22, s * 0.34, s * 0.34, 0]).fill({ color: c });
  },
  stop: (g, s, c) => {
    g.roundRect(-s * 0.26, -s * 0.26, s * 0.52, s * 0.52, s * 0.08).fill({ color: c });
  },
  plus: (g, s, c) => {
    const t = s * 0.16;
    const l = s * 0.62;
    g.roundRect(-l / 2, -t / 2, l, t, t / 2).fill({ color: c });
    g.roundRect(-t / 2, -l / 2, t, l, t / 2).fill({ color: c });
  },
  minus: (g, s, c) => {
    const t = s * 0.16;
    const l = s * 0.62;
    g.roundRect(-l / 2, -t / 2, l, t, t / 2).fill({ color: c });
  },
  // lightning bolt
  turbo: (g, s, c) => {
    g.poly([
      s * 0.06,
      -s * 0.42,
      -s * 0.3,
      s * 0.06,
      -s * 0.04,
      s * 0.06,
      -s * 0.06,
      s * 0.42,
      s * 0.3,
      -s * 0.06,
      s * 0.04,
      -s * 0.06
    ]).fill({ color: c });
  },
  // circular arrow (autoplay)
  auto: (g, s, c) => {
    const r = s * 0.3;
    g.arc(0, 0, r, Math.PI * 0.25, Math.PI * 1.75).stroke({
      width: s * 0.12,
      color: c,
      cap: "round"
    });
    const a = Math.PI * 1.75;
    const ax = Math.cos(a) * r;
    const ay = Math.sin(a) * r;
    g.poly([
      ax + s * 0.16,
      ay - s * 0.02,
      ax - s * 0.04,
      ay - s * 0.18,
      ax - s * 0.1,
      ay + s * 0.1
    ]).fill({ color: c });
  },
  sound: (g, s, c) => {
    g.poly([
      -s * 0.36,
      -s * 0.12,
      -s * 0.16,
      -s * 0.12,
      s * 0,
      -s * 0.3,
      s * 0,
      s * 0.3,
      -s * 0.16,
      s * 0.12,
      -s * 0.36,
      s * 0.12
    ]).fill({ color: c });
    g.arc(s * 0.02, 0, s * 0.22, -Math.PI / 3, Math.PI / 3).stroke({
      width: s * 0.07,
      color: c,
      cap: "round"
    });
    g.arc(s * 0.02, 0, s * 0.34, -Math.PI / 3, Math.PI / 3).stroke({
      width: s * 0.07,
      color: c,
      cap: "round"
    });
  },
  soundOff: (g, s, c) => {
    g.poly([
      -s * 0.36,
      -s * 0.12,
      -s * 0.16,
      -s * 0.12,
      s * 0,
      -s * 0.3,
      s * 0,
      s * 0.3,
      -s * 0.16,
      s * 0.12,
      -s * 0.36,
      s * 0.12
    ]).fill({ color: c });
    g.moveTo(s * 0.12, -s * 0.16).lineTo(s * 0.36, s * 0.16).stroke({ width: s * 0.08, color: c, cap: "round" });
    g.moveTo(s * 0.36, -s * 0.16).lineTo(s * 0.12, s * 0.16).stroke({ width: s * 0.08, color: c, cap: "round" });
  },
  // hamburger
  menu: (g, s, c) => {
    const t = s * 0.12;
    const l = s * 0.58;
    for (const y of [-s * 0.22, 0, s * 0.22]) {
      g.roundRect(-l / 2, y - t / 2, l, t, t / 2).fill({ color: c });
    }
  },
  // sliders
  settings: (g, s, c) => {
    for (const y of [-s * 0.2, s * 0.08]) {
      g.roundRect(-s * 0.3, y - s * 0.04, s * 0.6, s * 0.08, s * 0.04).fill({ color: c });
    }
    g.circle(s * 0.12, -s * 0.2, s * 0.1).fill({ color: c });
    g.circle(-s * 0.1, s * 0.08, s * 0.1).fill({ color: c });
  },
  info: (g, s, c) => {
    g.circle(0, 0, s * 0.34).stroke({ width: s * 0.075, color: c });
    g.circle(0, -s * 0.15, s * 0.05).fill({ color: c });
    g.roundRect(-s * 0.05, -s * 0.02, s * 0.1, s * 0.24, s * 0.03).fill({ color: c });
  },
  close: (g, s, c) => {
    g.moveTo(-s * 0.22, -s * 0.22).lineTo(s * 0.22, s * 0.22).stroke({ width: s * 0.12, color: c, cap: "round" });
    g.moveTo(s * 0.22, -s * 0.22).lineTo(-s * 0.22, s * 0.22).stroke({ width: s * 0.12, color: c, cap: "round" });
  }
};
function ControlBar($$payload, $$props) {
  push();
  const context2 = getContext();
  const BAR_FONT = "Inter, Arial, sans-serif";
  const autoPopupOptions = [
    "10",
    "25",
    "50",
    "100",
    "250",
    INFINITY_MARK
  ];
  const AUTO_POPUP_SIZE = { w: 340, h: 168 };
  const BET_POPUP_COLUMNS = { desktop: 5, mobile: 3 };
  const BET_POPUP_PADDING = { x: 46, y: 48 };
  const AUTO_CHOICE = {
    w: 90,
    h: 48,
    gapX: 108,
    gapY: 58,
    fontSize: 18
  };
  const BET_CHOICE = {
    w: 150,
    h: 62,
    gapX: 178,
    gapY: 82,
    fontSize: 26
  };
  const BET_POPUP_SCROLL_ROWS = { popout: 3, tiny: 2 };
  const ACTIVE_PURPLE = 10181887;
  const ACTIVE_PURPLE_BRIGHT = 13215743;
  const MENU_SLIDER = {
    w: 124,
    h: 34,
    labelX: -100,
    trackX: 40,
    labelFontSize: 18
  };
  const MENU_POPUP_PANEL = { w: 290, h: 248, centerY: -92 };
  const MENU_ACTION_BUTTON = {
    w: 232,
    h: 56,
    iconX: -82,
    labelX: -42,
    iconSize: 38,
    fontSize: 20
  };
  const BET_STEP_BUTTON = {
    hitW: 68,
    hitH: 62,
    drawSize: 60,
    glyphSize: 36,
    y: 12
  };
  const SELECTABLE_BUY_MODE_KEYS = /* @__PURE__ */ new Set(["ANTE", "SUPERSPINS"]);
  let showAutoPopup = false;
  let showBetPopup = false;
  let autoSpinArmed = false;
  let betScrollRow = 0;
  let betScrollDragging = false;
  let betScrollMoved = false;
  let betScrollDragStartY = 0;
  let betScrollDragStartRow = 0;
  let volumeSliderDragging = null;
  let hoveredSlider = null;
  const LEFT_BOUNDS = { minX: -56, maxY: 56 };
  const RIGHT_BOUNDS = { maxX: 196, maxY: 50 };
  const amountPanelWidth = (text, minWidth, maxWidth, fontSize) => {
    const estimatedWidth = Math.ceil(text.length * fontSize * 0.62 + 54);
    return Math.min(maxWidth, Math.max(minWidth, estimatedWidth));
  };
  const amountFontSize = (text, panelWidth, baseSize, minSize, targetFill = 0.82, targetWidth) => {
    const availableWidth = panelWidth - 46;
    const target = Math.min(availableWidth * targetFill, targetWidth ?? Number.POSITIVE_INFINITY);
    const fittedSize = Math.floor(target / Math.max(text.length * 0.62, 1));
    return Math.max(minSize, Math.min(baseSize, fittedSize));
  };
  const choiceFontSize = (text, chipWidth, baseSize, minSize) => {
    const availableWidth = chipWidth - 26;
    const fittedSize = Math.floor(availableWidth / Math.max(text.length * 0.62, 1));
    return Math.max(minSize, Math.min(baseSize, fittedSize));
  };
  const balanceText = numberToCurrencyString(stateBet$1.balanceAmount);
  const betText = numberToCurrencyString(stateBetDerived.betCost());
  const balancePanelWidth = amountPanelWidth(balanceText, ABYSSAL_CONTROL_BAR_LAYOUT.left.balance.w, 390, 36);
  const betPanelWidth = amountPanelWidth(betText, ABYSSAL_CONTROL_BAR_LAYOUT.right.bet.w, 470, 34);
  const balanceValueFontSize = amountFontSize(balanceText, balancePanelWidth, 54, 26, 0.86, 210);
  const betValueFontSize = amountFontSize(betText, betPanelWidth, 52, 25, 0.62, 198);
  const betButtonOffset = Math.max(116, betPanelWidth / 2 - 42);
  const options = [...stateConfig.betAmountOptions].sort((a, b) => a - b);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const betPopupSize = (columns, maxVisibleRows) => {
    const rows = Math.max(1, Math.ceil(options.length / columns));
    const visibleRows = Math.min(maxVisibleRows, rows);
    const maxScrollRow = Math.max(0, rows - visibleRows);
    const scrollRow = clamp(betScrollRow, 0, maxScrollRow);
    return {
      columns,
      rows,
      visibleRows,
      maxScrollRow,
      scrollRow,
      w: (columns - 1) * BET_CHOICE.gapX + BET_CHOICE.w + BET_POPUP_PADDING.x * 2,
      h: (visibleRows - 1) * BET_CHOICE.gapY + BET_CHOICE.h + BET_POPUP_PADDING.y * 2
    };
  };
  const screenSize = context2.stateLayoutDerived.canvasSizes();
  const responsive = (() => {
    const isPortrait = screenSize.height > screenSize.width * 1.15;
    const isTinyLandscape = !isPortrait && screenSize.width <= 500 && screenSize.height <= 300;
    const isPopoutLandscape = !isPortrait && screenSize.width < 900;
    const isCompactLandscape = !isPortrait && (screenSize.width < 900 || screenSize.height < 600);
    const portraitBaseScale = Math.min(screenSize.width / 460, screenSize.height / 780);
    const tinyLandscapeBaseScale = Math.min(screenSize.width / 800, screenSize.height / 440);
    const popoutLandscapeBaseScale = Math.min(screenSize.width / 1280, screenSize.height / 720);
    const compactLandscapeBaseScale = Math.min(screenSize.width / 1280, screenSize.height / 720);
    const desktopBaseScale = Math.min(screenSize.width / ABYSSAL_CONTROL_BAR_LAYOUT.design.w, screenSize.height / ABYSSAL_CONTROL_BAR_LAYOUT.design.h);
    let scale;
    if (isPortrait) {
      scale = Math.min(0.48, Math.max(0.42, portraitBaseScale));
    } else if (isTinyLandscape) {
      scale = Math.min(0.26, Math.max(0.22, tinyLandscapeBaseScale));
    } else if (isPopoutLandscape) {
      scale = Math.min(0.34, Math.max(0.28, popoutLandscapeBaseScale));
    } else if (isCompactLandscape) {
      scale = Math.min(0.58, Math.max(0.46, compactLandscapeBaseScale));
    } else {
      scale = Math.min(1, Math.max(0.68, desktopBaseScale));
    }
    const edgeGap = isTinyLandscape ? 8 : isPortrait ? 14 : 42;
    const bottomGap = isTinyLandscape ? 8 : isPortrait ? 16 : isCompactLandscape ? 20 : 34;
    const baselineY = screenSize.height - bottomGap - Math.max(LEFT_BOUNDS.maxY, RIGHT_BOUNDS.maxY) * scale;
    const popupScaleFor = (width, height, desiredScale) => Math.max(0.32, Math.min(desiredScale, (screenSize.width - edgeGap * 2) / width, (screenSize.height - edgeGap * 2 - 40) / height));
    const clampPopupX = (x, width, popupScale = scale) => Math.min(screenSize.width - edgeGap - width * popupScale / 2, Math.max(edgeGap + width * popupScale / 2, x));
    const mobileControls = isPortrait;
    const compactControls = isCompactLandscape && !isPopoutLandscape;
    const balanceCenterX = 205 + (balancePanelWidth - ABYSSAL_CONTROL_BAR_LAYOUT.left.balance.w) / 2;
    const leftControlScale = isPopoutLandscape ? 1 : compactControls ? 0.76 : 0.84;
    const controls = {
      menuScale: leftControlScale,
      buyScale: leftControlScale * 1.12,
      balanceScale: leftControlScale,
      betScale: compactControls ? 0.84 : 0.88,
      sideScale: compactControls ? 0.96 : 1.12,
      spinScale: compactControls ? 0.9 : 1,
      menu: { x: 0, y: 0 },
      balance: { x: balanceCenterX, y: 0 },
      buy: { x: 34, y: -144 },
      auto: compactControls ? { x: 142, y: -178 } : { x: 188, y: -204 },
      turbo: compactControls ? { x: 142, y: -116 } : { x: 188, y: -118 },
      spin: compactControls ? { x: 0, y: -148 } : { x: 0, y: -162 },
      bet: compactControls ? { x: 0, y: -4 } : { x: 0, y: 0 },
      autoGlyph: compactControls ? 52 : 58,
      turboGlyph: compactControls ? 40 : 46
    };
    const rightMaxX = Math.max(RIGHT_BOUNDS.maxX, controls.bet.x + betPanelWidth * controls.betScale / 2, controls.auto.x + ABYSSAL_CONTROL_BAR_LAYOUT.right.autoplay.size * controls.sideScale / 2, controls.turbo.x + ABYSSAL_CONTROL_BAR_LAYOUT.right.turbo.size * controls.sideScale / 2);
    if (mobileControls) {
      const allMobileBetRows = Math.max(1, Math.ceil(options.length / BET_POPUP_COLUMNS.mobile));
      const betPopup2 = betPopupSize(BET_POPUP_COLUMNS.mobile, allMobileBetRows);
      const autoPopupScale2 = popupScaleFor(AUTO_POPUP_SIZE.w, AUTO_POPUP_SIZE.h, 0.78);
      const betPopupScale2 = popupScaleFor(betPopup2.w, betPopup2.h, 0.92);
      const centerX = screenSize.width * 0.5;
      const mobilePad = 14;
      const mobileBottomY = 74;
      const mobileMenuScale = 0.5;
      const mobileBalanceScale = 0.78;
      const mobileBetScale = 0.62;
      const mobileLeftGap = 8;
      const centerY = screenSize.height - bottomGap - 118 * scale;
      const menuWidth = ABYSSAL_CONTROL_BAR_LAYOUT.left.menu.size * mobileMenuScale * scale;
      const balanceWidth = balancePanelWidth * mobileBalanceScale * scale;
      const menuX = (mobilePad + menuWidth / 2 - centerX) / scale;
      const balanceX = (mobilePad + menuWidth + mobileLeftGap + balanceWidth / 2 - centerX) / scale;
      const betX2 = (screenSize.width - mobilePad - betPanelWidth * mobileBetScale * scale / 2 - centerX) / scale;
      const mobileLayoutControls = {
        ...controls,
        menuScale: mobileMenuScale,
        buyScale: 0.65,
        balanceScale: mobileBalanceScale,
        betScale: mobileBetScale,
        sideScale: 0.76,
        spinScale: 0.62,
        menu: { x: menuX, y: mobileBottomY + 18 },
        buy: { x: -224, y: -52 },
        balance: { x: balanceX, y: mobileBottomY },
        spin: { x: 0, y: -52 },
        auto: { x: 126, y: -82 },
        turbo: { x: 126, y: -22 },
        bet: { x: betX2, y: mobileBottomY },
        autoGlyph: 52,
        turboGlyph: 38
      };
      return {
        scale,
        controls: mobileLayoutControls,
        left: { x: centerX, y: centerY },
        right: { x: centerX, y: centerY },
        menuPopup: {
          x: clampPopupX(centerX + mobileLayoutControls.menu.x * scale, MENU_POPUP_PANEL.w),
          y: centerY + mobileLayoutControls.menu.y * scale - 84 * scale
        },
        autoPopup: {
          ...AUTO_POPUP_SIZE,
          scale: autoPopupScale2,
          x: clampPopupX(centerX + mobileLayoutControls.auto.x * scale, AUTO_POPUP_SIZE.w, autoPopupScale2),
          y: centerY + mobileLayoutControls.auto.y * scale - AUTO_POPUP_SIZE.h * autoPopupScale2 / 2 - (ABYSSAL_CONTROL_BAR_LAYOUT.right.autoplay.size * mobileLayoutControls.sideScale * 0.5 + 12) * scale
        },
        betPopup: {
          ...betPopup2,
          scale: betPopupScale2,
          x: clampPopupX(centerX + mobileLayoutControls.bet.x * scale, betPopup2.w, betPopupScale2),
          y: centerY + mobileLayoutControls.bet.y * scale - betPopup2.h * betPopupScale2 / 2 - (ABYSSAL_CONTROL_BAR_LAYOUT.right.bet.h * mobileLayoutControls.betScale * 0.5 + 12) * scale
        },
        win: { x: centerX, y: centerY - 204 * scale }
      };
    }
    const rightX = screenSize.width - edgeGap - rightMaxX * scale;
    const autoX = rightX + controls.auto.x * scale;
    const autoY = baselineY + controls.auto.y * scale;
    const betX = rightX + controls.bet.x * scale;
    const betY = baselineY + controls.bet.y * scale;
    const allDesktopBetRows = Math.max(1, Math.ceil(options.length / BET_POPUP_COLUMNS.desktop));
    const desktopVisibleBetRows = isTinyLandscape ? BET_POPUP_SCROLL_ROWS.tiny : isPopoutLandscape ? BET_POPUP_SCROLL_ROWS.popout : allDesktopBetRows;
    const betPopup = betPopupSize(BET_POPUP_COLUMNS.desktop, desktopVisibleBetRows);
    const desiredPopupScale = isTinyLandscape ? 0.42 : isPopoutLandscape ? 0.52 : isCompactLandscape ? 0.74 : 1;
    const autoPopupScale = popupScaleFor(AUTO_POPUP_SIZE.w, AUTO_POPUP_SIZE.h, desiredPopupScale);
    const betPopupScale = popupScaleFor(betPopup.w, betPopup.h, desiredPopupScale);
    return {
      scale,
      controls,
      left: {
        x: edgeGap - LEFT_BOUNDS.minX * scale,
        y: baselineY
      },
      right: { x: rightX, y: baselineY },
      menuPopup: {
        x: clampPopupX(edgeGap - LEFT_BOUNDS.minX * scale, MENU_POPUP_PANEL.w),
        y: baselineY - 84 * scale
      },
      autoPopup: {
        ...AUTO_POPUP_SIZE,
        scale: autoPopupScale,
        x: clampPopupX(autoX, AUTO_POPUP_SIZE.w, autoPopupScale),
        y: autoY - AUTO_POPUP_SIZE.h * autoPopupScale / 2 - (ABYSSAL_CONTROL_BAR_LAYOUT.right.autoplay.size * controls.sideScale * 0.5 + 12) * scale
      },
      betPopup: {
        ...betPopup,
        scale: betPopupScale,
        x: clampPopupX(betX, betPopup.w, betPopupScale),
        y: betY - betPopup.h * betPopupScale / 2 - (ABYSSAL_CONTROL_BAR_LAYOUT.right.bet.h * controls.betScale * 0.5 + 12) * scale
      },
      win: { x: screenSize.width * 0.5, y: baselineY }
    };
  })();
  const isIdle = context2.stateXstateDerived.isIdle();
  const smallest = options[0];
  const biggest = options[options.length - 1];
  const autoActive = stateBetDerived.hasAutoBetCounter();
  const autoIndicatorActive = autoActive || autoSpinArmed;
  const buyBonusIndicatorActive = stateBetDerived.activeBetMode()?.type === "activate";
  const autoDisabled = !autoActive && !autoSpinArmed && (!isIdle || !stateBetDerived.isBetCostAvailable());
  const turboDisabled = stateBet$1.isSpaceHold;
  const decDisabled = !isIdle || stateBet$1.betAmount <= smallest;
  const incDisabled = !isIdle || stateBet$1.betAmount >= biggest;
  const spinDisabled = !isIdle || !stateBetDerived.isBetCostAvailable();
  const winText = bookEventAmountToCurrencyString(stateBet$1.winBookEventAmount);
  const betLabelText = stateBetDerived.activeBetMode()?.text?.betAmountLabel || "BET";
  const spinning = !isIdle;
  const press = (fn) => {
    context2.eventEmitter.broadcast({ type: "soundPressGeneral" });
    fn();
  };
  const shouldResetBuyModeBeforeManualSpin = () => stateBetDerived.activeBetMode()?.type === "buy" && stateBet$1.activeBetModeKey.toUpperCase() !== "SUPERSPINS";
  const beginAutoSpin = () => {
    if (!stateBetDerived.isBetCostAvailable()) return;
    stateBet$1.autoSpinsCounter = AUTO_SPINS_TEXT_OPTION_MAP[stateUi.autoSpinsText];
    stateBet$1.autoSpinsLossLimitAmount = Infinity;
    stateBet$1.autoSpinsSingleWinLimitAmount = Infinity;
    const activeMode = stateBetDerived.activeBetMode();
    if (activeMode?.type === "buy" && !SELECTABLE_BUY_MODE_KEYS.has(stateBet$1.activeBetModeKey.toUpperCase())) {
      stateBet$1.activeBetModeKey = "BASE";
    }
    autoSpinArmed = false;
    showAutoPopup = false;
    context2.eventEmitter.broadcast({ type: "autoBet" });
  };
  const spin = () => {
    context2.eventEmitter.broadcast({ type: "soundPressBet" });
    if (spinDisabled) return;
    if (isIdle) {
      if (autoSpinArmed) {
        beginAutoSpin();
        return;
      }
      if (shouldResetBuyModeBeforeManualSpin()) stateBet$1.activeBetModeKey = "BASE";
      context2.eventEmitter.broadcast({ type: "bet" });
      return;
    }
    context2.stateGameDerived.speedUpCurrentSpin();
  };
  const decreaseBet = () => press(() => {
    if (!isIdle) return;
    const next = [...options].reverse().find((option) => option < stateBet$1.betAmount);
    stateBetDerived.setBetAmount(next ?? smallest);
  });
  const increaseBet = () => press(() => {
    if (!isIdle) return;
    const next = options.find((option) => option > stateBet$1.betAmount);
    stateBetDerived.setBetAmount(next ?? biggest);
  });
  const autoplay = () => press(() => {
    if (autoSpinArmed && !stateBetDerived.hasAutoBetCounter()) {
      autoSpinArmed = false;
      showAutoPopup = false;
      return;
    }
    if (autoDisabled) return;
    if (stateBetDerived.hasAutoBetCounter()) {
      stateBet$1.autoSpinsCounter = 0;
      autoSpinArmed = false;
      showAutoPopup = false;
      return;
    }
    showBetPopup = false;
    showAutoPopup = !showAutoPopup;
  });
  const toggleAutoSpinChoice = (option) => press(() => {
    if (!isIdle || !stateBetDerived.isBetCostAvailable()) return;
    if (autoSpinArmed && stateUi.autoSpinsText === option) {
      autoSpinArmed = false;
      showAutoPopup = false;
      return;
    }
    stateUi.autoSpinsText = option;
    autoSpinArmed = true;
    showAutoPopup = false;
  });
  const toggleTurbo = () => press(() => {
    if (turboDisabled) return;
    if (stateBet$1.isTurbo) {
      stateBetDerived.updateIsTurbo(false, { persistent: true });
      return;
    }
    context2.stateGameDerived.enableTurbo();
  });
  const openMenu = () => press(() => stateUi.menuOpen = true);
  const anyPopupOpen = showAutoPopup || showBetPopup || stateUi.menuOpen;
  const closeAllPopups = () => press(() => {
    showAutoPopup = false;
    showBetPopup = false;
    stateUi.menuOpen = false;
  });
  const openBuyBonus = () => press(() => {
    if (!isIdle) return;
    if (buyBonusIndicatorActive) {
      stateBet$1.activeBetModeKey = "BASE";
      return;
    }
    stateModal.modal = { name: "buyBonus" };
  });
  const openBetMenu = () => press(() => {
    if (!isIdle) return;
    showAutoPopup = false;
    const popup = responsive.betPopup;
    const selectedIndex = Math.max(0, options.findIndex((option) => option === stateBet$1.betAmount));
    const selectedRow = Math.floor(selectedIndex / popup.columns);
    betScrollRow = clamp(selectedRow - Math.floor(popup.visibleRows / 2), 0, popup.maxScrollRow);
    showBetPopup = !showBetPopup;
  });
  const scrollBetOptions = (direction) => {
    const popup = responsive.betPopup;
    betScrollRow = clamp(betScrollRow + direction, 0, popup.maxScrollRow);
  };
  const startBetScrollDrag = (event2) => {
    if (responsive.betPopup.maxScrollRow <= 0) return;
    event2.stopPropagation();
    betScrollDragging = true;
    betScrollMoved = false;
    betScrollDragStartY = event2.global.y;
    betScrollDragStartRow = responsive.betPopup.scrollRow;
  };
  const updateBetScrollDrag = (event2) => {
    if (!betScrollDragging) return;
    event2.stopPropagation();
    const dragDelta = betScrollDragStartY - event2.global.y;
    if (Math.abs(dragDelta) > 8) betScrollMoved = true;
    const rowDelta = Math.round(dragDelta / (BET_CHOICE.gapY * responsive.betPopup.scale));
    betScrollRow = clamp(betScrollDragStartRow + rowDelta, 0, responsive.betPopup.maxScrollRow);
  };
  const stopBetScrollDrag = () => {
    betScrollDragging = false;
    betScrollMoved = false;
  };
  const menuLocalX = (event2) => (event2.global.x - responsive.menuPopup.x) / responsive.scale;
  const setVolumeSliderValue = (key, event2) => {
    event2.stopPropagation();
    const trackLeft = MENU_SLIDER.trackX - MENU_SLIDER.w / 2;
    const nextValue = Math.round(clamp((menuLocalX(event2) - trackLeft) / MENU_SLIDER.w, 0, 1) * 100);
    if (key === "music") {
      stateSound.volumeValueMusic = nextValue;
    } else {
      stateSound.volumeValueSoundEffect = nextValue;
    }
  };
  const startVolumeSliderDrag = (key, event2) => {
    volumeSliderDragging = key;
    setVolumeSliderValue(key, event2);
  };
  const updateVolumeSliderDrag = (event2) => {
    if (!volumeSliderDragging) return;
    setVolumeSliderValue(volumeSliderDragging, event2);
  };
  const stopVolumeSliderDrag = (event2) => {
    event2.stopPropagation();
    volumeSliderDragging = null;
  };
  const wheelBetOptions = (event2) => {
    if (responsive.betPopup.maxScrollRow <= 0) return;
    event2.preventDefault();
    event2.stopPropagation();
    scrollBetOptions(event2.deltaY > 0 ? 1 : -1);
  };
  const chooseBetAmount = (value) => {
    if (betScrollMoved || !isIdle) return;
    press(() => {
      stateBetDerived.setBetAmount(value);
      showBetPopup = false;
    });
  };
  const labelStyle = {
    fontFamily: BAR_FONT,
    fontWeight: "800",
    fontSize: 17,
    fill: 15770682,
    letterSpacing: 0.8,
    dropShadow: {
      color: 0,
      blur: 4,
      distance: 2,
      alpha: 0.8
    }
  };
  const valueStyle = {
    fontFamily: BAR_FONT,
    fontWeight: "900",
    fontSize: 36,
    fill: 16777215,
    dropShadow: {
      color: 0,
      blur: 4,
      distance: 2,
      alpha: 0.8
    }
  };
  const buttonScale = (pressed, hovered, disabled = false, hoverScale = 1.07, pressScale = 0.94) => {
    if (disabled) return 1;
    if (pressed) return pressScale;
    if (hovered) return hoverScale;
    return 1;
  };
  const displayAutoSpinText = (value) => value;
  const autoCounterText = stateBet$1.autoSpinsCounter === Infinity ? INFINITY_MARK : `${stateBet$1.autoSpinsCounter}`;
  const autoCounterFontSize = (() => {
    if (stateBet$1.autoSpinsCounter === Infinity) return 78;
    if (stateBet$1.autoSpinsCounter > 99) return 54;
    if (stateBet$1.autoSpinsCounter > 9) return 68;
    return 78;
  })();
  const menuActions = [
    {
      icon: "info",
      label: "info",
      y: -158,
      onpress: () => press(() => stateModal.modal = { name: "gameRules" })
    }
  ];
  const menuVolumeSliders = [
    { key: "music", label: "MUSIC", y: -96 },
    { key: "sfx", label: "SFX", y: -34 }
  ];
  const menuPopupPanel = { ...MENU_POPUP_PANEL };
  const drawGlassPanel = (g, w, h, radius = 24, active = false) => {
    g.roundRect(-w / 2 + 9, -h / 2 + 14, w, h, radius).fill({ color: 0, alpha: active ? 0.32 : 0.26 });
    g.roundRect(-w / 2, -h / 2, w, h, radius).fill({ color: 197637, alpha: active ? 0.5 : 0.4 });
    g.roundRect(-w / 2, -h / 2, w, h * 0.5, radius).fill({ color: 16777215, alpha: active ? 0.08 : 0.045 });
    g.roundRect(-w / 2, -h / 2, w, h, radius).stroke({
      width: active ? 1.8 : 1.4,
      color: 16777215,
      alpha: active ? 0.64 : 0.36
    });
  };
  const drawPopoverPanel = (g, w, h, radius = 20, showArrow = true) => {
    g.roundRect(-w / 2 + 10, -h / 2 + 16, w, h, radius).fill({ color: 0, alpha: 0.64 });
    g.roundRect(-w / 2, -h / 2, w, h, radius).fill({ color: 461076, alpha: 0.96 });
    g.roundRect(-w / 2, -h / 2, w, h * 0.48, radius).fill({ color: 2963808, alpha: 0.36 });
    g.roundRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, radius - 6).fill({ color: 132365, alpha: 0.72 });
    g.roundRect(-w / 2, -h / 2, w, h, radius).stroke({ width: 2, color: 16777215, alpha: 0.62 });
    if (!showArrow) return;
    g.poly(
      [
        -16,
        h / 2 - 2,
        16,
        h / 2 - 2,
        0,
        h / 2 + 14
      ],
      true
    ).fill({ color: 461076, alpha: 0.96 });
    g.poly(
      [
        -16,
        h / 2 - 2,
        16,
        h / 2 - 2,
        0,
        h / 2 + 14
      ],
      true
    ).stroke({
      width: 1.2,
      color: 16777215,
      alpha: 0.34,
      join: "round"
    });
  };
  const drawButtonAccentRing = (g, size, color = 16727862) => {
    const w = size;
    const h = size * 0.86;
    g.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 22).stroke({ width: 6, color, alpha: 0.22 });
    g.roundRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 20).stroke({ width: 2.8, color, alpha: 0.92 });
  };
  const drawPanelAccentRing = (g, w, h, radius = 24, color = 16727862) => {
    g.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, radius + 2).stroke({ width: 6, color, alpha: 0.2 });
    g.roundRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, radius - 2).stroke({ width: 2.4, color, alpha: 0.92 });
  };
  const drawPanelHoverStroke = (g, w, h, radius = 24) => {
    g.roundRect(-w / 2, -h / 2, w, h, radius).stroke({ width: 2.8, color: 15770682, alpha: 0.94 });
  };
  const drawButtonHoverStroke = (g, size) => {
    drawPanelHoverStroke(g, size, size * 0.86, 20);
  };
  const drawChoiceChip = (g, w, h, selected = false, accent = 16167482) => {
    const radius = Math.min(14, h * 0.28);
    g.roundRect(-w / 2 + 5, -h / 2 + 7, w, h, radius).fill({
      color: 0,
      alpha: selected ? 0.42 : 0.34
    });
    g.roundRect(-w / 2, -h / 2, w, h, radius).fill({
      color: selected ? accent : 197637,
      alpha: selected ? 0.3 : 0.36
    });
    g.roundRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, Math.max(6, radius - 6)).fill({
      color: 0,
      alpha: selected ? 0.18 : 0.12
    });
    g.roundRect(-w / 2, -h / 2, w, h * 0.52, radius).fill({
      color: 16777215,
      alpha: selected ? 0.14 : 0.06
    });
    g.roundRect(-w / 2, -h / 2, w, h, radius).stroke({
      width: selected ? 2.1 : 1.35,
      color: selected ? accent : 16777215,
      alpha: selected ? 0.88 : 0.36
    });
    if (!selected) return;
    g.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, radius + 2).stroke({ width: 4, color: accent, alpha: 0.16 });
  };
  const drawInfinityIcon = (g, size, selected = false) => {
    const w = size * 0.78;
    const h = size * 0.34;
    const color = selected ? 16773872 : 16777215;
    const alpha = selected ? 1 : 0.92;
    const drawLoop = (width, strokeAlpha) => {
      g.moveTo(-w / 2, 0).bezierCurveTo(-w / 2, -h, -w * 0.14, -h, 0, 0).bezierCurveTo(w * 0.14, h, w / 2, h, w / 2, 0).bezierCurveTo(w / 2, -h, w * 0.14, -h, 0, 0).bezierCurveTo(-w * 0.14, h, -w / 2, h, -w / 2, 0).stroke({
        width,
        color,
        alpha: strokeAlpha,
        cap: "round",
        join: "round"
      });
    };
    if (selected) drawLoop(10, 0.18);
    drawLoop(4.8, alpha);
  };
  const drawRoundButton = (g, size, active = false, disabled = false) => {
    const w = size;
    const h = size * 0.86;
    drawGlassPanel(g, w, h, 20, active);
    g.roundRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18, 15).fill({
      color: 0,
      alpha: disabled ? 0.12 : active ? 0.18 : 0.14
    });
  };
  const drawVolumeSlider = (g, value) => {
    const percent = clamp(value / 100, 0, 1);
    const trackLeft = -124 / 2;
    const filledW = MENU_SLIDER.w * percent;
    const knobX = trackLeft + filledW;
    g.roundRect(trackLeft, -6, MENU_SLIDER.w, 12, 6).fill({ color: 0, alpha: 0.48 });
    g.roundRect(trackLeft, -5, MENU_SLIDER.w, 10, 5).fill({ color: 1910592, alpha: 0.9 });
    if (filledW > 0) {
      g.roundRect(trackLeft, -5, Math.max(10, filledW), 10, 5).fill({ color: 15770682, alpha: 0.95 });
    }
    g.circle(knobX, 0, 15).fill({ color: 461076, alpha: 1 });
    g.circle(knobX, 0, 11).fill({ color: 16777215, alpha: 0.94 });
    g.circle(knobX, 0, 16).stroke({ width: 1.8, color: 15770682, alpha: 0.72 });
  };
  const drawMenuButton = (g, size, active = false) => {
    if (active) {
      const w = size * 1.08;
      const h = size * 0.96;
      g.roundRect(-w / 2 + 8, -h / 2 + 12, w, h, 24).fill({ color: 0, alpha: 0.38 });
      g.roundRect(-w / 2, -h / 2, w, h, 24).fill({ color: 659488, alpha: 0.78 });
      g.roundRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 18).fill({ color: 15770682, alpha: 0.12 });
    }
    drawRoundButton(g, size, active);
  };
  const drawSpinPanel = (g, size) => {
    drawGlassPanel(g, size * 1.08, size * 0.76, 28, true);
  };
  OnHotkey($$payload, {
    hotkey: "Space",
    disabled: spinDisabled,
    onpress: spin
  });
  $$payload.out += `<!----> `;
  Container($$payload, {
    zIndex: 30,
    sortableChildren: true,
    children: ($$payload2) => {
      if (anyPopupOpen) {
        $$payload2.out += "<!--[-->";
        {
          let children = function($$payload3, { center }) {
            Rectangle$1($$payload3, {
              anchor: 0.5,
              x: center.x,
              y: center.y,
              width: screenSize.width,
              height: screenSize.height,
              backgroundAlpha: 1e-3
            });
          };
          Button($$payload2, {
            sizes: {
              width: screenSize.width,
              height: screenSize.height
            },
            onpress: closeAllPopups,
            zIndex: 15,
            children,
            $$slots: { default: true }
          });
        }
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--> `;
      Container($$payload2, {
        x: responsive.left.x,
        y: responsive.left.y,
        scale: responsive.scale,
        zIndex: 5,
        children: ($$payload3) => {
          {
            let children = function($$payload4, { center, hovered, pressed }) {
              Container($$payload4, {
                x: center.x,
                y: center.y,
                scale: buttonScale(pressed, hovered) * responsive.controls.menuScale,
                children: ($$payload5) => {
                  Graphics($$payload5, {
                    draw: (g) => {
                      drawMenuButton(g, ABYSSAL_CONTROL_BAR_LAYOUT.left.menu.size, stateUi.menuOpen || hovered);
                      if (hovered) drawButtonHoverStroke(g, ABYSSAL_CONTROL_BAR_LAYOUT.left.menu.size);
                    }
                  });
                  $$payload5.out += `<!----> `;
                  Graphics($$payload5, {
                    draw: (g) => drawControlGlyph(g, "menu", 74, { active: stateUi.menuOpen })
                  });
                  $$payload5.out += `<!---->`;
                },
                $$slots: { default: true }
              });
            };
            Button($$payload3, {
              x: responsive.controls.menu.x,
              y: responsive.controls.menu.y,
              anchor: 0.5,
              sizes: {
                width: ABYSSAL_CONTROL_BAR_LAYOUT.left.menu.size,
                height: ABYSSAL_CONTROL_BAR_LAYOUT.left.menu.size
              },
              onpress: openMenu,
              zIndex: 5,
              children,
              $$slots: { default: true }
            });
          }
          $$payload3.out += `<!----> `;
          {
            let children = function($$payload4, { center }) {
              Container($$payload4, {
                x: center.x,
                y: center.y,
                scale: responsive.controls.balanceScale,
                children: ($$payload5) => {
                  Graphics($$payload5, {
                    draw: (g) => drawGlassPanel(g, balancePanelWidth, ABYSSAL_CONTROL_BAR_LAYOUT.left.balance.h, 22)
                  });
                  $$payload5.out += `<!----> `;
                  Text($$payload5, {
                    anchor: 0.5,
                    y: -25,
                    text: "BALANCE",
                    style: labelStyle
                  });
                  $$payload5.out += `<!----> `;
                  Text($$payload5, {
                    anchor: 0.5,
                    y: 18,
                    text: balanceText,
                    style: { ...valueStyle, fontSize: balanceValueFontSize }
                  });
                  $$payload5.out += `<!---->`;
                },
                $$slots: { default: true }
              });
            };
            Button($$payload3, {
              x: responsive.controls.balance.x,
              y: responsive.controls.balance.y,
              anchor: 0.5,
              sizes: {
                width: balancePanelWidth,
                height: ABYSSAL_CONTROL_BAR_LAYOUT.left.balance.h
              },
              onpress: () => void 0,
              zIndex: 4,
              children,
              $$slots: { default: true }
            });
          }
          $$payload3.out += `<!----> `;
          {
            let children = function($$payload4, { center, hovered, pressed }) {
              Container($$payload4, {
                x: center.x,
                y: center.y,
                scale: buttonScale(pressed, hovered, !isIdle) * responsive.controls.buyScale,
                rotation: -0.055,
                alpha: isIdle ? 1 : 0.48,
                children: ($$payload5) => {
                  Graphics($$payload5, {
                    draw: (g) => {
                      drawGlassPanel(g, ABYSSAL_CONTROL_BAR_LAYOUT.left.buyBonus.w, ABYSSAL_CONTROL_BAR_LAYOUT.left.buyBonus.h, 26, buyBonusIndicatorActive || hovered && isIdle);
                      if (buyBonusIndicatorActive) {
                        g.roundRect(-210 / 2, -142 / 2, ABYSSAL_CONTROL_BAR_LAYOUT.left.buyBonus.w, ABYSSAL_CONTROL_BAR_LAYOUT.left.buyBonus.h, 26).fill({ color: 16727862, alpha: 0.32 });
                        drawPanelAccentRing(g, ABYSSAL_CONTROL_BAR_LAYOUT.left.buyBonus.w, ABYSSAL_CONTROL_BAR_LAYOUT.left.buyBonus.h, 26);
                      }
                      if (hovered && isIdle) {
                        drawPanelHoverStroke(g, ABYSSAL_CONTROL_BAR_LAYOUT.left.buyBonus.w, ABYSSAL_CONTROL_BAR_LAYOUT.left.buyBonus.h, 26);
                      }
                    }
                  });
                  $$payload5.out += `<!----> `;
                  if (buyBonusIndicatorActive) {
                    $$payload5.out += "<!--[-->";
                    Text($$payload5, {
                      anchor: 0.5,
                      text: "DEACTIVATE",
                      style: {
                        fontFamily: BAR_FONT,
                        fontWeight: "900",
                        fontSize: 24,
                        fill: 16777215,
                        letterSpacing: 0.6,
                        dropShadow: {
                          color: 0,
                          blur: 4,
                          distance: 2,
                          alpha: 0.85
                        }
                      }
                    });
                  } else {
                    $$payload5.out += "<!--[!-->";
                    Sprite($$payload5, {
                      key: "providerLogo",
                      anchor: 0.5,
                      y: -8,
                      width: 70,
                      height: 84
                    });
                  }
                  $$payload5.out += `<!--]-->`;
                },
                $$slots: { default: true }
              });
            };
            Button($$payload3, {
              x: responsive.controls.buy.x,
              y: responsive.controls.buy.y,
              anchor: 0.5,
              sizes: {
                width: ABYSSAL_CONTROL_BAR_LAYOUT.left.buyBonus.w,
                height: ABYSSAL_CONTROL_BAR_LAYOUT.left.buyBonus.h
              },
              onpress: openBuyBonus,
              disabled: !isIdle,
              zIndex: 5,
              children,
              $$slots: { default: true }
            });
          }
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      Container($$payload2, {
        x: responsive.right.x,
        y: responsive.right.y,
        scale: responsive.scale,
        zIndex: 10,
        children: ($$payload3) => {
          {
            let children = function($$payload4, { center, hovered, pressed }) {
              Container($$payload4, {
                x: center.x,
                y: center.y,
                scale: buttonScale(pressed, hovered, autoDisabled) * responsive.controls.sideScale,
                alpha: autoDisabled ? 0.45 : 1,
                children: ($$payload5) => {
                  Graphics($$payload5, {
                    draw: (g) => {
                      drawRoundButton(g, ABYSSAL_CONTROL_BAR_LAYOUT.right.autoplay.size, autoIndicatorActive || hovered);
                      if (autoIndicatorActive) {
                        drawButtonAccentRing(g, ABYSSAL_CONTROL_BAR_LAYOUT.right.autoplay.size, ACTIVE_PURPLE);
                      }
                      if (hovered && !autoDisabled) drawButtonHoverStroke(g, ABYSSAL_CONTROL_BAR_LAYOUT.right.autoplay.size);
                    }
                  });
                  $$payload5.out += `<!----> `;
                  Graphics($$payload5, {
                    draw: (g) => drawControlGlyph(g, "autoplay", responsive.controls.autoGlyph, {
                      active: autoIndicatorActive,
                      disabled: autoDisabled,
                      color: autoIndicatorActive ? ACTIVE_PURPLE_BRIGHT : 16777215
                    })
                  });
                  $$payload5.out += `<!---->`;
                },
                $$slots: { default: true }
              });
            };
            Button($$payload3, {
              x: responsive.controls.auto.x,
              y: responsive.controls.auto.y,
              anchor: 0.5,
              sizes: {
                width: ABYSSAL_CONTROL_BAR_LAYOUT.right.autoplay.size * responsive.controls.sideScale,
                height: ABYSSAL_CONTROL_BAR_LAYOUT.right.autoplay.size * responsive.controls.sideScale
              },
              onpress: autoplay,
              disabled: autoDisabled,
              zIndex: 8,
              children,
              $$slots: { default: true }
            });
          }
          $$payload3.out += `<!----> `;
          {
            let children = function($$payload4, { center, hovered, pressed }) {
              Container($$payload4, {
                x: center.x,
                y: center.y,
                scale: buttonScale(pressed, hovered, turboDisabled) * responsive.controls.sideScale,
                alpha: turboDisabled ? 0.45 : 1,
                children: ($$payload5) => {
                  Graphics($$payload5, {
                    draw: (g) => {
                      drawRoundButton(g, ABYSSAL_CONTROL_BAR_LAYOUT.right.turbo.size, stateBet$1.isTurbo || hovered);
                      if (stateBet$1.isTurbo) drawButtonAccentRing(g, ABYSSAL_CONTROL_BAR_LAYOUT.right.turbo.size, ACTIVE_PURPLE);
                      if (hovered && !turboDisabled) drawButtonHoverStroke(g, ABYSSAL_CONTROL_BAR_LAYOUT.right.turbo.size);
                    }
                  });
                  $$payload5.out += `<!----> `;
                  Graphics($$payload5, {
                    draw: (g) => drawControlGlyph(g, "turbo", responsive.controls.turboGlyph, {
                      active: stateBet$1.isTurbo,
                      disabled: turboDisabled,
                      color: stateBet$1.isTurbo ? ACTIVE_PURPLE_BRIGHT : 16777215
                    })
                  });
                  $$payload5.out += `<!---->`;
                },
                $$slots: { default: true }
              });
            };
            Button($$payload3, {
              x: responsive.controls.turbo.x,
              y: responsive.controls.turbo.y,
              anchor: 0.5,
              sizes: {
                width: ABYSSAL_CONTROL_BAR_LAYOUT.right.turbo.size * responsive.controls.sideScale,
                height: ABYSSAL_CONTROL_BAR_LAYOUT.right.turbo.size * responsive.controls.sideScale
              },
              onpress: toggleTurbo,
              disabled: turboDisabled,
              zIndex: 8,
              children,
              $$slots: { default: true }
            });
          }
          $$payload3.out += `<!----> `;
          {
            let children = function($$payload4, { center, hovered, pressed }) {
              Container($$payload4, {
                x: center.x,
                y: center.y,
                scale: buttonScale(pressed, hovered, spinDisabled) * responsive.controls.spinScale,
                rotation: -0.035,
                alpha: spinDisabled ? 0.48 : 1,
                children: ($$payload5) => {
                  Graphics($$payload5, {
                    draw: (g) => {
                      drawSpinPanel(g, ABYSSAL_CONTROL_BAR_LAYOUT.right.spin.size);
                      if (hovered && !spinDisabled) {
                        drawPanelHoverStroke(g, ABYSSAL_CONTROL_BAR_LAYOUT.right.spin.size * 1.08, ABYSSAL_CONTROL_BAR_LAYOUT.right.spin.size * 0.76, 28);
                      }
                    }
                  });
                  $$payload5.out += `<!----> `;
                  if (autoActive) {
                    $$payload5.out += "<!--[-->";
                    Text($$payload5, {
                      anchor: 0.5,
                      rotation: 0.035,
                      text: autoCounterText,
                      style: {
                        fontFamily: BAR_FONT,
                        fontWeight: "900",
                        fontSize: autoCounterFontSize,
                        fill: 16777215,
                        dropShadow: {
                          color: 0,
                          blur: 8,
                          distance: 2,
                          alpha: 0.9
                        }
                      }
                    });
                  } else {
                    $$payload5.out += "<!--[!-->";
                    Graphics($$payload5, {
                      rotation: 0.035,
                      draw: (g) => drawControlGlyph(g, "spin", ABYSSAL_CONTROL_BAR_LAYOUT.right.spin.size * 0.72, {
                        active: spinning,
                        disabled: spinDisabled,
                        stop: spinning
                      })
                    });
                  }
                  $$payload5.out += `<!--]-->`;
                },
                $$slots: { default: true }
              });
            };
            Button($$payload3, {
              x: responsive.controls.spin.x,
              y: responsive.controls.spin.y,
              anchor: 0.5,
              sizes: {
                width: ABYSSAL_CONTROL_BAR_LAYOUT.right.spin.size,
                height: ABYSSAL_CONTROL_BAR_LAYOUT.right.spin.size
              },
              onpress: spin,
              disabled: spinDisabled,
              zIndex: 12,
              children,
              $$slots: { default: true }
            });
          }
          $$payload3.out += `<!----> `;
          Container($$payload3, {
            x: responsive.controls.bet.x,
            y: responsive.controls.bet.y,
            scale: responsive.controls.betScale,
            zIndex: 9,
            children: ($$payload4) => {
              {
                let children = function($$payload5, { center, hovered, pressed }) {
                  Container($$payload5, {
                    x: center.x,
                    y: center.y,
                    scale: buttonScale(pressed, hovered, !isIdle, 1.025, 0.99),
                    children: ($$payload6) => {
                      Graphics($$payload6, {
                        draw: (g) => {
                          drawGlassPanel(g, betPanelWidth, ABYSSAL_CONTROL_BAR_LAYOUT.right.bet.h, 22, hovered && isIdle);
                          if (hovered && isIdle) drawPanelHoverStroke(g, betPanelWidth, ABYSSAL_CONTROL_BAR_LAYOUT.right.bet.h, 22);
                        }
                      });
                      $$payload6.out += `<!----> `;
                      Text($$payload6, {
                        anchor: 0.5,
                        y: -28,
                        text: betLabelText,
                        style: labelStyle
                      });
                      $$payload6.out += `<!----> `;
                      Text($$payload6, {
                        anchor: 0.5,
                        y: 16,
                        text: betText,
                        style: { ...valueStyle, fontSize: betValueFontSize }
                      });
                      $$payload6.out += `<!---->`;
                    },
                    $$slots: { default: true }
                  });
                };
                Button($$payload4, {
                  anchor: 0.5,
                  sizes: { width: betPanelWidth, height: ABYSSAL_CONTROL_BAR_LAYOUT.right.bet.h },
                  onpress: openBetMenu,
                  disabled: !isIdle,
                  children,
                  $$slots: { default: true }
                });
              }
              $$payload4.out += `<!----> `;
              {
                let children = function($$payload5, { center, hovered, pressed }) {
                  Container($$payload5, {
                    x: center.x,
                    y: center.y,
                    scale: buttonScale(pressed, hovered, decDisabled),
                    alpha: decDisabled ? 0.42 : 1,
                    children: ($$payload6) => {
                      Graphics($$payload6, {
                        draw: (g) => {
                          drawRoundButton(g, BET_STEP_BUTTON.drawSize, hovered && !decDisabled);
                          if (hovered && !decDisabled) drawButtonHoverStroke(g, BET_STEP_BUTTON.drawSize);
                        }
                      });
                      $$payload6.out += `<!----> `;
                      Graphics($$payload6, {
                        draw: (g) => drawControlGlyph(g, "minus", BET_STEP_BUTTON.glyphSize, { disabled: decDisabled })
                      });
                      $$payload6.out += `<!---->`;
                    },
                    $$slots: { default: true }
                  });
                };
                Button($$payload4, {
                  x: 0 - betButtonOffset,
                  y: BET_STEP_BUTTON.y,
                  anchor: 0.5,
                  sizes: {
                    width: BET_STEP_BUTTON.hitW,
                    height: BET_STEP_BUTTON.hitH
                  },
                  onpress: decreaseBet,
                  disabled: decDisabled,
                  children,
                  $$slots: { default: true }
                });
              }
              $$payload4.out += `<!----> `;
              {
                let children = function($$payload5, { center, hovered, pressed }) {
                  Container($$payload5, {
                    x: center.x,
                    y: center.y,
                    scale: buttonScale(pressed, hovered, incDisabled),
                    alpha: incDisabled ? 0.42 : 1,
                    children: ($$payload6) => {
                      Graphics($$payload6, {
                        draw: (g) => {
                          drawRoundButton(g, BET_STEP_BUTTON.drawSize, hovered && !incDisabled);
                          if (hovered && !incDisabled) drawButtonHoverStroke(g, BET_STEP_BUTTON.drawSize);
                        }
                      });
                      $$payload6.out += `<!----> `;
                      Graphics($$payload6, {
                        draw: (g) => drawControlGlyph(g, "plus", BET_STEP_BUTTON.glyphSize, { disabled: incDisabled })
                      });
                      $$payload6.out += `<!---->`;
                    },
                    $$slots: { default: true }
                  });
                };
                Button($$payload4, {
                  x: betButtonOffset,
                  y: BET_STEP_BUTTON.y,
                  anchor: 0.5,
                  sizes: {
                    width: BET_STEP_BUTTON.hitW,
                    height: BET_STEP_BUTTON.hitH
                  },
                  onpress: increaseBet,
                  disabled: incDisabled,
                  children,
                  $$slots: { default: true }
                });
              }
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      if (showAutoPopup) {
        $$payload2.out += "<!--[-->";
        Container($$payload2, {
          x: responsive.autoPopup.x,
          y: responsive.autoPopup.y,
          scale: responsive.autoPopup.scale,
          zIndex: 45,
          children: ($$payload3) => {
            const each_array = ensure_array_like(autoPopupOptions);
            Graphics($$payload3, {
              draw: (g) => drawPopoverPanel(g, responsive.autoPopup.w, responsive.autoPopup.h, 22, false)
            });
            $$payload3.out += `<!----> `;
            {
              let children = function($$payload4, { center }) {
                Rectangle$1($$payload4, {
                  anchor: 0.5,
                  x: center.x,
                  y: center.y,
                  width: responsive.autoPopup.w,
                  height: responsive.autoPopup.h,
                  backgroundAlpha: 1e-3
                });
              };
              Button($$payload3, {
                anchor: 0.5,
                sizes: {
                  width: responsive.autoPopup.w,
                  height: responsive.autoPopup.h
                },
                onpress: () => {
                },
                children,
                $$slots: { default: true }
              });
            }
            $$payload3.out += `<!----> <!--[-->`;
            for (let index = 0, $$length = each_array.length; index < $$length; index++) {
              let option = each_array[index];
              const selected = stateUi.autoSpinsText === option;
              {
                let children = function($$payload4, { center, hovered, pressed }) {
                  Container($$payload4, {
                    x: center.x,
                    y: center.y,
                    scale: buttonScale(pressed, hovered),
                    children: ($$payload5) => {
                      Graphics($$payload5, {
                        draw: (g) => {
                          drawChoiceChip(g, AUTO_CHOICE.w, AUTO_CHOICE.h, selected && autoSpinArmed || hovered, ACTIVE_PURPLE);
                          if (hovered) drawPanelHoverStroke(g, AUTO_CHOICE.w, AUTO_CHOICE.h, 14);
                        }
                      });
                      $$payload5.out += `<!----> `;
                      if (option === INFINITY_MARK) {
                        $$payload5.out += "<!--[-->";
                        Graphics($$payload5, {
                          draw: (g) => drawInfinityIcon(g, 44, selected && autoSpinArmed)
                        });
                      } else {
                        $$payload5.out += "<!--[!-->";
                        Text($$payload5, {
                          anchor: 0.5,
                          text: displayAutoSpinText(option),
                          style: {
                            fontFamily: BAR_FONT,
                            fontWeight: "800",
                            fontSize: AUTO_CHOICE.fontSize,
                            fill: 16777215,
                            dropShadow: {
                              color: 0,
                              blur: 3,
                              distance: 1,
                              alpha: 0.7
                            }
                          }
                        });
                      }
                      $$payload5.out += `<!--]-->`;
                    },
                    $$slots: { default: true }
                  });
                };
                Button($$payload3, {
                  x: index % 3 * AUTO_CHOICE.gapX - AUTO_CHOICE.gapX,
                  y: Math.floor(index / 3) * AUTO_CHOICE.gapY - AUTO_CHOICE.gapY / 2,
                  anchor: 0.5,
                  sizes: { width: AUTO_CHOICE.w, height: AUTO_CHOICE.h },
                  onpress: () => toggleAutoSpinChoice(option),
                  children,
                  $$slots: { default: true }
                });
              }
            }
            $$payload3.out += `<!--]-->`;
          },
          $$slots: { default: true }
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--> `;
      if (showBetPopup) {
        $$payload2.out += "<!--[-->";
        Container($$payload2, {
          x: responsive.betPopup.x,
          y: responsive.betPopup.y,
          scale: responsive.betPopup.scale,
          zIndex: 46,
          children: ($$payload3) => {
            const firstBetOptionIndex = responsive.betPopup.scrollRow * responsive.betPopup.columns;
            Graphics($$payload3, {
              draw: (g) => drawPopoverPanel(g, responsive.betPopup.w, responsive.betPopup.h, 24, false)
            });
            $$payload3.out += `<!----> `;
            {
              let children = function($$payload4, { center }) {
                Rectangle$1($$payload4, {
                  anchor: 0.5,
                  x: center.x,
                  y: center.y,
                  width: responsive.betPopup.w,
                  height: responsive.betPopup.h,
                  backgroundAlpha: 1e-3
                });
              };
              Button($$payload3, {
                anchor: 0.5,
                sizes: {
                  width: responsive.betPopup.w,
                  height: responsive.betPopup.h
                },
                onpress: () => {
                },
                children,
                $$slots: { default: true }
              });
            }
            $$payload3.out += `<!----> `;
            Container($$payload3, {
              eventMode: responsive.betPopup.maxScrollRow > 0 ? "static" : "passive",
              cursor: responsive.betPopup.maxScrollRow > 0 ? betScrollDragging ? "grabbing" : "grab" : "default",
              onpointerdown: startBetScrollDrag,
              onglobalpointermove: updateBetScrollDrag,
              onpointerup: stopBetScrollDrag,
              onpointerupoutside: stopBetScrollDrag,
              onwheel: wheelBetOptions,
              children: ($$payload4) => {
                const each_array_1 = ensure_array_like(options.slice(firstBetOptionIndex, firstBetOptionIndex + responsive.betPopup.visibleRows * responsive.betPopup.columns));
                Graphics($$payload4, {
                  isMask: true,
                  draw: (g) => {
                    g.roundRect(-responsive.betPopup.w / 2 + BET_POPUP_PADDING.x * 0.55, -responsive.betPopup.h / 2 + BET_POPUP_PADDING.y * 0.6, responsive.betPopup.w - BET_POPUP_PADDING.x * 1.1, responsive.betPopup.h - BET_POPUP_PADDING.y * 1.2, 18).fill({ color: 16777215, alpha: 1 });
                  }
                });
                $$payload4.out += `<!----> <!--[-->`;
                for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
                  let option = each_array_1[index];
                  const selected = stateBet$1.betAmount === option;
                  const optionText = numberToCurrencyString(option);
                  {
                    let children = function($$payload5, { center, hovered, pressed }) {
                      Container($$payload5, {
                        x: center.x,
                        y: center.y,
                        scale: buttonScale(pressed, hovered),
                        children: ($$payload6) => {
                          Graphics($$payload6, {
                            draw: (g) => {
                              drawChoiceChip(g, BET_CHOICE.w, BET_CHOICE.h, selected || hovered, 16167482);
                              if (hovered) drawPanelHoverStroke(g, BET_CHOICE.w, BET_CHOICE.h, 14);
                            }
                          });
                          $$payload6.out += `<!----> `;
                          Text($$payload6, {
                            anchor: 0.5,
                            text: optionText,
                            style: {
                              fontFamily: BAR_FONT,
                              fontWeight: "850",
                              fontSize: choiceFontSize(optionText, BET_CHOICE.w, BET_CHOICE.fontSize, 14),
                              fill: 16777215,
                              dropShadow: {
                                color: 0,
                                blur: 3,
                                distance: 1,
                                alpha: 0.75
                              }
                            }
                          });
                          $$payload6.out += `<!---->`;
                        },
                        $$slots: { default: true }
                      });
                    };
                    Button($$payload4, {
                      x: index % responsive.betPopup.columns * BET_CHOICE.gapX - (responsive.betPopup.columns - 1) * BET_CHOICE.gapX / 2,
                      y: Math.floor(index / responsive.betPopup.columns) * BET_CHOICE.gapY - (responsive.betPopup.visibleRows - 1) * BET_CHOICE.gapY / 2,
                      anchor: 0.5,
                      sizes: { width: BET_CHOICE.w, height: BET_CHOICE.h },
                      onpress: () => chooseBetAmount(option),
                      children,
                      $$slots: { default: true }
                    });
                  }
                }
                $$payload4.out += `<!--]-->`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            if (responsive.betPopup.maxScrollRow > 0) {
              $$payload3.out += "<!--[-->";
              Graphics($$payload3, {
                draw: (g) => {
                  const trackH = responsive.betPopup.h - 82;
                  const trackX = responsive.betPopup.w / 2 - 23;
                  const trackY = -trackH / 2;
                  const knobH = Math.max(42, trackH * (responsive.betPopup.visibleRows / responsive.betPopup.rows));
                  const knobTravel = Math.max(0, trackH - knobH);
                  const knobY = trackY + knobH / 2 + knobTravel * (responsive.betPopup.scrollRow / responsive.betPopup.maxScrollRow);
                  g.roundRect(trackX - 5, trackY, 10, trackH, 5).fill({ color: 16777215, alpha: 0.22 });
                  g.roundRect(trackX - 3, trackY + 2, 6, trackH - 4, 3).fill({ color: 1120298, alpha: 0.72 });
                  g.roundRect(trackX - 7, knobY - knobH / 2, 14, knobH, 7).fill({ color: 16167482, alpha: 0.94 });
                  g.roundRect(trackX - 7, knobY - knobH / 2, 14, knobH, 7).stroke({ width: 1.2, color: 16777215, alpha: 0.52 });
                }
              });
            } else {
              $$payload3.out += "<!--[!-->";
            }
            $$payload3.out += `<!--]-->`;
          },
          $$slots: { default: true }
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--> `;
      if (stateUi.menuOpen) {
        $$payload2.out += "<!--[-->";
        Container($$payload2, {
          x: responsive.menuPopup.x,
          y: responsive.menuPopup.y,
          scale: responsive.scale,
          zIndex: 22,
          children: ($$payload3) => {
            const each_array_2 = ensure_array_like(menuVolumeSliders);
            const each_array_3 = ensure_array_like(menuActions);
            Graphics($$payload3, {
              y: menuPopupPanel.centerY,
              draw: (g) => drawPopoverPanel(g, menuPopupPanel.w, menuPopupPanel.h, 22, false)
            });
            $$payload3.out += `<!----> `;
            {
              let children = function($$payload4, { center }) {
                Rectangle$1($$payload4, {
                  anchor: 0.5,
                  x: center.x,
                  y: center.y,
                  width: menuPopupPanel.w,
                  height: menuPopupPanel.h,
                  backgroundAlpha: 1e-3
                });
              };
              Button($$payload3, {
                y: menuPopupPanel.centerY,
                anchor: 0.5,
                sizes: {
                  width: menuPopupPanel.w,
                  height: menuPopupPanel.h
                },
                onpress: () => {
                },
                children,
                $$slots: { default: true }
              });
            }
            $$payload3.out += `<!----> <!--[-->`;
            for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
              let slider = each_array_2[$$index_2];
              const value = slider.key === "music" ? stateSound.volumeValueMusic : stateSound.volumeValueSoundEffect;
              Container($$payload3, {
                y: slider.y,
                eventMode: "static",
                alpha: hoveredSlider === slider.key || volumeSliderDragging === slider.key ? 1 : 0.72,
                cursor: volumeSliderDragging === slider.key ? "grabbing" : "pointer",
                onpointerover: () => hoveredSlider = slider.key,
                onpointerout: () => hoveredSlider = null,
                onpointerdown: (event2) => startVolumeSliderDrag(slider.key, event2),
                onglobalpointermove: updateVolumeSliderDrag,
                onpointerup: stopVolumeSliderDrag,
                onpointerupoutside: stopVolumeSliderDrag,
                children: ($$payload4) => {
                  Rectangle$1($$payload4, {
                    anchor: 0.5,
                    x: MENU_SLIDER.trackX,
                    width: MENU_SLIDER.w + 38,
                    height: MENU_SLIDER.h,
                    backgroundAlpha: 1e-3
                  });
                  $$payload4.out += `<!----> `;
                  Text($$payload4, {
                    anchor: { x: 0, y: 0.5 },
                    x: MENU_SLIDER.labelX,
                    text: slider.label,
                    style: {
                      fontFamily: BAR_FONT,
                      fontWeight: "850",
                      fontSize: MENU_SLIDER.labelFontSize,
                      fill: 16777215,
                      dropShadow: {
                        color: 0,
                        blur: 3,
                        distance: 1,
                        alpha: 0.75
                      }
                    }
                  });
                  $$payload4.out += `<!----> `;
                  Graphics($$payload4, {
                    x: MENU_SLIDER.trackX,
                    draw: (g) => drawVolumeSlider(g, value)
                  });
                  $$payload4.out += `<!---->`;
                },
                $$slots: { default: true }
              });
            }
            $$payload3.out += `<!--]--> <!--[-->`;
            for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
              let item = each_array_3[$$index_3];
              {
                let children = function($$payload4, { center, hovered, pressed }) {
                  Container($$payload4, {
                    x: center.x,
                    y: center.y,
                    scale: buttonScale(pressed, hovered),
                    alpha: hovered ? 1 : 0.72,
                    children: ($$payload5) => {
                      Graphics($$payload5, {
                        x: MENU_ACTION_BUTTON.iconX,
                        draw: (g) => icons[item.icon](g, MENU_ACTION_BUTTON.iconSize, 16777215)
                      });
                      $$payload5.out += `<!----> `;
                      Text($$payload5, {
                        anchor: { x: 0, y: 0.5 },
                        x: MENU_ACTION_BUTTON.labelX,
                        text: item.label,
                        style: {
                          fontFamily: BAR_FONT,
                          fontWeight: "850",
                          fontSize: MENU_ACTION_BUTTON.fontSize,
                          fill: 16777215,
                          dropShadow: {
                            color: 0,
                            blur: 3,
                            distance: 1,
                            alpha: 0.75
                          }
                        }
                      });
                      $$payload5.out += `<!---->`;
                    },
                    $$slots: { default: true }
                  });
                };
                Button($$payload3, {
                  y: item.y,
                  anchor: 0.5,
                  sizes: {
                    width: MENU_ACTION_BUTTON.w,
                    height: MENU_ACTION_BUTTON.h
                  },
                  onpress: item.onpress,
                  children,
                  $$slots: { default: true }
                });
              }
            }
            $$payload3.out += `<!--]-->`;
          },
          $$slots: { default: true }
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--> `;
      if (stateBet$1.winBookEventAmount > 0) {
        $$payload2.out += "<!--[-->";
        Container($$payload2, {
          x: responsive.win.x,
          y: responsive.win.y,
          scale: responsive.scale,
          zIndex: 7,
          children: ($$payload3) => {
            Graphics($$payload3, {
              draw: (g) => drawGlassPanel(g, 300, 78, 18)
            });
            $$payload3.out += `<!----> `;
            Text($$payload3, {
              anchor: 0.5,
              y: -17,
              text: "WIN",
              style: { ...labelStyle, fontSize: 15 }
            });
            $$payload3.out += `<!----> `;
            Text($$payload3, {
              anchor: 0.5,
              y: 16,
              text: winText,
              style: { ...valueStyle, fontSize: 28 }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--> `;
      Rectangle$1($$payload2, {
        x: screenSize.width * 0.5,
        y: screenSize.height * 0.5,
        anchor: 0.5,
        width: 1,
        height: 1,
        backgroundAlpha: 0
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!---->`;
  pop();
}
const config = {
  gameName: "abyssal"
};
const C = {
  navyDeep: 526092,
  amber: 16757052,
  purpleBright: 8142335,
  white: 16777215,
  textDim: 12036553
};
const FONT = "Inter, sans-serif";
function GameHeader($$payload, $$props) {
  push();
  const context2 = getContext();
  const canvas = context2.stateLayoutDerived.canvasSizes();
  const nameText = config.gameName.toUpperCase();
  let now2 = /* @__PURE__ */ new Date();
  const timeText = now2.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" });
  const scale = Math.max(0.6, Math.min(1, canvas.width / 1200));
  const pad = Math.round(26 * scale);
  const fontSize = Math.round(18 * scale);
  const nameStyle = {
    fontFamily: FONT,
    fontWeight: "600",
    fontSize,
    fill: C.textDim,
    letterSpacing: 4
  };
  Container($$payload, {
    children: ($$payload2) => {
      Text($$payload2, {
        x: pad,
        y: pad,
        anchor: { x: 0, y: 0 },
        alpha: 0.85,
        text: timeText,
        style: nameStyle
      });
      $$payload2.out += `<!----> `;
      Text($$payload2, {
        x: canvas.width - pad,
        y: pad,
        anchor: { x: 1, y: 0 },
        alpha: 1,
        text: nameText,
        style: nameStyle
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  pop();
}
function ReplayControls($$payload, $$props) {
  push();
  const context2 = getContext();
  let phase = "idle";
  const turboDisabled = stateBet$1.isSpaceHold;
  const toggleTurbo = () => {
    if (turboDisabled) return;
    context2.eventEmitter.broadcast({ type: "soundPressGeneral" });
    if (stateBet$1.isTurbo) {
      stateBetDerived.updateIsTurbo(false, { persistent: true });
    } else {
      context2.stateGameDerived.enableTurbo();
    }
  };
  const winText = bookEventAmountToCurrencyString(stateBet$1.winBookEventAmount);
  const betText = numberToCurrencyString(stateBetDerived.betCost());
  const statusText = "LOADING REPLAY…";
  const layout = context2.stateLayoutDerived.mainLayoutStandard();
  const BAR_W = 820;
  const BAR_H = 168;
  const labelStyle = {
    fontFamily: FONT,
    fontWeight: "700",
    fontSize: 15,
    fill: C.textDim,
    letterSpacing: 1.5
  };
  const valueStyle = {
    fontFamily: FONT,
    fontWeight: "900",
    fontSize: 30,
    fill: C.white,
    dropShadow: {
      color: 0,
      blur: 4,
      distance: 2,
      alpha: 0.8
    }
  };
  const drawBar2 = (g) => {
    g.roundRect(-BAR_W / 2, -BAR_H / 2, BAR_W, BAR_H, 24).fill({ color: C.navyDeep, alpha: 0.82 });
    g.roundRect(-BAR_W / 2, -BAR_H / 2, BAR_W, BAR_H, 24).stroke({ width: 2, color: C.purpleBright, alpha: 0.5 });
  };
  MainContainer($$payload, {
    standard: true,
    alignVertical: "bottom",
    children: ($$payload2) => {
      FadeContainer($$payload2, {
        show: phase !== "playing",
        children: ($$payload3) => {
          Container($$payload3, {
            x: layout.width * 0.5,
            y: layout.height - BAR_H * 0.5 - 36,
            children: ($$payload4) => {
              Graphics($$payload4, { draw: drawBar2 });
              $$payload4.out += `<!----> `;
              Container($$payload4, {
                y: -BAR_H * 0.5 + 24,
                children: ($$payload5) => {
                  Graphics($$payload5, {
                    draw: (g) => {
                      g.roundRect(-58, -14, 116, 28, 8).fill({ color: C.purpleBright, alpha: 0.92 });
                    }
                  });
                  $$payload5.out += `<!----> `;
                  Text($$payload5, {
                    anchor: 0.5,
                    text: "REPLAY",
                    style: {
                      fontFamily: FONT,
                      fontWeight: "900",
                      fontSize: 14,
                      fill: C.white,
                      letterSpacing: 3
                    }
                  });
                  $$payload5.out += `<!---->`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Container($$payload4, {
                x: -BAR_W / 2 + 44,
                y: 18,
                children: ($$payload5) => {
                  Text($$payload5, {
                    anchor: { x: 0, y: 0.5 },
                    y: -16,
                    text: "BET",
                    style: labelStyle
                  });
                  $$payload5.out += `<!----> `;
                  Text($$payload5, {
                    anchor: { x: 0, y: 0.5 },
                    y: 16,
                    text: betText,
                    style: valueStyle
                  });
                  $$payload5.out += `<!---->`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Container($$payload4, {
                x: BAR_W / 2 - 44,
                y: 18,
                children: ($$payload5) => {
                  Text($$payload5, {
                    anchor: { x: 1, y: 0.5 },
                    y: -16,
                    text: "WIN",
                    style: labelStyle
                  });
                  $$payload5.out += `<!----> `;
                  Text($$payload5, {
                    anchor: { x: 1, y: 0.5 },
                    y: 16,
                    text: winText,
                    style: { ...valueStyle, fill: C.amber }
                  });
                  $$payload5.out += `<!---->`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              {
                $$payload4.out += "<!--[!-->";
                {
                  $$payload4.out += "<!--[-->";
                  Text($$payload4, {
                    anchor: 0.5,
                    y: 16,
                    text: statusText,
                    style: {
                      fontFamily: FONT,
                      fontWeight: "800",
                      fontSize: 20,
                      fill: C.textDim,
                      letterSpacing: 1
                    }
                  });
                }
                $$payload4.out += `<!--]-->`;
              }
              $$payload4.out += `<!--]-->`;
            },
            $$slots: { default: true }
          });
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      Container($$payload2, {
        x: layout.width - 96,
        y: layout.height - BAR_H * 0.5 - 36,
        children: ($$payload3) => {
          {
            let children = function($$payload4, { center, hovered, pressed }) {
              Container($$payload4, {
                x: center.x,
                y: center.y,
                scale: pressed ? 0.96 : hovered ? 1.04 : 1,
                alpha: turboDisabled ? 0.45 : 1,
                children: ($$payload5) => {
                  Graphics($$payload5, {
                    draw: (g) => {
                      g.circle(0, 0, 38).fill({
                        color: stateBet$1.isTurbo ? C.purpleBright : C.navyDeep,
                        alpha: 0.92
                      });
                      g.circle(0, 0, 38).stroke({
                        width: 2,
                        color: stateBet$1.isTurbo ? C.white : C.purpleBright,
                        alpha: 0.8
                      });
                    }
                  });
                  $$payload5.out += `<!----> `;
                  Graphics($$payload5, {
                    draw: (g) => drawControlGlyph(g, "turbo", 42, {
                      active: stateBet$1.isTurbo,
                      disabled: turboDisabled,
                      color: C.white
                    })
                  });
                  $$payload5.out += `<!---->`;
                },
                $$slots: { default: true }
              });
            };
            Button($$payload3, {
              anchor: 0.5,
              sizes: { width: 76, height: 76 },
              onpress: toggleTurbo,
              disabled: turboDisabled,
              children,
              $$slots: { default: true }
            });
          }
          $$payload3.out += `<!----> `;
          Text($$payload3, {
            anchor: 0.5,
            y: 54,
            text: "SPEED",
            style: {
              fontFamily: FONT,
              fontWeight: "800",
              fontSize: 12,
              fill: C.textDim,
              letterSpacing: 1.5
            }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  pop();
}
function GameInfo($$payload, $$props) {
  push();
  const ATLAS = new URL("../../assets/symbols/eye/eye.png", import.meta.url).href;
  const ATLAS_W = 1572;
  const ATLAS_H = 1660;
  const CELL_W = 393;
  const CELL_H = 415;
  const FRAME = {
    H1: [393, 0],
    H2: [0, 0],
    H3: [1179, 0],
    H4: [786, 0],
    L1: [786, 415],
    L2: [0, 415],
    L3: [393, 415],
    L4: [0, 830],
    L5: [1179, 415],
    SCATTER: [393, 830],
    ADD_EYE: [1179, 830],
    MULT_EYE: [0, 1245],
    CLOSE_EYE: [786, 830]
  };
  const highs = [
    {
      sym: "H1",
      name: "Anglerfish",
      pays: ["10.00×", "25.00×", "50.00×"]
    },
    {
      sym: "H2",
      name: "Nautilus",
      pays: ["2.50×", "10.00×", "25.00×"]
    },
    {
      sym: "H3",
      name: "Diving Helmet",
      pays: ["2.00×", "5.00×", "15.00×"]
    },
    {
      sym: "H4",
      name: "Jellyfish",
      pays: ["1.50×", "2.00×", "12.00×"]
    }
  ];
  const lows = [
    {
      sym: "L1",
      name: "Cyan gem",
      pays: ["1.00×", "1.50×", "10.00×"]
    },
    {
      sym: "L2",
      name: "Teal gem",
      pays: ["0.80×", "1.20×", "8.00×"]
    },
    {
      sym: "L3",
      name: "Sapphire gem",
      pays: ["0.50×", "1.00×", "8.00×"]
    },
    {
      sym: "L4",
      name: "Violet gem",
      pays: ["0.40×", "0.90×", "6.00×"]
    },
    {
      sym: "L5",
      name: "Aqua gem",
      pays: ["0.20×", "0.70×", "5.00×"]
    }
  ];
  const modes = [
    {
      name: "Base",
      cost: "1× bet",
      text: "The standard game. The Eye is rare, mostly the friendly ADD type."
    },
    {
      name: "Ante",
      cost: "1.25× bet",
      text: "Pay 25% more for more frequent Eyes and Scatters."
    },
    {
      name: "Buy Free Spins",
      cost: "100× bet",
      text: "Buy straight into the Free Spins feature."
    },
    {
      name: "Super Spins",
      cost: "20× bet",
      text: "One single spin with the Eye guaranteed — no bonus round."
    },
    {
      name: "Super Bonus",
      cost: "500× bet",
      text: "Free Spins with the Gaze charging twice as fast and MULTIPLY Eyes common."
    },
    {
      name: "Ultimate",
      cost: "300× bet",
      text: "One spin with several Eyes at once that combine — huge or nothing."
    }
  ];
  function symIcon($$payload2, name, size = 30) {
    const fx = FRAME[name][0];
    const fy = FRAME[name][1];
    const s = size / CELL_W;
    $$payload2.out += `<span class="sym-icon svelte-73l26x"${attr("style", `width:${stringify(CELL_W * s)}px; height:${stringify(CELL_H * s)}px; background-image:url('${stringify(ATLAS)}'); background-size:${stringify(ATLAS_W * s)}px ${stringify(ATLAS_H * s)}px; background-position:${stringify(-fx * s)}px ${stringify(-fy * s)}px;`)}></span>`;
  }
  function payColumn($$payload2, title, list, high) {
    const each_array = ensure_array_like(list);
    $$payload2.out += `<div${attr("class", to_class("pay-col", "svelte-73l26x", { "high": high }))}><h3 class="svelte-73l26x">${escape_html(title)}</h3> <table class="svelte-73l26x"><thead><tr><th class="sym svelte-73l26x">Symbol</th><th class="svelte-73l26x">8–9</th><th class="svelte-73l26x">10–11</th><th class="svelte-73l26x">12+</th></tr></thead><tbody class="svelte-73l26x"><!--[-->`;
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let s = each_array[$$index];
      $$payload2.out += `<tr class="svelte-73l26x"><td class="sym svelte-73l26x">`;
      symIcon($$payload2, s.sym);
      $$payload2.out += `<!----><span>${escape_html(s.name)}</span></td><td class="svelte-73l26x">${escape_html(s.pays[0])}</td><td class="svelte-73l26x">${escape_html(s.pays[1])}</td><td class="svelte-73l26x">${escape_html(s.pays[2])}</td></tr>`;
    }
    $$payload2.out += `<!--]--></tbody></table></div>`;
  }
  const each_array_1 = ensure_array_like(modes);
  $$payload.out += `<div class="game-info svelte-73l26x"><header class="svelte-73l26x"><h1 class="svelte-73l26x">ABYSSAL</h1> <p class="tag svelte-73l26x">DEEP-SEA TUMBLE SLOT</p></header> <p class="lead svelte-73l26x">Symbols drop onto a <strong class="svelte-73l26x">6×5 board</strong>. You win whenever <strong class="svelte-73l26x">8 or more of the
		same symbol</strong> land <strong class="svelte-73l26x">anywhere</strong> — no paylines. Winners burst and new
		symbols tumble in, which can chain into more wins from a single spin.
		There is <strong class="svelte-73l26x">no wild</strong>; the <strong class="svelte-73l26x">Eye</strong> is the sole multiplier.</p> <section class="svelte-73l26x"><h2 class="svelte-73l26x">How a spin plays</h2> <ol class="steps svelte-73l26x"><li class="svelte-73l26x">The board fills with 30 symbols.</li> <li class="svelte-73l26x">Any symbol with 8+ on the board wins and bursts.</li> <li class="svelte-73l26x">Symbols above fall and new ones drop in — a <strong class="svelte-73l26x">tumble</strong>.</li> <li class="svelte-73l26x">Wins are checked again, repeating until a drop pays nothing.</li></ol></section> <section class="svelte-73l26x"><h2 class="svelte-73l26x">Paytable</h2> <p class="note svelte-73l26x">Pays are a multiple of your bet, by how many land — before any Eye multiplier.</p> <div class="paytables svelte-73l26x">`;
  payColumn($$payload, "High symbols", highs, true);
  $$payload.out += `<!----> `;
  payColumn($$payload, "Low symbols", lows, false);
  $$payload.out += `<!----></div></section> <section class="svelte-73l26x"><h2 class="svelte-73l26x">Special symbols</h2> <div class="specials svelte-73l26x"><div class="special svelte-73l26x">`;
  symIcon($$payload, "SCATTER", 56);
  $$payload.out += `<!----> <div class="special-name svelte-73l26x">Leviathan — Scatter</div> <p class="svelte-73l26x"><strong class="svelte-73l26x">4+</strong> triggers Free Spins and pays instantly: <strong class="svelte-73l26x">4 = 3×</strong>, <strong class="svelte-73l26x">5 = 5×</strong>, <strong class="svelte-73l26x">6 = 100×</strong>.</p></div> <div class="special svelte-73l26x">`;
  symIcon($$payload, "ADD_EYE", 56);
  $$payload.out += `<!----> <div class="special-name svelte-73l26x">ADD Eye</div> <p class="svelte-73l26x">Common. Multiplier = <strong class="svelte-73l26x">start + Gaze</strong>.</p></div> <div class="special svelte-73l26x">`;
  symIcon($$payload, "MULT_EYE", 56);
  $$payload.out += `<!----> <div class="special-name svelte-73l26x">MULTIPLY Eye</div> <p class="svelte-73l26x">Rare &amp; explosive. Multiplier = <strong class="svelte-73l26x">start × Gaze</strong>.</p></div></div></section> <section class="svelte-73l26x"><h2 class="svelte-73l26x">The Eye &amp; the Gaze</h2> <p class="svelte-73l26x">Every winning tumble charges the <strong class="svelte-73l26x">Gaze</strong> by 1. If an <strong class="svelte-73l26x">Eye</strong> is
			on the board at the end of a winning spin, it turns the Gaze into one big multiplier applied
			to everything you won that spin.</p> <p class="note svelte-73l26x">Example: a 2× win with a Gaze of 3 and an ADD Eye starting at 10 → ×13 → pays 26×.
			A MULTIPLY Eye → ×30 → pays 60×.</p></section> <section class="svelte-73l26x"><h2 class="svelte-73l26x">Free Spins</h2> <ul class="bullets svelte-73l26x"><li class="svelte-73l26x">Land <strong class="svelte-73l26x">4+ Leviathan (Scatter)</strong> — they can drop mid-tumble — to trigger.</li> <li class="svelte-73l26x">You get a flat <strong class="svelte-73l26x">15 free spins</strong>.</li> <li class="svelte-73l26x">A <strong class="svelte-73l26x">banked multiplier</strong> starts at ×1 and only grows, paying off on Eye spins.</li> <li class="svelte-73l26x">Retrigger with 3+ Scatters for <strong class="svelte-73l26x">+5 spins</strong> (up to 30).</li></ul></section> <section class="svelte-73l26x"><h2 class="svelte-73l26x">Ways to play</h2> <div class="modes svelte-73l26x"><!--[-->`;
  for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
    let m = each_array_1[$$index_1];
    $$payload.out += `<div class="mode svelte-73l26x"><div class="mode-head svelte-73l26x"><span class="mode-name svelte-73l26x">${escape_html(m.name)}</span><span class="mode-cost svelte-73l26x">${escape_html(m.cost)}</span></div> <p class="svelte-73l26x">${escape_html(m.text)}</p></div>`;
  }
  $$payload.out += `<!--]--></div></section> <section class="svelte-73l26x"><h2 class="svelte-73l26x">General Disclaimer</h2> <p class="disclaimer svelte-73l26x">Malfunction voids all wins and plays. A consistent internet connection is required. In the
			event of a disconnection, reload the game to finish any uncompleted rounds. The expected
			return is calculated over many plays. The game display is not representative of any physical
			device and is for illustrative purposes only. Winnings are settled according to the amount
			received from the Remote Game Server and not from events within the web browser. TM and ©
			2026 Stake Engine.</p></section></div>`;
  pop();
}
function BuyBonusModal($$payload, $$props) {
  push();
  const { eventEmitter: eventEmitter2 } = getContextEventEmitter();
  const cards = [...stateMetaDerived.betModeMetaList()].filter((m) => m.type === "activate" || m.type === "buy").sort((a, b) => a.costMultiplier - b.costMultiplier);
  const isActivate = (m) => m.type === "activate";
  const options = [...stateConfig.betAmountOptions].sort((a, b) => a - b);
  const smallest = options[0] ?? 0;
  const biggest = options[options.length - 1] ?? 0;
  const decDisabled = stateBet$1.betAmount <= smallest;
  const incDisabled = stateBet$1.betAmount >= biggest;
  const costOf = (m) => stateBet$1.betAmount * m.costMultiplier;
  const affordable = (m) => stateBet$1.betAmount > 0 && stateBet$1.balanceAmount >= costOf(m);
  const isActive = (m) => stateBet$1.activeBetModeKey.toUpperCase() === m.mode.toUpperCase();
  const close = () => stateModal.modal = null;
  const money = (n) => numberToCurrencyString(n);
  const heroOf = (m) => m.assets?.dialogImage || m.assets?.icon || "";
  const BOLTS = [0, 1, 2, 3, 4];
  const volatilityOf = (m) => Number(m.assets?.volatility) || 0;
  if (stateModal.modal?.name === "buyBonus") {
    $$payload.out += "<!--[-->";
    Popup($$payload, {
      zIndex: zIndex.modal,
      onclose: close,
      children: ($$payload2) => {
        const each_array = ensure_array_like(cards);
        $$payload2.out += `<div class="buy-modal svelte-1edcu2"><div class="bm-bet svelte-1edcu2"><span class="bm-bet-label svelte-1edcu2">BET</span> <div class="bm-stepper svelte-1edcu2"><button class="bm-step svelte-1edcu2"${attr("disabled", decDisabled, true)} aria-label="decrease bet">−</button> <span class="bm-bet-value svelte-1edcu2">${escape_html(money(stateBet$1.betAmount))}</span> <button class="bm-step svelte-1edcu2"${attr("disabled", incDisabled, true)} aria-label="increase bet">+</button></div></div> <div class="bm-grid svelte-1edcu2"><!--[-->`;
        for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
          let m = each_array[$$index_1];
          const activate = isActivate(m);
          const active = activate && isActive(m);
          const each_array_1 = ensure_array_like(BOLTS);
          $$payload2.out += `<div${attr("class", to_class("bm-card", "svelte-1edcu2", { "active": active }))}><div class="bm-hero svelte-1edcu2">`;
          if (heroOf(m)) {
            $$payload2.out += "<!--[-->";
            $$payload2.out += `<img${attr("src", heroOf(m))}${attr("alt", m.text.title)} class="svelte-1edcu2">`;
          } else {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]--> `;
          if (active) {
            $$payload2.out += "<!--[-->";
            $$payload2.out += `<div class="bm-badge svelte-1edcu2">ACTIVE</div>`;
          } else {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]--></div> <div class="bm-panel svelte-1edcu2"><div class="bm-bolts svelte-1edcu2"><!--[-->`;
          for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
            let i = each_array_1[$$index];
            $$payload2.out += `<svg${attr("class", to_class("bolt", "svelte-1edcu2", { "on": i < volatilityOf(m) }))} viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z" class="svelte-1edcu2"></path></svg>`;
          }
          $$payload2.out += `<!--]--></div> <div class="bm-title svelte-1edcu2">${escape_html(m.text.title)}</div> <div class="bm-price svelte-1edcu2">${escape_html(money(costOf(m)))}</div> `;
          if (activate && active) {
            $$payload2.out += "<!--[-->";
            $$payload2.out += `<button class="bm-action activate on svelte-1edcu2">DEACTIVATE</button>`;
          } else {
            $$payload2.out += "<!--[!-->";
            if (activate) {
              $$payload2.out += "<!--[-->";
              $$payload2.out += `<button class="bm-action activate svelte-1edcu2"${attr("disabled", !affordable(m), true)}>ACTIVATE</button>`;
            } else {
              $$payload2.out += "<!--[!-->";
              $$payload2.out += `<button class="bm-action buy svelte-1edcu2"${attr("disabled", !affordable(m), true)}>${escape_html(affordable(m) ? "BUY" : "LOW FUNDS")}</button>`;
            }
            $$payload2.out += `<!--]-->`;
          }
          $$payload2.out += `<!--]--></div></div>`;
        }
        $$payload2.out += `<!--]--></div></div>`;
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!----> `;
    {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]-->`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function Game($$payload, $$props) {
  push();
  const context2 = getContext();
  new Tween(0, { duration: 300 });
  context2.eventEmitter.subscribeOnMount({
    buyBonusConfirm: () => {
      stateModal.modal = { name: "buyBonusConfirm" };
    }
  });
  App($$payload, {
    children: ($$payload2) => {
      EnableSound();
      $$payload2.out += `<!----> `;
      EnableHotkey();
      $$payload2.out += `<!----> `;
      TurboSpaceHold($$payload2);
      $$payload2.out += `<!----> `;
      EnableGameActor($$payload2, {});
      $$payload2.out += `<!----> `;
      EnablePixiExtension();
      $$payload2.out += `<!----> `;
      Container($$payload2, {
        filters: [],
        children: ($$payload3) => {
          Background($$payload3);
          $$payload3.out += `<!----> `;
          if (!context2.stateLayout.showLoadingScreen) {
            $$payload3.out += "<!--[-->";
            ResumeBet();
            $$payload3.out += `<!----> `;
            Sound$1();
            $$payload3.out += `<!----> `;
            MainContainer($$payload3, {
              children: ($$payload4) => {
                ReelFrame($$payload4, { layer: "background" });
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            MainContainer($$payload3, {
              children: ($$payload4) => {
                Board($$payload4);
                $$payload4.out += `<!----> `;
                TumbleBoard($$payload4);
                $$payload4.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            MainContainer($$payload3, {
              children: ($$payload4) => {
                ReelFrame($$payload4, { layer: "overlay" });
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            MainContainer($$payload3, {
              children: ($$payload4) => {
                BoardDebris($$payload4);
                $$payload4.out += `<!----> `;
                Anticipations($$payload4);
                $$payload4.out += `<!----> `;
                TumbleWinAmount($$payload4);
                $$payload4.out += `<!----> `;
                GazeMeter($$payload4);
                $$payload4.out += `<!----> `;
                ClusterWinAmounts($$payload4);
                $$payload4.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            MainContainer($$payload3, {
              children: ($$payload4) => {
                Eye($$payload4);
                $$payload4.out += `<!----> `;
                PersistentMultiplier($$payload4);
                $$payload4.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            ScatterFx($$payload3);
            $$payload3.out += `<!----> `;
            if (stateUrlDerived.replay()) {
              $$payload3.out += "<!--[-->";
              ReplayControls($$payload3);
            } else {
              $$payload3.out += "<!--[!-->";
              ControlBar($$payload3);
            }
            $$payload3.out += `<!--]--> `;
            Win($$payload3);
            $$payload3.out += `<!----> `;
            ScatterPay($$payload3);
            $$payload3.out += `<!----> `;
            WinCapCelebration($$payload3);
            $$payload3.out += `<!----> `;
            if (["desktop", "landscape"].includes(context2.stateLayoutDerived.layoutType())) {
              $$payload3.out += "<!--[-->";
              FreeSpinCounter($$payload3);
            } else {
              $$payload3.out += "<!--[!-->";
            }
            $$payload3.out += `<!--]--> `;
            FreeSpinOutro($$payload3);
            $$payload3.out += `<!----> `;
            GameHeader($$payload3);
            $$payload3.out += `<!---->`;
          } else {
            $$payload3.out += "<!--[!-->";
          }
          $$payload3.out += `<!--]-->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      if (!context2.stateLayout.showLoadingScreen) {
        $$payload2.out += "<!--[-->";
        FreeSpinIntro($$payload2);
        $$payload2.out += `<!----> `;
        FreeSpinRetrigger($$payload2);
        $$payload2.out += `<!----> `;
        Transition($$payload2);
        $$payload2.out += `<!---->`;
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]-->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----> `;
  {
    let version2 = function($$payload2) {
      GameVersion($$payload2, { version: "0.0.0" });
    }, gameRules = function($$payload2) {
      GameInfo($$payload2);
    }, buyBonus = function($$payload2) {
      BuyBonusModal($$payload2);
    };
    Modals($$payload, {
      version: version2,
      gameRules,
      buyBonus,
      $$slots: {
        version: true,
        gameRules: true,
        buyBonus: true
      }
    });
  }
  $$payload.out += `<!---->`;
  pop();
}
function AbyssalPixiLogo($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  $$payload.out += `<div class="abyssal-pixi-logo svelte-1sswcpt" role="img"${attr("aria-label", props.title)}></div>`;
  pop();
}
function AbyssalLoader($$payload, $$props) {
  push();
  const context2 = getContext();
  let leaving = false;
  let activeCard = 0;
  const progress = Math.round(context2.stateApp.loadingProgress ?? 0);
  const ready = context2.stateApp.loaded || progress >= 100;
  const copy = {
    logo: i18nDerived.loaderLogo(),
    card1Title: i18nDerived.loaderCard1Title(),
    card1Body: i18nDerived.loaderCard1Body(),
    card2Title: i18nDerived.loaderCard2Title(),
    card2Body: i18nDerived.loaderCard2Body(),
    card3Title: i18nDerived.loaderCard3Title(),
    card3Body: i18nDerived.loaderCard3Body(),
    cta: i18nDerived.loaderCta(),
    loading: i18nDerived.loaderLoading(),
    cardsLabel: i18nDerived.loaderCardsLabel(),
    previousCard: i18nDerived.loaderPreviousCard(),
    nextCard: i18nDerived.loaderNextCard()
  };
  const backgroundUrl = new URL("../../assets/background/background-base.png", import.meta.url).href;
  new URL("../../assets/fonts/Cinzel/Cinzel-VariableFont_wght.ttf", import.meta.url).href;
  const cards = [
    {
      art: new URL("../../assets/bonus/gaze_card.png", import.meta.url).href,
      title: copy.card1Title,
      body: copy.card1Body
    },
    {
      art: new URL("../../assets/bonus/eye_card.png", import.meta.url).href,
      title: copy.card2Title,
      body: copy.card2Body
    },
    {
      art: new URL("../../assets/bonus/win_card.png", import.meta.url).href,
      title: copy.card3Title,
      body: copy.card3Body
    }
  ];
  {
    $$payload.out += "<!--[-->";
    const each_array = ensure_array_like(Array.from({ length: 28 }));
    const each_array_1 = ensure_array_like(cards);
    $$payload.out += `<div${attr("class", to_class("abyssal-loader", "svelte-zmtehn", { "ready": ready, "leaving": leaving }))} role="button" tabindex="0"${attr("aria-label", ready ? copy.cta : copy.loading)}><div class="loader-stage svelte-zmtehn"><div class="background svelte-zmtehn" aria-hidden="true"${attr("style", `background-image: url(${backgroundUrl})`)}></div> <div class="vignette svelte-zmtehn" aria-hidden="true"></div> <div class="light-rays svelte-zmtehn" aria-hidden="true"></div> <div class="bubbles svelte-zmtehn" aria-hidden="true"><!--[-->`;
    for (let index = 0, $$length = each_array.length; index < $$length; index++) {
      each_array[index];
      $$payload.out += `<i${attr("style", `--i: ${index}`)} class="svelte-zmtehn"></i>`;
    }
    $$payload.out += `<!--]--></div> <header class="loader-header svelte-zmtehn">`;
    AbyssalPixiLogo($$payload, { title: copy.logo });
    $$payload.out += `<!----></header> <div class="cards svelte-zmtehn"><!--[-->`;
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let card = each_array_1[$$index_1];
      $$payload.out += `<article class="how-card svelte-zmtehn"><img class="card-art svelte-zmtehn"${attr("src", card.art)} alt=""> <div class="card-shade svelte-zmtehn"></div> <div class="card-copy svelte-zmtehn"><h2 class="svelte-zmtehn">${escape_html(card.title)}</h2> <p class="svelte-zmtehn">${escape_html(card.body)}</p></div></article>`;
    }
    $$payload.out += `<!--]--></div> <div class="card-navigation svelte-zmtehn"${attr("aria-label", copy.cardsLabel)}><button class="carousel-arrow previous svelte-zmtehn" type="button"${attr("aria-label", copy.previousCard)}${attr("disabled", activeCard === 0, true)}>‹</button> <button class="carousel-arrow next svelte-zmtehn" type="button"${attr("aria-label", copy.nextCard)}${attr("disabled", activeCard === cards.length - 1, true)}>›</button></div> <div class="loader-gate svelte-zmtehn">`;
    if (ready) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<div class="cta svelte-zmtehn">${escape_html(copy.cta)}</div>`;
    } else {
      $$payload.out += "<!--[!-->";
      $$payload.out += `<div class="progress svelte-zmtehn"><div class="progress-fill svelte-zmtehn"${attr("style", `width: ${progress}%`)}></div></div> <span class="svelte-zmtehn">${escape_html(copy.loading)} ${escape_html(progress)}%</span>`;
    }
    $$payload.out += `<!--]--></div></div></div>`;
  }
  $$payload.out += `<!--]-->`;
  pop();
}
const mergeMessagesMaps = (messagesMapList) => {
  const merged = messagesMapList.filter(Boolean).reduce((acc, current) => _.merge(acc, current), {});
  return merged;
};
const en = {
  HOME: "HOME",
  LOADER_SUBTITLE: "HOW IT WORKS",
  LOADER_LOGO: "ABYSSAL",
  LOADER_CARD_1_TITLE: "CHARGE THE GAZE",
  LOADER_CARD_1_BODY: "Winning clusters charge your Gaze.\nMore tumbles build more power.",
  LOADER_CARD_2_TITLE: "EYE MULTIPLIERS",
  LOADER_CARD_2_BODY: "When an Eye lands, it boosts your win.\nADD and MULTIPLY Eyes can appear.",
  LOADER_CARD_3_TITLE: "MAX WIN",
  LOADER_CARD_3_BODY: "Charged Eyes combine with Gaze\nfor massive payouts.\nBuild power, then unleash it.",
  LOADER_CTA: "CLICK TO CONTINUE",
  LOADER_LOADING: "LOADING",
  LOADER_CARDS_LABEL: "Tutorial cards",
  LOADER_PREVIOUS_CARD: "Previous card",
  LOADER_NEXT_CARD: "Next card",
  FREE_SPINS_TAP_TO_PLAY: "TAP ANYWHERE TO PLAY",
  FREE_SPINS_TAP_TO_SKIP: "TAP ANYWHERE TO SKIP"
};
const zh = {
  HOME: "主页",
  LOADER_SUBTITLE: "玩法说明",
  LOADER_LOGO: "ABYSSAL",
  LOADER_CARD_1_TITLE: "积攒凝视能量",
  LOADER_CARD_1_BODY: "获胜组合会积攒凝视能量。\n更多连消，更多力量。",
  LOADER_CARD_2_TITLE: "眼睛倍数",
  LOADER_CARD_2_BODY: "眼睛出现时会提升您的赢分。\n可能出现加成或倍增眼睛。",
  LOADER_CARD_3_TITLE: "最高赢分",
  LOADER_CARD_3_BODY: "充能眼睛与凝视能量结合，\n带来巨额奖励。\n积蓄力量，再尽情释放。",
  LOADER_CTA: "点击继续",
  LOADER_LOADING: "加载中",
  LOADER_CARDS_LABEL: "教程卡片",
  LOADER_PREVIOUS_CARD: "上一张卡片",
  LOADER_NEXT_CARD: "下一张卡片",
  FREE_SPINS_TAP_TO_PLAY: "点击任意处开始",
  FREE_SPINS_TAP_TO_SKIP: "点击任意处跳过"
};
const messagesMapGame = {
  en,
  zh
};
const messagesMap = mergeMessagesMaps([messagesMapGame, messagesMap$1, messagesMap$2]);
function _layout($$payload, $$props) {
  push();
  const { $$slots, $$events, ...props } = $$props;
  setContext();
  GlobalStyle($$payload, {
    children: ($$payload2) => {
      Authenticate($$payload2, {
        children: ($$payload3) => {
          LoadI18n($$payload3, {
            messagesMap,
            children: ($$payload4) => {
              Game($$payload4);
              $$payload4.out += `<!----> `;
              AbyssalLoader($$payload4);
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
        },
        $$slots: { default: true }
      });
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----> `;
  props.children($$payload);
  $$payload.out += `<!---->`;
  pop();
}
export {
  _layout as default
};
