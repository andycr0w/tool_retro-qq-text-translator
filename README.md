# 莪の发言翻译器

一个纯静态的 2006–2012 中文互联网风格语气翻译器。

目前只有转火星文的单通翻译。

## 维护词库

词库集中在 `vocabulary.js`：

- `phraseRules`：长词优先的语气和年代词替换。
- `characterVariants`：火星字、繁体字与近形字。
- `nicknameVariantCycles`：网名拆字和固定变体序列。
- `personaVoices`：四种人格的前缀、结尾和颜文字。
- `signatureFrames` / `nicknameFrames`：载体装饰。

不要加入不可见控制字符或 Unicode 私用区字符；翻译器也会在输出阶段主动清理它们。
