# 莪の发言翻译器

一个纯静态的 2006–2012 中文互联网语气翻译器。

## 功能

- 聊天发言、个性签名、QQ 网名三种输出载体。
- 伤感葬爱、甜蜜网恋、拽酷宣言、日常聊天四种人格。
- 轻度、标准、爆表三级火星文浓度。
- QQ 网名一次生成 12 个候选，点击即可复制。
- 固定 seed 可复现结果，网址、英文与数字保持不变。
- 无后端、无 API、无第三方依赖，输入内容不会离开浏览器。

## 使用

直接打开 `index.html`，或在目录中启动任意静态文件服务器。

翻译接口暴露在浏览器全局：

```js
MillenniumTranslator.translate("蓝翔吕姐", {
  carrier: "nickname",
  persona: "daily",
  intensity: "high",
  seed: 2008
});
```

返回值始终为数组；聊天和签名返回 1 项，网名返回 12 项。

## 维护词库

词库集中在 `vocabulary.js`：

- `phraseRules`：长词优先的语气和年代词替换。
- `characterVariants`：火星字、繁体字与近形字。
- `nicknameVariantCycles`：网名拆字和固定变体序列。
- `personaVoices`：四种人格的前缀、结尾和颜文字。
- `signatureFrames` / `nicknameFrames`：载体装饰。

不要加入不可见控制字符或 Unicode 私用区字符；翻译器也会在输出阶段主动清理它们。
