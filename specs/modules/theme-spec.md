# 模块 Spec：Theme（主题系统模块）

> 本模块定义全局 Theme 切换规范，是用户直接感知的基础体验层。纯前端模块，无后端依赖。
>
> 对应变更域：phase-3-user-experience

---

## 1. 范围边界

### 1.1 包含
- 三种 Theme 模式：light（浅色）、dark（深色）、system（跟随系统）
- CSS Variables 动态切换机制
- localStorage 持久化
- ThemeToggle 切换组件
- ThemeProvider 全局上下文

### 1.2 不包含
- ❌ 多套主题配色（如企业蓝、节日红等）
- ❌ 后端主题配置存储
- ❌ 主题动画过渡（CSS transition 除外）
- ❌ 字体大小/排版主题切换

---

## 2. 设计规范

### 2.1 支持的 Theme 模式

| 模式 | 标识 | 行为 |
|------|------|------|
| 浅色模式 | `light` | 强制使用浅色配色 |
| 深色模式 | `dark` | 强制使用深色配色 |
| 跟随系统 | `system` | 读取 `prefers-color-scheme`，随系统切换 |

### 2.2 默认行为

- **首次访问**：默认 `system` 模式
- **系统偏好变化**：当 mode 为 `system` 时，实时响应 `prefers-color-scheme` 变化
- **刷新保持**：从 localStorage 读取上次选择的 mode

### 2.3 CSS Variables 规范

所有颜色值必须通过 CSS Variables 定义，不允许硬编码颜色。

```css
/* Light Mode（默认） */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #eeeeee;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --border-color: #e0e0e0;
  --accent-color: #1976d2;
  --accent-hover: #1565c0;
  --error-color: #d32f2f;
  --success-color: #388e3c;
  --warning-color: #f57c00;
  --user-message-bg: #1976d2;
  --user-message-text: #ffffff;
  --assistant-message-bg: #f5f5f5;
  --assistant-message-text: #1a1a1a;
  --sidebar-bg: #fafafa;
  --card-bg: #ffffff;
  --input-bg: #ffffff;
  --input-border: #d0d0d0;
  --hover-bg: rgba(0, 0, 0, 0.04);
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Dark Mode */
[data-theme="dark"] {
  --bg-primary: #121212;
  --bg-secondary: #1e1e1e;
  --bg-tertiary: #2a2a2a;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --text-tertiary: #707070;
  --border-color: #333333;
  --accent-color: #64b5f6;
  --accent-hover: #90caf9;
  --error-color: #ef5350;
  --success-color: #66bb6a;
  --warning-color: #ffa726;
  --user-message-bg: #1565c0;
  --user-message-text: #ffffff;
  --assistant-message-bg: #2a2a2a;
  --assistant-message-text: #e0e0e0;
  --sidebar-bg: #1a1a1a;
  --card-bg: #1e1e1e;
  --input-bg: #2a2a2a;
  --input-border: #404040;
  --hover-bg: rgba(255, 255, 255, 0.04);
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

### 2.4 分类色卡（深色模式适配）

各文档分类的颜色在深色模式下需降低饱和度：

| 分类 | Light 背景 | Light 文字 | Dark 背景 | Dark 文字 |
|------|-----------|-----------|-----------|-----------|
| 年假 | `#E3F2FD` | `#1565C0` | `#0D47A1` | `#BBDEFB` |
| 报销 | `#E8F5E9` | `#2E7D32` | `#1B5E20` | `#C8E6C9` |
| 晋升 | `#FFF3E0` | `#E65100` | `#BF360C` | `#FFE0B2` |
| 考勤 | `#F3E5F5` | `#7B1FA2` | `#4A148C` | `#E1BEE7` |
| 福利 | `#FFFDE7` | `#F9A825` | `#F57F17` | `#FFF9C4` |
| 自定义 | `#F5F5F5` | `#616161` | `#424242` | `#BDBDBD` |

---

## 3. 前端接口规范

### 3.1 ThemeContext 接口

```typescript
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;                    // 当前选择的模式
  resolvedTheme: 'light' | 'dark';    // 实际生效的主题（system 已解析）
  setMode: (mode: ThemeMode) => void; // 切换模式
  toggleTheme: () => void;            // 快捷切换：light → dark → system → light
}
```

### 3.2 ThemeProvider 实现要求

