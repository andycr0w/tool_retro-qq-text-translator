(function () {
  "use strict";
  const output = document.getElementById("results");
  let failures = 0;
  function test(name, assertion) {
    const item = document.createElement("li");
    try {
      if (!assertion()) throw new Error("断言返回 false");
      item.className = "pass";
      item.textContent = `PASS  ${name}`;
    } catch (error) {
      failures += 1;
      item.className = "fail";
      item.textContent = `FAIL  ${name}: ${error.message}`;
    }
    output.appendChild(item);
  }
  const translate = MillenniumTranslator.translate;
  const nickname = translate("蓝翔吕姐", { carrier: "nickname", intensity: "high", seed: 2008 });
  test("网名返回 12 个候选", () => nickname.length === 12);
  test("网名候选互不相同", () => new Set(nickname).size === 12);
  test("网名候选保留经典符号框", () => nickname[0].startsWith("╃") && nickname[0].endsWith("メ") && nickname[1].startsWith("ぷ") && nickname[1].endsWith("℅"));
  test("网名候选含火星字形", () => nickname.some((item) => /[蘫藍灆姊女且呂洺銘]/.test(item)));
  test("固定 seed 可复现", () => JSON.stringify(nickname) === JSON.stringify(translate("蓝翔吕姐", { carrier: "nickname", intensity: "high", seed: 2008 })));
  test("聊天与签名载体不同", () => translate("我很想你", { carrier: "chat", seed: 1 })[0] !== translate("我很想你", { carrier: "signature", seed: 1 })[0]);
  test("火星文翻译官保留语义骨架并综合字形层", () => {
    const input = "我今天很开心，也有一点难过";
    const result = translate(input, { persona: "translator", carrier: "chat", intensity: "high", seed: 2012 })[0];
    return result !== input && /今|天|開|开/.test(result) && !/^(原來|寶|呵|诶)/.test(result);
  });
  test("签名体包含繁体符号和近形层", () => {
    const result = translate("雨，整整下了一季，梦，轻轻碎了一地", { carrier: "signature", intensity: "standard", seed: 99 })[0];
    return /[夢儚輕誶]/.test(result) && /[ㄋ①の]/.test(result) && /[丅悸哋]/.test(result);
  });
  test("高浓度比低浓度更密但仍可读", () => {
    const input = "雨，整整下了一季，梦，轻轻碎了一地";
    const low = translate(input, { carrier: "signature", intensity: "low", seed: 2008 })[0];
    const high = translate(input, { carrier: "signature", intensity: "high", seed: 2008 })[0];
    const changed = (value) => Array.from(value).filter((char) => !input.includes(char) && !/[╭ァ︶ㄣじ☆veづ〆… ]/.test(char)).length;
    return changed(high) > changed(low) && /雨/.test(high) && /整整/.test(high) && /[梦夢儚]/.test(high) && /[轻輕]/.test(high) && /[地哋]/.test(high);
  });
  test("网址、英文和数字保持不变", () => {
    const result = translate("去 https://example.com 找 Andy123，时间 20:08", { carrier: "chat", intensity: "high", seed: 9 })[0];
    return result.includes("https://example.com") && result.includes("Andy123") && result.includes("20:08");
  });
  test("清除控制字符与私用区字符", () => {
    const result = translate("蓝\u000e翔\ue123吕姐", { carrier: "nickname", seed: 2 }).join("");
    return !/[\u0000-\u001f\u007f-\u009f\ue000-\uf8ff]/i.test(result);
  });
  test("复制成功文案带时代符号", () => {
    const messages = MillenniumTranslator.copyMessages;
    return messages.length === 4 && messages.every((message) => /[╭★━〣]/.test(message));
  });
  test("示例语料覆盖 2006–2012", () => {
    const years = new Set(MillenniumLexicon.exampleCorpus.chat.map(({ year }) => year));
    return [2006, 2007, 2008, 2009, 2010, 2011, 2012].every((year) => years.has(year));
  });
  test("经典聊天黑话已收录", () => {
    const texts = MillenniumLexicon.exampleCorpus.chat.map(({ text }) => text).join("\n");
    return ["我倒", "我晕", "GG", "MM", "886", "偶稀饭你"].every((word) => texts.includes(word));
  });
  test("GG、MM 与 886 保持可识别", () => {
    const result = translate("我晕，你是GG还是MM？886。", { carrier: "chat", intensity: "high", seed: 2006 })[0];
    return result.includes("GG") && result.includes("MM") && result.includes("886");
  });
  function updateTitle() {
    document.title = failures ? `失败 ${failures} 项` : "全部测试通过";
  }

  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.title = "界面交互测试";
  frame.addEventListener("load", () => {
    const page = frame.contentDocument;
    const win = frame.contentWindow;
    const color = (selector) => win.getComputedStyle(page.querySelector(selector)).backgroundColor;
    test("七个功能区域使用指定底色", () =>
      color(".region-l1") === "rgb(148, 208, 247)" &&
      color(".region-l2") === "rgb(254, 254, 254)" &&
      color(".region-l3") === "rgb(206, 229, 244)" &&
      color(".region-l4") === "rgb(254, 254, 254)" &&
      color(".region-l5") === "rgb(176, 213, 239)" &&
      color(".region-r1") === "rgb(79, 166, 236)" &&
      color(".region-r2") === "rgb(186, 221, 243)" &&
      color(".region-r3") === "rgb(255, 255, 255)"
    );
    test("L2 至 L4 由与 L5 一体的窄边槽包围", () => {
      const paneStyle = win.getComputedStyle(page.querySelector(".left-pane"));
      const innerRegions = [".region-l2", ".region-l3", ".region-l4"].map((selector) => win.getComputedStyle(page.querySelector(selector)));
      const footerStyle = win.getComputedStyle(page.querySelector(".region-l5"));
      return paneStyle.backgroundColor === "rgb(176, 213, 239)" &&
        paneStyle.gridTemplateColumns.startsWith("6px") &&
        paneStyle.gridTemplateColumns.endsWith("6px") &&
        innerRegions.every((style) => style.gridColumnStart === "2") &&
        footerStyle.gridColumnStart === "1" && footerStyle.gridColumnEnd === "-1";
    });
    test("用途选择采用与设置页相连的浏览器标签", () =>
      color('.notebook-tab input:checked + span') === "rgb(239, 247, 255)" &&
      color('.notebook-tab input:not(:checked) + span') === "rgb(188, 224, 244)" &&
      page.querySelector(".region-r2").getBoundingClientRect().bottom === page.querySelector(".region-r3").getBoundingClientRect().top &&
      win.getComputedStyle(page.querySelector(".region-r3")).boxShadow.includes("rgb(239, 247, 255)")
    );
    test("L5 按钮还原普通与默认发送层级", () => {
      const clearStyle = win.getComputedStyle(page.querySelector("#clear-button"));
      const sendStyle = win.getComputedStyle(page.querySelector("#generate-button"));
      return clearStyle.backgroundImage.includes("rgb(244, 251, 255)") &&
        clearStyle.backgroundImage.includes("rgb(184, 213, 230)") &&
        clearStyle.height === "24px" &&
        clearStyle.borderColor === "rgb(113, 157, 183)" &&
        sendStyle.backgroundImage.includes("rgb(232, 241, 199)") &&
        sendStyle.backgroundImage.includes("rgb(184, 207, 120)") &&
        sendStyle.borderColor === "rgb(138, 159, 67)" &&
        sendStyle.fontWeight === "400" &&
        clearStyle.color === "rgb(0, 0, 0)" && sendStyle.color === "rgb(0, 0, 0)";
    });
    test("L3 示例按钮文字为纯黑", () => win.getComputedStyle(page.querySelector("#example-button")).color === "rgb(0, 0, 0)");
    test("L2 默认 14px 宋体且右栏恢复字号层级", () => {
      const bodyStyle = win.getComputedStyle(page.body);
      const outputStyle = win.getComputedStyle(page.querySelector("#output-area"));
      const friendNameStyle = win.getComputedStyle(page.querySelector(".persona-card b"));
      const friendNoteStyle = win.getComputedStyle(page.querySelector(".persona-card small"));
      const expectedNameSize = win.innerWidth <= 520 ? "11px" : "14px";
      const expectedNoteSize = win.innerWidth <= 520 ? "9px" : "11px";
      return bodyStyle.fontSize === "13px" &&
        outputStyle.getPropertyValue("--preview-font").includes("SimSun") &&
        outputStyle.getPropertyValue("--preview-size").trim() === "14px" &&
        friendNameStyle.fontSize === expectedNameSize &&
        friendNoteStyle.fontSize === expectedNoteSize;
    });
    test("保留三个编辑工具且无品牌字样", () =>
      page.querySelectorAll(".editor-tool").length === 3 &&
      !page.body.textContent.toUpperCase().includes("QQ")
    );
    test("五种语气显示为好友资料且翻译官排首位", () => {
      const cards = Array.from(page.querySelectorAll(".persona-card"));
      const names = cards.map((card) => card.querySelector("b").textContent);
      return cards.length === 5 &&
        names[0] === "火星文翻译官" &&
        ["火星文翻译官", "葬花♀涙", "糖糖ゞ", "冷瞳╮", "阿澈"].every((name) => names.includes(name)) &&
        page.querySelector('input[name="persona"]:checked').value === "translator";
    });
    test("颜文字和装饰笔画面板已扩充", () =>
      page.querySelectorAll("#emoji-panel [data-insert]").length >= 30 &&
      page.querySelectorAll("#symbol-panel [data-insert]").length >= 48
    );
    test("签名复制按钮初始隐藏", () => page.querySelector("#active-copy-button").hidden);

    const range = page.querySelector("#intensity-range");
    range.value = "2";
    range.dispatchEvent(new win.Event("input", { bubbles: true }));
    test("信号滑块映射爆表浓度", () => range.getAttribute("aria-valuetext") === "爆表" && page.querySelector("#signal-meter").dataset.level === "2");

    const input = page.querySelector("#source-text");
    input.value = "测试";
    input.setSelectionRange(1, 1);
    page.querySelector('[data-tool="emoji"]').click();
    page.querySelector('[data-insert="^_^"]').click();
    test("颜文字插入当前光标位置", () => input.value === "测^_^试" && input.selectionStart === 4);

    page.querySelector('[data-tool="appearance"]').click();
    const font = page.querySelector("#appearance-font");
    const size = page.querySelector("#appearance-size");
    test("A 工具恢复 L2 字体字号与颜色设置", () =>
      font.value === "song" &&
      size.value === "14" &&
      page.querySelectorAll("#appearance-panel [data-color]").length === 4
    );
    font.value = "kai";
    font.dispatchEvent(new win.Event("change", { bubbles: true }));
    size.value = "18";
    size.dispatchEvent(new win.Event("change", { bubbles: true }));
    test("字体设置只作用于 L2 结果区域", () =>
      page.querySelector("#output-area").style.getPropertyValue("--preview-font").includes("KaiTi") &&
      page.querySelector("#output-area").style.getPropertyValue("--preview-size") === "18px" &&
      !input.style.getPropertyValue("--preview-font") &&
      !input.style.getPropertyValue("--preview-size") &&
      input.value === "测^_^试"
    );
    font.value = "song";
    font.dispatchEvent(new win.Event("change", { bubbles: true }));
    size.value = "14";
    size.dispatchEvent(new win.Event("change", { bubbles: true }));
    page.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    test("Escape 关闭工具面板", () => page.querySelector("#appearance-panel").hidden);

    const sorrow = page.querySelector('input[name="persona"][value="sorrow"]');
    sorrow.checked = true;
    sorrow.dispatchEvent(new win.Event("change", { bubbles: true }));
    test("好友选择同步聊天标题", () => page.querySelector("#task-title").textContent.includes("葬花♀涙"));

    page.querySelector("#translator-form").dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
    test("好友选择同步消息身份和复制操作", () =>
      page.querySelector(".is-translated .message-meta").textContent.includes("葬花♀涙") &&
      !page.querySelector("#active-copy-button").hidden
    );
    test("聊天昵称按发送方着色且正文默认纯黑", () =>
      win.getComputedStyle(page.querySelector(".is-translated .message-meta")).color === "rgb(0, 0, 255)" &&
      win.getComputedStyle(page.querySelector(".is-source .message-meta")).color === "rgb(0, 128, 0)" &&
      win.getComputedStyle(page.querySelector(".is-translated p")).color === "rgb(0, 0, 0)" &&
      win.getComputedStyle(page.querySelector(".is-source p")).color === "rgb(0, 0, 0)" &&
      win.getComputedStyle(page.querySelector(".is-translated p")).fontSize === "14px" &&
      win.getComputedStyle(page.querySelector(".is-translated p")).fontFamily.includes("SimSun")
    );
    test("L4 与 L5 按钮文字保持纯黑", () =>
      win.getComputedStyle(input).color === "rgb(0, 0, 0)" &&
      win.getComputedStyle(page.querySelector("#clear-button")).color === "rgb(0, 0, 0)" &&
      win.getComputedStyle(page.querySelector("#generate-button")).color === "rgb(0, 0, 0)"
    );

    const exampleButton = page.querySelector("#example-button");
    input.value = "";
    exampleButton.click();
    const firstExample = input.value;
    exampleButton.click();
    test("来个例子会轮换年代语料", () => firstExample.includes("GG") && input.value !== firstExample);

    page.querySelector("#profile-signature-button").click();
    const signature = page.querySelector('input[name="carrier"][value="signature"]');
    test("资料签名入口切换签名模式", () => signature.checked && page.querySelector("#task-title").textContent === "正在制作个性签名");
    input.value = "不是所有的等待，都能等到一个结果。";
    input.dispatchEvent(new win.Event("input", { bubbles: true }));
    page.querySelector("#translator-form").dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
    test("签名结果同步资料区并提供复制", () =>
      Boolean(page.querySelector(".signature-preview .signature-result")) &&
      page.querySelector("#profile-signature-text").textContent !== "编辑个性签名" &&
      !page.querySelector("#active-copy-button").hidden
    );

    const nicknameMode = page.querySelector('input[name="carrier"][value="nickname"]');
    nicknameMode.checked = true;
    nicknameMode.dispatchEvent(new win.Event("change", { bubbles: true }));
    test("网名模式隐藏好友语气并更新标题", () =>
      page.querySelector("#persona-group").hidden &&
      page.querySelector("#task-title").textContent === "正在生成网名候选"
    );
    updateTitle();
  });
  frame.src = "index.html";
  document.body.appendChild(frame);
  updateTitle();
})();
