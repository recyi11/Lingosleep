# LingoSleep

**LingoSleep** is a mobile-first Japanese and Korean vocabulary app built for relaxed listening and review while resting, commuting, or winding down.

**Live:** https://lingosleep.pages.dev

## What you can do

- Learn **Japanese or Korean** with **English or Simplified Chinese** meanings
- Choose **Basic, Intermediate, or Advanced** vocabulary and filter by topic
- Listen continuously with configurable target/native voices
- Use random playback with recent-word anti-repetition for more variety
- Save favorites, track learning progress and history, and review with quizzes
- Add rain or thunder background audio and set a sleep timer
- Use it comfortably on mobile as a responsive PWA

## Vocabulary

| Level | Japanese | Korean | Total |
| --- | ---: | ---: | ---: |
| Basic | 564 | 499 | 1,063 |
| Intermediate | 723 | 947 | 1,670 |
| Advanced | 1,268 | 902 | 2,170 |
| **Total** | **2,555** | **2,348** | **4,903** |

The bundled vocabulary focuses on useful standalone words and established lexical compounds rather than mechanically generated phrases. Japanese entries include kana readings and romanization where applicable.

For exam-focused study, the library also includes expanded **JLPT-oriented Japanese vocabulary** and **exam-oriented Korean vocabulary**, including additional intermediate and advanced learner words.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

For Supabase-backed features, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.

```bash
npm run build
```

**Stack:** React + TypeScript + Vite · Supabase · Cloudflare Pages · Playwright

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment details.

---

## 中文

**LingoSleep** 是一个面向手机端的日语、韩语词汇学习应用，适合在休息、通勤或睡前通过连续听词进行轻量复习。

**在线使用：** https://lingosleep.pages.dev

### 你可以做什么

- 学习 **日语或韩语**，并使用 **英语或简体中文** 查看释义
- 按 **Basic、Intermediate、Advanced** 难度选择词汇，并按主题筛选
- 连续播放词汇，自定义目标语言和母语语音
- 随机播放并降低近期已播放词汇的重复率
- 收藏单词、记录学习进度和历史，并通过 Quiz 复习
- 播放雨声或雷声背景音，并设置睡眠计时器
- 直接在手机上使用，也可以作为 PWA 安装

### 词库规模

| 难度 | 日语 | 韩语 | 合计 |
| --- | ---: | ---: | ---: |
| Basic | 564 | 499 | 1,063 |
| Intermediate | 723 | 947 | 1,670 |
| Advanced | 1,268 | 902 | 2,170 |
| **总计** | **2,555** | **2,348** | **4,903** |

内置词库以实用的独立词汇和常用固定复合词为主，避免通过机械拼接词组来凑数量。日语词条在适用时包含假名读音和罗马字。

如果用于考试学习，词库中也包含扩充后的 **JLPT 日语词汇** 和 **韩语考试向词汇**，覆盖更多中级和高级学习内容。

### 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

如果需要使用 Supabase 相关功能，请在 `.env.local` 中配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。

```bash
npm run build
```

**技术栈：** React + TypeScript + Vite · Supabase · Cloudflare Pages · Playwright

部署说明见 [DEPLOYMENT.md](./DEPLOYMENT.md)。
