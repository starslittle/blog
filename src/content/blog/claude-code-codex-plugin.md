---
title: '在 Claude Code 里调用 Codex：官方插件怎么装、怎么用'
description: 'OpenAI 出了一个装进 Claude Code 的 Codex 插件。装好以后，可以让 Claude 写代码、Codex 来审查，不用来回切窗口。这篇讲怎么装、怎么用，以及几个容易踩的坑。'
pubDate: '2026-11-18'
series: claude
seriesOrder: 3
---

我平时 Claude Code 和 Codex 都用。最常见的配合是：**Claude 写代码，Codex 来审查。**

为什么要换一个来审？因为同一个模型检查自己写的东西，容易带着同样的思路，看不出自己的盲点。换一个模型，就像换一个同事来看，更容易发现问题。

以前我是自己写脚本来做这件事。最近发现 OpenAI 官方出了一个插件，叫 [codex-plugin-cc](https://github.com/openai/codex-plugin-cc)，装进 Claude Code 就能直接用。

## 装好以后能做什么

插件会给 Claude Code 加几个**斜杠命令**，也就是在输入框里打 `/` 开头的命令。最常用的是这四个：

- **`/codex:review`**：让 Codex 看一遍你还没提交的改动，指出问题。它只看不改。
- **`/codex:adversarial-review`**：也是审查，但专门挑刺，会质疑你的设计和取舍。你可以告诉它重点看哪里。
- **`/codex:rescue`**：把一个任务整个交给 Codex。比如 Claude 卡在一个 bug 上，就让 Codex 换个思路试试。
- **`/codex:transfer`**：把你和 Claude 的这段对话，整个搬到 Codex 里，之后在 Codex 那边接着聊。

举个例子：Claude 刚改完登录功能，你输入 `/codex:review`，过一会儿 Codex 就会列出它发现的问题，比如"这里没处理密码为空的情况"。

如果审查要很久，可以在命令后面加 `--background`，让它在后台跑，你接着让 Claude 干别的。之后用 `/codex:status` 看进度，用 `/codex:result` 拿结果。

## 它是怎么调用 Codex 的

我一开始以为，它会打开 Codex 的窗口，或者去操控 Codex 的桌面版。翻了源码才知道，两个都不是。

它的做法是：**在后台悄悄启动一个没有界面的 Codex**，把任务交给它，等它做完，再把结果拿回 Claude Code 里给你看。

这带来三个结果：

1. **用的是你电脑上装的 Codex**，登录的账号和设置都跟你平时一样。
2. **Codex 桌面版开不开都没关系**，插件不会去碰它。
3. **审查不留记录**，做完就丢了。只有交任务和搬对话会留下记录，之后可以在 Codex 里接着用。

## 怎么装

先确认两件事：

- 电脑上已经装好 Codex 命令行，并且登录过。没登录的话，在终端运行 `codex login`。
- Node.js 版本在 18.18 以上。在终端运行 `node --version` 可以查看。

然后在 Claude Code 里依次输入这四条命令：

```
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

前三条是安装，最后一条是检查。看到 `ready: true`，就说明装好了。

### 如果你用的是 Claude 桌面版

我主要用 Claude 桌面版里的 Code 页面。在那里输入 `/plugin` 打不开安装界面，在终端里输入 `claude` 也提示找不到命令。

原因是：桌面版其实自带了 `claude` 命令，只是放在一个很深的文件夹里，终端找不到。它的位置大概是这样：

```
~/Library/Application Support/Claude/claude-code/<版本号>/<一串字符>/claude.app/Contents/MacOS/claude
```

在终端里用这个完整路径运行下面两条命令，效果和上面的 `/plugin` 一样：

```bash
claude plugin marketplace add openai/codex-plugin-cc
claude plugin install codex@openai-codex --scope user
```

这里的 `claude` 要换成上面那个完整路径。`--scope user` 的意思是装给你自己，以后打开任何项目都能用。

装完以后要**新开一个对话**，才能用这些命令。已经开着的对话不会自动加载。

## 三个要注意的地方

### 1. 审查默认不会"想得很深"

Codex 可以设置**推理强度**，也就是让模型想得多深。设得越高，想得越久，结果通常也越准。

`/codex:review` 没法单独设置推理强度，会直接用你 Codex 设置里的默认值。想让它想得更深，可以换成：

```
/codex:rescue --effort xhigh 只看不改，审查我还没提交的改动
```

`xhigh` 是最高一档。

注意要写上"只看不改"。`/codex:rescue` 本来是用来交任务的，默认允许 Codex 改文件。

### 2. "审查关卡"会很费额度

插件有一个可选功能叫"审查关卡"。打开以后，Claude 每次回答完，都会自动让 Codex 检查一遍；Codex 发现问题，Claude 就得先改好。

听起来很好，但两个模型可能会一直来回改，很快就把用量额度花完了。官方也这样提醒过。我平时关着它，只在自己盯着的时候才打开。

### 3. 只能叫上 Codex 一个

这个插件只能调用 Codex。如果你想让好几个不同的模型一起审，再对比它们的意见，还是得自己写脚本。

## 我的分工方式

最后说说我怎么让两边配合：

- **Claude 写，Codex 审。** 写的和审的不是同一个模型，审查才有意义。
- **审的人只提意见，不动手改。** 改代码还是交给写代码的一方，这样出了问题，能分清是谁改的。
- **两边不要同时改同一个文件。** 不然后改的会把先改的覆盖掉。真要同时开工，就各用一份独立的代码目录。

还有一个容易忽略的点：**让两边守同样的规矩。** Claude Code 的全局规则写在 `~/.claude/CLAUDE.md`，Codex 的写在 `~/.codex/AGENTS.md`。我之前给 Claude 加了一条"每句话都要让人读一遍就懂"，后来才发现 Codex 那边根本没有这条。规矩不一样，两边交接的时候就容易出岔子。
