/* ============================================================
 * H5 视觉规范预览工具 · 交互逻辑
 * ============================================================ */

console.log("[H5预览] app.js v6 已加载");

// ============================================================
// 启动前检测：必须通过 HTTP 服务访问，不能 file:// 直接打开
// ============================================================
(function checkProtocol() {
  if (location.protocol === "file:") {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.innerHTML = `
        <div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#1A1E24;color:#E5E6EB;font-family:-apple-system,'PingFang SC',sans-serif;padding:24px;z-index:99999;">
          <div style="max-width:560px;background:#1F2329;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:32px;line-height:1.7;">
            <h2 style="margin:0 0 16px;font-size:20px;color:#FF6B6B;">⚠ 不能用浏览器直接打开 index.html</h2>
            <p style="margin:0 0 16px;color:#E5E6EB;">检测到当前是 <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;color:#FF85B3;">file://</code> 协议，浏览器会因安全策略屏蔽资源加载，导致控制台 / 图标 / 导出全部失效。</p>
            <h3 style="margin:0 0 8px;font-size:15px;color:#4A8BFF;">✅ 正确启动方式（任选其一）：</h3>
            <p style="margin:0 0 8px;color:#8C92A4;font-size:13px;">在当前目录（<code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;color:#FF85B3;">preview-template/</code>）打开终端 / PowerShell，运行：</p>
            <div style="background:#1A1E24;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:12px;margin-bottom:12px;font-family:'SF Mono',Consolas,monospace;font-size:13px;color:#E5E6EB;">
              <div style="color:#8C92A4;font-size:11px;margin-bottom:4px;">macOS / Linux：</div>
              <div>双击 <strong style="color:#4A8BFF;">start-mac.command</strong> 或在终端运行 <code style="color:#FFD666;">bash start.sh</code></div>
            </div>
            <div style="background:#1A1E24;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:12px;margin-bottom:12px;font-family:'SF Mono',Consolas,monospace;font-size:13px;color:#E5E6EB;">
              <div style="color:#8C92A4;font-size:11px;margin-bottom:4px;">Windows：</div>
              <div>双击 <strong style="color:#4A8BFF;">start-windows.bat</strong></div>
            </div>
            <div style="background:#1A1E24;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:12px;font-family:'SF Mono',Consolas,monospace;font-size:13px;color:#E5E6EB;">
              <div style="color:#8C92A4;font-size:11px;margin-bottom:4px;">手动方式（任意系统）：</div>
              <div style="color:#FFD666;">python3 -m http.server 5520</div>
              <div style="color:#8C92A4;font-size:12px;margin-top:6px;">然后访问 <span style="color:#4A8BFF;">http://localhost:5520/index.html</span></div>
            </div>
            <p style="margin:16px 0 0;color:#6C7280;font-size:12px;">需要先安装 Python 3。Windows 可从 <a href="https://www.python.org/downloads/" style="color:#4A8BFF;" target="_blank">python.org</a> 下载并勾选「Add to PATH」。</p>
          </div>
        </div>
      `;
    });
    // 阻止后续脚本执行
    throw new Error("[H5预览] 必须通过 HTTP 服务访问。请使用 start-mac.command / start-windows.bat / python3 -m http.server 启动");
  }
})();

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ============================================================
// 银行高亮色对照表（来自 credit-card-ops SKILL §3.4）
// 选择银行后，渐变主色自动切换到该银行品牌色
// ============================================================
const BANK_COLORS = {
  cmb:   { name: "招商银行",     color: "#C42D32" },
  ceb:   { name: "光大银行",     color: "#843CC4" },
  hxb:   { name: "华夏银行",     color: "#DB4C40" },
  icbc:  { name: "工商银行",     color: "#BD3338" },
  cibf:  { name: "广发银行",     color: "#D43D40" },
  ccb:   { name: "建设银行",     color: "#2F6CB8" },
  bcm:   { name: "交通银行",     color: "#0B6BD5" },
  cmbc:  { name: "民生银行",     color: "#2E7BD9" },
  abc:   { name: "农业银行",     color: "#009583" },
  pab:   { name: "平安银行",     color: "#EA5404" },
  spdb:  { name: "浦发银行",     color: "#2662AB" },
  cib:   { name: "兴业银行",     color: "#0054A3" },
  psbc:  { name: "邮政储蓄银行", color: "#14634A" },
  boc:   { name: "中国银行",     color: "#B6002A" },
  citic: { name: "中信银行",     color: "#D91920" },
  general: { name: "通用",       color: "#0CBD6A" },
  custom:  { name: "自定义",     color: null },
};

// ============================================================
// Logo 配置：业务主题 → logo 路径（自有品牌 logo）
// ============================================================
const LOGO_PRESETS = {
  // 主题联动默认值（路径指向 assets/logos/own/）
  themeMap: {
    "telecom":      "assets/logos/own/通讯.svg",
    "cross-border": "assets/logos/own/跨境.svg",
    "credit-card":  "assets/logos/own/信用卡.svg",
  },
};

// ============================================================
// 资产 Manifest（自动加载本地资产清单）
// ============================================================
let _manifest = null;
async function loadManifest() {
  if (_manifest) return _manifest;
  try {
    const res = await fetch("assets/manifest.json");
    if (!res.ok) throw new Error("manifest 加载失败 " + res.status);
    _manifest = await res.json();
    return _manifest;
  } catch (err) {
    console.warn("manifest 加载失败，资产下拉无法填充：", err);
    _manifest = { logos: { own: [], bank: [] }, icons: { own: [], common: [], bank: [], partner: [] } };
    return _manifest;
  }
}

// 文件名 → 显示名（去扩展名 + 下划线转 ·）
function fileToLabel(name) {
  return name.replace(/\.(svg|png|jpe?g)$/i, "").replace(/_/g, " · ");
}

// 用 manifest 填充 Logo 下拉（自有品牌 + 银行）
function populateLogoSelect(manifest) {
  const sel = $("#ctrlLogoSelect");
  if (!sel) return;
  // 删除已有 optgroup（防重复填充）
  sel.querySelectorAll("optgroup[data-auto]").forEach(g => g.remove());

  const customOpt = sel.querySelector('option[value="custom"]');

  // 自有品牌 logo
  if (manifest.logos.own.length) {
    const og = document.createElement("optgroup");
    og.label = "自有品牌";
    og.dataset.auto = "1";
    manifest.logos.own.forEach(f => {
      const o = document.createElement("option");
      o.value = `assets/logos/own/${f}`;
      o.textContent = fileToLabel(f);
      og.appendChild(o);
    });
    sel.insertBefore(og, customOpt);
  }
  // 银行 logo（PNG，不支持反白）
  if (manifest.logos.bank.length) {
    const og = document.createElement("optgroup");
    og.label = "银行 logo";
    og.dataset.auto = "1";
    manifest.logos.bank.forEach(f => {
      const o = document.createElement("option");
      o.value = `assets/logos/bank/${f}`;
      o.textContent = fileToLabel(f);
      og.appendChild(o);
    });
    sel.insertBefore(og, customOpt);
  }

  // 同时填充次 Logo 下拉（联合/背书时使用）
  populateLogo2Select(manifest);
}

// 次 Logo 下拉填充：自有品牌 + 银行 logo + 合作方图标（PNG）
function populateLogo2Select(manifest) {
  const sel = $("#ctrlLogo2Select");
  if (!sel) return;
  sel.innerHTML = "";

  // 自有品牌
  if (manifest.logos.own.length) {
    const og = document.createElement("optgroup");
    og.label = "自有品牌";
    manifest.logos.own.forEach(f => {
      const o = document.createElement("option");
      o.value = `assets/logos/own/${f}`;
      o.textContent = fileToLabel(f);
      og.appendChild(o);
    });
    sel.appendChild(og);
  }
  // 银行
  if (manifest.logos.bank.length) {
    const og = document.createElement("optgroup");
    og.label = "银行 logo";
    manifest.logos.bank.forEach(f => {
      const o = document.createElement("option");
      o.value = `assets/logos/bank/${f}`;
      o.textContent = fileToLabel(f);
      og.appendChild(o);
    });
    sel.appendChild(og);
  }
  // 合作方
  if (manifest.icons.partner.length) {
    const og = document.createElement("optgroup");
    og.label = "合作方";
    manifest.icons.partner.forEach(f => {
      const o = document.createElement("option");
      o.value = `assets/icons/partner/${f}`;
      o.textContent = fileToLabel(f).replace(/^图标 · /, "");
      og.appendChild(o);
    });
    sel.appendChild(og);
  }

  // 默认选中第一个
  if (!state.header.logoSecond && sel.options.length) {
    state.header.logoSecond = sel.options[0].value;
  }
  sel.value = state.header.logoSecond || "";
}

// ============================================================
// TDesign 图标加载（线性 SVG，统一 2px 线宽）
// 用于：白底卡片图标 / Header 装饰图标 等需要"线条统一"的场景
// 文档：https://tdesign.tencent.com/icons
// ============================================================
const TD_ICON_BASE = "https://unpkg.com/tdesign-icons-svg@0.4.2/src";
const TD_ICON_STROKE_WIDTH = 2; // TDesign 默认线宽 2px
const _tdIconCache = new Map();

async function loadTdIcon(name) {
  if (_tdIconCache.has(name)) return _tdIconCache.get(name);
  try {
    const res = await fetch(`${TD_ICON_BASE}/${name}.svg`);
    if (!res.ok) throw new Error("404");
    let svg = await res.text();
    // TDesign 用非标准 view-box（连字符），浏览器不识别 → 改为标准 viewBox
    svg = svg.replace(/\bview-box=/gi, 'viewBox=');
    // 统一线宽
    svg = svg.replace(/stroke-width="[^"]*"/gi, `stroke-width="${TD_ICON_STROKE_WIDTH}"`);
    // 移除固定 1em 尺寸，让父容器控制
    svg = svg.replace(/\s(width|height)="[^"]*"/g, "");
    _tdIconCache.set(name, svg);
    return svg;
  } catch (err) {
    console.warn("TDesign 图标加载失败：", name, err);
    return null;
  }
}

// 渲染页面内所有 [data-td-icon] 的图标
async function renderTdIcons() {
  const targets = $$("[data-td-icon]");
  await Promise.all(targets.map(async el => {
    const name = el.dataset.tdIcon;
    if (!name || el.dataset.tdLoaded === name) return;
    const svg = await loadTdIcon(name);
    if (svg) {
      el.innerHTML = svg;
      el.dataset.tdLoaded = name;
    }
  }));
}

