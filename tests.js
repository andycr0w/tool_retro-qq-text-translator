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
  document.title = failures ? `失败 ${failures} 项` : "全部测试通过";
})();
