// Run with a running Vite server and Playwright available locally.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const out = 'test-results/avatar';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
async function page(options = {}) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 }, ...options });
  p.on('pageerror', error => errors.push(error.message));
  return p;
}
const url = 'http://localhost:4173';
const state = (p, value) => p.waitForFunction(value => document.querySelector('.avatar-video')?.dataset.state === value, value);
const ready = p => p.waitForFunction(() => document.querySelector('video')?.readyState >= 3);
const button = p => p.locator('.avatar-video-activate');
try {
  const p = await page({ reducedMotion: 'reduce' });
  await p.goto(url);
  await ready(p);
  assert.equal(await p.locator('video').evaluate(v => v.paused && v.currentTime === 0), true);
  // Inspect exact first and last decoded frames, including their full native bounds.
  for (const [name, time] of [['first', 0.001], ['last', 5.09]]) {
    const frame = await p.locator('video').evaluate(async (v, time) => {
      await new Promise(resolve => { v.addEventListener('seeked', resolve, { once: true }); v.currentTime = time; });
      const c = document.createElement('canvas');
      c.width = v.videoWidth; c.height = v.videoHeight;
      const ctx = c.getContext('2d'); ctx.drawImage(v, 0, 0);
      return { png: c.toDataURL('image/png').split(',')[1], corner: [...ctx.getImageData(0, 0, 1, 1).data], width: c.width, height: c.height, duration: v.duration };
    }, time);
    await writeFile(`${out}/${name}.png`, Buffer.from(frame.png, 'base64'));
    console.log(name, { ...frame, png: '(saved)' });
  }
  await p.reload(); await ready(p);
  await p.screenshot({ path: `${out}/desktop-poster.png` });
  await button(p).focus(); await p.keyboard.press('Tab');
  await p.keyboard.press('Shift+Tab');
  assert.equal(await button(p).evaluate(b => b.matches(':focus-visible') && getComputedStyle(b).outlineStyle !== 'none'), true);
  await p.keyboard.press('Enter'); await state(p, 'playing');
  await p.waitForFunction(() => document.querySelector('video').currentTime > 0.5);
  const before = await p.locator('video').evaluate(v => v.currentTime);
  await button(p).evaluate(b => { b.click(); b.click(); b.click(); });
  assert.ok(await p.locator('video').evaluate(v => v.currentTime) >= before);
  await state(p, 'ended');
  assert.equal(await p.locator('video').evaluate(v => v.classList.contains('is-visible') && v.ended && !v.loop && v.muted && v.playsInline && !v.controls), true);
  await p.screenshot({ path: `${out}/desktop-ended.png` });
  await p.keyboard.press('Space'); await state(p, 'playing');
  assert.ok(await p.locator('video').evaluate(v => v.currentTime) < 1);
  await p.close();
  console.log('PASS reduced motion, Enter/Space, focus indicator, repeated activation, completion, replay');

  const auto = await page();
  await auto.addInitScript(() => {
    window.playCalls = 0;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { window.playCalls++; return play.call(this); };
  });
  await auto.goto(url); await state(auto, 'playing'); await state(auto, 'ended');
  await auto.locator('#contact').scrollIntoViewIfNeeded();
  await auto.locator('#hero').scrollIntoViewIfNeeded();
  assert.equal(await auto.evaluate(() => window.playCalls), 1);
  await button(auto).click(); await state(auto, 'playing');
  assert.equal(await auto.evaluate(() => window.playCalls), 2);
  await auto.close();
  console.log('PASS autoplay once, completion, click replay');

  const blocked = await page();
  await blocked.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    let first = true;
    HTMLMediaElement.prototype.play = function () {
      if (first) { first = false; return Promise.reject(new DOMException('Test blocked autoplay', 'NotAllowedError')); }
      return play.call(this);
    };
  });
  await blocked.goto(url); await state(blocked, 'blocked');
  assert.equal(await blocked.locator('video').evaluate(v => getComputedStyle(v).opacity), '0');
  await button(blocked).click(); await state(blocked, 'playing');
  await blocked.close();
  console.log('PASS blocked autoplay preserves poster and permits explicit play');

  const failed = await page();
  await failed.route('**/developer-salute.mp4', route => route.abort());
  await failed.goto(url); await state(failed, 'fallback');
  assert.equal(await button(failed).count(), 0);
  assert.equal(await failed.locator('.avatar-video img').evaluate(img => img.complete && img.naturalWidth > 0 && img.getAttribute('aria-hidden') !== 'true'), true);
  await failed.close();
  console.log('PASS media failure shows accessible PNG with no replay button');

  const loading = await page({ reducedMotion: 'reduce' });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let requested;
  const request = new Promise(resolve => { requested = resolve; });
  await loading.route('**/developer-salute.mp4', async route => { requested(); await gate; await route.continue(); });
  await loading.goto(url, { waitUntil: 'domcontentloaded' }); await request;
  await loading.waitForFunction(() => document.querySelector('.avatar-video img')?.naturalWidth > 0);
  const reserved = await loading.locator('.hero-visual').boundingBox();
  assert.equal(await loading.locator('video').evaluate(v => getComputedStyle(v).opacity), '0');
  release(); await ready(loading);
  assert.deepEqual(await loading.locator('.hero-visual').boundingBox(), reserved);
  await loading.close();
  console.log('PASS delayed media keeps poster and reserved layout');

  const hidden = await page({ viewport: { width: 390, height: 350 } });
  let revealMedia;
  const hiddenGate = new Promise(resolve => { revealMedia = resolve; });
  await hidden.route('**/developer-salute.mp4', async route => { await hiddenGate; await route.continue(); });
  await hidden.goto(url, { waitUntil: 'domcontentloaded' });
  await hidden.locator('#contact').scrollIntoViewIfNeeded();
  revealMedia(); await ready(hidden);
  assert.equal(await hidden.locator('video').evaluate(v => v.paused && v.currentTime === 0), true);
  await button(hidden).scrollIntoViewIfNeeded(); await state(hidden, 'playing');
  await hidden.close();
  console.log('PASS autoplay waits for avatar visibility');

  for (const width of [320, 390, 768, 1024, 1440]) {
    const mobile = await page({ viewport: { width, height: 844 }, reducedMotion: 'reduce', hasTouch: true });
    await mobile.goto(url); await ready(mobile);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
    const bounds = await mobile.evaluate(() => {
      const copy = document.querySelector('.hero-copy').getBoundingClientRect();
      const media = document.querySelector('.hero-visual').getBoundingClientRect();
      return { stacked: media.bottom <= copy.top, beside: media.left >= copy.right, height: media.height };
    });
    assert.ok(width < 1024 ? bounds.stacked : bounds.beside);
    await button(mobile).scrollIntoViewIfNeeded();
    await mobile.screenshot({ path: `${out}/layout-${width}.png` });
    await button(mobile).tap(); await state(mobile, 'playing');
    assert.equal(await mobile.locator('.hero-visual').evaluate(el => el.getBoundingClientRect().height), bounds.height);
    await mobile.close();
  }
  console.log('PASS responsive layouts, reserved height, no overflow, tap replay at 320/390/768/1024/1440px');
  assert.deepEqual(errors, []);
  console.log('PASS no browser runtime errors');
} finally { await browser.close(); }