// ============================================================
// 本地资源加载（仅用于 Logo PNG / SVG）
// ============================================================
const _iconCache = new Map();
async function loadLocalIcon(url) {
  if (_iconCache.has(url)) return _iconCache.get(url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("404");
    let svg = await res.text();
    // 去掉 xml 声明
    svg = svg.replace(/<\?xml[^>]*\?>/, "").trim();
    // 兼容性：少数 SVG 用 view-box，统一改为 viewBox
    svg = svg.replace(/\bview-box=/gi, 'viewBox=');
    // 移除 svg 根节点上的 width/height（让父容器控制尺寸）
    svg = svg.replace(/<svg([^>]*)\s(width|height)="[^"]*"/gi, "<svg$1");
    // ★ 关键：把所有硬编码黑色 fill 替换为 currentColor，让图标跟随主题色
    //   常见值：black / #000 / #000000 / rgb(0,0,0) / #1A1A1A 等
    //   保留 fill="none"（描边图标）
    svg = svg
      .replace(/fill="(?!none\b)#?(?:000(?:000)?|black|1[Aa]1[Aa]1[Aa]|111|222|333)"/gi, 'fill="currentColor"')
      .replace(/fill="rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)"/gi, 'fill="currentColor"')
      .replace(/fill="rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*[^)]+\)"/gi, 'fill="currentColor"');
    // 同时把硬编码黑色 stroke 也替换为 currentColor
    svg = svg
      .replace(/stroke="(?!none\b)#?(?:000(?:000)?|black|1[Aa]1[Aa]1[Aa]|111|222|333)"/gi, 'stroke="currentColor"')
      .replace(/stroke="rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)"/gi, 'stroke="currentColor"');
    // 如果整个 svg 没有任何 fill，给根节点加 fill=currentColor 兜底
    if (!/\sfill=/i.test(svg)) {
      svg = svg.replace(/<svg/, '<svg fill="currentColor"');
    }
    _iconCache.set(url, svg);
    return svg;
  } catch (err) {
    console.warn("本地图标加载失败：", url, err);
    return null;
  }
}

// 渲染页面内所有 [data-icon-src] 的本地图标
async function renderLocalIcons() {
  const targets = $$("[data-icon-src]");
  await Promise.all(targets.map(async el => {
    const src = el.dataset.iconSrc;
    if (!src || el.dataset.iconLoaded === src) return;
    // PNG 直接用 <img>
    if (/\.(png|jpe?g)$/i.test(src)) {
      el.innerHTML = `<img src="${src}" alt="" />`;
      el.dataset.iconLoaded = src;
      return;
    }
    // SVG 内联（便于 currentColor 跟随主题）
    const svg = await loadLocalIcon(src);
    if (svg) {
      el.innerHTML = svg;
      el.dataset.iconLoaded = src;
    }
  }));
}

// SVG 反白：把所有彩色 fill 替换为白色（保留 fill="none"）
function invertSvgFills(svgText) {
  return svgText.replace(/fill="(?!none\b|"#fff"i)([^"]+)"/gi, 'fill="#FFFFFF"');
}

// 加载 SVG 内联（带反白选项）
async function loadSvgInline(url, invert = false) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    let svg = await res.text();
    // 去掉 xml 声明
    svg = svg.replace(/<\?xml[^>]*\?>/, "").trim();
    if (invert) svg = invertSvgFills(svg);
    return svg;
  } catch (err) {
    console.warn("加载 logo 失败：", url, err);
    return null;
  }
}

// ============================================================
// 状态
// ============================================================
const state = {
  theme: "cross-border",  // 跨境业务
  bg: "gradient",          // 品牌色渐变底
  gradientColor: "#FFCF00",// 黄色主色（智汇鹅品牌色）
  bankColor: "custom",
  bankCustomColor: "#FFCF00",
  qaStyle: "default",
  header: {
    form: "solid",           // 形态 B：插图 + 标题
    title: "腾讯官方 / [跨境电商收款]",
    sub: "更懂中国商企的跨境支付平台",
    showTag: true,
    tag: "新客 100 万免费额度",
    tagInvert: false,        // Tag 反色：true=白底+品牌色文字，false=品牌色底+白字
    align: "left",
    logoMode: "assets/logos/own/智汇鹅.png",  // 智汇鹅品牌 logo
    logoCustomDataUrl: null,
    logoInvert: false,
    logoLayout: "single",
    logoSecond: null,
    bannerDataUrl: null,
    illuDataUrl: null,
  },
  modules: {
    "title-text":  true,
    "coupon":      true,     // 省钱钩子 4 个数据点
    "table":       false,    // 关闭，能力用白底卡片展示
    "qa":          false,
    "phone-flow":  false,
    "input":       false,
    "white-cards": true,     // 能力 & 福利
  },
  // 模块编排列表（顺序唯一来源 + 显隐 + 同类型多实例）
  // 每个条目 { id, type, visible }；id 用于 DOM 唯一标识，便于拖拽
  // 同一 type 出现多次：共享同一份 state（如多个 coupon 块都展示 state.coupons）
  modulesList: [
    { id: "m1", type: "title-text",  visible: true  },
    { id: "m2", type: "coupon",      visible: true  },
    { id: "m3", type: "white-cards", visible: true  },
  ],
  coupons: [
    { amount: "0.3%",   name: "提现封顶费率",    cond: "最低低至 0.05%" },
    { amount: "0",      name: "汇损",            cond: "实时锁汇" },
    { amount: "秒级",   name: "极速到账",        cond: "境内最快秒级到账" },
    { amount: "7×24",   name: "全时段交易",      cond: "节假日照常" },
  ],
  qa: [],
  phoneSteps: 3,
  phoneStepLabels: [],
  titleText: {
    title: "腾讯官方出品 · [银行级合规]",  // 支持 [...] 高亮
    iconStats: [
      { icon: "time",        num: "近 20 年", label: "支付行业经验" },
      { icon: "certificate", num: "3 地",    label: "合规牌照齐全" },
      { icon: "earth",       num: "60+",     label: "国家与地区" },
    ],
    note: "内地 / 香港 / 新加坡 三地牌照　·　花旗 / 摩根大通 / 德意志银行 战略合作",
  },
  whiteCards: [
    { style: "icon", icon: "wallet", main: "跨境收款", sub: "[1 分钟开店]，对接全球主流电商平台",
      logos: [
        { name: "Amazon",      src: "" },
        { name: "Shopify",     src: "" },
        { name: "TikTok Shop", src: "" },
        { name: "Shopee",      src: "" },
        { name: "Lazada",      src: "" },
        { name: "eBay",        src: "" },
      ]
    },
    { style: "icon", icon: "swap",   main: "实时汇兑", sub: "银行间汇率，[所见即所得]，0 汇损 · 秒级到账", logos: [] },
    { style: "icon", icon: "earth",  main: "全球付款", sub: "供应商付款 · 多国 VAT 缴税（[0 手续费]）", logos: [] },
    { style: "icon", icon: "gift",   main: "新客注册即享", sub: "手续费全免 · [100 万免费额度] · 绑店送好礼", logos: [] },
  ],
  footerForm: "info",
  qrCodeDataUrl: null,
  qrTitle: "",
  qrManagerName: "",
  qrNote: "",
  platforms: [],
  footerName: "",
  footerPhone: "global.tenpay.com　·　400-624-1888",
  footerCopy: "客服在线 9:00–21:00",
  rulesText: $("#rulesText") ? $("#rulesText").value : "",
};

// ============================================================
// 渲染
// ============================================================
function render() {
  applyHeaderBgConstraint();
  renderCanvas();
  renderHeader();
  renderModules();
  renderCoupons();
  renderQA();
  renderPhoneFlow();
  renderRules();
  renderFooter();
  renderTdIcons();    // 加载 TDesign 图标（白底卡片等）
  renderLocalIcons(); // 加载本地图标（Logo PNG 等）
  // 同步外层 wrap 高度（让缩放后画布占据正确的滚动空间）
  syncCanvasWrapHeight();
}

// 缩放后画布在 layout 上仍占原高度，wrap 需要用 JS 同步真实高度
function syncCanvasWrapHeight() {
  requestAnimationFrame(() => {
    const wrap = document.querySelector(".h5-canvas-wrap");
    const canvas = document.getElementById("h5Canvas");
    if (!wrap || !canvas) return;
    const h = canvas.offsetHeight * 0.5; // scale(0.5)
    wrap.style.height = h + "px";
  });
}
// 观察画布内容变化触发同步
if (typeof ResizeObserver !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("h5Canvas");
    if (!canvas) return;
    const ro = new ResizeObserver(syncCanvasWrapHeight);
    ro.observe(canvas);
  });
}

/**
 * 形态 A（全幅 banner）只能搭配浅色页面底色
 * 自动锁定 bg=solid，并禁用 bg 选择器
 */
function applyHeaderBgConstraint() {
  const bgSelect = $("#bgSelect");
  if (!bgSelect) return;
  if (state.header.form === "image") {
    state.bg = "solid";
    bgSelect.value = "solid";
    bgSelect.disabled = true;
    bgSelect.title = "形态 A（全幅 banner 图）仅支持浅色底";
  } else {
    bgSelect.disabled = false;
    bgSelect.title = "";
  }

  // 联动 Header 形态 → 显隐 Banner / 插图 上传栏
  const bannerRow = $("#ctrlBannerRow");
  const illuRow = $("#ctrlIlluRow");
  const logoInvertRow = $("#ctrlLogoInvertRow");
  if (bannerRow) {
    bannerRow.style.display = state.header.form === "image" ? "" : "none";
  }
  if (illuRow) {
    // 仅形态 B（solid） 显示插图；text-only 不需要插图
    illuRow.style.display = state.header.form === "solid" ? "" : "none";
  }
  if (logoInvertRow) {
    // 仅形态 A（image）显示 Logo 反白手动开关
    logoInvertRow.style.display = state.header.form === "image" ? "" : "none";
  }
}

