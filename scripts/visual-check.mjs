#!/usr/bin/env node
/**
 * 麻雀点数トレーナー用のヘッドレス画面チェック。
 *
 * - 各画面 × 各ビューポートのスクリーンショット
 * - 横はみ出し / 画面外要素 / 操作要素の重なり / テキスト切れ / 固定要素の被り /
 *   重複 id / 同一親内の同名ボタン を検出
 *
 * 使い方（リポジトリ直下で）:
 *   node D:\AIWork\tools\mahjong-visual\visual.mjs --repo . --build --serve
 *   node ... --repo . --serve --sizes 1440x900,390x844 --routes home,learn
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const DEFAULT_SIZES = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow', width: 360, height: 800 },
];
const DEFAULT_ROUTES = ['home', 'learn', 'memorize', 'practice', 'chart', 'yaku', 'settings'];
const OUT_DIR =
  process.env.VISUAL_OUT_DIR ??
  (process.platform === 'win32' ? 'D:\\AIWork\\visual\\mahjong' : 'visual-out');
const PORT = 4173;

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  const prefixed = process.argv.find((value) => value.startsWith(`--${name}=`));
  return prefixed ? prefixed.slice(name.length + 3) : fallback;
}
function has(name) {
  return process.argv.includes(`--${name}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('Chrome / Edge が見つかりません。CHROME_PATH を指定してください。');
  return found;
}

function runNpm(args, cwd) {
  if (process.platform === 'win32') {
    return spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }
  return spawn('npm', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
}

async function waitFor(url, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* not yet */
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
  throw new Error(`${url} が ${timeoutMs}ms 以内に応答しません`);
}

function slug(route) {
  return route.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'root';
}

