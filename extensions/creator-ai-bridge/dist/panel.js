// src/capability-profile.ts
var CAPABILITY_PROFILE_LABELS = {
  "read-only": "\u53EA\u8BFB",
  authoring: "\u521B\u4F5C",
  "full-control": "\u5B8C\u5168\u63A7\u5236"
};
function capabilityProfileLabel(profile) {
  return CAPABILITY_PROFILE_LABELS[profile];
}
function capabilitySelectionState(effective, selected) {
  const value = selected ?? effective;
  return {
    selected: value,
    selectedLabel: capabilityProfileLabel(value),
    effectiveLabel: capabilityProfileLabel(effective),
    pending: value !== effective
  };
}

// src/panel.ts
var READ_METHODS = /* @__PURE__ */ new Set([
  "creator.ping",
  "creator.projectInfo",
  "scene.getTree",
  "asset.list",
  "asset.search",
  "asset.getInfo",
  "asset.resolveReference",
  "script.getErrors",
  "script.findComponent",
  "component.listAvailable",
  "component.getSchema",
  "prefab.probe",
  "prefab.getTree"
]);
var TOOL_METHODS = [
  ...READ_METHODS,
  "scene.open",
  "scene.applyPatch",
  "scene.undoLastWrite",
  "asset.import",
  "asset.refresh",
  "script.write",
  "asset.delete",
  "script.waitCompile",
  "prefab.create",
  "prefab.open",
  "prefab.applyPatch",
  "prefab.save",
  "prefab.close",
  "prefab.instantiate"
].sort();
var ALLOWED_METHODS = new Set(TOOL_METHODS);
var CODEX_PROMPTS = [
  { title: "\u68C0\u67E5\u8FDE\u63A5", text: "\u4F7F\u7528 cocos-creator MCP \u68C0\u67E5\u8FDE\u63A5\uFF0C\u544A\u8BC9\u6211 Creator \u7248\u672C\u3001\u5F53\u524D\u5DE5\u7A0B\u3001\u5F53\u524D\u6587\u6863\u548C revision\uFF0C\u4E0D\u8981\u4FEE\u6539\u5DE5\u7A0B\u3002" },
  { title: "\u8BFB\u53D6\u573A\u666F", text: "\u4F7F\u7528 cocos-creator MCP \u8BFB\u53D6\u5F53\u524D\u573A\u666F\uFF0C\u5217\u51FA\u8282\u70B9\u3001semanticKey \u548C\u7EC4\u4EF6\uFF0C\u4E0D\u8FDB\u884C\u4EFB\u4F55\u4FEE\u6539\u3002" },
  { title: "\u521B\u5EFA\u6309\u94AE", text: "\u4F7F\u7528 cocos-creator MCP \u5728\u5F53\u524D\u573A\u666F\u521B\u5EFA home.settingsButton\uFF0C\u6DFB\u52A0 UITransform\u3001Sprite\u3001Button \u548C\u6587\u5B57\u4E3A\u201C\u8BBE\u7F6E\u201D\u7684 Label \u5B50\u8282\u70B9\u3002\u4F7F\u7528\u6700\u65B0 revision\uFF0C\u4FDD\u5B58\u5E76\u56DE\u8BFB\u9A8C\u8BC1\u3002" },
  { title: "\u5BFC\u5165\u5E76\u7ED1\u5B9A\u56FE\u7247", text: "\u4F7F\u7528 cocos-creator MCP \u628A\u6211\u6307\u5B9A\u7684\u672C\u5730\u56FE\u7247\u5BFC\u5165 db://assets/ui/\uFF0C\u89E3\u6790 SpriteFrame\uFF0C\u5E76\u7ED1\u5B9A\u5230\u76EE\u6807\u8282\u70B9\u7684 cc.Sprite.spriteFrame\u3002\u7981\u6B62\u8986\u76D6\u5DF2\u6709\u8D44\u6E90\uFF0C\u4FDD\u5B58\u540E\u9A8C\u8BC1\u771F\u5B9E\u8D44\u6E90 UUID\u3002" },
  { title: "\u521B\u5EFA\u811A\u672C", text: "\u4F7F\u7528 cocos-creator MCP \u5728 db://assets/scripts/ \u4E0B\u521B\u5EFA TypeScript \u7EC4\u4EF6\uFF0C\u7B49\u5F85 Creator \u7F16\u8BD1\uFF0C\u68C0\u67E5\u9519\u8BEF\u548C\u7EC4\u4EF6\u6CE8\u518C\u72B6\u6001\uFF0C\u6210\u529F\u540E\u6302\u8F7D\u5230\u76EE\u6807\u8282\u70B9\u3002" },
  { title: "\u751F\u6210 Prefab", text: "\u4F7F\u7528 cocos-creator MCP \u5C06\u76EE\u6807 semanticKey \u8282\u70B9\u521B\u5EFA\u4E3A Prefab\uFF0C\u6253\u5F00\u540E\u4FEE\u6539 Label\uFF0C\u4FDD\u5B58\u3001\u5173\u95ED\u5E76\u6062\u590D\u539F\u573A\u666F\uFF0C\u518D\u5B9E\u4F8B\u5316\u5230\u5F53\u524D\u573A\u666F\u5E76\u56DE\u8BFB\u9A8C\u8BC1\u7EC4\u4EF6\u548C\u8D44\u6E90\u5F15\u7528\u3002" }
];
var MCP_TOOL_CATALOG = [
  ["\u8FDE\u63A5", "creator_ping", "\u53EA\u8BFB", "\u68C0\u67E5 Bridge \u662F\u5426\u5728\u7EBF\uFF0C\u5E76\u9A8C\u8BC1\u5F53\u524D Creator \u4F1A\u8BDD\u3002"],
  ["\u8FDE\u63A5", "creator_get_project_info", "\u53EA\u8BFB", "\u8BFB\u53D6 Creator \u7248\u672C\u3001\u5DE5\u7A0B\u8DEF\u5F84\u3001\u5DE5\u7A0B\u6307\u7EB9\u548C session\u3002"],
  ["\u573A\u666F", "scene_get_tree", "\u53EA\u8BFB", "\u8BFB\u53D6\u5F53\u524D\u573A\u666F\u8282\u70B9\u6811\u3001\u7EC4\u4EF6\u3001semanticKey \u548C revision\u3002"],
  ["\u573A\u666F", "scene_open", "\u64CD\u4F5C", "\u901A\u8FC7 Creator \u6253\u5F00 assets \u4E0B\u7684 .scene \u6587\u4EF6\u3002"],
  ["\u573A\u666F", "scene_apply_patch", "\u5199\u5165", "\u6309 revision \u4E8B\u52A1\u4FEE\u6539\u573A\u666F\uFF0C\u4FDD\u5B58\u5E76\u56DE\u8BFB\u9A8C\u8BC1\u3002"],
  ["\u573A\u666F", "undo_last_mcp_write", "\u5199\u5165", "\u53EA\u64A4\u9500\u672C Bridge \u6700\u8FD1\u4E00\u6B21\u573A\u666F\u5199\u5165\u3002"],
  ["\u8D44\u6E90", "asset_list", "\u53EA\u8BFB", "\u5217\u51FA Creator AssetDB \u4E2D\u7684\u8D44\u6E90\u3002"],
  ["\u8D44\u6E90", "asset_search", "\u53EA\u8BFB", "\u6309 URL \u6216\u540D\u79F0\u641C\u7D22 AssetDB\u3002"],
  ["\u8D44\u6E90", "asset_get_info", "\u53EA\u8BFB", "\u8BFB\u53D6\u8D44\u6E90 URL\u3001UUID\u3001\u7C7B\u578B\u3001\u54C8\u5E0C\u548C\u5B50\u8D44\u6E90\u3002"],
  ["\u8D44\u6E90", "asset_import", "\u5199\u5165", "\u5BFC\u5165\u4E00\u4E2A\u660E\u786E\u6307\u5B9A\u7684\u672C\u5730\u6587\u4EF6\uFF0C\u7981\u6B62\u8986\u76D6\u3002"],
  ["\u8D44\u6E90", "asset_refresh", "\u64CD\u4F5C", "\u5237\u65B0\u6307\u5B9A\u8D44\u6E90\u5E76\u7B49\u5F85 AssetDB \u7A33\u5B9A\u3002"],
  ["\u8D44\u6E90", "asset_resolve_reference", "\u53EA\u8BFB", "\u628A\u8D44\u6E90\u6216\u5B50\u8D44\u6E90\u89E3\u6790\u4E3A\u53EF\u7ED1\u5B9A\u7684 Creator UUID\u3002"],
  ["\u8D44\u6E90", "asset_delete", "\u5220\u9664", "\u6821\u9A8C\u54C8\u5E0C\u548C\u786E\u8BA4\u4E32\u540E\u5220\u9664\u8D44\u6E90\uFF1B\u9700\u8981\u5B8C\u5168\u63A7\u5236\u3002"],
  ["\u811A\u672C", "script_write", "\u5199\u5165", "\u521B\u5EFA\u6216\u6309\u54C8\u5E0C\u66F4\u65B0 assets \u4E0B\u7684 TypeScript \u811A\u672C\u3002"],
  ["\u811A\u672C", "script_wait_compile", "\u53EA\u8BFB", "\u7B49\u5F85\u5BFC\u5165\u3001\u7F16\u8BD1\u548C\u6307\u5B9A\u7EC4\u4EF6\u6CE8\u518C\u5B8C\u6210\u3002"],
  ["\u811A\u672C", "script_get_errors", "\u53EA\u8BFB", "\u8BFB\u53D6\u672C\u8F6E\u5199\u5165\u4E4B\u540E\u7684 Creator \u7F16\u8BD1\u9519\u8BEF\u3002"],
  ["\u811A\u672C", "script_find_component", "\u53EA\u8BFB", "\u786E\u8BA4 @ccclass \u81EA\u5B9A\u4E49\u7EC4\u4EF6\u662F\u5426\u5DF2\u6CE8\u518C\u3002"],
  ["\u7EC4\u4EF6", "component_list_available", "\u53EA\u8BFB", "\u5217\u51FA\u53EF\u7528\u7684\u5F15\u64CE\u7EC4\u4EF6\u548C\u9879\u76EE\u7EC4\u4EF6\u3002"],
  ["\u7EC4\u4EF6", "component_get_schema", "\u53EA\u8BFB", "\u8BFB\u53D6\u7EC4\u4EF6\u53EF\u5199\u5C5E\u6027\u3001\u7C7B\u578B\u548C\u5F15\u7528\u7EA6\u675F\u3002"],
  ["Prefab", "prefab_probe", "\u53EA\u8BFB", "\u68C0\u67E5 Creator 3.8.8 Prefab \u5185\u90E8\u9002\u914D\u662F\u5426\u53EF\u7528\u3002"],
  ["Prefab", "prefab_create", "\u5199\u5165", "\u4ECE\u573A\u666F\u552F\u4E00\u8282\u70B9\u521B\u5EFA\u65B0\u7684\u5173\u8054 Prefab\u3002"],
  ["Prefab", "prefab_open", "\u64CD\u4F5C", "\u8FDB\u5165\u6307\u5B9A Prefab \u7684\u7F16\u8F91\u6A21\u5F0F\u5E76\u4FDD\u7559\u539F\u573A\u666F\u4E0A\u4E0B\u6587\u3002"],
  ["Prefab", "prefab_get_tree", "\u53EA\u8BFB", "\u8BFB\u53D6\u5F53\u524D\u6253\u5F00 Prefab \u7684\u8282\u70B9\u6811\u548C revision\u3002"],
  ["Prefab", "prefab_apply_patch", "\u5199\u5165", "\u6309 Prefab revision \u4E8B\u52A1\u4FEE\u6539 Prefab\u3002"],
  ["Prefab", "prefab_save", "\u5199\u5165", "\u4FDD\u5B58\u5E76\u91CD\u65B0\u8BFB\u53D6\u5F53\u524D Prefab\u3002"],
  ["Prefab", "prefab_close", "\u64CD\u4F5C", "\u5173\u95ED Prefab \u6A21\u5F0F\u5E76\u6062\u590D\u8FDB\u5165\u524D\u7684\u573A\u666F\u3002"],
  ["Prefab", "prefab_instantiate", "\u5199\u5165", "\u628A\u771F\u5B9E\u5173\u8054\u7684 Prefab \u5B9E\u4F8B\u5316\u5230\u5F53\u524D\u573A\u666F\u3002"]
];
var template = `
<div id="app">
  <header class="panel-header">
    <div><span id="dot"></span><strong>Creator AI Bridge</strong></div>
    <div class="header-actions"><button id="statusToggle" aria-expanded="true">\u6536\u8D77\u72B6\u6001</button><button id="refresh">\u5237\u65B0</button></div>
  </header>
  <div id="statusDetails">
    <section class="status" id="status"></section>
    <section class="capability-state"><span>\u5F53\u524D\u751F\u6548\uFF1A<b id="currentCapability">\u5F85\u8BFB\u53D6</b></span><span id="capabilityPending"></span></section>
    <section class="capabilities"><select id="capabilityProfile" aria-label="Creator \u6743\u9650"><option value="read-only">\u53EA\u8BFB</option><option value="authoring">\u521B\u4F5C</option><option value="full-control">\u5B8C\u5168\u63A7\u5236</option></select><button id="applyCapability" data-exec>\u5E94\u7528 Creator \u6743\u9650</button><button id="copyDiagnostic">\u590D\u5236\u8BCA\u65AD</button></section>
  </div>
  <nav>
    <button data-tab="scene" class="active">\u573A\u666F\u68C0\u67E5</button>
    <button data-tab="p2">\u8D44\u6E90/\u811A\u672C/Prefab</button>
    <button data-tab="json">\u9AD8\u7EA7\u8C03\u8BD5</button>
    <button data-tab="audit">\u64CD\u4F5C\u8BB0\u5F55</button>
    <button data-tab="help">\u5E2E\u52A9</button>
  </nav>
  <main>
    <section data-page="scene">
      <p class="page-intro">\u5F53\u524D\u573A\u666F\u7684\u53EF\u89C6\u5316\u5F00\u53D1\u8C03\u8BD5\u5165\u53E3\uFF1A\u67E5\u770B\u8282\u70B9\u548C\u7EC4\u4EF6\u3001\u521B\u5EFA\u9A8C\u6536\u8282\u70B9\uFF0C\u4EE5\u53CA\u64A4\u9500\u6700\u8FD1\u4E00\u6B21 MCP \u573A\u666F\u5199\u5165\u3002</p>
      <div class="actions"><button id="createTest" data-exec>\u521B\u5EFA\u9A8C\u6536\u8282\u70B9</button><button id="undo" data-exec>\u64A4\u9500 MCP \u5199\u5165</button></div>
      <div id="tree" class="tree"></div>
    </section>
    <section data-page="p2" hidden>
      <p class="page-intro">P2 \u9AD8\u7EA7\u80FD\u529B\u7684\u8868\u5355\u5316\u8C03\u8BD5\u5165\u53E3\uFF1A\u8D44\u6E90\u3001\u811A\u672C\u3001\u7EC4\u4EF6\u548C Prefab\u3002\u5B83\u4E0E Codex \u8C03\u7528\u7684\u662F\u540C\u4E00\u5957\u670D\u52A1\uFF0C\u9002\u5408\u624B\u52A8\u9A8C\u8BC1\u53C2\u6570\u548C Creator \u8FD0\u884C\u7ED3\u679C\u3002</p>
      <fieldset><legend>\u8D44\u6E90\u5BFC\u5165</legend><input id="assetSource" placeholder="\u7EDD\u5BF9\u672C\u5730\u6587\u4EF6\u8DEF\u5F84"><input id="assetDest" value="db://assets/p2/ui/start-button.png"><div class="actions"><button id="assetImport" data-exec>\u5BFC\u5165</button><button id="assetRefresh" data-exec>\u5237\u65B0 AssetDB</button></div></fieldset>
      <fieldset><legend>\u811A\u672C\u5199\u5165\u4E0E\u7F16\u8BD1</legend><input id="scriptUrl" value="db://assets/p2/StartButton.ts"><input id="scriptClass" value="StartButton"><textarea id="scriptContent" spellcheck="false"></textarea><button id="scriptWrite" data-exec>\u5199\u5165\u5E76\u7B49\u5F85\u7F16\u8BD1</button></fieldset>
      <fieldset><legend>\u7EC4\u4EF6\u67E5\u8BE2</legend><input id="componentName" value="cc.Button" placeholder="\u7EC4\u4EF6\u7C7B\u540D"><div class="actions"><button id="componentList" data-exec>\u53EF\u7528\u7EC4\u4EF6</button><button id="componentSchema" data-exec>\u5C5E\u6027 Schema</button></div></fieldset>
      <fieldset><legend>Prefab</legend><input id="prefabNode" value="home.startButton"><input id="prefabUrl" value="db://assets/p2/ui/StartButton.prefab"><div class="actions"><button id="prefabProbe" data-exec>\u63A2\u9488</button><button id="prefabCreate" data-exec>\u521B\u5EFA</button><button id="prefabOpen" data-exec>\u6253\u5F00</button><button id="prefabSave" data-exec>\u4FDD\u5B58</button><button id="prefabClose" data-exec>\u5173\u95ED</button></div><input id="prefabParent" placeholder="\u7236\u8282\u70B9 semanticKey\uFF08\u53EF\u7A7A\uFF09"><input id="prefabSemanticKey" value="home.startButton.instance" placeholder="\u5B9E\u4F8B semanticKey"><button id="prefabInstantiate" data-exec>\u5B9E\u4F8B\u5316\u5230\u5F53\u524D\u573A\u666F</button></fieldset>
    </section>
    <section data-page="json" hidden>
      <p class="page-intro">\u76F4\u63A5\u8C03\u7528\u767D\u540D\u5355 Bridge \u65B9\u6CD5\uFF0C\u4F9B\u5F00\u53D1\u6392\u969C\u548C\u534F\u8BAE\u9A8C\u6536\u3002\u666E\u901A\u4F7F\u7528\u4F18\u5148\u8BA9 Codex \u8C03\u7528 MCP\uFF1B\u5199\u64CD\u4F5C\u5FC5\u987B\u52FE\u9009\u786E\u8BA4\u3002</p>
      <select id="method"></select>
      <textarea id="params" spellcheck="false">{}</textarea>
      <label><input type="checkbox" id="confirm">\u786E\u8BA4\u6267\u884C\u5199\u64CD\u4F5C</label>
      <button id="run" data-exec>\u6821\u9A8C\u5E76\u6267\u884C</button>
      <pre id="result"></pre>
    </section>
    <section data-page="audit" hidden><p class="page-intro">\u5F53\u524D Creator \u542F\u52A8\u4F1A\u8BDD\u6700\u8FD1 100 \u6B21 Bridge \u64CD\u4F5C\u8BB0\u5F55\uFF0C\u5305\u542B\u9762\u677F\u548C\u5916\u90E8 MCP \u8C03\u7528\u3002\u5B83\u7528\u4E8E\u6392\u9519\u548C\u786E\u8BA4\u4FEE\u6539\u6765\u6E90\uFF0C\u4E0D\u662F Git \u5386\u53F2\uFF0C\u4E5F\u4E0D\u4F1A\u5728 Creator \u91CD\u542F\u540E\u4FDD\u7559\u3002</p><button id="copyAudit">\u590D\u5236 JSON</button><div id="audit"></div></section>
    <section data-page="help" hidden>
      <fieldset><legend>Creator AI Companion</legend>
        <p class="page-intro">\u6B64\u5DE5\u7A0B\u7531 Creator AI Companion \u7BA1\u7406\u3002Companion \u8D1F\u8D23\u7A33\u5B9A\u5DE5\u7A0B\u8DEF\u7531\u3001Creator \u751F\u547D\u5468\u671F\u548C Codex \u63A5\u5165\uFF1B\u672C\u9762\u677F\u4FDD\u7559\u5F53\u524D Creator \u7684\u72B6\u6001\u4E0E\u5E94\u6025\u8C03\u8BD5\u80FD\u529B\u3002</p>
        <div id="codexStatus" class="integration-status">\u6B63\u5728\u68C0\u67E5 Companion \u72B6\u6001...</div>
        <div class="actions"><button id="installCodex" data-exec>\u542F\u52A8\u5E76\u63A5\u5165</button><button id="openCompanion">\u6253\u5F00 Companion</button><button id="refreshCodex">\u5237\u65B0\u72B6\u6001</button></div>
        <small>\u65E7\u76F4\u8FDE\u914D\u7F6E\u4EC5\u5728\u65B0 Companion \u914D\u7F6E\u5B8C\u6210\u5E76\u56DE\u8BFB\u9A8C\u8BC1\u540E\u8FC1\u79FB\uFF1B\u4E0D\u4F1A\u4FEE\u6539\u5176\u4ED6\u5DE5\u7A0B\u7684 MCP\uFF0C\u4E5F\u4E0D\u4F1A\u5728\u754C\u9762\u4E2D\u663E\u793A\u4EE4\u724C\u3001\u7AEF\u53E3\u6216\u8FDE\u63A5\u6587\u4EF6\u3002</small>
      </fieldset>
      <fieldset><legend>\u76F4\u63A5\u53D1\u7ED9 Codex</legend><div id="promptList" class="prompt-list"></div></fieldset>
      <fieldset><legend>MCP \u5DE5\u5177\u6E05\u5355\uFF0827 \u4E2A\uFF09</legend><p class="page-intro">\u201C\u53EA\u8BFB\u201D\u4E0D\u4F1A\u4FEE\u6539 Creator\uFF1B\u201C\u64CD\u4F5C\u201D\u4F1A\u5207\u6362\u6216\u5237\u65B0\u7F16\u8F91\u5668\u72B6\u6001\uFF1B\u201C\u5199\u5165/\u5220\u9664\u201D\u53D7 Creator \u6743\u9650\u3001revision\u3001hash \u548C\u786E\u8BA4\u89C4\u5219\u4FDD\u62A4\u3002</p><div id="toolCatalog"></div></fieldset>
    </section>
  </main>
</div>`;
var style = `
.panel-header{position:sticky;top:0;z-index:10;padding:4px 0;background:#252525}.page-intro{margin:6px 0 8px;padding:7px;background:#303030;border-left:3px solid #4f8cff;color:#bbb;line-height:1.5}.tool-group{margin:6px 0;border:1px solid #444;border-radius:4px}.tool-group>summary{padding:7px;cursor:pointer;color:#8fb8ff}.tool-row{display:grid;grid-template-columns:minmax(150px,1fr) auto;gap:3px 8px;padding:7px;border-top:1px solid #3c3c3c}.tool-row code{overflow-wrap:anywhere;color:#ddd}.tool-access{color:#8fb8ff}.tool-description{grid-column:1/-1;color:#aaa;line-height:1.4}
:host{display:block;height:100%;max-width:100%;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;color:#ddd;font:12px -apple-system,BlinkMacSystemFont,sans-serif}*{box-sizing:border-box}#app{width:100%;min-width:0;max-width:100%;padding:10px;background:#252525;min-height:100%;overflow-x:hidden}header{display:flex;justify-content:space-between;align-items:center;gap:6px}.header-actions{display:flex;gap:5px}#dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#777;margin-right:7px}#dot.on{background:#45c46b;box-shadow:0 0 6px #45c46b}.status{display:grid;grid-template-columns:90px minmax(0,1fr);gap:4px 8px;margin:10px 0 4px;padding:8px;background:#303030;border-radius:4px}.status span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.capability-state{display:flex;justify-content:space-between;gap:8px;margin:5px 0;color:#bbb}.capability-state .bad{font-weight:600}.capabilities{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:5px;margin-bottom:8px}.capabilities select{margin:0}nav{display:flex;flex-wrap:wrap;gap:3px;border-bottom:1px solid #444;margin-bottom:8px}nav button{flex:1 1 72px}nav button.active{background:#4f8cff;color:white}main,section{min-width:0;max-width:100%}button,select,input,textarea{background:#373737;color:#ddd;border:1px solid #555;border-radius:3px;padding:5px;min-width:0;max-width:100%}button{cursor:pointer}button:disabled{opacity:.5;cursor:wait}button.installed{background:#276a3c;border-color:#45c46b;color:#fff}input,textarea,select{width:100%;margin:3px 0}textarea{min-height:120px;resize:vertical;font-family:ui-monospace,monospace}.actions{display:flex;gap:5px;flex-wrap:wrap}.actions button{flex:1 1 96px}.tree{margin-top:8px;max-width:100%;overflow:auto}.node{padding:3px 0 3px min(calc(var(--depth)*12px),120px);border-bottom:1px solid #333;min-width:max-content}.node summary{cursor:pointer}.node small{color:#8fb8ff;margin-left:6px}.components{color:#999;margin-left:8px}fieldset{border:1px solid #444;margin:8px 0;padding:8px;min-width:0;max-width:100%}legend{color:#8fb8ff}pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;background:#1e1e1e;padding:8px;max-height:300px;max-width:100%;overflow:auto}.audit-row{padding:6px;border-bottom:1px solid #444;overflow-wrap:anywhere}.ok{color:#45c46b}.bad{color:#ff6b6b}.integration-status{padding:8px;margin-bottom:6px;border-radius:4px;background:#303030}.prompt-list{display:grid;gap:7px}.prompt-card{padding:8px;background:#303030;border-radius:4px}.prompt-card header{margin-bottom:5px}.prompt-card p{margin:0;color:#bbb;white-space:pre-wrap}.prompt-card button{flex:0 0 auto}[hidden]{display:none!important}@media(max-width:520px){.capabilities{grid-template-columns:minmax(0,1fr) 1fr}.capabilities #copyDiagnostic{grid-column:1/-1}}@media(max-width:440px){#app{padding:6px}.status{grid-template-columns:72px minmax(0,1fr)}}`;
function input(panel, name) {
  return panel.$[name];
}
function textarea(panel, name) {
  return panel.$[name];
}
async function call(method, params) {
  if (!ALLOWED_METHODS.has(method)) throw new Error(`\u9762\u677F\u4E0D\u5141\u8BB8\u8C03\u7528\u5DE5\u5177: ${method}`);
  return Editor.Message.request("creator-ai-bridge", "panel-call", method, params);
}
function renderTree(nodes, depth = 0) {
  return nodes.map((node) => {
    const label = `<b>${escapeHtml(node.name)}</b><small>${escapeHtml(node.semanticKey ?? node.key)}</small><span class="components">${node.components.map((item) => escapeHtml(item.type)).join(", ")}</span>`;
    return node.children.length > 0 ? `<details class="node" style="--depth:${depth}" open><summary>${label}</summary>${renderTree(node.children, depth + 1)}</details>` : `<div class="node" style="--depth:${depth}">${label}</div>`;
  }).join("");
}
function escapeHtml(value) {
  return redactText(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function redactText(value) {
  return value.replace(/\bBearer\s+[^\s,}"']+/gi, "Bearer [REDACTED]").replace(/((?:token|authorization|secret)\s*[:=]\s*)[^\s,}"']+/gi, "$1[REDACTED]");
}
function sanitizeJson(value) {
  if (Array.isArray(value)) return value.map(sanitizeJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      /token|authorization|secret/i.test(key) ? "[REDACTED]" : sanitizeJson(item)
    ]));
  }
  return typeof value === "string" ? redactText(value) : value;
}
function safeStringify(value) {
  return JSON.stringify(sanitizeJson(value), null, 2);
}
function errorText(error) {
  return redactText(error instanceof Error ? error.message : String(error));
}
async function copyText(panel, value, label) {
  try {
    await navigator.clipboard.writeText(redactText(value));
    panel.$.result.textContent = `${label}\u5DF2\u590D\u5236`;
  } catch (error) {
    panel.$.result.textContent = `\u590D\u5236\u5931\u8D25: ${errorText(error)}`;
  }
}
function renderCodexPrompts(panel) {
  const prompts = CODEX_PROMPTS.map((prompt) => ({
    ...prompt,
    text: prompt.text.replace("cocos-creator MCP", `${panel.codexMcpName ?? "\u5F53\u524D\u5DE5\u7A0B\u5BF9\u5E94\u7684 Creator"} MCP`)
  }));
  panel.$.promptList.innerHTML = prompts.map((prompt, index) => `<article class="prompt-card"><header><b>${escapeHtml(prompt.title)}</b><button data-copy-prompt="${index}">\u590D\u5236</button></header><p>${escapeHtml(prompt.text)}</p></article>`).join("");
  panel.$.promptList.querySelectorAll("button[data-copy-prompt]").forEach((button) => button.addEventListener("click", () => {
    const prompt = prompts[Number(button.dataset.copyPrompt)];
    if (prompt) void copyText(panel, prompt.text, `\u201C${prompt.title}\u201D\u63D0\u793A\u8BCD`);
  }));
}
function renderToolCatalog(panel) {
  const groups = /* @__PURE__ */ new Map();
  for (const tool of MCP_TOOL_CATALOG) groups.set(tool[0], [...groups.get(tool[0]) ?? [], tool]);
  panel.$.toolCatalog.innerHTML = [...groups].map(([group, tools]) => `
    <details class="tool-group" open><summary>${escapeHtml(group)}\uFF08${tools.length}\uFF09</summary>
      ${tools.map(([, name, access, description]) => `<div class="tool-row"><code>${escapeHtml(name)}</code><span class="tool-access">${escapeHtml(access)}</span><span class="tool-description">${escapeHtml(description)}</span></div>`).join("")}
    </details>`).join("");
}
async function refreshCodexIntegration(panel) {
  try {
    const state = await Editor.Message.request("creator-ai-bridge", "codex-integration-status");
    panel.integration = state;
    panel.codexMcpName = state.name;
    renderCodexPrompts(panel);
    panel.$.codexStatus.innerHTML = `
      <b>Companion</b> <span class="${state.companion === "connected" ? "ok" : "bad"}">${state.companion === "connected" ? "\u5DF2\u8FDE\u63A5" : "\u672A\u8FDE\u63A5"}</span><br>
      <b>Codex MCP</b> ${escapeHtml(state.name)}<br>
      ${state.projectId ? `<b>\u5DE5\u7A0B ID</b> ${escapeHtml(state.projectId)}<br>` : ""}
      <span class="${state.current ? "ok" : state.available ? "" : "bad"}">${escapeHtml(state.message)}</span>`;
    const installButton = panel.$.installCodex;
    installButton.textContent = state.current ? "\u4FEE\u590D\u63A5\u5165" : state.installed ? "\u8FC1\u79FB\u5230 Companion" : "\u542F\u52A8\u5E76\u63A5\u5165";
    installButton.classList.toggle("installed", state.current);
    installButton.disabled = !state.available || panel.busy;
    render(panel);
  } catch (error) {
    panel.$.codexStatus.innerHTML = `<span class="bad">${escapeHtml(errorText(error))}</span>`;
  }
}
async function installCodex(panel) {
  if (panel.busy) return;
  setBusy(panel, true);
  panel.$.codexStatus.textContent = "Companion \u6B63\u5728\u6CE8\u518C\u5DE5\u7A0B\u3001\u9A8C\u8BC1 Bridge \u5E76\u63A5\u5165 Codex...";
  try {
    const state = await Editor.Message.request("creator-ai-bridge", "codex-integration-install");
    panel.$.result.textContent = state.message;
  } catch (error) {
    panel.$.result.textContent = `\u63A5\u5165\u5931\u8D25: ${errorText(error)}`;
  } finally {
    setBusy(panel, false);
    await refreshCodexIntegration(panel);
  }
}
function setBusy(panel, busy) {
  panel.busy = busy;
  const root = panel.$.result.getRootNode();
  root.querySelectorAll("button[data-exec]").forEach((button) => {
    button.disabled = busy;
  });
}
function setStatusCollapsed(panel, collapsed) {
  panel.statusCollapsed = collapsed;
  panel.$.statusDetails.hidden = collapsed;
  panel.$.statusToggle.textContent = collapsed ? "\u5C55\u5F00\u72B6\u6001" : "\u6536\u8D77\u72B6\u6001";
  panel.$.statusToggle.setAttribute("aria-expanded", String(!collapsed));
  localStorage.setItem("creator-ai-bridge.status-collapsed", String(collapsed));
}
function render(panel) {
  const state = panel.state;
  const integration = panel.integration;
  panel.$.dot.classList.toggle("on", Boolean(state?.connected));
  panel.$.status.innerHTML = state ? `
    <b>Bridge</b><span>${state.connected ? "\u5DF2\u8FDE\u63A5" : "\u672A\u8FDE\u63A5"}</span>
    <b>Creator</b><span>${escapeHtml(state.project.creatorVersion)}</span>
    <b>\u534F\u8BAE</b><span>${escapeHtml(state.project.protocolVersion)}</span>
    <b>\u5DE5\u7A0B</b><span title="${escapeHtml(state.project.projectPath)}">${escapeHtml(state.project.projectPath)}</span>
    <b>\u4F1A\u8BDD</b><span>${escapeHtml(state.project.sessionId)}</span>
    <b>Companion</b><span class="${integration?.companion === "connected" ? "ok" : "bad"}">${integration?.companion === "connected" ? "\u5DF2\u8FDE\u63A5" : "\u672A\u8FDE\u63A5"}</span>
    <b>Codex MCP</b><span>${escapeHtml(integration?.name ?? "\u5F85\u68C0\u6D4B")}</span>
    <b>\u6587\u6863</b><span>${escapeHtml(state.document?.sceneUrl ?? "\u672A\u6253\u5F00")}</span>
    <b>Revision</b><span>${escapeHtml(state.document?.revision ?? "-")}</span>` : "\u672A\u8FDE\u63A5";
  panel.$.tree.innerHTML = state?.document ? renderTree(state.document.roots) : "\u65E0\u573A\u666F\u6570\u636E";
  if (state) {
    const capability = capabilitySelectionState(state.capabilityProfile, panel.pendingCapabilityProfile);
    panel.pendingCapabilityProfile = capability.selected;
    panel.$.capabilityProfile.value = capability.selected;
    panel.$.currentCapability.textContent = capability.effectiveLabel;
    panel.$.capabilityPending.textContent = capability.pending ? `\u5F85\u5E94\u7528\uFF1A${capability.selectedLabel}` : "\u5DF2\u5E94\u7528";
    panel.$.capabilityPending.classList.toggle("bad", capability.pending);
    panel.$.capabilityPending.classList.toggle("ok", !capability.pending);
  }
  panel.$.audit.innerHTML = (state?.audit ?? []).slice(-100).map((event) => `<div class="audit-row"><span class="${event.ok ? "ok" : "bad"}">${event.ok ? "OK" : "FAIL"}</span> ${escapeHtml(event.method)} \xB7 ${event.durationMs}ms<br><small>${escapeHtml(event.startedAt)} \xB7 ${escapeHtml(event.errorCode ?? "-")} \xB7 ${escapeHtml(event.summary)}</small></div>`).join("");
}
async function applyCapabilityProfile(panel) {
  if (panel.busy) return;
  const profile = panel.$.capabilityProfile.value;
  if (profile === "full-control" && !window.confirm("\u5B8C\u5168\u63A7\u5236\u5C06\u5141\u8BB8\u5E26\u7CBE\u786E\u786E\u8BA4\u4E32\u7684\u8282\u70B9\u548C\u8D44\u6E90\u5220\u9664\u3002\u786E\u8BA4\u542F\u7528\uFF1F")) return;
  setBusy(panel, true);
  try {
    const applied = await Editor.Message.request("creator-ai-bridge", "set-capability-profile", profile);
    const state = await Editor.Message.request("creator-ai-bridge", "panel-state");
    panel.state = state;
    panel.pendingCapabilityProfile = profile;
    render(panel);
    if (applied !== profile || state.capabilityProfile !== profile) {
      throw new Error(`Creator \u6743\u9650\u72B6\u6001\u51B2\u7A81\uFF1A\u8BF7\u6C42 ${capabilityProfileLabel(profile)}\uFF0C\u8FD4\u56DE ${capabilityProfileLabel(applied)}\uFF0C\u5F53\u524D\u751F\u6548 ${capabilityProfileLabel(state.capabilityProfile)}`);
    }
    panel.$.result.textContent = `Creator \u6743\u9650\u5DF2\u5207\u6362\u4E3A ${capabilityProfileLabel(profile)}`;
  } catch (error) {
    panel.$.result.textContent = errorText(error);
  } finally {
    setBusy(panel, false);
  }
}
async function copyDiagnostic(panel) {
  try {
    const diagnostic = await Editor.Message.request("creator-ai-bridge", "diagnostic-snapshot");
    await copyText(panel, safeStringify(diagnostic), "\u8BCA\u65AD\u4FE1\u606F");
  } catch (error) {
    panel.$.result.textContent = `\u8BCA\u65AD\u751F\u6210\u5931\u8D25: ${errorText(error)}`;
  }
}
async function refresh(panel) {
  if (panel.refreshing) return;
  panel.refreshing = true;
  try {
    panel.state = await Editor.Message.request("creator-ai-bridge", "panel-state");
    render(panel);
  } catch (error) {
    panel.$.result.textContent = errorText(error);
  } finally {
    panel.refreshing = false;
  }
}
async function run(panel, method, params, confirmWrite = false) {
  if (panel.busy) return;
  if (confirmWrite && !window.confirm(`\u786E\u8BA4\u6267\u884C\u5199\u64CD\u4F5C ${method}\uFF1F`)) return;
  setBusy(panel, true);
  panel.$.result.textContent = `\u6267\u884C ${method}...`;
  try {
    const result = await call(method, params);
    panel.$.result.textContent = safeStringify(result);
    await refresh(panel);
    return result;
  } catch (error) {
    panel.$.result.textContent = errorText(error);
  } finally {
    setBusy(panel, false);
  }
}
async function writeAndCompile(panel) {
  if (panel.busy || !window.confirm("\u786E\u8BA4\u5199\u5165 TypeScript \u811A\u672C\u5E76\u7B49\u5F85 Creator \u7F16\u8BD1\uFF1F")) return;
  setBusy(panel, true);
  const url = input(panel, "scriptUrl").value;
  panel.$.result.textContent = `\u68C0\u67E5 ${url}...`;
  try {
    const current = await call("asset.getInfo", { value: url });
    const written = await call("script.write", { url, content: textarea(panel, "scriptContent").value, expectedHash: current?.hash ?? null });
    const compiled = await call("script.waitCompile", { url, className: input(panel, "scriptClass").value, timeoutMs: 3e4 });
    panel.$.result.textContent = safeStringify({ written, compiled });
    await refresh(panel);
  } catch (error) {
    panel.$.result.textContent = errorText(error);
  } finally {
    setBusy(panel, false);
  }
}
module.exports = Editor.Panel.define({
  template,
  style,
  $: {
    dot: "#dot",
    status: "#status",
    refresh: "#refresh",
    tree: "#tree",
    createTest: "#createTest",
    undo: "#undo",
    assetSource: "#assetSource",
    assetDest: "#assetDest",
    assetImport: "#assetImport",
    scriptUrl: "#scriptUrl",
    assetRefresh: "#assetRefresh",
    scriptClass: "#scriptClass",
    scriptContent: "#scriptContent",
    scriptWrite: "#scriptWrite",
    componentName: "#componentName",
    componentList: "#componentList",
    componentSchema: "#componentSchema",
    prefabNode: "#prefabNode",
    prefabUrl: "#prefabUrl",
    prefabProbe: "#prefabProbe",
    prefabCreate: "#prefabCreate",
    prefabOpen: "#prefabOpen",
    prefabSave: "#prefabSave",
    prefabClose: "#prefabClose",
    prefabParent: "#prefabParent",
    prefabSemanticKey: "#prefabSemanticKey",
    prefabInstantiate: "#prefabInstantiate",
    method: "#method",
    params: "#params",
    confirm: "#confirm",
    run: "#run",
    result: "#result",
    audit: "#audit",
    copyAudit: "#copyAudit",
    codexStatus: "#codexStatus",
    installCodex: "#installCodex",
    openCompanion: "#openCompanion",
    refreshCodex: "#refreshCodex",
    promptList: "#promptList",
    capabilityProfile: "#capabilityProfile",
    currentCapability: "#currentCapability",
    capabilityPending: "#capabilityPending",
    applyCapability: "#applyCapability",
    copyDiagnostic: "#copyDiagnostic",
    statusDetails: "#statusDetails",
    statusToggle: "#statusToggle",
    toolCatalog: "#toolCatalog"
  },
  listeners: {
    show() {
      void refresh(this);
      this.timer ??= setInterval(() => void refresh(this), 2e3);
    },
    hide() {
      if (this.timer) clearInterval(this.timer);
      this.timer = void 0;
    }
  },
  ready() {
    this.statusCollapsed = localStorage.getItem("creator-ai-bridge.status-collapsed") === "true";
    setStatusCollapsed(this, this.statusCollapsed);
    setBusy(this, false);
    this.$.method.innerHTML = TOOL_METHODS.map((method) => `<option>${method}</option>`).join("");
    textarea(this, "scriptContent").value = `import { _decorator, Button, Component } from 'cc';
const { ccclass, property } = _decorator;
@ccclass('StartButton')
export class StartButton extends Component {
  @property(Button) button: Button | null = null;
}`;
    this.$.refresh.addEventListener("click", () => void refresh(this));
    this.$.statusToggle.addEventListener("click", () => setStatusCollapsed(this, !this.statusCollapsed));
    this.$.capabilityProfile.addEventListener("change", () => {
      this.pendingCapabilityProfile = this.$.capabilityProfile.value;
      render(this);
    });
    this.$.applyCapability.addEventListener("click", () => void applyCapabilityProfile(this));
    this.$.copyDiagnostic.addEventListener("click", () => void copyDiagnostic(this));
    const panelRoot = this.$.result.getRootNode();
    panelRoot.querySelectorAll("nav button").forEach((button) => button.addEventListener("click", () => {
      panelRoot.querySelectorAll("nav button").forEach((item) => item.classList.toggle("active", item === button));
      panelRoot.querySelectorAll("[data-page]").forEach((page) => page.hidden = page.getAttribute("data-page") !== button.getAttribute("data-tab"));
      if (button.getAttribute("data-tab") === "help") void refreshCodexIntegration(this);
    }));
    renderCodexPrompts(this);
    renderToolCatalog(this);
    this.$.installCodex.addEventListener("click", () => void installCodex(this));
    this.$.openCompanion.addEventListener("click", () => void Editor.Message.request("creator-ai-bridge", "open-companion").catch((error) => {
      this.$.result.textContent = `\u6253\u5F00 Companion \u5931\u8D25: ${errorText(error)}`;
    }));
    this.$.refreshCodex.addEventListener("click", () => void refreshCodexIntegration(this));
    this.$.createTest.addEventListener("click", () => {
      const revision = this.state?.document?.revision;
      if (revision) void run(this, "scene.applyPatch", { expectedRevision: revision, verify: true, save: true, operations: [{ op: "upsertNode", key: "CreatorAiPanelTest", name: "CreatorAiPanelTest" }] }, true);
    });
    this.$.undo.addEventListener("click", () => void run(this, "scene.undoLastWrite", void 0, true));
    this.$.assetImport.addEventListener("click", () => void run(this, "asset.import", { sourcePath: input(this, "assetSource").value, destinationUrl: input(this, "assetDest").value }, true));
    this.$.assetRefresh.addEventListener("click", () => void run(this, "asset.refresh", { url: input(this, "assetDest").value }, true));
    this.$.scriptWrite.addEventListener("click", () => void writeAndCompile(this));
    this.$.componentList.addEventListener("click", () => void run(this, "component.listAvailable"));
    this.$.componentSchema.addEventListener("click", () => void run(this, "component.getSchema", { name: input(this, "componentName").value }));
    this.$.prefabProbe.addEventListener("click", () => void run(this, "prefab.probe"));
    this.$.prefabCreate.addEventListener("click", () => void run(this, "prefab.create", { sourceNodeKey: input(this, "prefabNode").value, url: input(this, "prefabUrl").value }, true));
    this.$.prefabOpen.addEventListener("click", () => void run(this, "prefab.open", { url: input(this, "prefabUrl").value }, true));
    this.$.prefabSave.addEventListener("click", () => void run(this, "prefab.save", void 0, true));
    this.$.prefabClose.addEventListener("click", () => void run(this, "prefab.close", void 0, true));
    this.$.prefabInstantiate.addEventListener("click", () => {
      const revision = this.state?.document?.revision;
      if (!revision) {
        this.$.result.textContent = "\u5F53\u524D\u6CA1\u6709\u53EF\u7528\u7684\u573A\u666F revision";
        return;
      }
      const parentKey = input(this, "prefabParent").value.trim();
      const params = {
        url: input(this, "prefabUrl").value,
        semanticKey: input(this, "prefabSemanticKey").value,
        expectedRevision: revision
      };
      if (parentKey) params.parentKey = parentKey;
      void run(this, "prefab.instantiate", params, true);
    });
    this.$.run.addEventListener("click", () => {
      const method = this.$.method.value;
      if (!READ_METHODS.has(method) && !input(this, "confirm").checked) {
        this.$.result.textContent = "\u5199\u64CD\u4F5C\u5FC5\u987B\u52FE\u9009\u786E\u8BA4";
        return;
      }
      try {
        const params = JSON.parse(textarea(this, "params").value);
        if (params === null || Array.isArray(params) || typeof params !== "object") throw new Error("\u53C2\u6570\u5FC5\u987B\u662F JSON \u5BF9\u8C61");
        void run(this, method, params).then((result) => {
          if (result !== void 0 && !READ_METHODS.has(method)) input(this, "confirm").checked = false;
        });
      } catch (error) {
        this.$.result.textContent = `JSON \u65E0\u6548: ${errorText(error)}`;
      }
    });
    this.$.copyAudit.addEventListener("click", () => void navigator.clipboard.writeText(safeStringify((this.state?.audit ?? []).slice(-100))));
    void refreshCodexIntegration(this);
    void refresh(this);
  },
  beforeClose() {
  },
  close() {
    if (this.timer) clearInterval(this.timer);
    this.timer = void 0;
  }
});
//# sourceMappingURL=panel.js.map