```typescript
// 初始化流程
function ThemeProvider({ children }) {
  // 1. 从 localStorage 读取 mode，默认 'system'
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('hr_rag_theme') as ThemeMode) || 'system';
  });

  // 2. 计算 resolvedTheme
  const resolvedTheme = useMemo(() => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  }, [mode]);

  // 3. 应用 theme 到 document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem('hr_rag_theme', mode);
  }, [resolvedTheme, mode]);

  // 4. 监听系统偏好变化（仅 system 模式）
  useEffect(() => {
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { /* 触发重新渲染 */ };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [mode]);
}
```

### 3.3 切换组件 ThemeToggle

- **位置**：顶部导航栏右侧
- **样式**：图标按钮（💡/🌙/⚙️ 或纯图标）
- **交互**：
  - 点击展开下拉菜单：浅色 / 深色 / 跟随系统
  - 当前选中的模式高亮显示
  - 菜单外点击关闭
- **快捷切换**：`toggleTheme()` 循环切换 light → dark → system → light

---

## 4. 组件级 Theme 适配要求

### 4.1 所有组件必须遵循的规则

1. **禁止使用硬编码颜色**：所有颜色必须引用 CSS Variables
2. **禁止使用 `color: black` / `color: white`**：使用 `--text-primary` / `--bg-primary`
3. **边框和分割线**：使用 `--border-color`
4. **悬浮状态**：使用 `--hover-bg`
5. **阴影**：使用 `--shadow`

### 4.2 关键组件适配清单

| 组件 | 浅色模式 | 深色模式注意点 |
|------|---------|--------------|
| ChatMessage（用户） | 蓝色气泡 | 蓝色稍暗，文字保持白色 |
| ChatMessage（助手） | 灰色气泡 | 背景 `#2a2a2a`，文字 `#e0e0e0` |
| SourceCitation | 浅色边框卡片 | 边框 `#333333`，背景 `#1e1e1e` |
| DocumentCard | 分类色背景 | 使用深色模式分类色 |
| DocumentViewer | 白色背景 | `#121212` 背景，代码块高亮适配 |
| LoginPage | 白色背景卡片 | `#1e1e1e` 卡片，输入框 `#2a2a2a` |
| Sidebar | `#fafafa` | `#1a1a1a` |
| Input 框 | 白色背景，灰色边框 | `#2a2a2a` 背景，`#404040` 边框 |
| 滚动条 | 系统默认 | 自定义滚动条颜色适配深色 |

### 4.3 Markdown 渲染深色适配

Markdown 内容在深色模式下需特别处理：
- 代码块背景：`#1a1a1a`（非纯白）
- 引用块左边框：`--accent-color`
- 表格边框：`--border-color`
- 链接颜色：`--accent-color`，hover 时 `--accent-hover`
- 行内代码背景：`rgba(255,255,255,0.08)`

---

## 5. 性能要求

- Theme 切换必须即时生效，无闪烁
- 禁止使用 `setTimeout` 延迟应用 Theme
- CSS Variables 切换由浏览器原生支持，无 JS 计算开销
- 首屏渲染前需确定 Theme（避免 FOUC — Flash of Unstyled Content）

**防 FOUC 策略**：
```html
<!-- index.html 内联脚本 -->
<script>
  (function() {
    const mode = localStorage.getItem('hr_rag_theme') || 'system';
    const resolved = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    document.documentElement.setAttribute('data-theme', resolved);
  })();
</script>
```

---

## 6. 验收标准

- [ ] 首次打开页面，Theme 跟随系统偏好
- [ ] 点击 ThemeToggle，可切换 light / dark / system 三种模式
- [ ] 切换即时生效，无闪烁
- [ ] 刷新页面后保持上次选择的模式
- [ ] 选择 system 模式后，切换操作系统主题，页面自动跟随
- [ ] 深色模式下所有文字对比度 ≥ 4.5:1（WCAG AA 标准）
- [ ] 深色模式下 Markdown 文档阅读舒适
- [ ] 登录页、Chat 页、文档页全部适配深色模式
- [ ] 分类色卡在深色模式下清晰可见

---

## 7. 与其他模块的关系

```
ThemeProvider（全局包裹）
    ├── 影响 LoginPage 配色
    ├── 影响 ChatPage 配色
    ├── 影响 DocumentPage 配色
    ├── 影响所有 Component 配色
    └── 独立模块，不依赖任何其他模块
```

---

## 8. Spec 演进记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-18 | v1.0 | 初始版本，从 phase-3 spec 和 ADR-006 中提取 Theme 规范 |
