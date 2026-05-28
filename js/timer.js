// Countdown timer backed by a Web Worker.
//
// Worker を使う理由:
//   バックグラウンドタブでも throttle されない独立スレッドで動作する。
//   Date.now() ベースで残り時間を計算するため setInterval のズレに強い。
//
// 状態遷移: "idle" → "running" → "finished" → (reset) → "idle"
//
// Public API:
//   timer.setDuration(seconds)  — 秒数を設定 (running 中は無効)
//   timer.getDuration()         — 設定した合計秒数を返す
//   timer.getRemaining()        — 現在の残り秒数を返す
//   timer.getState()            — "idle" | "running" | "finished"
//   timer.start()               — カウントダウン開始
//   timer.reset()               — 停止して totalSeconds に戻す
//   timer.onTick(fn)            — fn(remaining, total) で毎秒コールバック
//   timer.onFinish(fn)          — タイマー終了時にコールバック

var timer = (function () {
  var WORKER_SRC = [
    'var intervalId = null;',
    'var deadline = 0;',
    'self.onmessage = function(e) {',
    '  if (e.data.type === "start") {',
    '    clearInterval(intervalId);',
    '    deadline = Date.now() + e.data.seconds * 1000;',
    '    intervalId = setInterval(function() {',
    '      var msLeft = deadline - Date.now();',
    '      var remaining = Math.max(0, Math.ceil(msLeft / 1000));',
    '      self.postMessage({ type: "tick", remaining: remaining });',
    '      if (remaining <= 0) {',
    '        clearInterval(intervalId);',
    '        self.postMessage({ type: "done" });',
    '      }',
    '    }, 250);',
    '  } else if (e.data.type === "stop") {',
    '    clearInterval(intervalId);',
    '  }',
    '};'
  ].join('\n');

  var workerUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'application/javascript' }));

  var state        = 'idle';
  var totalSeconds = 180;
  var remaining    = 180;
  var worker       = null;
  var onTickCb     = null;
  var onFinishCb   = null;

  function stopWorker() {
    if (!worker) return;
    worker.terminate();
    worker = null;
  }

  function createWorker() {
    stopWorker();
    worker = new Worker(workerUrl);
    worker.onmessage = function (e) {
      if (e.data.type === 'tick') {
        remaining = e.data.remaining;
        if (onTickCb) onTickCb(remaining, totalSeconds);
      } else if (e.data.type === 'done') {
        stopWorker();
        state = 'finished';
        if (onFinishCb) onFinishCb();
      }
    };
  }

  return {
    setDuration: function (seconds) {
      if (state === 'running') return;
      totalSeconds = seconds;
      remaining    = seconds;
      if (state === 'finished') state = 'idle';
    },
    getDuration:  function () { return totalSeconds; },
    getRemaining: function () { return remaining; },
    getState:     function () { return state; },

    start: function () {
      if (state === 'running') return;
      state = 'running';
      createWorker();
      worker.postMessage({ type: 'start', seconds: remaining });
    },

    reset: function () {
      stopWorker();
      state     = 'idle';
      remaining = totalSeconds;
    },

    onTick:   function (fn) { onTickCb = fn; },
    onFinish: function (fn) { onFinishCb = fn; }
  };
})();
