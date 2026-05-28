// エントリーポイント: DOM キャッシュ、UI 更新、イベントハンドラ、初期化
// 依存: audio.js (audio), timer.js (timer) が先に読み込まれていること

var CIRCUMFERENCE = 2 * Math.PI * 88;

// DOM 参照を一度だけ取得してキャッシュ
var els = {
  display:    document.getElementById('display'),
  ring:       document.getElementById('ring'),
  startBtn:   document.getElementById('startBtn'),
  presetBtns: document.querySelectorAll('.preset-btn')
};

els.ring.style.strokeDasharray = CIRCUMFERENCE;

// ---- Timer イベント配線 ----------------------------------------------------

timer.onTick(function (remaining, total) {
  updateDisplay(remaining);
  updateRing(remaining, total);
  if (remaining <= 10) {
    els.display.classList.add('urgent');
    els.ring.classList.add('urgent');
  }
});

timer.onFinish(function () {
  els.display.classList.remove('urgent');
  els.ring.classList.remove('urgent');
  els.display.classList.add('done');
  els.ring.classList.add('done');
  els.startBtn.textContent = 'スタート';
  els.startBtn.classList.remove('running');
  audio.playAlarm();
});

// ---- Audio イベント配線 ----------------------------------------------------

// pendingAlarm 状態が変わったら点滅アニメーションを切り替える
audio.onPendingChange(function (isPending) {
  els.display.classList.toggle('pending-alarm', isPending);
});

// ビープ終了後(~2秒後)に done スタイルをクリア
audio.onBeepsEnd(function () {
  els.display.classList.remove('done');
  els.ring.classList.remove('done');
});

// ---- UI 更新 ---------------------------------------------------------------

function updateDisplay(remaining) {
  var m = Math.floor(remaining / 60);
  var s = remaining % 60;
  els.display.textContent = m + ':' + String(s).padStart(2, '0');
}

function updateRing(remaining, total) {
  var fraction = total > 0 ? remaining / total : 0;
  els.ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);
}

function resetRing() {
  els.ring.style.strokeDashoffset = 0;
}

// ---- タイマー制御 ----------------------------------------------------------

function startTimer() {
  els.startBtn.textContent = 'リセット';
  els.startBtn.classList.add('running');
  els.display.classList.remove('urgent', 'done', 'pending-alarm');
  els.ring.classList.remove('urgent', 'done');
  updateDisplay(timer.getRemaining());
  updateRing(timer.getRemaining(), timer.getDuration());
  timer.start();
}

function resetTimer() {
  timer.reset();
  els.display.classList.remove('urgent', 'done', 'pending-alarm');
  els.ring.classList.remove('urgent', 'done');
  updateDisplay(timer.getRemaining());
  resetRing();
  els.startBtn.textContent = 'スタート';
  els.startBtn.classList.remove('running');
}

// ---- イベントハンドラ (HTML の onclick から呼ばれる) -----------------------

// ★ toggle() / setPreset() / adjust() は非 async のまま維持する。
//    async にすると Promise が返り、onclick の同期スタックが分断され、
//    unlockAudioSync() の gesture trust が iOS で失われる場合がある。

function toggle() {
  if (timer.getState() === 'running') {
    resetTimer();
  } else {
    audio.unlockAudioSync(); // ジェスチャー同期スタック内で呼ぶ
    if (timer.getState() === 'finished') timer.reset(); // remaining を totalSeconds に戻す
    startTimer();
  }
}

function setPreset(minutes, evt) {
  if (timer.getState() === 'running') return;
  els.presetBtns.forEach(function (b) { b.classList.remove('active'); });
  if (evt && evt.target) evt.target.classList.add('active');
  timer.setDuration(minutes * 60);
  els.display.classList.remove('urgent', 'done', 'pending-alarm');
  els.ring.classList.remove('urgent', 'done');
  updateDisplay(timer.getRemaining());
  resetRing();
  audio.unlockAudioSync();
}

function adjust(seconds) {
  if (timer.getState() === 'running') return;
  timer.setDuration(Math.max(30, timer.getDuration() + seconds));
  els.presetBtns.forEach(function (b) { b.classList.remove('active'); });
  els.display.classList.remove('urgent', 'done', 'pending-alarm');
  els.ring.classList.remove('urgent', 'done');
  updateDisplay(timer.getRemaining());
  resetRing();
  audio.unlockAudioSync();
}

// ---- グローバルジェスチャーフック -----------------------------------------

// スタートボタン以外の最初のタップでもアンロック・pendingAlarm 消化をカバー
document.body.addEventListener('touchstart', audio.unlockAudioSync, { passive: true });
document.body.addEventListener('click',      audio.unlockAudioSync, { passive: true });

// ダブルタップズーム 追加保険:
// CSS touch-action: manipulation だけでは古い iOS / 特定要素でズームが発生するケースがある
var lastTap = 0;
document.addEventListener('touchend', function (e) {
  var now = Date.now();
  if (now - lastTap < 300) e.preventDefault();
  lastTap = now;
}, { passive: false });

// ---- Service Worker --------------------------------------------------------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function (err) {
      console.warn('ServiceWorker registration failed:', err);
    });
  });
}

window.addEventListener('appinstalled', function () {
  console.log('PWA installed');
});

// ---- 初期化 ----------------------------------------------------------------

updateDisplay(timer.getRemaining());
resetRing();
