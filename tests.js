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
  test("金样例含经典符号框", () => nickname[0] === "╃蘫翔吕姊メ" && nickname[1] === "ぷ藍翔吕女且℅");
  test("固定 seed 可复现", () => JSON.stringify(nickname) === JSON.stringify(translate("蓝翔吕姐", { carrier: "nickname", intensity: "high", seed: 2008 })));
  test("聊天与签名载体不同", () => translate("我很想你", { carrier: "chat", seed: 1 })[0] !== translate("我很想你", { carrier: "signature", seed: 1 })[0]);
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
  function updateTitle() {
    document.title = failures ? `失败 ${failures} 项` : "全部测试通过";
  }

  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.title = "界面交互测试";
  frame.addEventListener("load", () => {
    const page = frame.contentDocument;
    const win = frame.contentWindow;
    test("恢复页脚、提示和四个编辑工具", () =>
      page.querySelector(".site-footer").textContent.includes("无账号") &&
      page.querySelector(".output-hint").textContent.includes("Ctrl + Enter") &&
      page.querySelectorAll(".editor-tool").length === 4 &&
      !page.body.textContent.includes("消息记录")
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
    font.value = "kai";
    font.dispatchEvent(new win.Event("change", { bubbles: true }));
    test("字体设置作用于预览而不修改文本", () => input.style.getPropertyValue("--preview-font").includes("KaiTi") && input.value === "测^_^试");
    page.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    test("Escape 关闭工具面板", () => page.querySelector("#appearance-panel").hidden);

    const signature = page.querySelector('input[name="carrier"][value="signature"]');
    signature.checked = true;
    signature.dispatchEvent(new win.Event("change", { bubbles: true }));
    input.value = "不是所有的等待，都能等到一个结果。";
    input.dispatchEvent(new win.Event("input", { bubbles: true }));
    page.querySelector("#translator-form").dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
    test("签名页使用独立预览框和图标复制", () => Boolean(page.querySelector(".signature-preview .signature-result")) && !page.querySelector("#active-copy-button").hidden);
    updateTitle();
  });
  frame.src = "index.html";
  document.body.appendChild(frame);
  updateTitle();
})();
