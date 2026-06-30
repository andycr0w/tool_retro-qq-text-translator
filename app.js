(function (root) {
  "use strict";

  const L = root.MillenniumLexicon;
  if (!L) throw new Error("MillenniumLexicon 未加载");

  const INTENSITY = {
    low: { glyphRate: 0.1, voiceRate: 0.18 },
    standard: { glyphRate: 0.3, voiceRate: 0.52 },
    high: { glyphRate: 0.55, voiceRate: 0.88 }
  };

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

  function applyGlyphs(text, rate, random) {
    let result = "";
    let insideToken = false;
    for (const char of text) {
      if (char === "§") {
        insideToken = !insideToken;
        result += char;
        continue;
      }
      const variants = L.characterVariants[char];
      if (!insideToken && variants && random() < rate) {
        result += pick(variants, random);
      } else {
        result += char;
      }
    }
    return result;
  }

  function voiceText(text, persona, intensity, carrier, random) {
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
    let converted = "";
    for (const char of text.replace(/\s+/g, "")) {
      const cycle = L.nicknameVariantCycles[char];
      const general = L.characterVariants[char];
      if (cycle) {
        converted += cycle[cycleIndex];
      } else if (general && (intensity === "high" || random() < 0.58)) {
        converted += general[(candidateIndex + Math.floor(random() * general.length)) % general.length];
      } else {
        converted += char;
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
    const persona = ["sorrow", "sweet", "cool", "daily"].includes(options.persona) ? options.persona : "daily";
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
    let result = applyPhraseRules(protectedText.value, persona, random);
    result = voiceText(result, persona, intensity, carrier, random);
    result = applyGlyphs(result, INTENSITY[intensity].glyphRate, random);
    result = restoreText(result, protectedText.protectedValues);
    if (carrier === "signature") result = decorateSignature(result, intensity, random);
    return [safeOutput(result)];
  }

  root.MillenniumTranslator = Object.freeze({ translate, cleanInput, hashSeed });

  if (typeof document === "undefined") return;

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    form: $("#translator-form"), input: $("#source-text"), counter: $("#char-count"),
    output: $("#output-area"), outputTitle: $("#output-title"), empty: $("#empty-state"),
    generate: $("#generate-button"), clear: $("#clear-button"), example: $("#example-button"),
    copy: $("#copy-button"), toast: $("#toast"), intensity: $("#intensity-group"),
    nicknameHint: $("#nickname-hint"), status: $("#connection-status")
  };

  let lastResults = [];
  let seedCounter = Date.now();
  const examples = {
    chat: ["你怎么还不回我消息，我有点生气了。", "我今天不想上班，只想回家睡觉。", "我还是忘不了你，但是不会再联系你了。"],
    signature: ["我还是忘不了你，但是不会再联系你了。", "不是所有的等待，都能等到一个结果。", "有些人一旦错过，就不在。"],
    nickname: ["蓝翔吕姐", "寂寞小雨", "冷酷少年"]
  };
  let exampleIndex = 0;

  function selected(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value;
  }

  function announce(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 1700);
  }

  function updateCounter() {
    const length = Array.from(elements.input.value).length;
    elements.counter.textContent = `${length} / 500`;
  }

  function setCarrierUI() {
    const carrier = selected("carrier");
    const isNickname = carrier === "nickname";
    elements.nicknameHint.hidden = !isNickname;
    elements.copy.hidden = isNickname || lastResults.length === 0;
    elements.generate.textContent = lastResults.length ? (isNickname ? "换一批" : "再整一句") : (isNickname ? "生成网名" : "开始翻译");
    elements.outputTitle.textContent = isNickname ? "网名候选 · 点击复制" : carrier === "signature" ? "个性签名预览" : "对方正在输入…";
    if (isNickname && selected("intensity") === "standard") {
      document.querySelector('input[name="intensity"][value="high"]').checked = true;
    }
  }

  function render(results, carrier) {
    elements.output.querySelectorAll(".result-message, .nickname-grid").forEach((node) => node.remove());
    elements.empty.hidden = results.length > 0;
    elements.output.classList.toggle("is-nickname", carrier === "nickname");

    if (carrier === "nickname") {
      const grid = document.createElement("div");
      grid.className = "nickname-grid result-reveal";
      results.forEach((result, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "nickname-result";
        button.dataset.value = result;
        button.setAttribute("aria-label", `复制网名候选 ${index + 1}：${result}`);
        const number = document.createElement("span");
        number.className = "candidate-number";
        number.textContent = String(index + 1).padStart(2, "0");
        const value = document.createElement("span");
        value.className = "candidate-value";
        value.textContent = result;
        button.append(number, value);
        grid.appendChild(button);
      });
      elements.output.appendChild(grid);
    } else {
      const message = document.createElement("div");
      message.className = `result-message result-reveal ${carrier === "signature" ? "is-signature" : ""}`;
      const meta = document.createElement("div");
      meta.className = "message-meta";
      meta.textContent = carrier === "signature" ? "QQ个性签名" : `${L.personaVoices[selected("persona")].label}  ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
      const content = document.createElement("p");
      content.textContent = results[0];
      message.append(meta, content);
      elements.output.appendChild(message);
    }
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    announce("已复制，去闪耀吧");
  }

  function generate() {
    const source = elements.input.value;
    if (!cleanInput(source)) {
      elements.input.focus();
      announce("先写点什么再发送");
      return;
    }
    const options = {
      carrier: selected("carrier"), persona: selected("persona"),
      intensity: selected("intensity"), seed: ++seedCounter
    };
    lastResults = translate(source, options);
    render(lastResults, options.carrier);
    setCarrierUI();
    elements.copy.hidden = options.carrier === "nickname";
    elements.status.textContent = "翻译完成";
    window.setTimeout(() => { elements.status.textContent = "在线"; }, 1300);
  }

  elements.form.addEventListener("submit", (event) => { event.preventDefault(); generate(); });
  elements.input.addEventListener("input", updateCounter);
  elements.input.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") generate();
  });
  document.querySelectorAll('input[name="carrier"]').forEach((input) => input.addEventListener("change", () => {
    lastResults = [];
    render([], selected("carrier"));
    setCarrierUI();
  }));
  elements.intensity.addEventListener("change", setCarrierUI);
  elements.example.addEventListener("click", () => {
    const carrier = selected("carrier");
    const list = examples[carrier];
    elements.input.value = list[exampleIndex++ % list.length];
    updateCounter();
    elements.input.focus();
  });
  elements.clear.addEventListener("click", () => {
    elements.input.value = "";
    lastResults = [];
    render([], selected("carrier"));
    updateCounter();
    setCarrierUI();
    elements.input.focus();
  });
  elements.copy.addEventListener("click", () => lastResults[0] && copyText(lastResults[0]));
  elements.output.addEventListener("click", (event) => {
    const candidate = event.target.closest(".nickname-result");
    if (candidate) copyText(candidate.dataset.value);
  });

  updateCounter();
  setCarrierUI();
})(typeof window !== "undefined" ? window : globalThis);