/** ページ内でレイアウト問題を検出する。 */
function auditInPage() {
  const issues = [];
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const doc = document.documentElement;

  if (doc.scrollWidth > vw + 1) {
    issues.push({
      type: 'horizontal-overflow',
      detail: `document.scrollWidth=${doc.scrollWidth} > viewport=${vw}`,
    });
  }

  const describe = (el) => {
    if (!el) return 'null';
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const cls = el.classList.length ? `.${[...el.classList].slice(0, 3).join('.')}` : '';
    const text = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `${tag}${id}${cls}${text ? ` "${text}"` : ''}`;
  };
  const clipRect = (el) => {
    let rect = el.getBoundingClientRect();
    let node = el.parentElement;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const clips = (value) => ['auto', 'scroll', 'hidden', 'clip'].includes(value);
      if (clips(style.overflowX) || clips(style.overflowY)) {
        const r = node.getBoundingClientRect();
        const left = Math.max(rect.left, r.left);
        const top = Math.max(rect.top, r.top);
        const right = Math.min(rect.right, r.right);
        const bottom = Math.min(rect.bottom, r.bottom);
        rect = {
          left,
          top,
          right,
          bottom,
          width: Math.max(0, right - left),
          height: Math.max(0, bottom - top),
        };
      }
      node = node.parentElement;
    }
    return rect;
  };
  const visible = (el) => {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = clipRect(el);
    return rect.width > 0 && rect.height > 0;
  };
  const ignored = (el) => Boolean(el.closest('[data-visual-ignore], .sr-only'));
  const inHorizontalScroller = (el) => {
    let node = el.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') return true;
      node = node.parentElement;
    }
    return false;
  };

  const all = [...document.querySelectorAll('body *')];
  const outside = [];
  for (const el of all) {
    if (!visible(el) || ignored(el) || inHorizontalScroller(el)) continue;
    const rect = clipRect(el);
    if (rect.left < -1 || rect.right > vw + 1) {
      const isText = [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim());
      const interactive = el.matches('button, a, input, select, textarea, [role="button"], [role="tab"]');
      if (!isText && !interactive) continue;
      outside.push({
        type: 'outside-viewport',
        detail: `${describe(el)} left=${Math.round(rect.left)} right=${Math.round(rect.right)} viewport=${vw}`,
      });
    }
  }
  issues.push(...outside.slice(0, 20));

  const controls = [...document.querySelectorAll(
    'button, a[href], input, select, textarea, [role="button"], [role="tab"], [tabindex]:not([tabindex="-1"])',
  )].filter((el) => visible(el) && !ignored(el) && !el.disabled && el.getAttribute('aria-hidden') !== 'true');

  for (let i = 0; i < controls.length; i += 1) {
    for (let j = i + 1; j < controls.length; j += 1) {
      const a = controls[i];
      const b = controls[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = clipRect(a);
      const rb = clipRect(b);
      const overlapW = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const overlapH = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (overlapW <= 1 || overlapH <= 1) continue;
      const overlap = overlapW * overlapH;
      const smaller = Math.min(ra.width * ra.height, rb.width * rb.height);
      if (smaller > 0 && overlap / smaller > 0.18) {
        issues.push({
          type: 'control-overlap',
          detail: `${describe(a)} ↔ ${describe(b)} (${Math.round((overlap / smaller) * 100)}% of smaller)`,
        });
      }
    }
  }

  const clipped = [];
  for (const el of all) {
    if (!visible(el) || ignored(el)) continue;
    const style = getComputedStyle(el);
    if (!['hidden', 'clip'].includes(style.overflowY) && !['hidden', 'clip'].includes(style.overflowX)) continue;
    const text = (el.textContent || '').trim();
    if (!text) continue;
    const vertical = el.scrollHeight > el.clientHeight + 2 && style.overflowY !== 'auto' && style.overflowY !== 'scroll';
    const horizontal = el.scrollWidth > el.clientWidth + 2 && style.overflowX !== 'auto' && style.overflowX !== 'scroll';
    if (vertical || horizontal) {
      clipped.push({
        type: 'clipped-text',
        detail: `${describe(el)} scroll=${el.scrollWidth}x${el.scrollHeight} client=${el.clientWidth}x${el.clientHeight}`,
      });
    }
  }
  issues.push(...clipped.slice(0, 20));

  const ids = new Map();
  for (const el of document.querySelectorAll('[id]')) {
    if (!el.id) continue;
    const list = ids.get(el.id) ?? [];
    list.push(el);
    ids.set(el.id, list);
  }
  for (const [id, list] of ids) {
    if (list.length > 1) issues.push({ type: 'duplicate-id', detail: `#${id} x${list.length}` });
  }

  const groups = new Map();
  for (const el of controls) {
    if (!el.parentElement) continue;
    const name = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ');
    if (!name) continue;
    const key = `${el.parentElement.tagName}:${el.parentElement.className}:${name}`;
    const list = groups.get(key) ?? [];
    list.push(el);
    groups.set(key, list);
  }
  for (const [key, list] of groups) {
    if (list.length > 1) {
      issues.push({
        type: 'duplicate-control',
        detail: `${list.length} controls with same name in one parent: ${key.split(':').slice(-1)[0]}`,
      });
    }
  }

  const fixedBars = [...document.querySelectorAll('body *')].filter((el) => {
    if (!visible(el)) return false;
    const style = getComputedStyle(el);
    return (style.position === 'fixed' || style.position === 'sticky') && el.getBoundingClientRect().width > vw * 0.5;
  });
  for (const bar of fixedBars) {
    const rb = bar.getBoundingClientRect();
    for (const control of controls) {
      if (bar.contains(control)) continue;
      const rc = clipRect(control);
      const overlapW = Math.min(rb.right, rc.right) - Math.max(rb.left, rc.left);
      const overlapH = Math.min(rb.bottom, rc.bottom) - Math.max(rb.top, rc.top);
      if (overlapW <= 1 || overlapH <= 1) continue;
      const overlap = overlapW * overlapH;
      if (overlap / Math.max(1, rc.width * rc.height) > 0.25) {
        issues.push({
          type: 'fixed-overlap',
          detail: `${describe(bar)} covers ${describe(control)}`,
        });
      }
    }
  }

  // 同じ見出しが近接して重複していないか（同一親内の h1/h2）
  for (const el of document.querySelectorAll('h1, h2')) {
    if (!el.parentElement) continue;
    const same = [...el.parentElement.children].filter(
      (sibling) => sibling !== el && sibling.tagName === el.tagName && sibling.textContent.trim() === el.textContent.trim(),
    );
    if (same.length > 0) {
      issues.push({ type: 'duplicate-heading', detail: `${describe(el)}` });
    }
  }

  return {
    viewport: { width: vw, height: vh },
    scroll: { width: doc.scrollWidth, height: doc.scrollHeight },
    issues,
  };
}

