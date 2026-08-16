# 贡献指南

## 投稿预设

1. 新建 `presets/<id>/`（id 为 kebab-case），内含 `agent.cordis.yml` 与 `preset.yml`（name/description）。
2. 行结构必须可验证：优先复用官方预设中出现过的行（注明出处）；新行引用的包必须能在 harness 安装中找到。
3. 通过校验：`node tools/validate-presets.mjs --harness <dsh安装路径>` 全绿。
4. 在 README 预设清单加一行，提 PR。

## 投稿规则

1. 新建 `rules/<name>.md`，顶部保留"并入方法"注释块。
2. 内容原创、清单化、每条约 40 行以内；涉及 DSH 行为的说法注明版本。

## 红线

- 不接受搬运其他仓库的预设/规则文案；派生必须保留归因。
- 不接受无法验证的配置行（例如凭空编造的字段名）。