// 把 hex 颜色解析为 [r,g,b]，失败返回 null
function hexToRgb(hex) {
  if (!hex) return null;
  const m = hex.replace("#", "").match(/^([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// hex + alpha → rgba 字符串
function rgbaFromHex(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

// 通用：接受 hex（"#FFCF00"）或 rgb 字符串（"rgb(120, 95, 0)"），返回 rgba(..., alpha)
function colorWithAlpha(color, alpha) {
  if (!color) return color;
  // hex
  if (color.startsWith("#")) return rgbaFromHex(color, alpha);
  // rgb(...) / rgba(...)
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  return color;
}

function renderCanvas() {
  const c = $("#h5Canvas");
  c.dataset.theme = state.theme;
  c.dataset.bg = state.bg;

  // 渐变主色联动：银行选择 → 自动设定渐变主色
  // bankColor !== auto 时，gradientColor 由银行表驱动
  const bankKey = state.bankColor;
  if (bankKey && bankKey !== "auto" && bankKey !== "custom") {
    const bankInfo = BANK_COLORS[bankKey];
    if (bankInfo && bankInfo.color && state.gradientColor !== bankInfo.color) {
      state.gradientColor = bankInfo.color;
    }
  } else if (bankKey === "custom" && state.bankCustomColor) {
    state.gradientColor = state.bankCustomColor;
  }

  // 自定义品牌色：只要用户选了非 auto 色（来自渐变色块/银行/自定义输入），
  // 就在任意 bg 模式下覆盖整套 brand 变量（高亮/Tag/icon/优惠券/coupon/icon-stats 等）
  // 渐变专属变量（--gradient-color、--brand-30、--brand-0）仅在 bg=gradient 时设置
  const hasCustomBrand = state.gradientColor && state.gradientColor !== "auto";
  const isGradientBg = state.bg === "gradient";
  if (hasCustomBrand) {
    const hex = state.gradientColor;
    c.style.setProperty("--brand", hex);
    c.style.setProperty("--brand-light", rgbaFromHex(hex, 0.5));
    c.style.setProperty("--brand-soft", rgbaFromHex(hex, 0.08));
    c.style.setProperty("--brand-16", rgbaFromHex(hex, 0.16));
    c.style.setProperty("--brand-18", rgbaFromHex(hex, 0.18));
    c.style.setProperty("--brand-32", rgbaFromHex(hex, 0.32));
    c.style.setProperty("--brand-20", rgbaFromHex(hex, 0.20));
    // 图标圆角矩形弱底：黄/橙系用 20%（亮色需要更明显），其他色相用 12%（避免过重）
    const iconBgAlpha = getIconBgAlpha(hex);
    c.style.setProperty("--brand-icon-bg", rgbaFromHex(hex, iconBgAlpha));
    c.dataset.gc = hex;

    // 渐变专属变量：仅在 gradient 底色模式下生效；solid 模式下移除避免干扰
    if (isGradientBg) {
      c.style.setProperty("--gradient-color", hex);
      c.style.setProperty("--brand-30", rgbaFromHex(hex, 0.30));
      c.style.setProperty("--brand-50", rgbaFromHex(hex, 0.50));
      c.style.setProperty("--brand-70", rgbaFromHex(hex, 0.70));
      c.style.setProperty("--brand-0",  rgbaFromHex(hex, 0));
      // 渐变顶部色：黄/橙色相用 70%（深一点才看得见），
      // 其他色相（蓝/绿/红/紫等）用 40%（避免顶部太重）
      const topAlpha = getGradientTopAlpha(hex);
      c.style.setProperty("--brand-top", rgbaFromHex(hex, topAlpha));
    } else {
      c.style.removeProperty("--gradient-color");
      c.style.removeProperty("--brand-30");
      c.style.removeProperty("--brand-50");
      c.style.removeProperty("--brand-70");
      c.style.removeProperty("--brand-0");
      c.style.removeProperty("--brand-top");
    }

    // ===== --brand-text 智能可读色 =====
    // 原则：所有"作文字色 / 线性图标 stroke"的高亮场景都用 --brand-text，
    //       它的色调与品牌色保持一致，但当品牌色亮到在白底上对比度 < 4.5:1（WCAG AA）
    //       时，自动按相同色相递减亮度直到达标。
    // 覆盖：黄(#FFCF00)、橙(#FA9116)、淡绿(#0CBD6A)、其它任何亮色
    const brandText = computeBrandText(hex);
    c.style.setProperty("--brand-text", brandText);
    // brand-text-16：同色系深色的 16% 透明版，用于图标圆角矩形弱底
    c.style.setProperty("--brand-text-16", colorWithAlpha(brandText, 0.16));
  } else {
    c.style.removeProperty("--gradient-color");
    c.style.removeProperty("--brand");
    c.style.removeProperty("--brand-text");
    c.style.removeProperty("--brand-text-16");
    c.style.removeProperty("--brand-light");
    c.style.removeProperty("--brand-soft");
    c.style.removeProperty("--brand-16");
    c.style.removeProperty("--brand-18");
    c.style.removeProperty("--brand-32");
    c.style.removeProperty("--brand-20");
    c.style.removeProperty("--brand-icon-bg");
    c.style.removeProperty("--brand-30");
    c.style.removeProperty("--brand-50");
    c.style.removeProperty("--brand-70");
    c.style.removeProperty("--brand-0");
    c.style.removeProperty("--brand-top");
    delete c.dataset.gc;
  }

  // 联动：仅渐变底时显示色块行
  const gcRow = $("#ctrlGradientColorRow");
  if (gcRow) gcRow.style.display = state.bg === "gradient" ? "" : "none";
  // 同步色块选中态
  $$("#gradientSwatches .gs-item").forEach(btn => {
    btn.setAttribute("aria-pressed", btn.dataset.gc === state.gradientColor ? "true" : "false");
  });
}

function renderHeader() {
  const h = $("#h5Header");
  const form = state.header.form === "text-only" ? "solid" : state.header.form;
  h.dataset.form = form;
  h.dataset.align = state.header.align;

  $("#headerTitle").innerHTML = highlightText(state.header.title);
  $("#headerSub").textContent = state.header.sub;
  $("#headerSub").style.display = state.header.showTag ? "none" : "";
  const tagEl = $("#headerTag");
  tagEl.hidden = !state.header.showTag;
  tagEl.textContent = state.header.tag;
  tagEl.dataset.invert = state.header.tagInvert ? "1" : "0";

  // 插图：仅 solid 形态（带插图）时显示；text-only 和 image 形态都不显示
  const illu = $("#headerIllu");
  illu.hidden = state.header.form !== "solid";
  if (state.header.illuDataUrl) {
    illu.dataset.hasImg = "1";
    illu.innerHTML = `<img src="${state.header.illuDataUrl}" alt="illustration" />`;
  } else {
    delete illu.dataset.hasImg;
    illu.innerHTML = "";
  }

  // Banner 图（形态 A，作为画布全局背景）
  const banner = $("#headerBannerImg");
  const fade = $("#headerFade");
  if (state.header.form === "image" && state.header.bannerDataUrl) {
    banner.src = state.header.bannerDataUrl;
    banner.hidden = false;
    if (fade) fade.hidden = false;
    // banner 加载后，根据真实尺寸动态设置 fade 高度（与 banner 等高）+ 渐隐分布
    banner.onload = () => {
      if (!fade) return;
      // banner 按 750 宽展示，等比换算真实展示高度
      const displayH = banner.naturalHeight * (750 / banner.naturalWidth);
      fade.style.height = `${displayH}px`;
      // 顶部 60% 完全透明（banner 完整可见），60%-100% 渐隐到页面底色
      fade.style.background = `linear-gradient(180deg,
        rgba(244,244,246,0) 0%,
        rgba(244,244,246,0) 60%,
        var(--color-bg-page) 100%)`;
    };
    // 若 src 已缓存（onload 不再触发），手动调用一次
    if (banner.complete && banner.naturalWidth) banner.onload();
  } else {
    banner.hidden = true;
    banner.removeAttribute("src");
    if (fade) fade.hidden = true;
  }

  // Logo 图（异步加载内联 SVG，支持反白）
  renderLogo();
}

// 渐变背景顶部的品牌色透明度（与 CSS 中保持一致）
// 黄/橙色相：0.70（亮色需深一点才看得见）
// 其他色相（蓝/绿/红/紫等）：0.40（避免顶部太厚重）
const GRADIENT_TOP_OPACITY_YELLOW = 0.70;
const GRADIENT_TOP_OPACITY_OTHER  = 0.40;
function getGradientTopAlphaFromRgb(r, g, b) {
  const hsl = rgbToHsl(r, g, b);
  return isYellowOrangeHue(hsl[0]) ? GRADIENT_TOP_OPACITY_YELLOW : GRADIENT_TOP_OPACITY_OTHER;
}
function getGradientTopAlpha(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return GRADIENT_TOP_OPACITY_OTHER;
  return getGradientTopAlphaFromRgb(rgb[0], rgb[1], rgb[2]);
}

// 图标圆角矩形弱底透明度（与 CSS 默认保持一致）
// 黄/橙色相：0.20（亮色需要更明显的底）
// 其他色相（蓝/绿/红/紫等）：0.12（避免过重）
const ICON_BG_OPACITY_YELLOW = 0.20;
const ICON_BG_OPACITY_OTHER  = 0.12;
function getIconBgAlpha(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return ICON_BG_OPACITY_OTHER;
  const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  return isYellowOrangeHue(hsl[0]) ? ICON_BG_OPACITY_YELLOW : ICON_BG_OPACITY_OTHER;
}

// ============================================================
// Logo 反白判断：基于 logo 实际落点的背景亮度
// ============================================================
// WCAG 相对亮度公式：返回 0~1，0=纯黑 1=纯白
// 阈值 0.5：< 0.5 视为深底（反白），≥ 0.5 视为浅底（彩色）
const LUMINANCE_THRESHOLD = 0.35;

function relativeLuminance(r, g, b) {
  const f = c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// ============================================================
// computeBrandText：基于 WCAG 对比度 + 同色相迭代加深
// 输入品牌色 hex，返回可在白底（卡片底色）上达到 4.5:1 对比度的"同色系"颜色
//
// 核心算法：
//   1) 已达标 → 直接返回原色
//   2) 不达标 → 转 HSL，保留色相，循环降亮度 L 直到达标
//   3) 黄/橙色系特殊（H ∈ [25°, 70°]）：降亮度同时同步降饱和度
//      原因：纯黄/纯橙在大字号上呈"老油漆黄"廉价感；
//            降饱和后变成"高级金"（如 #FFCF00 → 古铜金 #B5862F）
// ============================================================
const BRAND_TEXT_BG = [255, 255, 255];  // 文字承载底色：白底卡片
const BRAND_TEXT_MIN_CONTRAST = 4.5;     // WCAG AA 正文标准

// 判断色相是否落在"黄/橙系"区间（HSL.h 单位 0~1，对应 0°~360°）
// 黄系 H≈49°/360°≈0.136；橙系 H≈30°/360°≈0.083；金/橙红 H≈40°
// 区间 [25°, 70°] → [0.069, 0.194]
function isYellowOrangeHue(h) {
  return h >= 25 / 360 && h <= 70 / 360;
}

function computeBrandText(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  // 1) 先算原色对比度，达标就直接用
  const bgLum = relativeLuminance(...BRAND_TEXT_BG);
  const curLum = relativeLuminance(...rgb);
  const ratio = (Math.max(bgLum, curLum) + 0.05) / (Math.min(bgLum, curLum) + 0.05);
  if (ratio >= BRAND_TEXT_MIN_CONTRAST) return hex;
  // 2) 不达标 → 转 HSL，保留色相，逐步降亮度直到达标
  const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  const isYellow = isYellowOrangeHue(hsl[0]);
  let l = hsl[2];
  let s = hsl[1];
  while (l > 0.05) {
    l -= 0.05;
    // 黄/橙色系：每降 5% 亮度，同步降 3% 饱和度（下限 50%），模拟"高级金"
    if (isYellow) {
      s = Math.max(0.50, s - 0.03);
    }
    const [r, g, b] = hslToRgb(hsl[0], s, l);
    const lum = relativeLuminance(r, g, b);
    const r2 = (Math.max(bgLum, lum) + 0.05) / (Math.min(bgLum, lum) + 0.05);
    if (r2 >= BRAND_TEXT_MIN_CONTRAST) {
      return `rgb(${r},${g},${b})`;
    }
  }
  // 3) 极端兜底
  const dr = Math.round(rgb[0] * 0.20);
  const dg = Math.round(rgb[1] * 0.20);
  const db = Math.round(rgb[2] * 0.20);
  return `rgb(${dr},${dg},${db})`;
}

// RGB ↔ HSL 互转（保留色相、调整亮度用）
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// 解析 CSS color 字符串为 [r,g,b,a]
function parseRgba(str) {
  // 创建临时元素借浏览器解析
  const el = document.createElement("div");
  el.style.color = str;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  document.body.removeChild(el);
  const m = computed.match(/\d+(\.\d+)?/g);
  if (!m) return null;
  return [+m[0], +m[1], +m[2], m[3] !== undefined ? +m[3] : 1];
}

// alpha 合成到背景：上层 [r,g,b,a] over 下层 [r,g,b]
function compositeOver(top, bottomRGB) {
  const a = top[3];
  return [
    top[0] * a + bottomRGB[0] * (1 - a),
    top[1] * a + bottomRGB[1] * (1 - a),
    top[2] * a + bottomRGB[2] * (1 - a),
  ];
}

// 计算 Logo 落点（距顶 ~72px 区域）的实际背景色与亮度
function getLogoAreaLuminance() {
  // 页面底色（默认浅灰 #f4f4f6）
  const pageRGB = [244, 244, 246];

  // Header banner 图存在 → 假设 logo 区域是图片中部，无法采样图片像素（异步），
  // 但用户上传的设计稿一般顶部是深色，所以默认反白
  if (state.header.form === "image" && state.header.bannerDataUrl) {
    return 0.2; // 模拟深底
  }

  // 渐变底：计算 logo 落点（顶部 72px）的实际渐变颜色
  if (state.bg === "gradient") {
    const canvas = document.getElementById("h5Canvas");
    if (!canvas) return 0.95;
    // 优先用用户自选的渐变主色，否则用业务主题 brand
    let gradientRGB;
    if (state.gradientColor && state.gradientColor !== "auto") {
      gradientRGB = parseRgba(state.gradientColor) || [17, 193, 110];
    } else {
      const computed = getComputedStyle(canvas);
      const brandStr = computed.getPropertyValue("--brand").trim();
      gradientRGB = parseRgba(brandStr) || [17, 193, 110];
    }

    // logo 在距顶 72px 位置；渐变总高 880px → t ≈ 72/880 ≈ 0.082
    // 顶部品牌透明度按色相分流（黄橙 70% / 其他 40%），按高度线性减少到 0
    const topAlpha = getGradientTopAlphaFromRgb(gradientRGB[0], gradientRGB[1], gradientRGB[2]);
    const t = 72 / 880;
    const alphaAtLogo = topAlpha * (1 - t);
    const composited = compositeOver(
      [gradientRGB[0], gradientRGB[1], gradientRGB[2], alphaAtLogo],
      pageRGB
    );
    return relativeLuminance(...composited);
  }

  // 浅色底
  return relativeLuminance(...pageRGB);
}

// 判断当前 Header 是否需要反白 logo
function isHeaderDarkBg() {
  // 形态 A 下，由用户手动开关决定（true=反白 / false=彩色）
  if (state.header.form === "image") {
    return !!state.header.logoInvert;
  }
  // 其他形态走默认亮度判断
  const lum = getLogoAreaLuminance();
  return lum < LUMINANCE_THRESHOLD;
}

let _logoRenderToken = 0;

// 加载单个 logo 到一个临时元素（返回 HTML 片段字符串），同时返回是否被反白
async function buildLogoFragment(url, dark) {
  if (!url) return "";
  // PNG / JPG → <img>（不反白）
  if (/\.(png|jpe?g)$/i.test(url)) {
    return `<img src="${url}" alt="logo" />`;
  }
  // SVG → 内联，支持反白
  const svg = await loadSvgInline(url, dark);
  if (!svg) return "";
  // 包一层 span 便于约束尺寸
  return `<span class="logo-piece">${svg}</span>`;
}

// 主 Logo 路径（基于当前模式）
function resolveMainLogoUrl() {
  const mode = state.header.logoMode;
  if (mode === "auto") return LOGO_PRESETS.themeMap[state.theme] || null;
  if (mode === "custom") return null; // 自定义走 dataURL 分支
  if (mode === "none") return null;
  if (mode && mode.startsWith("assets/logos/")) return mode;
  return null;
}

async function renderLogo() {
  const logo = $("#headerLogo");
  const mode = state.header.logoMode;
  const layout = state.header.logoLayout || "single";
  const myToken = ++_logoRenderToken;

  // 重置
  logo.innerHTML = "";
  logo.style.backgroundImage = "";
  delete logo.dataset.hasImg;
  delete logo.dataset.invert;
  logo.style.width = "";

  // 同步 layout 给 CSS 使用（控制单/联合的高度差）
  logo.dataset.layout = layout;

  if (mode === "none") {
    logo.style.display = "none";
    return;
  }
  logo.style.display = "";

  const dark = isHeaderDarkBg();
  logo.dataset.invert = dark ? "1" : "0";

  // 处理自定义上传（仅单 Logo 模式）
  if (mode === "custom") {
    if (state.header.logoCustomDataUrl) {
      logo.innerHTML = `<img src="${state.header.logoCustomDataUrl}" alt="logo" />`;
      logo.dataset.hasImg = "1";
      logo.style.width = "auto";
    }
    return;
  }

  // 主 Logo
  const mainUrl = resolveMainLogoUrl();
  if (!mainUrl) return;

  const mainFrag = await buildLogoFragment(mainUrl, dark);
  if (myToken !== _logoRenderToken) return;

  if (layout === "single") {
    logo.innerHTML = mainFrag;
  } else {
    // 联合展示 / 品牌背书：主 Logo + 连接符 + 次 Logo
    const secondUrl = state.header.logoSecond;
    const secondFrag = await buildLogoFragment(secondUrl, dark);
    if (myToken !== _logoRenderToken) return;

    const sep = layout === "combined-x"
      ? `<span class="logo-sep-x">${closeIconSvg()}</span>`
      : `<span class="logo-sep-bar"></span>`;
    logo.innerHTML = mainFrag + sep + secondFrag;
  }

  logo.dataset.hasImg = "1";
  // 让所有内联 SVG 的尺寸由 CSS 接管（不再写 inline style，便于联合时降到 32px）
  logo.querySelectorAll("svg").forEach(svgEl => {
    if (svgEl.closest(".logo-sep-x")) {
      // 连接符 svg 标记一下，CSS 选择器排除
      svgEl.classList.add("logo-sep-svg");
      return;
    }
    svgEl.style.display = "block";
    svgEl.style.height = "";
    svgEl.style.width = "";
  });
  logo.style.width = "auto";
}

// × 连接符 SVG（24×24，currentColor）
function closeIconSvg() {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="6" y1="6" x2="18" y2="18"/>
    <line x1="18" y1="6" x2="6" y2="18"/>
  </svg>`;
}
// ============================================================
// Content 模块编排：按 state.modulesList 顺序克隆模板 → 注入 #h5Content
// 同类型多实例共享同一份 state（重复展示同份内容，便于在不同位置插入）
// ============================================================
const MODULE_TYPE_LABELS = {
  "title-text":  "标题 + 文案",
  "coupon":      "优惠券",
  "table":       "表格",
  "qa":          "QA 问答",
  "phone-flow":  "手机界面流程",
  "input":       "输入框",
  "white-cards": "白底卡片",
};

function renderContentList() {
  const container = $("#h5Content");
  const tplRoot = $("#moduleTemplates");
  if (!container || !tplRoot) return;
  container.innerHTML = "";

  state.modulesList.forEach(inst => {
    if (!inst.visible) return;
    // 找到对应类型的模板（按 data-module 匹配）
    const tplBlock = tplRoot.content.querySelector(`.content-block[data-module="${inst.type}"]`);
    if (!tplBlock) return;
    const node = tplBlock.cloneNode(true);
    node.dataset.instanceId = inst.id;
    container.appendChild(node);
    // 按类型注入数据
    fillModuleContent(node, inst.type);
  });

  // 模块异步图标（td-icon）注入完毕后刷新
  if (typeof renderTdIcons === "function") renderTdIcons();
}

// 把 state 数据填充到指定模块 DOM 块
function fillModuleContent(node, type) {
  switch (type) {
    case "title-text":   fillTitleText(node);   break;
    case "coupon":       fillCoupon(node);      break;
    case "qa":           fillQA(node);          break;
    case "phone-flow":   fillPhoneFlow(node);   break;
    case "white-cards":  fillWhiteCards(node);  break;
    case "table":        /* 静态内容，无需填充 */ break;
    case "input":        /* 静态内容，无需填充 */ break;
  }
}

function fillTitleText(node) {
  const t = state.titleText || {};
  const titleEl = node.querySelector('[data-role="title"]');
  if (titleEl) titleEl.innerHTML = highlightText(t.title || "");
  const noteEl = node.querySelector('[data-role="note"]');
  if (noteEl) noteEl.textContent = t.note || "";
  const grid = node.querySelector('[data-role="iconStats"]');
  if (grid) {
    grid.innerHTML = "";
    (t.iconStats || []).slice(0, 3).forEach(s => {
      const div = document.createElement("div");
      div.className = "icon-stat";
      div.innerHTML = `
        <div class="is-icon" data-td-icon="${escapeAttr(s.icon || "")}"></div>
        <div class="is-body">
          <div class="is-num">${escapeHtml(s.num || "")}</div>
          <div class="is-label">${escapeHtml(s.label || "")}</div>
        </div>`;
      grid.appendChild(div);
    });
  }
}

function fillCoupon(node) {
  const grid = node.querySelector('[data-role="couponGrid"]');
  if (!grid) return;
  grid.innerHTML = "";
  state.coupons.slice(0, 4).forEach(c => {
    const card = document.createElement("div");
    card.className = "coupon";
    card.innerHTML = `
      <div class="coupon-amount">${escapeHtml(c.amount)}</div>
      <div class="coupon-name">${escapeHtml(c.name)}</div>
      <div class="coupon-cond">${escapeHtml(c.cond)}</div>
    `;
    grid.appendChild(card);
  });
}

function fillQA(node) {
  const list = node.querySelector('[data-role="qaList"]');
  if (!list) return;
  list.dataset.style = state.qaStyle || "qa-chat";
  list.innerHTML = "";
  if (state.qaStyle === "default") {
    state.qa.slice(0, 4).forEach(item => {
      const wrap = document.createElement("div");
      wrap.className = "qa-default-item";
      wrap.innerHTML = `
        <div class="qa-default-q">${escapeHtml(item.q)}</div>
        <div class="qa-default-a">${escapeHtml(item.a)}</div>`;
      list.appendChild(wrap);
    });
  } else {
    state.qa.slice(0, 4).forEach(item => {
      list.appendChild(buildQAItem("q", item.q));
      list.appendChild(buildQAItem("a", item.a));
    });
  }
}

function fillPhoneFlow(node) {
  const wrap = node.querySelector('[data-role="phoneFlow"]');
  if (!wrap) return;
  wrap.innerHTML = "";
  const n = state.phoneSteps;
  if (n === 1) {
    wrap.classList.remove("phone-flow--multi");
    wrap.classList.add("phone-flow--single");
    wrap.appendChild(buildPhoneCard("single", null, state.phoneStepLabels[0] || "单页流程引导文案，最多 40 字"));
  } else {
    wrap.classList.remove("phone-flow--single");
    wrap.classList.add("phone-flow--multi");
    for (let i = 0; i < n; i++) {
      wrap.appendChild(buildPhoneCard("multi", i + 1, state.phoneStepLabels[i] || `步骤${i + 1}`));
    }
  }
}

function fillWhiteCards(node) {
  const grid = node.querySelector('[data-role="whiteCardsGrid"]');
  if (!grid) return;
  grid.innerHTML = "";
  state.whiteCards.slice(0, 4).forEach(card => {
    const isLogoGrid = card.style === "logo-grid";
    const isGift = !isLogoGrid && (card.icon === "gift" || /新客|福利|礼/.test(card.main || ""));
    const div = document.createElement("div");
    div.className = "white-card"
      + (isGift ? " white-card--gift" : "")
      + (isLogoGrid ? " white-card--logo-grid" : "");

    if (isLogoGrid) {
      // 主标题 + 副文案 + Logo 网格（自适应 1~9 个，每行 3 列，最多 3 排）
      const logos = (card.logos || []).slice(0, 9);
      const logosHtml = logos.map(lg => {
        if (lg.src) {
          return `<div class="wc-lg-cell"><img src="${escapeAttr(lg.src)}" alt="${escapeAttr(lg.name || "")}" /></div>`;
        }
        // 占位：黑色 20% 色块
        return `<div class="wc-lg-cell wc-lg-cell--placeholder" title="${escapeAttr(lg.name || "")}"></div>`;
      }).join("");
      div.innerHTML = `
        <div class="wc-body">
          <div class="wc-main">${escapeHtml(card.main || "")}</div>
          <div class="wc-sub">${highlightText(card.sub || "")}</div>
        </div>
        <div class="wc-logo-grid" data-count="${logos.length}">${logosHtml}</div>`;
    } else {
      // 默认形态：图标 + 主标题 + 副文案
      div.innerHTML = `
        <div class="wc-icon" data-td-icon="${escapeAttr(card.icon || "")}"></div>
        <div class="wc-body">
          <div class="wc-main">${escapeHtml(card.main || "")}</div>
          <div class="wc-sub">${highlightText(card.sub || "")}</div>
        </div>`;
    }
    grid.appendChild(div);
  });
}

// 兼容旧调用：renderModules / 各类 render 中"刷新预览"的部分统一走 renderContentList
function renderModules() {
  renderContentList();
}

// 白底卡片可选图标列表（中文标签 + TDesign 图标名）
const WC_ICON_OPTIONS = [
  { label: "无图标",        value: "" },
  { label: "🔒 安全锁",    value: "secured" },
  { label: "💰 折扣",      value: "discount" },
  { label: "📱 手机",       value: "mobile" },
  { label: "💳 钱包/支付",   value: "wallet" },
  { label: "⚡ 闪电/快捷",  value: "flash" },
  { label: "✓ 对勾/完成",   value: "check" },
  { label: "★ 星标/收藏",   value: "star" },
  { label: "❤ 爱心/喜爱",   value: "heart" },
  { label: "🏠 首页",       value: "home" },
  { label: "👤 用户/账号",  value: "user" },
  { label: "⚙ 设置/齿轮",   value: "setting" },
  { label: "🔔 通知/铃铛",  value: "notification" },
  { label: "ℹ 信息/说明",   value: "info-circle" },
  { label: "📊 图表/统计",  value: "chart-bar" },
  { label: "🛡 盾牌/保护",   value: "shield" },
  { label: "🎁 礼品/礼物",   value: "gift" },
  { label: "🌐 地球/全球",   value: "globe" },
  { label: "🔍 搜索/放大镜", value: "search" },
];

// 渲染白底卡片：①预览交给 renderContentList（多实例统一）+ ②编辑器（操作台 ⑧ 区）
// 数据来源：state.whiteCards = [{ style:"icon"|"logo-grid", icon, main, sub, logos:[{name,src}] }]
function renderWhiteCards() {
  // ===== 预览渲染（统一交给 renderContentList，遍历 modulesList 中所有 white-cards 实例）=====
  renderContentList();

  // ===== 编辑器渲染（⑧ 区）=====
  const editor = $("#whiteCardsEditor");
  if (!editor) return;
  const optionsHtml = WC_ICON_OPTIONS.map(opt =>
    `<option value="${escapeAttr(opt.value)}">${opt.label}</option>`
  ).join("");
  editor.innerHTML = "";
  state.whiteCards.forEach((card, i) => {
    const style = card.style === "logo-grid" ? "logo-grid" : "icon";
    const item = document.createElement("div");
    item.className = "sub-item";
    // 头部 + 样式切换
    let html = `
      <div style="display:flex;align-items:center;">
        <strong>卡片 ${i + 1}</strong>
        <button class="sub-del" data-del="${i}">删除</button>
      </div>
      <div class="sub-row">
        <label>样式</label>
        <select data-i="${i}" data-k="style">
          <option value="icon"${style === "icon" ? " selected" : ""}>图标卡片</option>
          <option value="logo-grid"${style === "logo-grid" ? " selected" : ""}>Logo 网格</option>
        </select>
      </div>`;
    // 图标卡片才显示图标选择
    if (style === "icon") {
      html += `
      <div class="sub-row">
        <label>图标</label>
        <select data-i="${i}" data-k="icon">${optionsHtml}</select>
      </div>`;
    }
    html += `
      <div class="sub-row"><label>主标题</label><input type="text" data-i="${i}" data-k="main" value="${escapeAttr(card.main || "")}" /></div>
      <div class="sub-row"><label>副文案</label><input type="text" data-i="${i}" data-k="sub" value="${escapeAttr(card.sub || "")}" /></div>`;
    // logo-grid 模式：显示 Logo 子项编辑（增删）
    if (style === "logo-grid") {
      const logos = card.logos || [];
      const logosHtml = logos.map((lg, j) => `
        <div class="sub-logo-row">
          <input type="text" placeholder="名称（如 Amazon）" data-i="${i}" data-lg-j="${j}" data-lg-k="name" value="${escapeAttr(lg.name || "")}" />
          <input type="text" placeholder="图片 URL（留空显示占位）" data-i="${i}" data-lg-j="${j}" data-lg-k="src" value="${escapeAttr(lg.src || "")}" />
          <button class="sub-del-mini" data-del-lg="${i}-${j}" title="删除">×</button>
        </div>
      `).join("");
      html += `
        <div class="sub-row" style="display:block;margin-top:8px;">
          <label style="width:auto;color:rgba(255,255,255,0.5);font-size:11px;">Logo 列表（${logos.length}/9，每行 3 个，最多 3 排）</label>
          <div class="sub-logo-list" style="display:flex;flex-direction:column;gap:4px;margin-top:6px;">${logosHtml}</div>
          <button class="btn-mini" data-add-lg="${i}" style="margin-top:6px;${logos.length >= 9 ? "opacity:0.4;pointer-events:none;" : ""}">+ 添加 Logo</button>
        </div>`;
    }
    item.innerHTML = html;
    if (style === "icon") {
      const sel = item.querySelector('select[data-k="icon"]');
      if (sel) sel.value = card.icon || "";
    }
    editor.appendChild(item);
  });
}

// 兼容旧调用名（其它地方引用了 renderWcIconEditor）
const renderWcIconEditor = renderWhiteCards;

// 仅刷新预览（输入时调用，避免编辑器 DOM 重建导致输入框失焦）
function renderTitleTextView() {
  // 多实例统一刷新
  renderContentList();
}

// 全量渲染：预览 + 编辑器（首次或结构变化时调用）
function renderTitleText() {
  renderTitleTextView();

  // ===== 编辑器 ④ =====
  const titleInput = $("#ctrlTitleTextTitle");
  if (titleInput && titleInput.value !== (state.titleText.title || "")) titleInput.value = state.titleText.title || "";
  const noteInput = $("#ctrlTitleTextNote");
  if (noteInput && noteInput.value !== (state.titleText.note || "")) noteInput.value = state.titleText.note || "";

  const editor = $("#iconStatsEditor");
  if (!editor) return;
  const optionsHtml = WC_ICON_OPTIONS.map(opt =>
    `<option value="${escapeAttr(opt.value)}">${opt.label}</option>`
  ).join("");
  editor.innerHTML = "";
  (state.titleText.iconStats || []).forEach((s, i) => {
    const item = document.createElement("div");
    item.className = "sub-item";
    item.innerHTML = `
      <div style="display:flex;align-items:center;">
        <strong>徽章 ${i + 1}</strong>
      </div>
      <div class="sub-row"><label>图标</label><select data-its-i="${i}" data-its-k="icon">${optionsHtml}</select></div>
      <div class="sub-row"><label>数字</label><input type="text" data-its-i="${i}" data-its-k="num" value="${escapeAttr(s.num || "")}" /></div>
      <div class="sub-row"><label>标签</label><input type="text" data-its-i="${i}" data-its-k="label" value="${escapeAttr(s.label || "")}" /></div>
    `;
    item.querySelector("select").value = s.icon || "";
    editor.appendChild(item);
  });
}

function renderCoupons() {
  // 预览统一交给 renderContentList（多实例）
  renderContentList();

  // 同时刷新优惠券编辑器
  const editor = $("#couponEditor");
  editor.innerHTML = "";
  state.coupons.forEach((c, i) => {
    const item = document.createElement("div");
    item.className = "sub-item";
    item.innerHTML = `
      <div style="display:flex;align-items:center;">
        <strong>优惠券 ${i + 1}</strong>
        <button class="sub-del" data-del="${i}">删除</button>
      </div>
      <div class="sub-row"><label>金额</label><input type="text" data-i="${i}" data-k="amount" value="${escapeAttr(c.amount)}" /></div>
      <div class="sub-row"><label>名称</label><input type="text" data-i="${i}" data-k="name" value="${escapeAttr(c.name)}" /></div>
      <div class="sub-row"><label>条件</label><input type="text" data-i="${i}" data-k="cond" value="${escapeAttr(c.cond)}" /></div>
    `;
    editor.appendChild(item);
  });
}

function renderQA() {
  // 预览统一交给 renderContentList（多实例）
  renderContentList();

  // 编辑器
  const editor = $("#qaEditor");
  editor.innerHTML = "";
  state.qa.forEach((item, i) => {
    const wrap = document.createElement("div");
    wrap.className = "sub-item";
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;">
        <strong>QA ${i + 1}</strong>
        <button class="sub-del" data-del-qa="${i}">删除</button>
      </div>
      <div class="sub-row"><label>问题</label><textarea data-i="${i}" data-k="q" rows="2">${escapeHtml(item.q)}</textarea></div>
      <div class="sub-row"><label>回答</label><textarea data-i="${i}" data-k="a" rows="2">${escapeHtml(item.a)}</textarea></div>
    `;
    editor.appendChild(wrap);
  });
}

function buildQAItem(type, text) {
  const div = document.createElement("div");
  div.className = `qa-item qa-item--${type}`;
  // 不再设置内联 flex 兜底——交给 CSS 控制（align-self 推到对侧）
  const avatar = type === "q"
    ? `<div class="qa-avatar">${qLogoSvg()}</div>`
    : `<div class="qa-avatar">A</div>`;
  div.innerHTML = `
    ${avatar}
    <div class="qa-bubble">
      ${escapeHtml(text)}
      ${qaTailSvg(type)}
    </div>
  `;
  return div;
}

function qLogoSvg() {
  // 微信类气泡 logo（简化版）
  return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="16" cy="18" rx="11" ry="8" fill="#fff"/>
    <ellipse cx="26" cy="22" rx="9" ry="7" fill="#fff"/>
    <circle cx="13" cy="17" r="1.5" fill="#11C16E"/>
    <circle cx="19" cy="17" r="1.5" fill="#11C16E"/>
    <path d="M9 26 L7 30 L11 28 Z" fill="#fff"/>
  </svg>`;
}

function qaTailSvg(type) {
  // 等边三角形 高 16px，顶点带 2px 圆角，颜色等于气泡背景色
  const fill = type === "q" ? "#EAEAEA" : "#FFFFFF";
  // 等边三角形：高 16，对应底边宽 ≈ 18.5
  return `<svg class="qa-tail" viewBox="0 0 16 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0 L16 18 L2 10 Q0 9 2 8 Z" fill="${fill}"/>
  </svg>`;
}

function renderPhoneFlow() {
  // 预览统一交给 renderContentList（多实例）
  renderContentList();

  // 编辑器
  const n = state.phoneSteps;
  const editor = $("#phoneFlowEditor");
  editor.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const div = document.createElement("div");
    div.className = "sub-item";
    div.innerHTML = `
      <div class="sub-row">
        <label>步骤 ${i + 1}</label>
        <input type="text" data-phone-i="${i}" value="${escapeAttr(state.phoneStepLabels[i] || "")}" maxlength="${n === 1 ? 40 : 13}" />
      </div>
    `;
    editor.appendChild(div);
  }
}

/**
 * 构建手机界面卡片（对齐 credit-card-ops flow-phone 规范）
 * 单步结构：.phone-card > .phone-phone > .phone-screen > (.phone-img + .phone-caption)
 * 多步结构：.phone-card > .phone-step-tag + .phone-phone > .phone-screen > (.phone-img + .phone-caption)
 */
function buildPhoneCard(type, stepNum, info) {
  const div = document.createElement("div");
  div.className = "phone-card";

  // 角标（仅多步）
  const stepTag = stepNum ? `<div class="phone-step-tag">${stepNum}</div>` : "";

  // 手机壳 + 屏幕 + 内容
  div.innerHTML = `
    ${stepTag}
    <div class="phone-phone">
      <div class="phone-screen">
        <div class="phone-img">界面截图</div>
      </div>
    </div>
    <p class="phone-caption--${type}">${escapeHtml(info)}</p>
  `;
  return div;
}

function renderRules() {
  const lines = state.rulesText.split(/\n/);
  const root = $("#h5Rules");
  // 保留标题
  root.innerHTML = `<h2 class="content-title">活动规则</h2><div class="rules-block" id="rulesBlock"></div>`;
  const block = $("#rulesBlock");

  let currentList = null;
  lines.forEach(raw => {
    const line = raw.trim();
    if (!line) { currentList = null; return; }

    // 二级标题：以"一、二、三、..."开头
    if (/^[一二三四五六七八九十]+、/.test(line)) {
      const h = document.createElement("div");
      h.className = "rules-h2";
      h.textContent = line;
      block.appendChild(h);
      currentList = null;
      return;
    }

    // 编号项 1. / 1、 / 1)
    const numMatch = line.match(/^(\d+)[\.、\)]\s*(.+)$/);
    if (numMatch) {
      if (!currentList) {
        currentList = document.createElement("ol");
        currentList.className = "rules-ol";
        block.appendChild(currentList);
      }
      const li = document.createElement("li");
      li.textContent = numMatch[2];
      currentList.appendChild(li);
      return;
    }

    // 普通段落
    const p = document.createElement("p");
    p.className = "rules-p";
    p.textContent = line;
    block.appendChild(p);
    currentList = null;
  });
}

function renderFooter() {
  $("#h5Footer").dataset.form = state.footerForm;

  // 通用 footer-card 内容（A 机构信息 / B 推广跳转 / C 免责声明 形态共用）
  const fcName = $("#fcName");
  const fcPhone = $("#fcPhone");
  const fcCopy = $("#fcCopy");
  if (fcName) fcName.textContent = state.footerName || "";
  if (fcPhone) fcPhone.textContent = state.footerPhone || "";
  if (fcCopy) fcCopy.textContent = state.footerCopy || "";

  // QR 形态：渲染客户经理名 + 二维码 + 平台 chips
  if (state.footerForm === "qr") {
    const titleEl = $("#qrBlockTitle");
    if (titleEl) titleEl.innerHTML = highlightText(state.qrTitle || "扫码联系 / 专属客户经理");

    const noteEls = document.querySelectorAll(".qr-block-note");
    noteEls.forEach(el => el.textContent = state.qrNote || "");

    const nameEl = $("#qrManagerNameSlot");
    if (nameEl) nameEl.textContent = state.qrManagerName || "客户经理";

    const qrBox = $("#qrBox");
    if (qrBox) {
      if (state.qrCodeDataUrl) {
        qrBox.innerHTML = `<img src="${state.qrCodeDataUrl}" alt="qr" />`;
        qrBox.dataset.hasImg = "1";
      } else {
        qrBox.innerHTML = `<span class="qr-placeholder">请上传<br>二维码</span>`;
        delete qrBox.dataset.hasImg;
      }
    }

    const chips = $("#platformLogos");
    if (chips) {
      chips.innerHTML = state.platforms
        .map(p => `<span class="platform-chip">${escapeHtml(p)}</span>`)
        .join("");
    }
  }
}

// ============================================================
// 工具
// ============================================================
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s) { return escapeHtml(s); }

function highlightText(s) {
  // 处理顺序：先 / → <br/>，再 [...] → <span>，否则 </span> 中的 / 会被误匹配换行
  // 1. 转义 HTML
  // 2. /  → 换行（用户手动控制）
  // 3. [xxx] → 高亮（品牌色）
  return escapeHtml(s)
    .replace(/\s*\/\s*/g, '<br/>')
    .replace(/\[([^\]]+)\]/g, '<span class="hl">$1</span>');
}

// ============================================================
// 事件绑定
// ============================================================
function bindFileUpload(inputId, clearId, stateKey) {
  const input = $(`#${inputId}`);
  const clear = $(`#${clearId}`);
  if (!input) return;
  input.addEventListener("change", e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      state.header[stateKey] = ev.target.result;
      renderHeader();
    };
    reader.readAsDataURL(file);
  });
  if (clear) {
    clear.addEventListener("click", () => {
      state.header[stateKey] = null;
      input.value = "";
      renderHeader();
    });
  }
}

function bindEvents() {
  // 主题
  $("#themeSelect").value = state.theme;
  $("#themeSelect").addEventListener("change", e => {
    state.theme = e.target.value;
    // 切主题时重置渐变主色为"跟随主题"
    state.gradientColor = "auto";
    renderCanvas();
    renderLogo(); // 主题变 → logo 跟随
  });

  $("#bgSelect").value = state.bg;
  $("#bgSelect").addEventListener("change", e => {
    state.bg = e.target.value;
    renderCanvas();
    renderLogo(); // 底色变 → logo 反白判断变
  });

  // 渐变主色色块
  const gradientSwatches = $("#gradientSwatches");
  if (gradientSwatches) {
    gradientSwatches.addEventListener("click", e => {
      const btn = e.target.closest(".gs-item");
      if (!btn) return;
      state.gradientColor = btn.dataset.gc;
      // 手动选色时，银行选择器切换到"自定义"
      state.bankColor = "custom";
      const bankSel = $("#bankColorSelect");
      if (bankSel) bankSel.value = "custom";
      const customRow = $("#bankCustomColorRow");
      if (customRow) customRow.style.display = "";
      renderCanvas();
      renderLogo(); // 渐变色变 → logo 反白判断变
    });
  }

  // 银行高亮色选择器
  const bankSel = $("#bankColorSelect");
  const bankCustomRow = $("#bankCustomColorRow");
  if (bankSel) {
    bankSel.value = state.bankColor || "auto";
    if (bankCustomRow) bankCustomRow.style.display = state.bankColor === "custom" ? "" : "none";
    bankSel.addEventListener("change", e => {
      state.bankColor = e.target.value;
      if (bankCustomRow) bankCustomRow.style.display = e.target.value === "custom" ? "" : "none";
      if (e.target.value === "auto") {
        state.gradientColor = "auto";
      } else if (e.target.value === "custom") {
        // 自定义：用 bankCustomColor 或保持当前
        if (state.bankCustomColor) state.gradientColor = state.bankCustomColor;
      } else {
        const bankInfo = BANK_COLORS[e.target.value];
        if (bankInfo && bankInfo.color) state.gradientColor = bankInfo.color;
      }
      renderCanvas();
      renderLogo();
    });
  }
  // 自定义银行颜色输入
  const bankCustomInput = $("#bankCustomColorInput");
  if (bankCustomInput) {
    bankCustomInput.value = state.bankCustomColor || "";
    bankCustomInput.addEventListener("input", e => {
      state.bankCustomColor = e.target.value;
      if (state.bankColor === "custom" && state.bankCustomColor) {
        state.gradientColor = state.bankCustomColor;
        renderCanvas();
        renderLogo();
      }
    });
  }

  // QA 样式切换
  const qaStyleSel = $("#qaStyleSelect");
  if (qaStyleSel) {
    qaStyleSel.value = state.qaStyle || "qa-chat";
    qaStyleSel.addEventListener("change", e => {
      state.qaStyle = e.target.value;
      renderQA();
    });
  }

  // Header
  $("#headerForm").value = state.header.form;
  $("#headerForm").addEventListener("change", e => {
    state.header.form = e.target.value;
    applyHeaderBgConstraint();
    renderCanvas();
    renderHeader();
  });
  $("#ctrlTitle").value = state.header.title;
  $("#ctrlTitle").addEventListener("input", e => { state.header.title = e.target.value; renderHeader(); });
  $("#ctrlSub").value = state.header.sub;
  $("#ctrlSub").addEventListener("input", e => { state.header.sub = e.target.value; renderHeader(); });
  $("#ctrlShowTag").checked = state.header.showTag;
  $("#ctrlShowTag").addEventListener("change", e => { state.header.showTag = e.target.checked; renderHeader(); });
  $("#ctrlTag").value = state.header.tag;
  $("#ctrlTag").addEventListener("input", e => { state.header.tag = e.target.value; renderHeader(); });
  $("#ctrlTagInvert").checked = !!state.header.tagInvert;
  $("#ctrlTagInvert").addEventListener("change", e => { state.header.tagInvert = e.target.checked; renderHeader(); });
  $("#ctrlHeaderAlign").value = state.header.align;
  $("#ctrlHeaderAlign").addEventListener("change", e => { state.header.align = e.target.value; renderHeader(); });

  // 图片上传：Banner / 插图
  bindFileUpload("ctrlBannerFile", "ctrlBannerClear", "bannerDataUrl");
  bindFileUpload("ctrlIlluFile",   "ctrlIlluClear",   "illuDataUrl");

  // Logo 反白开关（仅形态 A 显示）
  const logoInvertCb = $("#ctrlLogoInvert");
  if (logoInvertCb) {
    logoInvertCb.checked = !!state.header.logoInvert;
    logoInvertCb.addEventListener("change", e => {
      state.header.logoInvert = e.target.checked;
      renderHeader();
    });
  }

  // Logo 选择（下拉 + 自定义上传）
  const logoSelect = $("#ctrlLogoSelect");
  const logoCustomRow = $("#ctrlLogoCustomRow");
  logoSelect.value = state.header.logoMode;
  logoCustomRow.style.display = state.header.logoMode === "custom" ? "" : "none";
  logoSelect.addEventListener("change", e => {
    state.header.logoMode = e.target.value;
    logoCustomRow.style.display = e.target.value === "custom" ? "" : "none";
    renderLogo();
  });
  $("#ctrlLogoFile").addEventListener("change", e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      state.header.logoCustomDataUrl = ev.target.result;
      renderLogo();
    };
    reader.readAsDataURL(file);
  });
  $("#ctrlLogoClear").addEventListener("click", () => {
    state.header.logoCustomDataUrl = null;
    $("#ctrlLogoFile").value = "";
    renderLogo();
  });

  // Logo 样式（单 / 联合 X / 品牌背书 ｜）
  const logoLayoutSel = $("#ctrlLogoLayout");
  const logo2Row = $("#ctrlLogo2Row");
  const logo2Sel = $("#ctrlLogo2Select");
  const logoLabel = $("#ctrlLogoLabel");

  function applyLogoLayoutUI() {
    const layout = state.header.logoLayout || "single";
    logoLayoutSel.value = layout;
    const isPair = layout !== "single";
    logo2Row.style.display = isPair ? "" : "none";
    // 联合/背书时把"Logo 图"改称"主 Logo"提示用户
    if (logoLabel) logoLabel.textContent = isPair ? "主 Logo" : "Logo 图";
  }
  applyLogoLayoutUI();

  logoLayoutSel.addEventListener("change", e => {
    state.header.logoLayout = e.target.value;
    applyLogoLayoutUI();
    renderLogo();
  });
  if (logo2Sel) {
    if (state.header.logoSecond) logo2Sel.value = state.header.logoSecond;
    logo2Sel.addEventListener("change", e => {
      state.header.logoSecond = e.target.value;
      renderLogo();
    });
  }

  // ===========================================================
  // ③ Content 模块编排：拖拽排序 + 显隐 + 添加/删除（多实例共享 state）
  // ===========================================================
  // 模块类型 → 对应操作面板 fieldset 选择器
  const MOD_TO_PANEL = {
    "title-text":  "#ctrlTitleTextFieldset", // ④ 标题 + 文案
    "coupon":      "#ctrlCouponFieldset",     // ⑤ 优惠券
    "qa":          "#ctrlQAFieldset",         // ⑥ QA 问答
    "phone-flow":  "#ctrlPhoneFlowFieldset",  // ⑦ 手机界面流程
    "white-cards": "#ctrlWhiteCardsFieldset", // ⑧ 白底卡片
  };

  // 同步操作面板 fieldset 显隐：
  // 只要 modulesList 中存在该 type 的可见实例（visible=true），就显示对应 fieldset；否则隐藏
  function syncAllControlPanels() {
    Object.keys(MOD_TO_PANEL).forEach(type => {
      const el = $(MOD_TO_PANEL[type]);
      if (!el) return;
      const exists = state.modulesList.some(m => m.type === type && m.visible);
      el.style.display = exists ? "" : "none";
    });
  }

  function uidGen(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 8);
  }

  // 渲染 ③ 操作面板的模块编排列表
  function renderModuleList() {
    const list = $("#moduleList");
    if (!list) return;
    list.innerHTML = "";
    state.modulesList.forEach((inst, idx) => {
      const li = document.createElement("li");
      li.className = "module-item";
      li.draggable = true;
      li.dataset.id = inst.id;
      li.dataset.idx = String(idx);
      li.innerHTML = `
        <span class="mi-drag" title="拖拽排序">⋮⋮</span>
        <span class="mi-index">${idx + 1}</span>
        <span class="mi-name">${MODULE_TYPE_LABELS[inst.type] || inst.type}</span>
        <label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--dark-ui-64);">
          <input type="checkbox" class="mi-vis" ${inst.visible ? "checked" : ""} />
          显示
        </label>
        <button class="mi-del" title="删除" data-del-id="${inst.id}">×</button>
      `;
      list.appendChild(li);
    });
    bindModuleListDnD();
  }

  // 拖拽排序（HTML5 drag/drop）
  function bindModuleListDnD() {
    const list = $("#moduleList");
    if (!list) return;
    let draggingEl = null;

    list.querySelectorAll(".module-item").forEach(item => {
      item.addEventListener("dragstart", e => {
        draggingEl = item;
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", item.dataset.id); } catch (_) {}
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        list.querySelectorAll(".module-item").forEach(el => {
          el.classList.remove("drop-before", "drop-after");
        });
        draggingEl = null;
      });
      item.addEventListener("dragover", e => {
        e.preventDefault();
        if (!draggingEl || draggingEl === item) return;
        const rect = item.getBoundingClientRect();
        const isAfter = (e.clientY - rect.top) > rect.height / 2;
        item.classList.toggle("drop-before", !isAfter);
        item.classList.toggle("drop-after",  isAfter);
      });
      item.addEventListener("dragleave", () => {
        item.classList.remove("drop-before", "drop-after");
      });
      item.addEventListener("drop", e => {
        e.preventDefault();
        if (!draggingEl || draggingEl === item) return;
        const fromId = draggingEl.dataset.id;
        const toId   = item.dataset.id;
        const rect = item.getBoundingClientRect();
        const isAfter = (e.clientY - rect.top) > rect.height / 2;
        const fromIdx = state.modulesList.findIndex(m => m.id === fromId);
        let   toIdx   = state.modulesList.findIndex(m => m.id === toId);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = state.modulesList.splice(fromIdx, 1);
        // 重算 toIdx：删除 fromIdx 后，若 toIdx > fromIdx 需要 -1
        if (toIdx > fromIdx) toIdx -= 1;
        const insertIdx = isAfter ? toIdx + 1 : toIdx;
        state.modulesList.splice(insertIdx, 0, moved);
        renderModuleList();
        renderContentList();
      });
    });
  }

  // 初始化 ③：渲染列表 + 同步操作面板
  renderModuleList();
  syncAllControlPanels();

  // 显隐勾选
  $("#moduleList")?.addEventListener("change", e => {
    if (!e.target.classList.contains("mi-vis")) return;
    const li = e.target.closest(".module-item");
    if (!li) return;
    const inst = state.modulesList.find(m => m.id === li.dataset.id);
    if (!inst) return;
    inst.visible = e.target.checked;
    renderContentList();
    syncAllControlPanels();
  });

  // 删除按钮
  $("#moduleList")?.addEventListener("click", e => {
    const btn = e.target.closest(".mi-del");
    if (!btn) return;
    const id = btn.dataset.delId;
    const idx = state.modulesList.findIndex(m => m.id === id);
    if (idx === -1) return;
    state.modulesList.splice(idx, 1);
    renderModuleList();
    renderContentList();
    syncAllControlPanels();
  });

  // 添加模块按钮
  $("#moduleAddBtn")?.addEventListener("click", () => {
    const sel = $("#moduleAddType");
    if (!sel) return;
    const type = sel.value;
    state.modulesList.push({ id: uidGen("m"), type, visible: true });
    renderModuleList();
    renderContentList();
    syncAllControlPanels();
  });

  // 标题 + 文案编辑器（④ 区）：渲染 + 双向绑定
  renderTitleText();
  $("#ctrlTitleTextTitle")?.addEventListener("input", e => {
    state.titleText.title = e.target.value;
    renderTitleTextView();
  });
  $("#ctrlTitleTextNote")?.addEventListener("input", e => {
    state.titleText.note = e.target.value;
    renderTitleTextView();
  });
  const iconStatsEditorEl = $("#iconStatsEditor");
  if (iconStatsEditorEl) {
    iconStatsEditorEl.addEventListener("input", e => {
      const i = e.target.dataset.itsI, k = e.target.dataset.itsK;
      if (i != null && k && k !== "icon") {
        state.titleText.iconStats[+i][k] = e.target.value;
        renderTitleTextView();
      }
    });
    iconStatsEditorEl.addEventListener("change", e => {
      const i = e.target.dataset.itsI, k = e.target.dataset.itsK;
      if (i != null && k === "icon") {
        state.titleText.iconStats[+i].icon = e.target.value;
        renderTitleTextView();
      }
    });
  }

  // 白底卡片编辑器（⑧ 区）：渲染 + 双向绑定 + 添加/删除 + Logo 网格子项
  renderWhiteCards();
  const whiteCardsEditorEl = $("#whiteCardsEditor");
  if (whiteCardsEditorEl) {
    // input：主标题 / 副文案 / Logo 名称 / Logo URL
    whiteCardsEditorEl.addEventListener("input", e => {
      // Logo 子项输入（name / src）
      const lgJ = e.target.dataset.lgJ;
      const lgK = e.target.dataset.lgK;
      if (lgJ != null && lgK) {
        const i = +e.target.dataset.i;
        const card = state.whiteCards[i];
        if (!card.logos) card.logos = [];
        if (!card.logos[+lgJ]) card.logos[+lgJ] = { name: "", src: "" };
        card.logos[+lgJ][lgK] = e.target.value;
        renderContentList();
        return;
      }
      // 普通字段（main/sub）
      const i = e.target.dataset.i, k = e.target.dataset.k;
      if (i != null && k && k !== "icon" && k !== "style") {
        state.whiteCards[+i][k] = e.target.value;
        renderContentList();
      }
    });
    // change：图标下拉 / 样式下拉
    whiteCardsEditorEl.addEventListener("change", e => {
      const i = e.target.dataset.i, k = e.target.dataset.k;
      if (i == null) return;
      if (k === "icon") {
        state.whiteCards[+i].icon = e.target.value;
        renderContentList();
      } else if (k === "style") {
        state.whiteCards[+i].style = e.target.value;
        // 切到 logo-grid 时，若 logos 为空，给一个空数组（避免 undefined）
        if (e.target.value === "logo-grid" && !state.whiteCards[+i].logos) {
          state.whiteCards[+i].logos = [];
        }
        renderWhiteCards(); // 全量重渲染（编辑器结构变化）
      }
    });
    // click：删除卡片 / 删除 Logo / 添加 Logo
    whiteCardsEditorEl.addEventListener("click", e => {
      // 添加 Logo
      const addLg = e.target.dataset.addLg;
      if (addLg != null) {
        const i = +addLg;
        const card = state.whiteCards[i];
        if (!card.logos) card.logos = [];
        if (card.logos.length >= 9) { alert("最多 9 个 Logo（每行 3 个 × 3 排）"); return; }
        card.logos.push({ name: "", src: "" });
        renderWhiteCards();
        return;
      }
      // 删除 Logo
      const delLg = e.target.dataset.delLg;
      if (delLg != null) {
        const [i, j] = delLg.split("-").map(Number);
        state.whiteCards[i].logos.splice(j, 1);
        renderWhiteCards();
        return;
      }
      // 删除卡片
      const idx = e.target.dataset.del;
      if (idx != null) {
        state.whiteCards.splice(+idx, 1);
        renderWhiteCards();
      }
    });
  }
  $("#addWhiteCard")?.addEventListener("click", () => {
    if (state.whiteCards.length >= 4) { alert("最多 4 张白底卡片"); return; }
    state.whiteCards.push({ style: "icon", icon: "wallet", main: "新卡片", sub: "副文案描述", logos: [] });
    renderWhiteCards();
  });

  // 优惠券编辑
  $("#couponEditor").addEventListener("input", e => {
    const i = e.target.dataset.i, k = e.target.dataset.k;
    if (i != null && k) {
      state.coupons[+i][k] = e.target.value;
      renderCouponsView();
    }
  });
  $("#couponEditor").addEventListener("click", e => {
    const idx = e.target.dataset.del;
    if (idx != null) {
      state.coupons.splice(+idx, 1);
      renderCoupons();
    }
  });
  $("#addCoupon").addEventListener("click", () => {
    if (state.coupons.length >= 4) { alert("最多 4 个优惠券"); return; }
    state.coupons.push({ amount: "¥10", name: "立减券", cond: "新条件" });
    renderCoupons();
  });

  // QA 编辑
  $("#qaEditor").addEventListener("input", e => {
    const i = e.target.dataset.i, k = e.target.dataset.k;
    if (i != null && k) {
      state.qa[+i][k] = e.target.value;
      renderQA();
    }
  });
  $("#qaEditor").addEventListener("click", e => {
    const idx = e.target.dataset.delQa;
    if (idx != null) {
      state.qa.splice(+idx, 1);
      renderQA();
    }
  });
  $("#addQA").addEventListener("click", () => {
    if (state.qa.length >= 4) { alert("最多 4 组 QA"); return; }
    state.qa.push({ q: "新问题？", a: "新回答内容。" });
    renderQA();
  });

  // 手机流程
  $("#phoneSteps").value = state.phoneSteps;
  $("#phoneSteps").addEventListener("change", e => {
    state.phoneSteps = +e.target.value;
    renderPhoneFlow();
  });
  $("#phoneFlowEditor").addEventListener("input", e => {
    const i = e.target.dataset.phoneI;
    if (i != null) {
      state.phoneStepLabels[+i] = e.target.value;
      renderPhoneFlow();
    }
  });

  // Footer
  $("#footerForm").value = state.footerForm;
  $("#footerForm").addEventListener("change", e => { state.footerForm = e.target.value; renderFooter(); });

  // ---- 区域显示/隐藏联动开关 ----
  // Footer 底部卡片
  const ctrlShowFooter = $("#ctrlShowFooter");
  if (ctrlShowFooter) {
    const syncFooter = () => {
      $("#footerFormArea").style.display = ctrlShowFooter.checked ? "" : "none";
      if (!ctrlShowFooter.checked) {
        $("#h5Footer").dataset.form = "hidden";
        $("#h5Footer #footerCard")?.classList.add("hidden");
        renderFooter();
      } else {
        $("#h5Footer").dataset.form = state.footerForm;
        $("#h5Footer #footerCard")?.classList.remove("hidden");
        renderFooter();
      }
    };
    ctrlShowFooter.addEventListener("change", syncFooter);
    // 初始加载：未勾选时立即隐藏 Footer
    if (!ctrlShowFooter.checked) syncFooter();
  }

  // Content 模块（总开关：控制整个 Content 区显隐 + 操作面板编排区显隐）
  const ctrlShowContent = $("#ctrlShowContentModules");
  if (ctrlShowContent) {
    const applyContentSwitch = () => {
      $("#contentModulesArea").style.display = ctrlShowContent.checked ? "" : "none";
      const contentEl = $("#h5Content");
      if (contentEl) contentEl.style.display = ctrlShowContent.checked ? "" : "none";
      // 操作面板 ④~⑧ 子区域同步显隐：勾选时按 modulesList 决定，未勾选时全部隐藏
      if (ctrlShowContent.checked) {
        syncAllControlPanels();
      } else {
        Object.values(MOD_TO_PANEL).forEach(sel => {
          const el = $(sel);
          if (el) el.style.display = "none";
        });
      }
    };
    ctrlShowContent.addEventListener("change", applyContentSwitch);
    if (!ctrlShowContent.checked) applyContentSwitch();
  }

  // 活动规则
  const ctrlShowRules = $("#ctrlShowRules");
  if (ctrlShowRules) {
    ctrlShowRules.addEventListener("change", () => {
      $("#rulesArea").style.display = ctrlShowRules.checked ? "" : "none";
      const rulesEl = $("#h5Rules");
      if (rulesEl) rulesEl.style.display = ctrlShowRules.checked ? "" : "none";
    });
  }

  // QR 二维码上传
  if ($("#ctrlQrFile")) {
    $("#ctrlQrFile").addEventListener("change", e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        state.qrCodeDataUrl = ev.target.result;
        renderFooter();
      };
      reader.readAsDataURL(file);
    });
  }
  if ($("#ctrlQrClear")) {
    $("#ctrlQrClear").addEventListener("click", () => {
      state.qrCodeDataUrl = null;
      $("#ctrlQrFile").value = "";
      renderFooter();
    });
  }
  if ($("#ctrlQrTitle")) {
    $("#ctrlQrTitle").value = state.qrTitle;
    $("#ctrlQrTitle").addEventListener("input", e => {
      state.qrTitle = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlQrName")) {
    $("#ctrlQrName").value = state.qrManagerName;
    $("#ctrlQrName").addEventListener("input", e => {
      state.qrManagerName = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlQrNote")) {
    $("#ctrlQrNote").value = state.qrNote;
    $("#ctrlQrNote").addEventListener("input", e => {
      state.qrNote = e.target.value;
      renderFooter();
    });
  }
  if ($("#ctrlPlatforms")) {
    $("#ctrlPlatforms").value = state.platforms.join(", ");
    $("#ctrlPlatforms").addEventListener("input", e => {
      state.platforms = e.target.value.split(/[,，、]\s*/).filter(Boolean);
      renderFooter();
    });
  }

  // 规则
  $("#rulesText").addEventListener("input", e => {
    state.rulesText = e.target.value;
    renderRules();
  });

  // 导出
  $("#btnExport").addEventListener("click", exportPNG);
}

// 仅刷新优惠券预览（不刷编辑器，避免输入失焦）
function renderCouponsView() {
  const grid = $("#couponGrid");
  grid.innerHTML = "";
  state.coupons.slice(0, 4).forEach(c => {
    const card = document.createElement("div");
    card.className = "coupon";
    card.innerHTML = `
      <div class="coupon-amount">${escapeHtml(c.amount)}</div>
      <div class="coupon-name">${escapeHtml(c.name)}</div>
      <div class="coupon-cond">${escapeHtml(c.cond)}</div>
    `;
    grid.appendChild(card);
  });
}

// ============================================================
// 导出 PNG
// ============================================================
async function exportPNG() {
  const btn = $("#btnExport");
  const status = $("#exportStatus");
  const scale = +$("#exportScale").value;

  btn.disabled = true;
  status.textContent = `正在生成 ${scale}× 截图，请稍候...`;

  // 临时取消缩放，让 html2canvas 拍到原尺寸
  const canvas = $("#h5Canvas");
  const wrap = canvas.parentElement; // .h5-canvas-wrap
  const originalTransform = canvas.style.transform;
  const originalMargin = canvas.style.marginBottom;
  const originalWrapW = wrap.style.width;
  const originalWrapH = wrap.style.height;
  canvas.style.transform = "none";
  canvas.style.marginBottom = "0";
  wrap.style.width = "750px";
  wrap.style.height = "auto";

  try {
    const result = await html2canvas(canvas, {
      scale: scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: false,
      imageTimeout: 0,
      width: 750,
      windowWidth: 750,
      onclone: (clonedDoc) => {
        // 字体抗锯齿增强
        const clonedCanvas = clonedDoc.getElementById("h5Canvas");
        if (clonedCanvas) {
          clonedCanvas.style.webkitFontSmoothing = "antialiased";
          clonedCanvas.style.textRendering = "geometricPrecision";
        }
      },
    });

    const dataUrl = result.toDataURL("image/png");
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.download = `H5预览_${state.theme}_${scale}x_${ts}.png`;
    a.href = dataUrl;
    a.click();

    status.textContent = `✓ 导出完成（${scale}× ${result.width}×${result.height}px）`;
  } catch (err) {
    console.error(err);
    status.textContent = "✗ 导出失败：" + err.message;
  } finally {
    canvas.style.transform = originalTransform;
    canvas.style.marginBottom = originalMargin;
    wrap.style.width = originalWrapW;
    wrap.style.height = originalWrapH;
    syncCanvasWrapHeight();
    btn.disabled = false;
  }
}

// ============================================================
// 初始化
// ============================================================
window.addEventListener("DOMContentLoaded", async () => {
  console.log("[H5预览] DOMContentLoaded，开始初始化");
  try {
    // 先加载资产清单 → 填充 logo 下拉
    const manifest = await loadManifest();
    populateLogoSelect(manifest);
    bindEvents();
    console.log("[H5预览] 事件绑定完成");
    render();
    console.log("[H5预览] 初次渲染完成");
  } catch (err) {
    console.error("[H5预览] 初始化失败：", err);
    alert("初始化失败：" + err.message);
  }
});
