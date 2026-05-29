# H5 20260529

通用 H5 营销页面生成器（750px 设计稿），配套 `h5-marketing-page` Skill 使用。

## 目录

- `preview/` — H5 预览工具（HTML + CSS + JS + 图标资源）
  - `index.html` / `style.css` / `app.js` — 主程序
  - `assets/` — 380+ 图标 SVG / 银行 logo PNG / manifest.json
  - `logos/` — 11 个合作伙伴 SVG

## 启动

```bash
cd preview
python3 -m http.server 8765
# 打开 http://localhost:8765/
```

> 必须通过 HTTP 服务访问，不能 `file://` 双击 `index.html`（会触发 CORS）。

## 关联 Skill

完整 Skill 包：`~/.codebuddy/skills/h5-marketing-page/`，详细规范见其 `SKILL.md` 与 `references/h5-visual-spec.md`。

## 版本

- `style.css?v=92` / `app.js?v=66`
- 主要特性：
  - 头图渐变顶部色按色相分流（黄/橙 70% / 其他 40%）
  - 图标圆角矩形弱底按色相分流（黄/橙 20% / 其他 12%）
  - `--brand-text` 智能可读色（亮色品牌自动转高级金）
  - 形态 A 画布全局背景层 + Logo 反白
  - Content 模块勾选 ↔ 操作面板双向联动
  - 标题+文案 / 白底卡片可编辑 fieldset
