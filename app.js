(function (root) {
  "use strict";

  const L = root.MillenniumLexicon;
  if (!L) throw new Error("MillenniumLexicon 未加载");

  const INTENSITY = {
    low: {
      voiceRate: 0.18,
      layers: { traditional: 0.24, symbol: 0.14, shape: 0.06, split: 0.01, pinyin: 0.04 },
      texture: { spacer: 0.02, punctuation: 0.18, frame: 0.08, ornament: 0.01 }
    },
    standard: {
      voiceRate: 0.52,
      layers: { traditional: 0.48, symbol: 0.34, shape: 0.18, split: 0.06, pinyin: 0.16 },
      texture: { spacer: 0.08, punctuation: 0.42, frame: 0.18, ornament: 0.035 }
    },
    high: {
      voiceRate: 0.88,
      layers: { traditional: 0.64, symbol: 0.48, shape: 0.3, split: 0.14, pinyin: 0.28 },
      texture: { spacer: 0.16, punctuation: 0.66, frame: 0.34, ornament: 0.075 }
    }
  };
  const PERSONAS = ["translator", "sorrow", "sweet", "cool", "daily"];

  const GLYPH_LAYERS = [
    ["pinyin", "pinyinVariants"],
    ["symbol", "symbolVariants"],
    ["traditional", "traditionalVariants"],
    ["shape", "shapeVariants"],
    ["split", "splitVariants"]
  ];
  const SPACERS = [" ", "　", " 、 ", "﹏", " · "];

  function hashSeed(value) {
    let h = 2166136261 >>> 0;
    const input = String(value ?? "2008");
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seededRandom(seed) {
    let state = hashSeed(seed);
    return function random() {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(list, random) {
    return list[Math.floor(random() * list.length) % list.length];
  }

  function cleanInput(value) {
    return String(value ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uE000-\uF8FF]/g, "")
      .trim();
  }

  function protectText(text) {
    const protectedValues = [];
    const pattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[A-Za-z][A-Za-z0-9_.@#-]*|\d+(?:[.:/-]\d+)*)/g;
    const value = text.replace(pattern, (match) => {
      const token = `§${protectedValues.length}§`;
      protectedValues.push(match);
      return token;
    });
    return { value, protectedValues };
  }

  function restoreText(text, protectedValues) {
    return text.replace(/§(\d+)§/g, (_, index) => protectedValues[Number(index)] ?? "");
  }

  function applyPhraseRules(text, persona, random) {
    const rules = [...(L.phraseRules[persona] || []), ...L.phraseRules.common]
      .sort((a, b) => b[0].length - a[0].length);
    let result = text;
    for (const [source, replacements] of rules) {
      if (result.includes(source)) {
        result = result.split(source).join(pick(replacements, random));
      }
    }
    return result;
  }

  function protectReplacement(value, protectedValues) {
    const token = `§${protectedValues.length}§`;
    protectedValues.push(value);
    return token;
  }

  function applyProtectedPhraseRules(state, rules, random) {
    if (!rules?.length) return state.value;
    const sortedRules = [...rules].sort((a, b) => b[0].length - a[0].length);
    let result = state.value;
    for (const [source, replacements] of sortedRules) {
      if (result.includes(source)) {
        result = result.split(source).join(protectReplacement(pick(replacements, random), state.protectedValues));
      }
    }
    state.value = result;
    return result;
  }

  function transformCharacter(char, profile, random) {
    const layers = profile.layers || INTENSITY.standard.layers;
    const candidates = [];
    for (const [layerName, tableName] of GLYPH_LAYERS) {
      const variants = L[tableName]?.[char];
      const rate = layers[layerName] || 0;
      if (variants && rate > 0 && random() < rate) candidates.push(...variants);
    }
    if (candidates.length) return pick(candidates, random);

    const fallback = L.characterVariants?.[char];
    const fallbackRate = (layers.traditional || 0) * 0.35;
    if (fallback && random() < fallbackRate) return pick(fallback, random);
    return char;
  }

  function applyLayeredGlyphs(text, profile, random) {
    let result = "";
    let insideToken = false;
    for (const char of text) {
      if (char === "§") {
        insideToken = !insideToken;
        result += char;
        continue;
      }
      result += insideToken ? char : transformCharacter(char, profile, random);
    }
    return result;
  }

  function canTakeSpacer(char) {
    return /[\u4e00-\u9fffㄋの亽吢卟吥罘沵伱妳祢迩莪涐皒峩媞昰旳德]/u.test(char);
  }

  function textureText(text, profile, carrier, random) {
    const texture = profile.texture || INTENSITY.standard.texture;
    let result = "";
    let insideToken = false;
    let lastWasSpacer = false;
    for (const char of text) {
      if (char === "§") {
        insideToken = !insideToken;
        result += char;
        lastWasSpacer = false;
        continue;
      }
      if (insideToken) {
        result += char;
        continue;
      }

      const punctuation = L.punctuationVariants?.[char];
      const rendered = punctuation && random() < texture.punctuation ? pick(punctuation, random) : char;
      result += rendered;

      if (
        carrier !== "nickname" &&
        canTakeSpacer(char) &&
        !lastWasSpacer &&
        random() < texture.spacer
      ) {
        result += pick(SPACERS, random);
        lastWasSpacer = true;
      } else {
        lastWasSpacer = /\s|﹏|·|、/.test(rendered);
      }

      if (
        carrier !== "nickname" &&
        L.inlineSymbols?.length &&
        (punctuation || canTakeSpacer(char)) &&
        random() < texture.ornament
      ) {
        result += pick(L.inlineSymbols, random);
      }
    }
    return result.replace(/[ \t]{2,}/g, " ");
  }

  function decorateNonMainstream(text, carrier, intensity, random) {
    if (carrier === "nickname") return text;
    const profile = INTENSITY[intensity] || INTENSITY.standard;
    const frames = L.nonMainstreamFrames?.[carrier]?.[intensity] || [];
    if (!frames.length || random() >= profile.texture.frame) return text;
    const [start, end] = pick(frames, random);
    return `${start}${text}${end}`;
  }

  function voiceText(text, persona, intensity, carrier, random) {
    if (persona === "translator") {
      if (carrier !== "nickname") {
        const frames = L.translatorFrames[intensity] || L.translatorFrames.standard;
        const frameRate = intensity === "low" ? 0.08 : intensity === "high" ? 0.22 : 0.14;
        if (random() < frameRate) {
          const [start, end] = pick(frames, random);
          return `${start}${text}${end}`;
        }
      }
      return text;
    }
    const voice = L.personaVoices[persona] || L.personaVoices.daily;
    const setting = INTENSITY[intensity] || INTENSITY.standard;
    let result = text;

    if (carrier !== "nickname" && random() < setting.voiceRate) {
      result = `${pick(voice.prefixes, random)}${result}`;
    }
    if (carrier === "chat" && random() < setting.voiceRate * 0.72) {
      result = `${result.replace(/[。！？!?]+$/u, "")}${pick(voice.suffixes, random)}`;
    }
    if (carrier === "chat" && intensity !== "low" && random() < setting.voiceRate) {
      result += pick(voice.emoticons, random);
    }
    return result;
  }

  function decorateSignature(text, intensity, random) {
    const frames = L.signatureFrames[intensity] || L.signatureFrames.standard;
    const [start, end] = pick(frames, random);
    return `${start}${text.replace(/\n+/g, " … ")}${end}`;
  }

  function transformNickname(text, candidateIndex, random, intensity) {
    const cycleIndex = candidateIndex % 6;
    const profile = INTENSITY[intensity] || INTENSITY.high;
    let converted = "";
    for (const char of text.replace(/\s+/g, "")) {
      const cycle = L.nicknameVariantCycles[char];
      if (cycle) {
        converted += cycle[cycleIndex];
      } else {
        converted += transformCharacter(char, profile, random);
      }
    }
    const [start, end] = L.nicknameFrames[candidateIndex % L.nicknameFrames.length];
    return `${start}${converted}${end}`;
  }

  function safeOutput(value) {
    return value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uE000-\uF8FF]/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  }

  function translate(text, options = {}) {
    const carrier = ["chat", "signature", "nickname"].includes(options.carrier) ? options.carrier : "chat";
    const persona = PERSONAS.includes(options.persona) ? options.persona : "daily";
    const intensity = ["low", "standard", "high"].includes(options.intensity) ? options.intensity : (carrier === "nickname" ? "high" : "standard");
    const source = cleanInput(text);
    if (!source) return [];

    const seed = options.seed ?? Date.now();
    if (carrier === "nickname") {
      return Array.from({ length: 12 }, (_, index) => {
        const random = seededRandom(`${seed}:nickname:${index}`);
        return safeOutput(transformNickname(source, index, random, intensity));
      });
    }

    const random = seededRandom(`${seed}:${carrier}:${persona}:${intensity}`);
    const protectedText = protectText(source);
    applyProtectedPhraseRules(protectedText, L.phoneticPhraseRules, random);
    let result = applyPhraseRules(protectedText.value, persona, random);
    result = voiceText(result, persona, intensity, carrier, random);
    result = applyLayeredGlyphs(result, INTENSITY[intensity], random);
    result = textureText(result, INTENSITY[intensity], carrier, random);
    result = restoreText(result, protectedText.protectedValues);
    result = decorateNonMainstream(result, carrier, intensity, random);
    if (carrier === "signature") result = decorateSignature(result, intensity, random);
    return [safeOutput(result)];
  }

  const COPY_MESSAGES = Object.freeze([
    "╭ァ 已複製成功 ゞ",
    "★° 已收入剪貼簿 ツ",
    "—━╋う 複製好ㄋ ╰☆╮",
    "〣.＊帶走惹﹖"
  ]);

  root.MillenniumTranslator = Object.freeze({ translate, cleanInput, hashSeed, copyMessages: COPY_MESSAGES });

  if (typeof document === "undefined" || !document.querySelector("#translator-form")) return;

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    form: $("#translator-form"), input: $("#source-text"), counter: $("#char-count"),
    output: $("#output-area"), empty: $("#empty-state"), emptyTitle: $("#empty-title"),
    emptyCopy: $("#empty-copy"), generate: $("#generate-button"), clear: $("#clear-button"),
    example: $("#example-button"), toast: $("#toast"), personaGroup: $("#persona-group"),
    notebookPage: $("#notebook-page"), status: $("#connection-status"),
    intensityRange: $("#intensity-range"), signalMeter: $("#signal-meter"),
    activeCopy: $("#active-copy-button"), font: $("#appearance-font"), size: $("#appearance-size"),
    taskTitle: $("#task-title"), profileSignatureButton: $("#profile-signature-button"),
    profileSignatureText: $("#profile-signature-text")
  };

  const defaultAppearance = () => ({ font: "song", size: 14, color: "#000000" });
  const pages = {
    chat: { draft: "", persona: "translator", intensity: "standard", history: [], appearance: defaultAppearance() },
    signature: { draft: "", persona: "translator", intensity: "standard", result: "", appearance: defaultAppearance() },
    nickname: { draft: "", intensity: "high", results: [], appearance: defaultAppearance() }
  };
  const pageMeta = {
    chat: { emptyTitle: "等待一条地球消息", emptyCopy: "写下一句话，和火星翻译官聊聊。" },
    signature: { emptyTitle: "个性签名还是空的", emptyCopy: "写下一句话，生成你的个人签名。" },
    nickname: { emptyTitle: "还没有非主流网名", emptyCopy: "输入一个名字，看看它在 2008 年的样子。" }
  };
  const friends = Object.freeze({
    translator: { name: "火星文翻译官" },
    sorrow: { name: "葬花♀涙" },
    sweet: { name: "糖糖ゞ" },
    cool: { name: "冷瞳╮" },
    daily: { name: "阿澈" }
  });
  const examples = Object.fromEntries(
    Object.entries(L.exampleCorpus).map(([carrier, entries]) => [carrier, entries.map(({ text }) => text)])
  );
  const exampleIndex = { chat: 0, signature: 0, nickname: 0 };
  let activeCarrier = "chat";
  let seedCounter = Date.now();
  const intensityNames = ["low", "standard", "high"];
  const intensityLabels = ["轻度", "标准", "爆表"];
  const fontFamilies = {
    song: 'SimSun, "宋体", NSimSun, "New Gulim", sans-serif',
    kai: 'KaiTi, "楷体", serif',
    hei: 'SimHei, "黑体", "Microsoft YaHei", sans-serif',
    rounded: 'YouYuan, "幼圆", "Microsoft YaHei", sans-serif'
  };
  const copyIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="4" width="11" height="13" rx="2"></rect><rect x="4" y="8" width="11" height="12" rx="2"></rect></svg>';

  function selected(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value;
  }

  function setSelected(name, value) {
    const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }

  function announce(message, isError = false) {
    elements.toast.textContent = message;
    elements.toast.classList.toggle("is-error", isError);
    elements.toast.classList.add("is-visible");
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 1800);
  }

  function updateCounter() {
    const length = Array.from(elements.input.value).length;
    elements.counter.textContent = `${length} / 500`;
  }

  function saveCurrentPage() {
    const page = pages[activeCarrier];
    page.draft = elements.input.value;
    page.intensity = intensityNames[Number(elements.intensityRange.value)] || page.intensity;
    if (activeCarrier !== "nickname") page.persona = selected("persona") || page.persona;
  }

  function createCopyButton(value, label = "复制结果") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-icon-button inline-copy";
    button.dataset.copyValue = value;
    button.innerHTML = copyIcon;
    button.title = label;
    button.setAttribute("aria-label", `${label}：${value}`);
    return button;
  }

  function updateSignalMeter() {
    const level = Number(elements.intensityRange.value);
    elements.signalMeter.dataset.level = String(level);
    elements.intensityRange.setAttribute("aria-valuetext", intensityLabels[level]);
  }

  function updateInterfaceLabels() {
    if (activeCarrier === "chat") {
      const friend = friends[pages.chat.persona] || friends.daily;
      elements.taskTitle.textContent = `与「${friend.name}」聊天中`;
    } else if (activeCarrier === "signature") {
      elements.taskTitle.textContent = "正在制作个性签名";
    } else {
      elements.taskTitle.textContent = "正在生成网名候选";
    }
    elements.profileSignatureText.textContent = pages.signature.result || "编辑个性签名";
  }

  function applyAppearance() {
    const appearance = pages[activeCarrier].appearance;
    const font = fontFamilies[appearance.font] || fontFamilies.song;
    elements.output.style.setProperty("--preview-font", font);
    elements.output.style.setProperty("--preview-size", `${appearance.size}px`);
    elements.output.style.setProperty("--preview-color", appearance.color);
    elements.font.value = appearance.font;
    elements.size.value = String(appearance.size);
    document.querySelectorAll("[data-color]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.color === appearance.color)));
  }

  function renderChat() {
    const history = pages.chat.history;
    if (!history.length) return;
    const thread = document.createElement("div");
    thread.className = "chat-thread";
    history.forEach((item, index) => {
      const pair = document.createElement("section");
      pair.className = `message-pair${index === history.length - 1 ? " pair-enter" : ""}`;

      const source = document.createElement("div");
      source.className = "chat-message is-source";
      const sourceMeta = document.createElement("div");
      sourceMeta.className = "message-meta";
      sourceMeta.textContent = `逆光の旅人  ${item.time}`;
      const sourceText = document.createElement("p");
      sourceText.textContent = item.source;
      source.append(sourceMeta, sourceText);

      const translated = document.createElement("div");
      translated.className = "chat-message is-translated";
      const translatedMeta = document.createElement("div");
      translatedMeta.className = "message-meta";
      translatedMeta.textContent = `${(friends[item.persona] || friends.daily).name}  ${item.time}`;
      const translatedBody = document.createElement("div");
      translatedBody.className = "translated-body";
      const translatedText = document.createElement("p");
      translatedText.textContent = item.output;
      translatedBody.append(translatedText, createCopyButton(item.output));
      translated.append(translatedMeta, translatedBody);
      pair.append(source, translated);
      thread.appendChild(pair);
    });
    elements.output.appendChild(thread);
  }

  function renderSignature() {
    const result = pages.signature.result;
    if (!result) return;
    const preview = document.createElement("section");
    preview.className = "signature-preview result-reveal";
    const heading = document.createElement("h3");
    heading.textContent = "个性签名预览";
    const stage = document.createElement("div");
    stage.className = "signature-stage";
    const card = document.createElement("div");
    card.className = "signature-result";
    const label = document.createElement("span");
    label.className = "signature-label";
    label.textContent = "个性签名";
    const text = document.createElement("p");
    text.textContent = result;
    card.append(label, text);
    stage.appendChild(card);
    preview.append(heading, stage);
    elements.output.appendChild(preview);
  }

  function renderNicknames() {
    const results = pages.nickname.results;
    if (!results.length) return;
    const grid = document.createElement("div");
    grid.className = "nickname-grid result-reveal";
    results.forEach((result, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nickname-result";
      button.dataset.copyValue = result;
      button.setAttribute("aria-label", `复制网名候选 ${index + 1}：${result}`);
      const number = document.createElement("span");
      number.className = "candidate-number";
      number.textContent = String(index + 1).padStart(2, "0");
      const value = document.createElement("span");
      value.className = "candidate-value";
      value.textContent = result;
      const icon = document.createElement("span");
      icon.className = "candidate-copy-icon";
      icon.innerHTML = copyIcon;
      button.append(number, value, icon);
      grid.appendChild(button);
    });
    elements.output.appendChild(grid);
  }

  function hasResults(carrier) {
    if (carrier === "chat") return pages.chat.history.length > 0;
    if (carrier === "signature") return Boolean(pages.signature.result);
    return pages.nickname.results.length > 0;
  }

  function renderActivePage() {
    elements.output.querySelectorAll(".chat-thread, .signature-preview, .nickname-grid").forEach((node) => node.remove());
    elements.output.className = `output-area region-l2 mode-${activeCarrier}`;
    elements.activeCopy.hidden = true;
    delete elements.activeCopy.dataset.copyValue;
    elements.empty.hidden = hasResults(activeCarrier);
    if (activeCarrier === "chat") renderChat();
    if (activeCarrier === "signature") renderSignature();
    if (activeCarrier === "nickname") renderNicknames();

    const copyValue = activeCarrier === "chat"
      ? pages.chat.history.at(-1)?.output
      : activeCarrier === "signature" ? pages.signature.result : "";
    if (copyValue) {
      elements.activeCopy.hidden = false;
      elements.activeCopy.dataset.copyValue = copyValue;
    }
  }

  function restoreActivePage() {
    const page = pages[activeCarrier];
    const meta = pageMeta[activeCarrier];
    elements.input.value = page.draft;
    elements.emptyTitle.textContent = meta.emptyTitle;
    elements.emptyCopy.textContent = meta.emptyCopy;
    elements.personaGroup.hidden = activeCarrier === "nickname";
    elements.notebookPage.dataset.page = activeCarrier;
    elements.intensityRange.value = String(Math.max(0, intensityNames.indexOf(page.intensity)));
    if (page.persona) setSelected("persona", page.persona);
    updateSignalMeter();
    applyAppearance();

    if (activeCarrier === "chat") elements.generate.textContent = "发送";
    if (activeCarrier === "signature") elements.generate.textContent = page.result ? "再生成" : "生成签名";
    if (activeCarrier === "nickname") elements.generate.textContent = page.results.length ? "换一批" : "生成网名";
    updateInterfaceLabels();
    updateCounter();
    renderActivePage();
  }

  async function copyText(value) {
    let copied = false;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(value);
      copied = true;
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try { copied = document.execCommand("copy"); } catch (_) { copied = false; }
      area.remove();
    }
    if (!copied) {
      announce("复制失败，请手动选择文字", true);
      return;
    }
    announce(COPY_MESSAGES[Math.floor(Math.random() * COPY_MESSAGES.length)]);
  }

  function generate() {
    const source = cleanInput(elements.input.value);
    if (!source) {
      elements.input.focus();
      announce(activeCarrier === "chat" ? "先写点什么再发送" : "先写点什么再生成", true);
      return;
    }
    saveCurrentPage();
    const page = pages[activeCarrier];
    const options = { carrier: activeCarrier, intensity: page.intensity, seed: ++seedCounter };
    if (activeCarrier !== "nickname") options.persona = page.persona;
    const results = translate(source, options);

    if (activeCarrier === "chat") {
      page.history.push({ source, output: results[0], persona: page.persona, time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) });
      page.draft = "";
      elements.input.value = "";
    } else if (activeCarrier === "signature") {
      page.result = results[0];
      elements.generate.textContent = "再生成";
    } else {
      page.results = results;
      elements.generate.textContent = "换一批";
    }

    updateCounter();
    updateInterfaceLabels();
    renderActivePage();
    requestAnimationFrame(() => { elements.output.scrollTop = elements.output.scrollHeight; });
    elements.status.textContent = "翻译完成";
    window.setTimeout(() => { elements.status.textContent = "在线"; }, 1200);
  }

  function closeToolPanels(returnFocus = false) {
    const openButton = document.querySelector(".editor-tool[aria-expanded='true']");
    document.querySelectorAll(".tool-panel").forEach((panel) => { panel.hidden = true; });
    document.querySelectorAll(".editor-tool").forEach((button) => button.setAttribute("aria-expanded", "false"));
    if (returnFocus && openButton) openButton.focus();
  }

  function toggleToolPanel(button) {
    const panel = document.querySelector(`[data-panel="${button.dataset.tool}"]`);
    const willOpen = panel.hidden;
    closeToolPanels();
    if (willOpen) {
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");
    }
  }

  function insertAtCursor(value) {
    const start = elements.input.selectionStart ?? elements.input.value.length;
    const end = elements.input.selectionEnd ?? start;
    elements.input.setRangeText(value, start, end, "end");
    pages[activeCarrier].draft = elements.input.value;
    updateCounter();
    elements.input.focus();
  }

  function updateAppearance(property, value) {
    pages[activeCarrier].appearance[property] = property === "size" ? Number(value) : value;
    applyAppearance();
  }

  elements.form.addEventListener("submit", (event) => { event.preventDefault(); generate(); });
  elements.input.addEventListener("input", () => {
    pages[activeCarrier].draft = elements.input.value;
    updateCounter();
  });
  elements.input.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") generate();
  });
  document.querySelectorAll('input[name="carrier"]').forEach((input) => input.addEventListener("change", (event) => {
    saveCurrentPage();
    closeToolPanels();
    activeCarrier = event.target.value;
    restoreActivePage();
  }));
  document.querySelectorAll('input[name="persona"]').forEach((input) => input.addEventListener("change", () => {
    saveCurrentPage();
    updateInterfaceLabels();
  }));
  elements.intensityRange.addEventListener("input", () => { updateSignalMeter(); saveCurrentPage(); });
  document.querySelectorAll(".editor-tool").forEach((button) => button.addEventListener("click", () => toggleToolPanel(button)));
  document.querySelectorAll("[data-insert]").forEach((button) => button.addEventListener("click", () => {
    insertAtCursor(button.dataset.insert);
    closeToolPanels();
  }));
  elements.font.addEventListener("change", () => updateAppearance("font", elements.font.value));
  elements.size.addEventListener("change", () => updateAppearance("size", elements.size.value));
  document.querySelectorAll("[data-color]").forEach((button) => button.addEventListener("click", () => updateAppearance("color", button.dataset.color)));
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".editor-toolbar")) closeToolPanels();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeToolPanels(true);
  });
  elements.example.addEventListener("click", () => {
    const list = examples[activeCarrier];
    const index = exampleIndex[activeCarrier]++ % list.length;
    elements.input.value = list[index];
    pages[activeCarrier].draft = elements.input.value;
    updateCounter();
    elements.input.focus();
  });
  elements.clear.addEventListener("click", () => {
    elements.input.value = "";
    pages[activeCarrier].draft = "";
    updateCounter();
    elements.input.focus();
  });
  elements.output.addEventListener("click", (event) => {
    const target = event.target.closest("[data-copy-value]");
    if (target) copyText(target.dataset.copyValue);
  });
  elements.activeCopy.addEventListener("click", () => {
    if (elements.activeCopy.dataset.copyValue) copyText(elements.activeCopy.dataset.copyValue);
  });
  elements.profileSignatureButton.addEventListener("click", () => {
    const signature = document.querySelector('input[name="carrier"][value="signature"]');
    if (!signature.checked) {
      signature.checked = true;
      signature.dispatchEvent(new Event("change", { bubbles: true }));
    }
    elements.input.focus();
  });

  restoreActivePage();
})(typeof window !== "undefined" ? window : globalThis);
