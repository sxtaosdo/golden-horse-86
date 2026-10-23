var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/scene.ts
var scene_exports = {};
__export(scene_exports, {
  load: () => load,
  methods: () => methods,
  unload: () => unload
});
module.exports = __toCommonJS(scene_exports);
var import_node_path3 = require("node:path");

// src/user-script.ts
var MAX_RESULT_BYTES = 256 * 1024;
var DEFAULT_TIMEOUT_MS = 5e3;
function captureLogs(logs) {
  return (...args) => {
    logs.push(args.map((arg) => {
      if (typeof arg === "string") return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(" "));
  };
}
function serializeResult(value) {
  let json;
  try {
    json = JSON.stringify(value);
  } catch {
    return { ok: false };
  }
  if (json === void 0) return { ok: true, result: null };
  if (Buffer.byteLength(json, "utf8") > MAX_RESULT_BYTES) {
    return {
      ok: true,
      truncated: true,
      result: {
        truncated: true,
        byteLength: Buffer.byteLength(json, "utf8"),
        preview: json.slice(0, 2048)
      }
    };
  }
  return { ok: true, result: JSON.parse(json) };
}
async function withTimeout(promise, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Script timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function findNodeByUuid(root, uuid) {
  if (!root) return null;
  if (root.uuid === uuid) return root;
  for (const child of root.children ?? []) {
    const found = findNodeByUuid(child, uuid);
    if (found) return found;
  }
  return null;
}
function findNodeByName(root, name) {
  if (!root) return null;
  if (root.name === name) return root;
  for (const child of root.children ?? []) {
    const found = findNodeByName(child, name);
    if (found) return found;
  }
  return null;
}
async function runSceneUserScript(code, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const logs = [];
  const log = captureLogs(logs);
  try {
    const cc = require("cc");
    const helpers = {
      cc,
      log,
      getScene: () => cc.director.getScene(),
      findNodeByUuid: (uuid) => findNodeByUuid(cc.director.getScene(), uuid),
      findNodeByName: (name) => findNodeByName(cc.director.getScene(), name)
    };
    const runner = new Function(
      "helpers",
      `"use strict";
      const { cc, log, getScene, findNodeByUuid, findNodeByName } = helpers;
      return (async () => { ${code} })();`
    );
    const raw = await withTimeout(Promise.resolve(runner(helpers)), timeoutMs);
    const serialized = serializeResult(raw);
    return {
      ok: serialized.ok,
      ...serialized.result !== void 0 ? { result: serialized.result } : {},
      ...logs.length ? { logs } : {},
      ...serialized.truncated ? { truncated: true } : {}
    };
  } catch (error) {
    log(error instanceof Error ? error.message : String(error));
    return { ok: false, logs };
  }
}

// src/capture.ts
var import_node_zlib = require("node:zlib");
function fail(code, message) {
  return { ok: false, error: { code, message } };
}
function crc32(data) {
  let crc = 4294967295;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = crc >>> 1 ^ 3988292384 & mask;
    }
  }
  return (crc ^ 4294967295) >>> 0;
}
function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuffer, Buffer.from(data.buffer, data.byteOffset, data.byteLength)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBuffer, Buffer.from(data.buffer, data.byteOffset, data.byteLength), crc]);
}
function encodePngRgba(rgba, width, height, flipY = true) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const srcRow = flipY ? height - 1 - row : row;
    const dest = row * (stride + 1);
    raw[dest] = 0;
    raw.set(rgba.subarray(srcRow * stride, srcRow * stride + stride), dest + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", (0, import_node_zlib.deflateSync)(raw)),
    pngChunk("IEND", new Uint8Array(0))
  ]);
}
function pickCamera(cameras) {
  const enabled = cameras.filter((camera) => camera.enabled !== false);
  const pool = enabled.length ? enabled : cameras;
  return [...pool].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
}
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var captureMethods = {
  async captureSceneScreenshot() {
    let renderTexture;
    let camera;
    let previousTarget;
    try {
      const cc = require("cc");
      const scene = cc.director.getScene();
      if (!scene) return fail("NOT_FOUND", "No scene is currently open");
      const cameras = typeof scene.getComponentsInChildren === "function" ? scene.getComponentsInChildren(cc.Camera) : [];
      camera = pickCamera(cameras);
      if (!camera) return fail("NOT_FOUND", "No Camera found in the active scene");
      const visible = cc.view.getVisibleSize();
      const width = Math.max(1, Math.floor(visible.width) || 1280);
      const height = Math.max(1, Math.floor(visible.height) || 720);
      renderTexture = new cc.RenderTexture();
      renderTexture.reset({ width, height });
      previousTarget = camera.targetTexture;
      camera.targetTexture = renderTexture;
      const internalCamera = camera.camera;
      if (internalCamera && typeof cc.director.root?.pipeline?.render === "function") {
        cc.director.root.pipeline.render([internalCamera]);
      } else {
        await wait(120);
      }
      const pixels = renderTexture.readPixels(0, 0, width, height) ?? renderTexture.readPixels();
      if (!pixels || pixels.length < width * height * 4) {
        return fail("INTERNAL_ERROR", "RenderTexture.readPixels returned empty pixel data");
      }
      const png = encodePngRgba(pixels, width, height, true);
      const result = {
        mimeType: "image/png",
        base64: png.toString("base64"),
        width,
        height,
        source: "scene",
        capturedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      return { ok: true, result };
    } catch (error) {
      return fail(
        "UNSUPPORTED",
        `Scene screenshot capture failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (camera) camera.targetTexture = previousTarget ?? null;
      try {
        renderTexture?.destroy?.();
      } catch {
      }
    }
  }
};

// src/input-sim-scene.ts
function ccApi() {
  return require("cc");
}
function fail2(code, message) {
  return { ok: false, error: { code, message } };
}
function currentScene() {
  const scene = ccApi().director.getScene();
  if (!scene) throw Object.assign(new Error("No scene is currently open"), { code: "NOT_FOUND" });
  return scene;
}
function findNodeByUuid2(root, uuid) {
  if (root.uuid === uuid) return root;
  for (const child of root.children) {
    const found = findNodeByUuid2(child, uuid);
    if (found) return found;
  }
  return void 0;
}
function requireNode(uuid) {
  const node = findNodeByUuid2(currentScene(), uuid);
  if (!node) throw Object.assign(new Error(`Node ${uuid} was not found`), { code: "NOT_FOUND" });
  return node;
}
function getButton(node) {
  const cc = ccApi();
  const Button = cc.Button;
  if (!Button) throw Object.assign(new Error("cc.Button is unavailable"), { code: "UNSUPPORTED" });
  const button = node.getComponent(Button);
  if (!button) throw Object.assign(new Error(`Node ${node.uuid} has no Button component`), { code: "NOT_FOUND" });
  if (!Array.isArray(button.clickEvents)) button.clickEvents = [];
  return button;
}
function simulateButtonOnNode(node) {
  const cc = ccApi();
  const button = getButton(node);
  const clickType = cc.Button?.EventType?.CLICK ?? "click";
  let invokedHandlers = 0;
  if (cc.EventHandler && typeof cc.EventHandler.emitEvents === "function" && button.clickEvents.length > 0) {
    cc.EventHandler.emitEvents(button.clickEvents, button);
    invokedHandlers = button.clickEvents.length;
  }
  node.emit(clickType, button);
  return { uuid: node.uuid, handlerCount: button.clickEvents.length, invokedHandlers };
}
function bindButtonHandler(node, handlerComponent, handlerMethod) {
  const cc = ccApi();
  const EventHandler = cc.EventHandler;
  if (!EventHandler) throw Object.assign(new Error("cc.EventHandler is unavailable"), { code: "UNSUPPORTED" });
  const button = getButton(node);
  const handler = new EventHandler();
  handler.target = node;
  handler.component = handlerComponent;
  handler.handler = handlerMethod;
  handler.customEventData = "";
  button.clickEvents.push(handler);
  return { uuid: node.uuid, handlerCount: button.clickEvents.length };
}
function keyCodeFromName(key) {
  const cc = ccApi();
  const normalized = key.length === 1 ? key.toUpperCase() : key;
  const code = cc.KeyCode?.[normalized] ?? cc.KeyCode?.[key];
  return typeof code === "number" ? code : void 0;
}
function emitInput(type, event) {
  const cc = ccApi();
  if (typeof cc.input?.emit === "function") {
    cc.input.emit(type, event);
    return true;
  }
  if (typeof cc.systemEvent?.emit === "function") {
    cc.systemEvent.emit(type, event);
    return true;
  }
  return false;
}
function unsupportedRuntimeInput(message) {
  return fail2(
    "UNSUPPORTED",
    `${message} Editor scene-script cannot inject OS-level input; use input.simulatePreviewInput via Companion while Preview is running.`
  );
}
var inputSimSceneMethods = {
  inputSimulateButtonClick(request) {
    try {
      return { ok: true, result: simulateButtonOnNode(requireNode(request.uuid)) };
    } catch (error) {
      return fail2(error.code ?? "INVALID_REQUEST", error instanceof Error ? error.message : String(error));
    }
  },
  inputBindButtonClickEvent(request) {
    try {
      const node = requireNode(request.uuid);
      if (!request.handlerComponent || !request.handlerMethod) {
        throw Object.assign(new Error("handlerComponent and handlerMethod are required"), { code: "INVALID_REQUEST" });
      }
      return { ok: true, result: bindButtonHandler(node, request.handlerComponent, request.handlerMethod) };
    } catch (error) {
      return fail2(error.code ?? "INVALID_REQUEST", error instanceof Error ? error.message : String(error));
    }
  },
  inputSimulateKeyPress(request) {
    try {
      const cc = ccApi();
      const keyCode = keyCodeFromName(request.key);
      if (keyCode === void 0) return fail2("INVALID_REQUEST", `Unknown key "${request.key}"`);
      const EventKeyboard = cc.EventKeyboard;
      const keyDown = cc.Input?.EventType?.KEY_DOWN;
      const keyUp = cc.Input?.EventType?.KEY_UP;
      if (!EventKeyboard || keyDown === void 0 || keyUp === void 0) {
        return unsupportedRuntimeInput("Keyboard simulation is unavailable in this runtime.");
      }
      const phase = request.type ?? "press";
      if (phase === "down" || phase === "press") {
        if (!emitInput(keyDown, new EventKeyboard(keyCode, true))) {
          return unsupportedRuntimeInput("No input event dispatcher is available.");
        }
      }
      if (phase === "up" || phase === "press") {
        if (!emitInput(keyUp, new EventKeyboard(keyCode, false))) {
          return unsupportedRuntimeInput("No input event dispatcher is available.");
        }
      }
      return { ok: true, result: { key: request.key, type: phase, keyCode, runtime: "editor-scene" } };
    } catch (error) {
      return unsupportedRuntimeInput(error instanceof Error ? error.message : String(error));
    }
  },
  inputSimulateMouseClick(request) {
    try {
      const cc = ccApi();
      const EventMouse = cc.EventMouse;
      const mouseDown = cc.Input?.EventType?.MOUSE_DOWN;
      const mouseUp = cc.Input?.EventType?.MOUSE_UP;
      if (!EventMouse || mouseDown === void 0 || mouseUp === void 0) {
        return unsupportedRuntimeInput("Mouse click simulation is unavailable in this runtime.");
      }
      const down = new EventMouse(mouseDown);
      down.setLocation(request.x, request.y);
      const up = new EventMouse(mouseUp);
      up.setLocation(request.x, request.y);
      if (!emitInput(mouseDown, down) || !emitInput(mouseUp, up)) {
        return unsupportedRuntimeInput("No input event dispatcher is available.");
      }
      return { ok: true, result: { x: request.x, y: request.y, runtime: "editor-scene" } };
    } catch (error) {
      return unsupportedRuntimeInput(error instanceof Error ? error.message : String(error));
    }
  },
  inputSimulateMouseDrag(request) {
    try {
      const cc = ccApi();
      const EventMouse = cc.EventMouse;
      const mouseDown = cc.Input?.EventType?.MOUSE_DOWN;
      const mouseMove = cc.Input?.EventType?.MOUSE_MOVE;
      const mouseUp = cc.Input?.EventType?.MOUSE_UP;
      if (!EventMouse || mouseDown === void 0 || mouseMove === void 0 || mouseUp === void 0) {
        return unsupportedRuntimeInput("Mouse drag simulation is unavailable in this runtime.");
      }
      const down = new EventMouse(mouseDown);
      down.setLocation(request.fromX, request.fromY);
      const move = new EventMouse(mouseMove);
      move.setLocation(request.toX, request.toY);
      const up = new EventMouse(mouseUp);
      up.setLocation(request.toX, request.toY);
      if (!emitInput(mouseDown, down) || !emitInput(mouseMove, move) || !emitInput(mouseUp, up)) {
        return unsupportedRuntimeInput("No input event dispatcher is available.");
      }
      return {
        ok: true,
        result: {
          fromX: request.fromX,
          fromY: request.fromY,
          toX: request.toX,
          toY: request.toY,
          runtime: "editor-scene"
        }
      };
    } catch (error) {
      return unsupportedRuntimeInput(error instanceof Error ? error.message : String(error));
    }
  }
};

// src/node-resolve.ts
function assertNodeRef(ref) {
  const fields = ["uuid", "semanticKey", "path", "name"];
  if (!ref || typeof ref !== "object" || fields.some(
    (field) => ref[field] !== void 0 && (typeof ref[field] !== "string" || !ref[field].trim())
  ) || !fields.some((field) => ref[field] !== void 0)) {
    throw Object.assign(
      new Error("NodeRef requires uuid, path, semanticKey, or name"),
      { code: "INVALID_REQUEST" }
    );
  }
}
function activeNodeRefKind(ref) {
  assertNodeRef(ref);
  if (ref.uuid) return "uuid";
  if (ref.semanticKey) return "semanticKey";
  if (ref.path) return "path";
  return "name";
}

// src/node-resolve-scene.ts
var EDITOR_SCENE_NODES = /* @__PURE__ */ new Set(["Editor Scene Foreground", "Editor Scene Background"]);
function ccApi2() {
  return require("cc");
}
function fail3(code, message) {
  return { ok: false, error: { code, message } };
}
function currentScene2() {
  const scene = ccApi2().director.getScene();
  if (!scene) throw new Error("No scene is currently open");
  return scene;
}
function componentType(component) {
  return ccApi2().js.getClassName(component) || component.constructor.constructor.name;
}
function readSemanticKey(node) {
  const identity = node.components.find((component) => componentType(component) === "CreatorAiIdentity");
  const key = identity?.semanticKey;
  return typeof key === "string" && key ? key : void 0;
}
function visibleChildren(node) {
  return node.children.filter((child) => !EDITOR_SCENE_NODES.has(child.name));
}
function findNodeByUuid3(root, uuid) {
  if (root.uuid === uuid) return root;
  for (const child of root.children) {
    const found = findNodeByUuid3(child, uuid);
    if (found) return found;
  }
  return void 0;
}
function collectByName(root) {
  const nodes = /* @__PURE__ */ new Map();
  const visit = (node) => {
    if (EDITOR_SCENE_NODES.has(node.name)) {
      for (const child of node.children) visit(child);
      return;
    }
    const matches = nodes.get(node.name) ?? [];
    matches.push(node);
    nodes.set(node.name, matches);
    for (const child of node.children) visit(child);
  };
  for (const child of root.children) visit(child);
  return nodes;
}
function collectBySemanticKey(root) {
  const nodes = /* @__PURE__ */ new Map();
  const visit = (node) => {
    if (EDITOR_SCENE_NODES.has(node.name)) {
      for (const child of node.children) visit(child);
      return;
    }
    const key = readSemanticKey(node);
    if (key) {
      const matches = nodes.get(key) ?? [];
      matches.push(node);
      nodes.set(key, matches);
    }
    for (const child of node.children) visit(child);
  };
  for (const child of root.children) visit(child);
  return nodes;
}
function buildNodePath(node, scene) {
  const segments = [];
  let current = node;
  while (current && current !== scene) {
    if (EDITOR_SCENE_NODES.has(current.name)) return void 0;
    segments.unshift(current.name);
    current = current.parent;
  }
  return segments.length ? segments.join("/") : void 0;
}
function ambiguousReference(label, matches, root) {
  const candidates = matches.map((node) => toResolved(node, root));
  return Object.assign(
    new Error(`${label} is ambiguous. Specify a UUID or unique path. Candidates: ${JSON.stringify(candidates)}`),
    { code: "INVALID_REQUEST", candidates }
  );
}
function findNodeByPath(root, path) {
  const normalized = path.replace(/^\/|\/$/g, "");
  if (normalized.includes("//") || normalized.split("/").some((part) => part === "." || part === "..")) {
    throw Object.assign(new Error(`Node path ${path} is invalid; use a scene-relative hierarchy path`), { code: "INVALID_REQUEST" });
  }
  const segments = normalized.split("/").filter(Boolean);
  if (!segments.length) {
    throw Object.assign(new Error(`Node path ${path} was not found`), { code: "NOT_FOUND" });
  }
  let level = visibleChildren(root);
  let node;
  for (const segment of segments) {
    const matches = level.filter((candidate) => candidate.name === segment);
    if (!matches.length) {
      throw Object.assign(new Error(`Node path ${path} was not found`), { code: "NOT_FOUND" });
    }
    if (matches.length > 1) {
      throw ambiguousReference(`Node path ${path}`, matches, root);
    }
    node = matches[0];
    level = visibleChildren(node);
  }
  return node;
}
function toResolved(node, scene) {
  const key = readSemanticKey(node);
  const nodePath = buildNodePath(node, scene);
  return {
    uuid: node.uuid,
    name: node.name,
    ...key ? { semanticKey: key } : {},
    ...nodePath ? { path: nodePath } : {}
  };
}
function resolveNodeRefOnRoot(root, ref) {
  assertNodeRef(ref);
  const kind = activeNodeRefKind(ref);
  if (kind === "uuid") {
    const node = findNodeByUuid3(root, ref.uuid);
    if (!node) {
      throw Object.assign(new Error(`Node uuid ${ref.uuid} was not found`), { code: "NOT_FOUND" });
    }
    return toResolved(node, root);
  }
  if (kind === "semanticKey") {
    const matches2 = collectBySemanticKey(root).get(ref.semanticKey) ?? [];
    if (!matches2.length) {
      throw Object.assign(new Error(`Node semanticKey ${ref.semanticKey} was not found`), { code: "NOT_FOUND" });
    }
    if (matches2.length > 1) {
      throw ambiguousReference(`Node semanticKey ${ref.semanticKey}`, matches2, root);
    }
    return toResolved(matches2[0], root);
  }
  if (kind === "path") {
    return toResolved(findNodeByPath(root, ref.path), root);
  }
  const matches = collectByName(root).get(ref.name) ?? [];
  if (!matches.length) {
    throw Object.assign(new Error(`Node name ${ref.name} was not found`), { code: "NOT_FOUND" });
  }
  if (matches.length > 1) {
    throw ambiguousReference(`Node name ${ref.name}`, matches, root);
  }
  return toResolved(matches[0], root);
}
function resolveLegacyNodeKeyOnRoot(root, key) {
  if (typeof key !== "string" || !key.trim()) {
    throw Object.assign(new Error("Node key must be a non-empty string"), { code: "INVALID_REQUEST" });
  }
  const tagged = /^(uuid|semanticKey|path|name):(.*)$/s.exec(key);
  if (tagged) return resolveNodeRefOnRoot(root, { [tagged[1]]: tagged[2] });
  const uuidMatch = findNodeByUuid3(root, key);
  if (uuidMatch) return toResolved(uuidMatch, root);
  const semanticMatches = collectBySemanticKey(root).get(key) ?? [];
  if (semanticMatches.length > 1) throw ambiguousReference(`Node semanticKey ${key}`, semanticMatches, root);
  if (semanticMatches.length === 1) return toResolved(semanticMatches[0], root);
  return resolveNodeRefOnRoot(root, key.includes("/") ? { path: key } : { name: key });
}
var nodeResolveMethods = {
  resolveNodeRef(ref) {
    try {
      return { ok: true, result: resolveNodeRefOnRoot(currentScene2(), ref) };
    } catch (error) {
      return fail3(
        error.code ?? "INVALID_REQUEST",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
};

// src/scene-validate.ts
var import_node_path = require("node:path");
var NULL_REF_FIELDS = {
  Sprite: ["spriteFrame"],
  "cc.Sprite": ["spriteFrame"],
  Label: ["font"],
  "cc.Label": ["font"],
  RichText: ["font", "imageAtlas"],
  "cc.RichText": ["font", "imageAtlas"],
  Mask: ["spriteFrame"],
  "cc.Mask": ["spriteFrame"],
  MeshRenderer: ["mesh"],
  "cc.MeshRenderer": ["mesh"],
  SkinnedMeshRenderer: ["mesh", "skeleton"],
  "cc.SkinnedMeshRenderer": ["mesh", "skeleton"],
  sp: ["skeletonData"],
  "sp.Skeleton": ["skeletonData"]
};
function ensureCcModulePath() {
  try {
    module.paths.push((0, import_node_path.join)(Editor.App.path, "node_modules"));
  } catch {
  }
}
function ccApi3() {
  ensureCcModulePath();
  return require("cc");
}
function componentType2(component) {
  return ccApi3().js.getClassName(component) || component.constructor.constructor.name;
}
function serializeProperty(value) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (typeof value !== "object") return void 0;
  const record = value;
  const uuid = typeof record.uuid === "string" ? record.uuid : typeof record._uuid === "string" ? record._uuid : void 0;
  if (uuid) return { uuid, type: value.constructor?.name ?? "Object" };
  return void 0;
}
function componentProperties(component) {
  const properties = {};
  for (const key of ["enabled", "string", "fontSize", "lineHeight", "semanticKey", "action", "spriteFrame", "font", "mesh", "skeleton", "skeletonData", "imageAtlas", "customMaterial"]) {
    const serialized = serializeProperty(component[key]);
    if (serialized !== void 0) properties[key] = serialized;
  }
  return properties;
}
function semanticKey(node) {
  const identity = node.components.find((component) => componentType2(component) === "CreatorAiIdentity");
  return typeof identity?.semanticKey === "string" && identity.semanticKey ? identity.semanticKey : void 0;
}
function nodeKey(node) {
  return semanticKey(node) ?? node.name;
}
function serializeNode(node) {
  const identityKey = semanticKey(node);
  return {
    key: nodeKey(node),
    ...identityKey ? { semanticKey: identityKey } : {},
    name: node.name,
    components: node.components.map((component) => ({
      type: componentType2(component),
      properties: componentProperties(component)
    })),
    children: node.children.map(serializeNode)
  };
}
function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return `rev-${(result >>> 0).toString(16).padStart(8, "0")}`;
}
function snapshotFromDirector() {
  const scene = ccApi3().director.getScene();
  if (!scene) throw new Error("No scene is currently open");
  const roots = scene.children.filter((node) => node.name !== "Editor Scene Foreground" && node.name !== "Editor Scene Background").map(serializeNode);
  return { sceneUrl: scene.name, revision: hash(JSON.stringify(roots)), roots };
}
function isNullishRef(value) {
  if (value === null || value === void 0) return true;
  if (typeof value === "object" && value !== null) {
    const record = value;
    if ("uuid" in record) return typeof record.uuid !== "string" || !record.uuid;
  }
  return false;
}
function walkNodes(nodes, parentPath, visit) {
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name;
    visit(node, path);
    walkNodes(node.children, path, visit);
  }
}
function isBlockingConsoleLine(line) {
  return /\b(error|exception|failed)\b/i.test(line) && !/\bwarning\b/i.test(line);
}
function validateScene(tree, helpers) {
  const issues = [];
  let componentsIntact = true;
  let referencesValid = true;
  const reopenable = helpers.reopenable ?? true;
  walkNodes(tree.roots, "", (node, nodePath) => {
    for (const component of node.components) {
      if (!helpers.isComponentRegistered(component.type)) {
        componentsIntact = false;
        issues.push({
          code: "COMPONENT_NOT_REGISTERED",
          severity: "error",
          message: `Component ${component.type} is not registered`,
          nodeKey: node.key,
          nodePath
        });
      }
      const watched = NULL_REF_FIELDS[component.type] ?? [];
      for (const field of watched) {
        if (!(field in component.properties)) continue;
        if (!isNullishRef(component.properties[field])) continue;
        issues.push({
          code: "EMPTY_REFERENCE",
          severity: "warning",
          message: `${component.type}.${field} is empty`,
          nodeKey: node.key,
          nodePath
        });
      }
    }
  });
  referencesValid = !issues.some((issue) => issue.code === "EMPTY_REFERENCE" && issue.severity === "error");
  const consoleErrors = (helpers.consoleErrors ?? []).filter(isBlockingConsoleLine);
  const consoleBlockingErrors = consoleErrors.length > 0;
  for (const line of consoleErrors.slice(-20)) {
    issues.push({
      code: "CONSOLE_ERROR",
      severity: "error",
      message: line
    });
  }
  if (!reopenable) {
    issues.push({
      code: "SCENE_NOT_REOPENABLE",
      severity: "error",
      message: "Scene asset is missing or cannot be reopened"
    });
  }
  const ok = reopenable && componentsIntact && referencesValid && !consoleBlockingErrors && !issues.some((issue) => issue.severity === "error");
  return {
    ok,
    sceneUrl: tree.sceneUrl,
    revision: tree.revision,
    issues,
    checks: {
      reopenable,
      componentsIntact,
      referencesValid,
      consoleBlockingErrors
    }
  };
}
function isClassRegistered(className) {
  try {
    const ctor = ccApi3().js.getClassByName(className);
    return typeof ctor === "function";
  } catch {
    return false;
  }
}
var validateMethods = {
  sceneValidate() {
    try {
      const tree = snapshotFromDirector();
      const result = validateScene(tree, {
        isComponentRegistered: isClassRegistered,
        reopenable: true
      });
      return { ok: true, result };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
};

// src/scene-animation.ts
var import_node_path2 = require("node:path");
var ANIMATION_TYPES = /* @__PURE__ */ new Set(["Animation", "cc.Animation"]);
var SPINE_TYPES = /* @__PURE__ */ new Set(["sp.Skeleton", "Skeleton", "cc.Spine"]);
function ensureCcModulePath2() {
  try {
    module.paths.push((0, import_node_path2.join)(Editor.App.path, "node_modules"));
  } catch {
  }
}
function ccApi4() {
  ensureCcModulePath2();
  return require("cc");
}
function fail4(code, message) {
  return { ok: false, error: { code, message } };
}
function currentScene3() {
  const scene = ccApi4().director.getScene();
  if (!scene) throw Object.assign(new Error("No scene is currently open"), { code: "INVALID_REQUEST" });
  return scene;
}
function componentType3(component) {
  return ccApi4().js.getClassName(component) || component.constructor.constructor.name;
}
function semanticKey2(node) {
  const identity = node.components.find((component) => componentType3(component) === "CreatorAiIdentity");
  return typeof identity?.semanticKey === "string" && identity.semanticKey ? identity.semanticKey : void 0;
}
function resolveNode(ref, root) {
  const resolved = resolveNodeRefOnRoot(root, ref);
  const node = findNodeByUuid4(root, resolved.uuid);
  if (!node) {
    throw Object.assign(new Error(`Node uuid ${resolved.uuid} was not found`), { code: "NOT_FOUND" });
  }
  return node;
}
function findNodeByUuid4(root, uuid) {
  if (root.uuid === uuid) return root;
  for (const child of root.children) {
    const found = findNodeByUuid4(child, uuid);
    if (found) return found;
  }
  return void 0;
}
function getComponentByTypes(node, types) {
  return node.components.find((component) => types.has(componentType3(component)));
}
function requireAnimation(node) {
  const component = getComponentByTypes(node, ANIMATION_TYPES);
  if (!component) {
    throw Object.assign(new Error(`Node ${node.name} has no cc.Animation component`), { code: "NOT_FOUND" });
  }
  return component;
}
function spineRegistered() {
  const cc = ccApi4();
  if (cc.sp?.Skeleton) return true;
  const ctor = cc.js.getClassByName("sp.Skeleton");
  return typeof ctor === "function";
}
function requireSpine(node) {
  if (!spineRegistered()) {
    throw Object.assign(new Error("Spine module (sp.Skeleton) is not available in this project"), { code: "UNSUPPORTED" });
  }
  const component = getComponentByTypes(node, SPINE_TYPES);
  if (!component) {
    throw Object.assign(new Error(`Node ${node.name} has no sp.Skeleton component`), { code: "NOT_FOUND" });
  }
  return component;
}
function clipNames(animation) {
  const names = /* @__PURE__ */ new Set();
  for (const clip of animation.clips ?? []) {
    if (clip?.name) names.add(clip.name);
  }
  if (animation.defaultClip?.name) names.add(animation.defaultClip.name);
  return [...names];
}
function serializeAnimationState(state) {
  if (!state) return void 0;
  return {
    name: state.name,
    isPlaying: Boolean(state.isPlaying),
    isPaused: Boolean(state.isPaused),
    isMotionless: Boolean(state.isMotionless),
    time: state.time,
    duration: state.duration,
    speed: state.speed,
    ...state.wrapMode !== void 0 ? { wrapMode: state.wrapMode } : {}
  };
}
function listSpineNames(data, field) {
  if (!data) return [];
  const names = /* @__PURE__ */ new Set();
  const addFrom = (source) => {
    if (!source) return;
    const items = source[field] ?? [];
    for (const item of items) {
      if (item?.name) names.add(item.name);
    }
  };
  try {
    addFrom(data.getRuntimeData?.() ?? null);
  } catch {
  }
  addFrom(data._skeletonCache ?? null);
  const json = data.skeletonJson;
  if (json && typeof json === "object") {
    const record = json;
    addFrom(record);
  }
  return [...names];
}
function skeletonDataUuid(data) {
  if (!data) return void 0;
  return typeof data.uuid === "string" ? data.uuid : typeof data._uuid === "string" ? data._uuid : void 0;
}
function nodeSummary(node) {
  const key = semanticKey2(node);
  const summary = {
    uuid: node.uuid,
    name: node.name
  };
  if (key) summary.semanticKey = key;
  return summary;
}
var animationMethods = {
  animationGetState(params) {
    try {
      const node = resolveNode(params.target, currentScene3());
      const animation = requireAnimation(node);
      const clips = clipNames(animation);
      const states = clips.map((name) => serializeAnimationState(animation.getState(name))).filter(Boolean);
      const playing = states.find((state) => {
        const record = state;
        return record.isPlaying;
      });
      return {
        ok: true,
        result: {
          node: nodeSummary(node),
          componentType: componentType3(animation),
          defaultClip: animation.defaultClip?.name ?? null,
          clips,
          states,
          playingClip: playing?.name ?? null
        }
      };
    } catch (error) {
      return fail4(error.code ?? "INVALID_REQUEST", error instanceof Error ? error.message : String(error));
    }
  },
  animationPlay(params) {
    try {
      const node = resolveNode(params.target, currentScene3());
      const animation = requireAnimation(node);
      const clip = params.clip ?? animation.defaultClip?.name;
      if (!clip) {
        throw Object.assign(new Error("No clip specified and cc.Animation has no defaultClip"), { code: "INVALID_REQUEST" });
      }
      const clips = clipNames(animation);
      if (!clips.includes(clip)) {
        throw Object.assign(new Error(`Animation clip ${clip} was not found on ${node.name}`), { code: "NOT_FOUND" });
      }
      animation.play(clip);
      const state = serializeAnimationState(animation.getState(clip));
      return {
        ok: true,
        result: {
          node: nodeSummary(node),
          componentType: componentType3(animation),
          clip,
          state
        }
      };
    } catch (error) {
      return fail4(error.code ?? "INVALID_REQUEST", error instanceof Error ? error.message : String(error));
    }
  },
  animationStop(params) {
    try {
      const node = resolveNode(params.target, currentScene3());
      const animation = requireAnimation(node);
      animation.stop();
      return {
        ok: true,
        result: {
          node: nodeSummary(node),
          componentType: componentType3(animation),
          stopped: true
        }
      };
    } catch (error) {
      return fail4(error.code ?? "INVALID_REQUEST", error instanceof Error ? error.message : String(error));
    }
  },
  spineGetInfo(params) {
    try {
      const node = resolveNode(params.target, currentScene3());
      const skeleton = requireSpine(node);
      const data = skeleton.skeletonData ?? null;
      return {
        ok: true,
        result: {
          node: nodeSummary(node),
          componentType: componentType3(skeleton),
          animation: skeleton.animation ?? null,
          loop: Boolean(skeleton.loop),
          skeletonDataUuid: skeletonDataUuid(data) ?? null,
          animations: listSpineNames(data, "animations"),
          skins: listSpineNames(data, "skins")
        }
      };
    } catch (error) {
      return fail4(error.code ?? "INVALID_REQUEST", error instanceof Error ? error.message : String(error));
    }
  },
  spinePlay(params) {
    try {
      const node = resolveNode(params.target, currentScene3());
      const skeleton = requireSpine(node);
      skeleton.setAnimation(0, params.animation, params.loop ?? false);
      return {
        ok: true,
        result: {
          node: nodeSummary(node),
          componentType: componentType3(skeleton),
          animation: params.animation,
          loop: params.loop ?? false
        }
      };
    } catch (error) {
      return fail4(error.code ?? "INVALID_REQUEST", error instanceof Error ? error.message : String(error));
    }
  },
  spineSetSkin(params) {
    try {
      const node = resolveNode(params.target, currentScene3());
      const skeleton = requireSpine(node);
      skeleton.setSkin(params.skin);
      return {
        ok: true,
        result: {
          node: nodeSummary(node),
          componentType: componentType3(skeleton),
          skin: params.skin
        }
      };
    } catch (error) {
      return fail4(error.code ?? "INVALID_REQUEST", error instanceof Error ? error.message : String(error));
    }
  }
};

// src/component-name.ts
function normalizeComponentName(name) {
  return name.startsWith("cc.") ? name.slice(3) : name;
}
function componentNameCandidates(name) {
  return name.startsWith("cc.") ? [name] : [name, `cc.${name}`];
}

// src/ui-build-scene.ts
function createUiBuildSceneMethods(api) {
  const component = (node, type) => node.components.find((item) => normalizeComponentName(api.js.getClassName(item)) === normalizeComponentName(type));
  const root = () => {
    const scene = api.director.getScene();
    if (!scene) throw new Error("No scene is currently open");
    return scene;
  };
  const allNodes = (scene) => scene.children.flatMap((node) => ["Editor Scene Foreground", "Editor Scene Background"].includes(node.name) ? [] : [node, ...allNodes(node)]);
  const resolve = (scene, key) => {
    const uuid = resolveLegacyNodeKeyOnRoot(scene, key).uuid;
    const node = [scene, ...allNodes(scene)].find((candidate) => candidate.uuid === uuid);
    if (!node) throw new Error(`Node ${key} is not part of the editable scene`);
    return node;
  };
  const canvasFor = (scene, target) => {
    if (target) {
      let node = resolve(scene, target);
      while (node && node !== scene) {
        if (component(node, "Canvas")) return node;
        node = node.parent;
      }
      return void 0;
    }
    const canvases = allNodes(scene).filter((node) => component(node, "Canvas"));
    if (canvases.length > 1) throw new Error(`Multiple Canvas nodes found; specify a parent. Candidates: ${canvases.map((node) => `${node.name} (${node.uuid})`).join(", ")}`);
    return canvases[0];
  };
  const viewport = (target) => {
    const canvas = canvasFor(root(), target);
    const ui = canvas ? component(canvas, "UITransform") : void 0;
    const configured = api.settings?.querySettings("screen", "designResolution");
    const viewSize = api.view?.getDesignResolutionSize();
    const validSize = (size2) => Number.isFinite(size2?.width) && Number.isFinite(size2?.height) && Number(size2?.width) > 0 && Number(size2?.height) > 0;
    const size = validSize(configured) ? configured : validSize(viewSize) ? viewSize : void 0;
    return {
      source: validSize(configured) ? "project-settings" : size ? "editor-view" : "unknown",
      status: size ? "partial" : "unknown",
      runtimeVisible: "unknown",
      ...size ? { designWidth: size.width, designHeight: size.height } : {},
      ...configured?.policy !== void 0 ? { resolutionPolicy: configured.policy } : {},
      ...canvas ? { canvasUuid: canvas.uuid } : {},
      ...ui && validSize(ui.contentSize) ? { canvasWidth: ui.contentSize.width, canvasHeight: ui.contentSize.height } : {}
    };
  };
  const wrap = (fn) => {
    try {
      return { ok: true, result: fn() };
    } catch (error) {
      return { ok: false, error: { code: "INVALID_REQUEST", message: error instanceof Error ? error.message : String(error) } };
    }
  };
  return {
    uiFindCanvas: () => wrap(() => {
      const canvas = canvasFor(root());
      const canvasComponent = canvas ? component(canvas, "Canvas") : void 0;
      return canvas ? {
        key: `uuid:${canvas.uuid}`,
        uuid: canvas.uuid,
        name: canvas.name,
        hasCamera: Boolean(canvasComponent?.cameraComponent)
      } : null;
    }),
    uiGetViewportContext: (target) => wrap(() => viewport(target)),
    uiCheckUiBounds: (keys) => wrap(() => {
      const scene = root();
      const warnings = [];
      for (const key of keys) {
        const node = resolve(scene, key);
        const canvas = canvasFor(scene, `uuid:${node.uuid}`);
        const ui = component(node, "UITransform");
        const canvasUi = canvas ? component(canvas, "UITransform") : void 0;
        if (!ui || !canvasUi || node === canvas) continue;
        if (typeof ui.convertToWorldSpaceAR !== "function" || typeof canvasUi.convertToNodeSpaceAR !== "function") {
          warnings.push(`Node "${node.name}" (${node.uuid}): Canvas-space bounds unavailable`);
          continue;
        }
        const { width, height } = ui.contentSize;
        const { x: ax, y: ay } = ui.anchorPoint;
        const corners = [[-width * ax, -height * ay], [width * (1 - ax), -height * ay], [-width * ax, height * (1 - ay)], [width * (1 - ax), height * (1 - ay)]].map(([x, y]) => canvasUi.convertToNodeSpaceAR(ui.convertToWorldSpaceAR({ x, y, z: 0 })));
        const left = -canvasUi.contentSize.width * canvasUi.anchorPoint.x;
        const bottom = -canvasUi.contentSize.height * canvasUi.anchorPoint.y;
        const sides = [
          ...Math.min(...corners.map((point) => point.x)) < left - 0.01 ? ["left"] : [],
          ...Math.max(...corners.map((point) => point.x)) > left + canvasUi.contentSize.width + 0.01 ? ["right"] : [],
          ...Math.min(...corners.map((point) => point.y)) < bottom - 0.01 ? ["bottom"] : [],
          ...Math.max(...corners.map((point) => point.y)) > bottom + canvasUi.contentSize.height + 0.01 ? ["top"] : []
        ];
        if (sides.length) warnings.push(`Node "${node.name}" (${node.uuid}) extends beyond Canvas ${canvas.name}: ${sides.join(", ")}`);
      }
      return warnings;
    })
  };
}
var uiBuildSceneMethods = {
  uiFindCanvas: () => createUiBuildSceneMethods(require("cc")).uiFindCanvas(),
  uiGetViewportContext: (target) => createUiBuildSceneMethods(require("cc")).uiGetViewportContext(target),
  uiCheckUiBounds: (keys) => createUiBuildSceneMethods(require("cc")).uiCheckUiBounds(keys)
};

// src/ui-defaults.ts
var UI_DEFAULT_WIDTH = 100;
var UI_DEFAULT_HEIGHT = 40;
var UI_DEFAULT_ANCHOR = 0.5;

// ../mcp/src/companion/property-schema.ts
var ATTR_DELIM = "$_$";
var ASSET_NAMES = /* @__PURE__ */ new Set([
  "SpriteFrame",
  "Font",
  "Prefab",
  "Texture2D",
  "AudioClip",
  "Material",
  "AnimationClip",
  "SkeletonData",
  "ImageAsset",
  "SpriteAtlas",
  "JsonAsset",
  "TextAsset",
  "BufferAsset",
  "Asset",
  "TTFFont",
  "BitmapFont",
  "LabelAtlas"
]);
function classAttr(attrs, property, key) {
  return attrs?.[`${property}${ATTR_DELIM}${key}`];
}
function declaredTypeName(typeValue) {
  if (typeof typeValue === "string" && typeValue.trim()) return typeValue.replace(/^cc\./, "");
  if (typeof typeValue === "function" && typeValue.name) return typeValue.name;
  return void 0;
}
function isAssetTypeName(name) {
  if (!name) return false;
  return name.endsWith("Asset") || name.endsWith("Frame") || ASSET_NAMES.has(name);
}
function isNodeTypeName(name) {
  return name === "Node";
}
function enumMembersFromAttr(raw) {
  if (!Array.isArray(raw)) return [];
  const members = [];
  raw.forEach((item, index) => {
    if (typeof item === "string" && item) {
      members.push({ name: item, value: index });
      return;
    }
    if (!item || typeof item !== "object") return;
    const record = item;
    if (typeof record.name !== "string" || !record.name) return;
    members.push({ name: record.name, value: typeof record.value === "number" ? record.value : index });
  });
  return members;
}
function classifyDeclaredProperty(input) {
  const typeName = input.typeName;
  const nodeReference = isNodeTypeName(typeName) || input.isComponent;
  const asset = !nodeReference && isAssetTypeName(typeName);
  const type = typeName && typeName !== "object" ? typeName : input.runtimeType ?? typeName ?? "object";
  return {
    name: input.name,
    type,
    readonly: false,
    ...input.runtimeArray ? { array: true } : {},
    ...asset && typeName ? { assetType: typeName } : {},
    ...nodeReference ? { nodeReference: true } : {},
    ...input.members.length ? { enumNames: input.members.map((member) => member.name) } : {}
  };
}

// ../mcp/src/companion/console-buffer.ts
var SECRET = /((?:bearer\s+)|(?:(?:token|password|secret|authorization)\s*[:=]\s*))(\S+)/gi;
function redactConsoleMessage(message) {
  return message.replace(SECRET, "$1[redacted]").slice(0, 2e3);
}
function formatConsoleArgs(args) {
  return redactConsoleMessage(args.map((value) => {
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.message;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }).join(" "));
}
function consoleLevelFromMethod(method) {
  if (method === "error") return "error";
  if (method === "warn" || method === "warning") return "warning";
  if (method === "debug" || method === "trace") return "debug";
  return "info";
}
var ConsoleBuffer = class {
  constructor(capacity = 200) {
    this.capacity = capacity;
  }
  entries = [];
  installed = false;
  push(level, message, time = (/* @__PURE__ */ new Date()).toISOString()) {
    this.entries.push({ time, level, message: redactConsoleMessage(message) });
    if (this.entries.length > this.capacity) this.entries.splice(0, this.entries.length - this.capacity);
  }
  query(filter = {}) {
    const search = filter.query?.toLowerCase();
    const matched = this.entries.filter(
      (entry) => (!filter.level || entry.level === filter.level) && (!filter.since || entry.time >= filter.since) && (!search || entry.message.toLowerCase().includes(search))
    );
    const limit = filter.limit ?? this.capacity;
    return matched.slice(-Math.max(0, limit));
  }
  install(target) {
    if (this.installed) return;
    this.installed = true;
    for (const method of ["log", "info", "warn", "error", "debug"]) {
      const original = typeof target[method] === "function" ? target[method] : void 0;
      target[method] = (...args) => {
        this.push(consoleLevelFromMethod(method), formatConsoleArgs(args));
        return original?.(...args);
      };
    }
  }
};

// ../mcp/src/companion/widget-align.ts
var WIDGET_ALIGN_PROPERTIES = [
  "isAlignTop",
  "isAlignBottom",
  "isAlignLeft",
  "isAlignRight",
  "isAlignHorizontalCenter",
  "isAlignVerticalCenter"
];
function isWidgetAlignProperty(property) {
  return WIDGET_ALIGN_PROPERTIES.includes(property);
}
function widgetAlignBits(flags) {
  if (!flags) return void 0;
  const required = ["TOP", "MID", "BOT", "LEFT", "CENTER", "RIGHT"];
  if (required.some((key) => typeof flags[key] !== "number")) return void 0;
  return flags;
}
function widgetAlignMask(flags, widget) {
  let mask = 0;
  if (widget.isAlignTop) mask |= flags.TOP;
  if (widget.isAlignVerticalCenter) mask |= flags.MID;
  if (widget.isAlignBottom) mask |= flags.BOT;
  if (widget.isAlignLeft) mask |= flags.LEFT;
  if (widget.isAlignHorizontalCenter) mask |= flags.CENTER;
  if (widget.isAlignRight) mask |= flags.RIGHT;
  return mask;
}

// src/scene.ts
module.paths.push((0, import_node_path3.join)(Editor.App.path, "node_modules"));
var lastUndo;
var recoveryRequired = false;
var sceneConsole = new ConsoleBuffer(200);
var schemaCache = /* @__PURE__ */ new WeakMap();
var enumCache = /* @__PURE__ */ new WeakMap();
function ccApi5() {
  return require("cc");
}
function componentConstructor(name) {
  for (const candidate of componentNameCandidates(name)) {
    const constructor = ccApi5().js.getClassByName(candidate);
    if (typeof constructor === "function") return constructor;
  }
  return void 0;
}
function fail5(code, message) {
  return { ok: false, error: { code, message } };
}
function currentScene4() {
  const scene = ccApi5().director.getScene();
  if (!scene) throw new Error("No scene is currently open");
  return scene;
}
function componentType4(component) {
  return ccApi5().js.getClassName(component) || component.constructor.constructor.name;
}
function destroyObject(value) {
  value.destroy();
}
function serializeProperty2(value) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) {
    const serialized = value.map(serializeProperty2);
    return serialized.every((item) => item !== void 0) ? serialized : void 0;
  }
  if (typeof value !== "object") return void 0;
  const record = value;
  const uuid = typeof record.uuid === "string" ? record.uuid : typeof record._uuid === "string" ? record._uuid : void 0;
  if (uuid) return { uuid, type: value.constructor?.name ?? "Object" };
  const type = value.constructor?.name;
  const fields = type === "Color" ? ["r", "g", "b", "a"] : type === "Size" ? ["width", "height"] : type === "Vec2" ? ["x", "y"] : type === "Vec3" ? ["x", "y", "z"] : type === "Quat" ? ["x", "y", "z", "w"] : [];
  if (!fields.length) return void 0;
  return Object.fromEntries(fields.map((field) => [field, record[field]]));
}
function copyPropertyForUndo(value) {
  if (Array.isArray(value)) return value.map(copyPropertyForUndo);
  if (!value || typeof value !== "object") return value;
  const type = value.constructor?.name;
  if (!["Vec2", "Vec3", "Quat", "Size", "Color"].includes(type)) return value;
  const clone = value.clone;
  if (typeof clone === "function") return clone.call(value);
  const fields = type === "Color" ? ["r", "g", "b", "a"] : type === "Size" ? ["width", "height"] : type === "Vec2" ? ["x", "y"] : type === "Quat" ? ["x", "y", "z", "w"] : ["x", "y", "z"];
  const Constructor = value.constructor;
  return new Constructor(...fields.map((field) => value[field]));
}
function componentProperties2(component) {
  const properties = {};
  for (const key of /* @__PURE__ */ new Set([...Object.keys(component).filter((key2) => !key2.startsWith("_") && key2 !== "node"), ...(component.constructor.__props__ ?? []).filter((key2) => key2 !== "node" && key2 !== "_node"), "enabled", "string", "fontSize", "lineHeight", "semanticKey", "action", "spriteFrame", "font", "contentSize", "anchorPoint", "color", "horizontalAlign", "verticalAlign", "layoutType", "resizeMode", "spacingX", "spacingY", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom"])) {
    if (["_objFlags", "_editorExtras"].includes(key)) continue;
    const value = component[key];
    const serialized = serializeProperty2(value);
    if (serialized !== void 0) properties[key] = serialized;
  }
  return properties;
}
function semanticKey3(node) {
  const identity = node.components.find((component) => componentType4(component) === "CreatorAiIdentity");
  return typeof identity?.semanticKey === "string" && identity.semanticKey ? identity.semanticKey : void 0;
}
function nodeKey2(node) {
  return semanticKey3(node) ?? node.name;
}
function serializeNode2(node) {
  const identityKey = semanticKey3(node);
  return {
    key: nodeKey2(node),
    uuid: node.uuid,
    ...Object.fromEntries(["active", "position", "rotation", "scale", "layer"].flatMap((key) => {
      const value = serializeProperty2(node[key]);
      return value === void 0 ? [] : [[key, value]];
    })),
    ...identityKey ? { semanticKey: identityKey } : {},
    name: node.name,
    components: node.components.filter((component) => ccApi5().isValid?.(component, true) !== false).map((component) => ({
      type: componentType4(component),
      properties: componentProperties2(component)
    })),
    children: node.children.filter((child) => !["Editor Scene Foreground", "Editor Scene Background"].includes(child.name)).map(serializeNode2)
  };
}
function hash2(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return `rev-${(result >>> 0).toString(16).padStart(8, "0")}`;
}
function snapshot() {
  const scene = currentScene4();
  const roots = scene.children.filter((node) => node.name !== "Editor Scene Foreground" && node.name !== "Editor Scene Background").map(serializeNode2);
  return { sceneUrl: scene.name, revision: hash2(JSON.stringify([scene.uuid, roots])), roots };
}
function findNodeByUuid5(root, uuid) {
  if (root.uuid === uuid) return root;
  for (const child of root.children) {
    const found = findNodeByUuid5(child, uuid);
    if (found) return found;
  }
  return void 0;
}
function prefabManager() {
  const modulePath = (0, import_node_path3.join)(Editor.App.path, "builtin/scene/dist/script/3d/manager/prefab/index.ccc");
  const loaded = require(modulePath);
  const manager = loaded.default ?? loaded;
  if (typeof manager.createPrefabAssetFromNode !== "function") {
    throw Object.assign(new Error("Creator 3.8.8 PrefabManager API is unavailable"), { code: "UNSUPPORTED" });
  }
  return manager;
}
function isComponentConstructor(value) {
  if (typeof value !== "function") return false;
  const api = ccApi5();
  return typeof api.js.isChildClassOf === "function" && api.Component !== void 0 && api.js.isChildClassOf(value, api.Component);
}
function rememberEnums(constructor, property, members) {
  if (!members.length) return;
  let byProperty = enumCache.get(constructor);
  if (!byProperty) {
    byProperty = /* @__PURE__ */ new Map();
    enumCache.set(constructor, byProperty);
  }
  byProperty.set(property, new Map(members.map((member) => [member.name, member.value])));
}
function schemaForComponent(name) {
  const constructor = componentConstructor(name);
  if (!constructor) {
    throw Object.assign(new Error(`Component ${name} is not registered`), { code: "NOT_FOUND" });
  }
  const cached = schemaCache.get(constructor);
  if (cached) return cached;
  const declaredCtor = constructor;
  const attrs = declaredCtor.__attrs__;
  const declaredNames = (declaredCtor.__props__ ?? []).filter((key) => key !== "node" && key !== "_node" && !key.startsWith("_"));
  const declared = /* @__PURE__ */ new Map();
  for (const property of declaredNames) {
    const typeValue = classAttr(attrs, property, "type");
    const typeName = declaredTypeName(typeValue);
    const members = enumMembersFromAttr(classAttr(attrs, property, "enumList"));
    rememberEnums(constructor, property, members);
    declared.set(property, classifyDeclaredProperty({
      name: property,
      ...typeName ? { typeName } : {},
      isComponent: isComponentConstructor(typeValue),
      members
    }));
  }
  const node = new (ccApi5()).Node("__schema_probe__");
  const component = node.addComponent(constructor);
  const properties = [];
  const seen = /* @__PURE__ */ new Set();
  for (const key of [...declaredNames, ...Object.keys(component), "enabled", "string", "fontSize", "lineHeight", "semanticKey"]) {
    if (seen.has(key) || key.startsWith("_") || key === "node") continue;
    seen.add(key);
    const fromDeclaration = declared.get(key);
    if (fromDeclaration && (fromDeclaration.nodeReference || fromDeclaration.assetType || fromDeclaration.enumNames)) {
      properties.push(fromDeclaration);
      continue;
    }
    const value = component[key];
    const type = Array.isArray(value) ? "array" : value?.constructor?.name ?? typeof value;
    if (["function", "undefined"].includes(typeof value) && !fromDeclaration) continue;
    const runtimeType = type === "object" && fromDeclaration ? fromDeclaration.type : type;
    properties.push({
      ...fromDeclaration ?? { name: key, type: runtimeType, readonly: false },
      ...Array.isArray(value) ? { array: true } : {},
      ...!fromDeclaration && (runtimeType.endsWith("Asset") || ["SpriteFrame", "Font", "Prefab"].includes(runtimeType)) ? { assetType: runtimeType } : {}
    });
  }
  destroyObject(node);
  const schema = { name, properties };
  schemaCache.set(constructor, schema);
  return schema;
}
function propertySchema(component, property) {
  try {
    return schemaForComponent(componentType4(component)).properties.find((item) => item.name === property);
  } catch {
    return void 0;
  }
}
function enumValue(component, property, name) {
  const values = enumCache.get(component.constructor)?.get(property);
  if (!values) return void 0;
  if (!values.has(name)) throw Object.assign(new Error(`Unknown enum name ${name} for ${property}`), { code: "INVALID_REQUEST" });
  return values.get(name);
}
function getComponent(node, type) {
  const normalizedType = normalizeComponentName(type);
  return node.components.find((component) => ccApi5().isValid?.(component, true) !== false && normalizeComponentName(componentType4(component)) === normalizedType);
}
function convertPropertyValue(current, value, root, aliases = /* @__PURE__ */ new Map()) {
  if (Array.isArray(value)) {
    const currentArray = Array.isArray(current) ? current : [];
    return value.map((item, index) => convertPropertyValue(currentArray[index], item, root, aliases));
  }
  if (!value || typeof value !== "object") return value;
  const tagged = value;
  if (tagged.$type === "NodeReference") {
    if (typeof tagged.semanticKey !== "string") throw new Error("NodeReference.semanticKey must be a string");
    return resolveKey(root, tagged.semanticKey, aliases);
  }
  if (tagged.$type === "ComponentReference") {
    if (typeof tagged.node !== "string" || typeof tagged.type !== "string") throw new Error("ComponentReference requires node and type strings");
    const component = getComponent(resolveKey(root, tagged.node, aliases), tagged.type);
    if (!component) throw Object.assign(new Error(`Component ${tagged.type} was not found on ${tagged.node}`), { code: "NOT_FOUND" });
    return component;
  }
  const type = tagged.$type ?? current?.constructor?.name;
  const constructor = current?.constructor;
  if (typeof constructor !== "function") return value;
  if (type === "Vec2") return new constructor(Number(tagged.x), Number(tagged.y));
  if (type === "Vec3") return new constructor(Number(tagged.x), Number(tagged.y), Number(tagged.z));
  if (type === "Quat") return new constructor(Number(tagged.x), Number(tagged.y), Number(tagged.z), Number(tagged.w));
  if (type === "Size") return new constructor(Number(tagged.width ?? tagged.x), Number(tagged.height ?? tagged.y));
  if (type === "Color") return new constructor(Number(tagged.r), Number(tagged.g), Number(tagged.b), Number(tagged.a));
  return value;
}
var NODE_REF_PREFIX = /^(uuid|path|name|semanticKey):/;
function isAssetShortcut(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.$type === "string") return false;
  return typeof value.path === "string" || typeof value.guid === "string";
}
async function loadAssetByUuid(uuid) {
  return new Promise((resolve, reject) => {
    ccApi5().assetManager.loadAny({ uuid }, (error, asset) => error ? reject(error) : resolve(asset));
  });
}
function syncWidgetAlign(component, property) {
  if (normalizeComponentName(componentType4(component)) !== "Widget" || !isWidgetAlignProperty(property)) return;
  const api = ccApi5();
  const flags = widgetAlignBits(api.Widget?.AlignFlags);
  if (!flags) return;
  component._alignFlags = widgetAlignMask(flags, component);
}
async function resolveIncomingValue(component, property, value, root, aliases) {
  const declared = propertySchema(component, property);
  const current = component[property];
  if (typeof value === "string") {
    const asEnum = enumValue(component, property, value);
    if (asEnum !== void 0) return asEnum;
    if (value.startsWith("db://")) {
      if (!declared?.assetType && !isAssetTypeName(typeof current === "object" && current ? current.constructor?.name : void 0)) {
        return value;
      }
      return loadAsset({ url: value });
    }
    if (declared?.nodeReference || isNodeTypeName(current?.constructor?.name)) {
      if (!NODE_REF_PREFIX.test(value)) {
        throw Object.assign(new Error(`Node reference ${property} requires a uuid:, path:, name:, or semanticKey: prefix`), { code: "INVALID_REQUEST" });
      }
      return resolveKey(root, value, aliases);
    }
  }
  if (isAssetShortcut(value)) {
    if (!declared?.assetType && !isAssetTypeName(typeof current === "object" && current ? current.constructor?.name : void 0)) {
      throw Object.assign(new Error(`${property} is not an asset reference`), { code: "INVALID_REQUEST" });
    }
    if (typeof value.guid === "string") return loadAssetByUuid(value.guid);
    if (typeof value.path === "string" && value.path.startsWith("db://")) {
      return loadAsset({ url: value.path, ...typeof value.subAsset === "string" ? { subAsset: value.subAsset } : {} });
    }
    throw Object.assign(new Error(`Asset reference for ${property} must be a db:// path or guid`), { code: "INVALID_REQUEST" });
  }
  return convertPropertyValue(current, value, root, aliases);
}
function resolveKey(root, key, aliases = /* @__PURE__ */ new Map()) {
  const alias = aliases.get(key);
  if (alias) {
    let ancestor = alias;
    while (ancestor && ancestor !== root) ancestor = ancestor.parent;
    if (ancestor === root) return alias;
    throw Object.assign(new Error(`Node ${key} was removed`), { code: "NOT_FOUND" });
  }
  const resolved = resolveLegacyNodeKeyOnRoot(root, key);
  return findNodeByUuid5(root, resolved.uuid);
}
function propertyGuard(node, component, property) {
  const owner = normalizeComponentName(component) === "Node" ? node : getComponent(node, component);
  if (!owner) throw new Error(`Component ${component} was not found on ${node.name}`);
  return { kind: "property", uuid: node.uuid, component, property, value: serializeProperty2(owner[property]) };
}
function guardMatches(root, guard) {
  const node = findNodeByUuid5(root, guard.uuid);
  if (guard.kind === "absent") return !node;
  if (!node) return false;
  if (guard.kind === "node") {
    return node.name === guard.name && node.parent?.uuid === guard.parentUuid;
  }
  if (guard.kind === "created-shape") {
    return JSON.stringify(node.children.map((child) => child.uuid)) === JSON.stringify(guard.childUuids);
  }
  if (guard.kind === "component") return Boolean(getComponent(node, guard.component));
  const owner = normalizeComponentName(guard.component) === "Node" ? node : getComponent(node, guard.component);
  return Boolean(owner) && JSON.stringify(serializeProperty2(owner[guard.property])) === JSON.stringify(guard.value);
}
function guardsMatch(root, guards) {
  return guards.every((guard) => guardMatches(root, guard));
}
function finalizeGuards(guards) {
  const absent = new Set(guards.filter((guard) => guard.kind === "absent").map((guard) => guard.uuid));
  const retained = guards.filter((guard) => {
    if (guard.kind === "absent") return true;
    return !absent.has(guard.uuid);
  });
  const seen = /* @__PURE__ */ new Set();
  return retained.reverse().filter((guard) => {
    const key = guard.kind === "property" ? `${guard.kind}:${guard.uuid}:${normalizeComponentName(guard.component)}:${guard.property}` : guard.kind === "component" ? `${guard.kind}:${guard.uuid}:${normalizeComponentName(guard.component)}` : `${guard.kind}:${guard.uuid}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).reverse();
}
function shouldAddUI(parent, mode) {
  if (mode === "off") return false;
  if (mode === "on") return true;
  for (let node = parent; node; node = node.parent) {
    if (getComponent(node, "Canvas") || getComponent(node, "UITransform")) return true;
  }
  return false;
}
function validate(patch, root) {
  const clone = (node, parent) => {
    const copy = {
      name: node.name,
      uuid: node.uuid,
      parent,
      children: [],
      components: node.components.map((component) => Object.create(Object.getPrototypeOf(component), Object.getOwnPropertyDescriptors(component)))
    };
    copy.children = node.children.map((child) => clone(child, copy));
    return copy;
  };
  const projected = clone(root, null);
  const aliases = /* @__PURE__ */ new Map();
  const checkReferences = (value) => {
    if (Array.isArray(value)) {
      value.forEach(checkReferences);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (value.$type === "NodeReference" || value.$type === "ComponentReference") {
      convertPropertyValue(void 0, value, projected, aliases);
    } else Object.values(value).forEach(checkReferences);
  };
  let serial = 0;
  for (const operation of patch.operations) {
    if (operation.op === "upsertNode") {
      let node2;
      try {
        node2 = resolveKey(projected, operation.key, aliases);
      } catch (error) {
        if (error.code !== "NOT_FOUND" || /^(uuid|path|name|semanticKey):/.test(operation.key)) throw error;
      }
      const parent = operation.parent ? resolveKey(projected, operation.parent, aliases) : projected;
      if (node2) {
        if (node2 === projected) throw new Error("The scene root cannot be updated");
        for (let ancestor = parent; ancestor; ancestor = ancestor.parent) {
          if (ancestor === node2) throw new Error("A node cannot be parented to itself or its descendant");
        }
        if (operation.parent && node2.parent !== parent) {
          node2.parent.children.splice(node2.parent.children.indexOf(node2), 1);
          node2.parent = parent;
          parent.children.push(node2);
        }
        node2.name = operation.name;
      } else {
        node2 = { name: operation.name, uuid: `__patch_${++serial}`, parent, children: [], components: [] };
        parent.children.push(node2);
        if (shouldAddUI(parent, operation.uiMode)) {
          const Constructor = componentConstructor("UITransform");
          if (!Constructor) throw new Error("UITransform is not registered");
          node2.components.push(Object.create(Constructor.prototype));
        }
      }
      aliases.set(operation.key, node2);
      continue;
    }
    const node = resolveKey(projected, operation.target, aliases);
    if (operation.op === "removeNode") {
      if (operation.confirmation !== `DELETE_NODE:${operation.target}`) throw new Error(`confirmation must equal DELETE_NODE:${operation.target}`);
      if (!node.parent) throw new Error("The scene root cannot be removed");
      node.parent.children.splice(node.parent.children.indexOf(node), 1);
      node.parent = null;
      continue;
    }
    if (operation.op === "upsertComponent") {
      const constructor = componentConstructor(operation.type);
      if (!constructor) throw Object.assign(new Error(`Component ${operation.type} is not registered`), { code: "NOT_FOUND" });
      let component = getComponent(node, operation.type);
      if (!component) {
        component = Object.create(constructor.prototype);
        node.components.push(component);
      }
      if (normalizeComponentName(operation.type) === "CreatorAiIdentity" && operation.properties?.semanticKey !== void 0) {
        Object.defineProperty(component, "semanticKey", { value: operation.properties.semanticKey, configurable: true, writable: true });
      }
      Object.values(operation.properties ?? {}).forEach(checkReferences);
    } else if (normalizeComponentName(operation.component) === "Node") {
      if (!["active", "position", "rotation", "scale", "eulerAngles", "layer"].includes(operation.property)) throw new Error(`Node property ${operation.property} is not writable`);
    } else if (!getComponent(node, operation.component)) {
      throw Object.assign(new Error(`Component ${operation.component} was not found on ${operation.target}`), { code: "NOT_FOUND" });
    }
    if (operation.op === "setProperty") checkReferences(operation.value);
  }
}
async function loadAsset(reference) {
  const info = await Editor.Message.request("asset-db", "query-asset-info", reference.url);
  if (!info) throw Object.assign(new Error(`Asset ${reference.url} was not found`), { code: "NOT_FOUND" });
  let uuid = info.uuid;
  if (reference.subAsset) {
    const subAssets = info.subAssets;
    if (Array.isArray(subAssets)) {
      uuid = subAssets.find((item) => item.name === reference.subAsset || item.url?.endsWith(reference.subAsset))?.uuid;
    } else if (subAssets) {
      uuid = Object.values(subAssets).find(
        (item) => item.name === reference.subAsset || item.url?.endsWith(`/${reference.subAsset}`)
      )?.uuid;
    }
  }
  if (!uuid) throw Object.assign(new Error(`Asset reference ${reference.url} could not be resolved`), { code: "NOT_FOUND" });
  return new Promise((resolve, reject) => {
    ccApi5().assetManager.loadAny({ uuid }, (error, asset) => error ? reject(error) : resolve(asset));
  });
}
async function applyOperation(operation, root, inverses, aliases, autoAdded, guards, created) {
  if (operation.op === "upsertNode") {
    let existing;
    try {
      existing = resolveKey(root, operation.key, aliases);
    } catch (error) {
      if (error.code !== "NOT_FOUND" || /^(uuid|path|name|semanticKey):/.test(operation.key)) throw error;
    }
    const parent = operation.parent ? resolveKey(root, operation.parent, aliases) : root;
    if (existing) {
      if (existing === root) throw new Error("The scene root cannot be updated");
      let ancestor = parent;
      while (ancestor) {
        if (ancestor === existing) throw new Error("A node cannot be parented to itself or its descendant");
        ancestor = ancestor.parent;
      }
      const oldName = existing.name;
      const oldParent = existing.parent;
      const oldIndex = oldParent.children.indexOf(existing);
      inverses.push(() => {
        existing.name = oldName;
        oldParent.insertChild(existing, oldIndex);
      });
      existing.name = operation.name;
      if (operation.parent && parent !== existing.parent) parent.addChild(existing);
      aliases.set(operation.key, existing);
      guards.push({ kind: "node", uuid: existing.uuid, name: existing.name, ...existing.parent ? { parentUuid: existing.parent.uuid } : {} });
      guards.push(propertyGuard(existing, "Node", "active"));
      return;
    }
    const node2 = new (ccApi5()).Node(operation.name);
    inverses.push(() => {
      node2.removeFromParent();
      destroyObject(node2);
    });
    parent.addChild(node2);
    created.add(node2.uuid);
    aliases.set(operation.key, node2);
    if (shouldAddUI(parent, operation.uiMode) && !getComponent(node2, "UITransform")) {
      const Constructor = componentConstructor("UITransform");
      if (!Constructor) throw new Error("UITransform is not registered");
      const transform = node2.addComponent(Constructor);
      transform.contentSize = convertPropertyValue(transform.contentSize, { $type: "Size", width: UI_DEFAULT_WIDTH, height: UI_DEFAULT_HEIGHT }, root, aliases);
      transform.anchorPoint = convertPropertyValue(transform.anchorPoint, { $type: "Vec2", x: UI_DEFAULT_ANCHOR, y: UI_DEFAULT_ANCHOR }, root, aliases);
      autoAdded.push({ nodeUuid: node2.uuid, type: "cc.UITransform" });
    }
    guards.push({ kind: "node", uuid: node2.uuid, name: node2.name, ...node2.parent ? { parentUuid: node2.parent.uuid } : {} });
    guards.push(propertyGuard(node2, "Node", "active"));
    return;
  }
  const node = resolveKey(root, operation.target, aliases);
  if (operation.op === "removeNode") {
    const parent = node.parent;
    if (!parent) throw Object.assign(new Error("The scene root cannot be removed"), { code: "INVALID_REQUEST" });
    const siblingIndex = parent.children.indexOf(node);
    inverses.push(() => parent.insertChild(node, siblingIndex));
    node.removeFromParent();
    guards.push({ kind: "absent", uuid: node.uuid });
    return;
  }
  if (operation.op === "upsertComponent") {
    let component2 = getComponent(node, operation.type);
    if (!component2) {
      const constructor = componentConstructor(operation.type);
      if (typeof constructor !== "function") throw new Error(`Invalid component ${operation.type}`);
      const existingComponents = new Set(node.components);
      inverses.push(() => {
        for (const item of [...node.components].reverse()) {
          if (!existingComponents.has(item)) destroyObject(item);
        }
      });
      component2 = node.addComponent(constructor);
    }
    guards.push({ kind: "component", uuid: node.uuid, component: operation.type });
    for (const [property, value] of Object.entries(operation.properties ?? {})) {
      const oldValue2 = copyPropertyForUndo(component2[property]);
      inverses.push(() => component2[property] = oldValue2);
      component2[property] = await resolveIncomingValue(component2, property, value, root, aliases);
      syncWidgetAlign(component2, property);
      guards.push(propertyGuard(node, operation.type, property));
    }
    return;
  }
  if (normalizeComponentName(operation.component) === "Node" && !["active", "position", "rotation", "scale", "eulerAngles", "layer"].includes(operation.property)) {
    throw Object.assign(new Error(`Node property ${operation.property} is not writable`), { code: "INVALID_REQUEST" });
  }
  const component = normalizeComponentName(operation.component) === "Node" ? node : getComponent(node, operation.component);
  if (!component) throw Object.assign(new Error(`Component ${operation.component} was not found on ${operation.target}`), { code: "NOT_FOUND" });
  const oldValue = copyPropertyForUndo(component[operation.property]);
  inverses.push(() => component[operation.property] = oldValue);
  component[operation.property] = operation.op === "bindAsset" ? await loadAsset(operation.asset) : await resolveIncomingValue(component, operation.property, operation.value, root, aliases);
  syncWidgetAlign(component, operation.property);
  guards.push(propertyGuard(node, operation.component, operation.property));
}
function rollback(inverses) {
  const errors = [];
  for (const inverse of [...inverses].reverse()) {
    try {
      inverse();
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (errors.length) throw new Error(errors.join("; "));
}
function settleScene() {
  return new Promise((resolve) => setTimeout(resolve, 16));
}
function load() {
  sceneConsole.install(console);
}
function unload() {
  lastUndo = void 0;
  recoveryRequired = false;
}
var methods = {
  ...captureMethods,
  ...inputSimSceneMethods,
  ...nodeResolveMethods,
  ...uiBuildSceneMethods,
  ...validateMethods,
  ...animationMethods,
  getTree(options) {
    try {
      const result = snapshot();
      if (options?.acknowledgeRecovery !== false) recoveryRequired = false;
      return { ok: true, result };
    } catch (error) {
      return fail5("INVALID_REQUEST", error instanceof Error ? error.message : String(error));
    }
  },
  requireRecoveryRead() {
    recoveryRequired = true;
    return { ok: true, result: null };
  },
  async acceptLastWriteAfterSave() {
    if (!lastUndo || currentScene4() !== lastUndo.root) {
      return fail5("REVISION_CONFLICT", "The document changed before the saved transaction could be finalized");
    }
    await settleScene();
    if (!lastUndo || currentScene4() !== lastUndo.root) {
      return fail5("REVISION_CONFLICT", "The document changed before the saved transaction could be finalized");
    }
    if (!guardsMatch(lastUndo.root, lastUndo.guards)) {
      const mismatches = lastUndo.guards.filter((guard) => !guardMatches(lastUndo.root, guard)).map(
        (guard) => guard.kind === "property" ? `${guard.kind}:${guard.uuid}:${guard.component}.${guard.property}` : `${guard.kind}:${guard.uuid}`
      );
      lastUndo = void 0;
      return fail5("REVISION_CONFLICT", `The document changed while the transaction was being saved; undo was refused (${mismatches.join(", ")})`);
    }
    const saved = snapshot();
    lastUndo.revision = saved.revision;
    return { ok: true, result: saved };
  },
  assertLastWriteCurrent() {
    if (!lastUndo || currentScene4() !== lastUndo.root) {
      return fail5("REVISION_CONFLICT", "The open document changed before the transaction could be saved");
    }
    return { ok: true, result: null };
  },
  async applyPatch(patch) {
    if (recoveryRequired) return fail5("RECOVERY_REQUIRED", "Previous rollback failed; read the scene again before writing");
    const before = snapshot();
    if (patch.expectedRevision !== before.revision) {
      return fail5("REVISION_CONFLICT", `Expected ${patch.expectedRevision}, current revision is ${before.revision}`);
    }
    const root = currentScene4();
    const inverses = [];
    try {
      validate(patch, root);
      const aliases = /* @__PURE__ */ new Map();
      const autoAddedComponents = [];
      const guards = [];
      const created = /* @__PURE__ */ new Set();
      for (const operation of patch.operations) {
        if (currentScene4() !== root) throw Object.assign(new Error("The open document changed during the transaction"), { code: "REVISION_CONFLICT" });
        await applyOperation(operation, root, inverses, aliases, autoAddedComponents, guards, created);
        if (currentScene4() !== root) throw Object.assign(new Error("The open document changed during the transaction"), { code: "REVISION_CONFLICT" });
      }
      for (const uuid of created) {
        const node = findNodeByUuid5(root, uuid);
        if (node) guards.push({
          kind: "created-shape",
          uuid,
          childUuids: node.children.map((child) => child.uuid)
        });
      }
      const finalizedGuards = finalizeGuards(guards);
      await settleScene();
      if (currentScene4() !== root || !guardsMatch(root, finalizedGuards)) {
        const mismatches = finalizedGuards.filter((guard) => !guardMatches(root, guard)).map(
          (guard) => guard.kind === "property" ? `${guard.kind}:${guard.uuid}:${guard.component}.${guard.property}` : `${guard.kind}:${guard.uuid}`
        );
        throw Object.assign(new Error(`The document changed while the transaction was settling; rollback was refused (${mismatches.join(", ")})`), {
          code: "REVISION_CONFLICT",
          skipRollback: true
        });
      }
      const after = snapshot();
      const transactionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      lastUndo = { transactionId, inverses, root, revision: after.revision, beforeRevision: before.revision, guards: finalizedGuards };
      const nodeUuids = Object.fromEntries([...aliases].filter(([, node]) => findNodeByUuid5(root, node.uuid)).map(([key, node]) => [key, node.uuid]));
      const result = { transactionId, beforeRevision: before.revision, after, nodeUuids, autoAddedComponents };
      return { ok: true, result };
    } catch (error) {
      const original = error instanceof Error ? error.message : String(error);
      if (error.skipRollback) {
        lastUndo = void 0;
        recoveryRequired = true;
        return fail5("REVISION_CONFLICT", original);
      }
      try {
        rollback(inverses);
        if (snapshot().revision !== before.revision) throw new Error("Restored scene differs from the pre-write scene");
      } catch (rollbackError) {
        lastUndo = void 0;
        recoveryRequired = true;
        return fail5("ROLLBACK_FAILED", `${original}; rollback failed: ${String(rollbackError)}`);
      }
      const code = error.code ?? "INVALID_REQUEST";
      return fail5(code, error instanceof Error ? error.message : String(error));
    }
  },
  undoLastWrite() {
    if (!lastUndo) return fail5("NO_UNDO", "There is no MCP write to undo");
    const { transactionId, inverses, root, revision, beforeRevision } = lastUndo;
    if (currentScene4() !== root || snapshot().revision !== revision) {
      lastUndo = void 0;
      return fail5("REVISION_CONFLICT", "The document changed after the last MCP write; undo was refused");
    }
    lastUndo = void 0;
    try {
      rollback(inverses);
      if (snapshot().revision !== beforeRevision) throw new Error("Restored scene differs from the pre-write scene");
    } catch (error) {
      recoveryRequired = true;
      return fail5("ROLLBACK_FAILED", String(error));
    }
    const result = { transactionId, restored: snapshot() };
    return { ok: true, result };
  },
  getConsoleLogs(filter) {
    sceneConsole.install(console);
    return { ok: true, result: sceneConsole.query(filter ?? {}) };
  },
  getComponentSchema(name) {
    try {
      return { ok: true, result: schemaForComponent(name) };
    } catch (error) {
      return fail5(error.code ?? "INVALID_REQUEST", error instanceof Error ? error.message : String(error));
    }
  },
  getNodeUuid(key) {
    try {
      return { ok: true, result: resolveKey(currentScene4(), key).uuid };
    } catch (error) {
      return fail5(error.code ?? "INVALID_REQUEST", error instanceof Error ? error.message : String(error));
    }
  },
  setSemanticKeyByUuid(request) {
    try {
      const node = findNodeByUuid5(currentScene4(), request.uuid);
      if (!node) throw Object.assign(new Error(`Node ${request.uuid} was not found`), { code: "NOT_FOUND" });
      let identity = getComponent(node, "CreatorAiIdentity");
      if (!identity) {
        const constructor = ccApi5().js.getClassByName("CreatorAiIdentity");
        if (typeof constructor !== "function") {
          throw Object.assign(new Error("CreatorAiIdentity is not registered"), { code: "NOT_FOUND" });
        }
        identity = node.addComponent(constructor);
      }
      identity.semanticKey = request.semanticKey;
      return { ok: true, result: serializeNode2(node) };
    } catch (error) {
      return fail5(error.code ?? "INVALID_REQUEST", error instanceof Error ? error.message : String(error));
    }
  },
  prefabProbe() {
    try {
      const manager = prefabManager();
      return {
        ok: true,
        result: {
          supported: typeof manager.createPrefabAssetFromNode === "function",
          creatorVersion: "3.8.8",
          strategy: "PrefabManager.createPrefabAssetFromNode"
        }
      };
    } catch (error) {
      return fail5("UNSUPPORTED", error instanceof Error ? error.message : String(error));
    }
  },
  async prefabCreate(request) {
    try {
      const node = resolveKey(currentScene4(), request.sourceNodeKey);
      const uuid = await prefabManager().createPrefabAssetFromNode(node.uuid, request.url);
      if (!uuid) throw new Error("Creator did not return a Prefab UUID");
      return { ok: true, result: { uuid, url: request.url } };
    } catch (error) {
      return fail5(error.code ?? "INTERNAL_ERROR", error instanceof Error ? error.message : String(error));
    }
  },
  /**
   * Scene-side user script entry (confirm EXECUTE_SCENE_SCRIPT enforced by bridge-service).
   * Invoked via execute-scene-script method "runUserScript".
   */
  async runUserScript(request) {
    try {
      const result = await runSceneUserScript(request.code, request.timeoutMs);
      return { ok: true, result };
    } catch (error) {
      return fail5("INVALID_REQUEST", error instanceof Error ? error.message : String(error));
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  load,
  methods,
  unload
});
//# sourceMappingURL=scene.js.map