async function main() {
  const repo = resolve(arg('repo', process.cwd()));
  const outDir = arg('out', OUT_DIR);
  const sizes = (arg('sizes', null) ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const [width, height] = value.split('x').map(Number);
      return { name: `${width}x${height}`, width, height };
    });
  const effectiveSizes = sizes.length > 0 ? sizes : DEFAULT_SIZES;
  const routeNames = (arg('routes', null) ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const routes = routeNames.length > 0 ? routeNames : DEFAULT_ROUTES;
  const strict = has('strict');

  if (!existsSync(join(repo, 'package.json'))) {
    throw new Error(`package.json が見つかりません: ${repo}`);
  }
  await mkdir(outDir, { recursive: true });

  if (has('build')) {
    console.log('[visual] build 中…');
    const build = runNpm(['run', 'build'], repo);
    let buildLog = '';
    build.stdout.on('data', (chunk) => (buildLog += chunk));
    build.stderr.on('data', (chunk) => (buildLog += chunk));
    const code = await new Promise((resolvePromise) => build.on('exit', resolvePromise));
    if (code !== 0) throw new Error(`build 失敗\n${buildLog}`);
  }

  let server = null;
  if (has('serve')) {
    console.log('[visual] preview を起動中…');
    const viteBin = join(repo, 'node_modules', 'vite', 'bin', 'vite.js');
    if (!existsSync(viteBin)) throw new Error(`vite が見つかりません: ${viteBin}（先に npm ci）`);
    server = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
      cwd: repo,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let serverLog = '';
    server.stdout.on('data', (chunk) => (serverLog += chunk));
    server.stderr.on('data', (chunk) => (serverLog += chunk));
    server.on('exit', (code) => {
      if (code && code !== 0) console.error(`[visual] preview 終了 code=${code}\n${serverLog}`);
    });
    await waitFor(`http://127.0.0.1:${PORT}/`);
  }

  const chrome = findChrome();
  console.log(`[visual] Chrome: ${chrome}`);
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    timeout: 30_000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  const results = [];
  try {
    for (const size of effectiveSizes) {
      for (const route of routes) {
        const page = await browser.newPage();
        await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 });
        const url = `http://127.0.0.1:${PORT}/#/${route}`;
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });
        await page.evaluate(() => document.fonts?.ready);
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 350));
        const name = `${slug(route)}-${size.name}`;
        const file = join(outDir, `${name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const topAudit = await page.evaluate(auditInPage);

        const scrolled = await page.evaluate(() => {
          const scrollables = [...document.querySelectorAll('*')].filter((el) => {
            const style = getComputedStyle(el);
            return (
              (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
              el.scrollHeight > el.clientHeight + 4
            );
          });
          const target = scrollables.sort(
            (a, b) =>
              b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight),
          )[0];
          if (target) {
            target.scrollTop = target.scrollHeight;
            return { kind: 'element', scrollTop: target.scrollTop };
          }
          window.scrollTo(0, document.body.scrollHeight);
          return { kind: 'window', scrollTop: window.scrollY };
        });
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
        const bottomFile = join(outDir, `${name}-bottom.png`);
        await page.screenshot({ path: bottomFile, fullPage: false });
        const bottomAudit = await page.evaluate(auditInPage);

        const issues = [
          ...topAudit.issues.map((issue) => ({ ...issue, scroll: 'top' })),
          ...bottomAudit.issues.map((issue) => ({ ...issue, scroll: 'bottom' })),
        ];
        results.push({
          route,
          size,
          file,
          bottomFile,
          scrolled,
          issues,
          topIssues: topAudit.issues.length,
          bottomIssues: bottomAudit.issues.length,
        });
        const count = issues.length;
        console.log(
          `[visual] ${name}: ${count === 0 ? 'OK' : `${count} issue(s)`} (top ${topAudit.issues.length} / bottom ${bottomAudit.issues.length})`,
        );
        for (const issue of issues) console.log(`  - [${issue.scroll}] ${issue.type}: ${issue.detail}`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
    if (server) {
      server.kill();
    }
  }

  const report = join(outDir, `report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await writeFile(report, JSON.stringify(results, null, 2), 'utf8');
  console.log(`[visual] レポート: ${report}`);
  const total = results.reduce((sum, result) => sum + result.issues.length, 0);
  console.log(`[visual] 合計 ${total} issue(s)`);
  if (strict && total > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[visual] ${error.message}`);
  process.exitCode = 1;
});
