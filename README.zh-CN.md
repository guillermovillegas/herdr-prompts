# Herdr Prompts

[English](README.md) | [简体中文](README.zh-CN.md)

Herdr Prompts 是一款为 [Herdr](https://herdr.dev) 打造的键盘优先 Prompt 库。你可以保存常用 Prompt、通过不区分大小写的全文子串搜索找到它们、填写模板变量，并把结果插入 Codex、Claude Code、OpenCode 或其他 Agent 的输入框——不会自动提交。

插件完全本地运行：Prompt 只保存在你的机器上，不发起网络请求，也不收集遥测数据。

inspired by my friend: bingguanqi

## 环境要求

- macOS
- Herdr 0.8.0 或更高版本
- Node.js 20 或更高版本

## 安装

可以从 Herdr 插件市场安装，也可以执行：

```bash
herdr plugin install oppenheimor/herdr-prompts
```

在 Agent pane 上打开右键菜单，选择 **Open Prompt Picker**。插件不会默认占用全局快捷键，因此不会和你的本地配置抢地盘。

### 可选快捷键

如果希望使用快捷键，请挑选一个尚未绑定的按键，添加到 `~/.config/herdr/config.toml`。下面只是示例；如有冲突，请改成适合自己的按键。

```toml
[[keys.command]]
key = "prefix+alt+p"
type = "plugin_action"
command = "oppenheimor.herdr-prompts.open"
description = "Open prompt picker"
```

编辑后重新加载配置：

```bash
herdr server reload-config
```

## 使用方式

选择器会覆盖在发起调用的 Agent pane 上。选择普通 Prompt 后，文本会被插入原 Agent 的输入框，但不会发送 Enter。

### Prompt 列表

| 按键 | 功能 |
| --- | --- |
| 直接输入 | 搜索 Prompt 全文 |
| `↑` / `↓` | 切换选中项 |
| `Enter` | 插入选中的 Prompt |
| `Ctrl+N` | 新建 Prompt |
| `Ctrl+E` | 编辑选中的 Prompt |
| `Ctrl+D` | 二次确认后删除选中项 |
| `Esc` | 关闭选择器 |

### 新建、编辑或填写模板

| 按键 | 功能 |
| --- | --- |
| `Enter` | 换行 |
| `Ctrl+S` | 保存，或插入填写完成的模板 |
| 方向键 | 移动光标 |
| `Esc` | 取消 |

Prompt 内容完整支持 UTF-8，包括多行中文和 emoji。

## 模板

在 Prompt 中使用 `{{变量}}`：

```text
请检查 {{文件}} 中的 {{关注点}}，并使用 {{语言}} 回答。
```

选择带变量的 Prompt 后，插件会打开一次性的全文编辑器。替换所有未填写变量，再按 `Ctrl+S`，填写后的文本会进入原 Agent 输入框，而已保存的模板不会改变。

变量名可以包含字母、数字、下划线和中文。需要输出字面量双花括号时，用 `\{{` 转义，例如 `\{{不是变量}}`；最终插入的内容是 `{{不是变量}}`。

## 存储与隐私

Prompt 保存在插件私有配置目录下的 `prompts.json`。可通过下面的命令查看目录位置：

```bash
herdr plugin config-dir oppenheimor.herdr-prompts
```

数据格式带版本号，并为未来增加元数据保留扩展空间：

```json
{
  "version": 1,
  "prompts": [
    { "content": "检查当前 diff。" }
  ]
}
```

写入采用原子替换，文件创建权限为 `0600`。数据损坏或版本不受支持时，插件只报错、绝不覆盖。空 Prompt 和内容完全相同的重复 Prompt 会被拒绝。当前版本不支持多个选择器会话同时编辑。

插入前，插件会确认原 pane 仍然运行着状态为 `idle` 或 `done` 的 Agent。插件始终不会发送 Enter。

## 本地开发

```bash
pnpm install
pnpm check
pnpm plugin:link
```

仓库中的 `dist/index.mjs` 是根目录 `herdr-plugin.toml` 使用的自包含 Node.js bundle。

## 许可证

[MIT](LICENSE)
