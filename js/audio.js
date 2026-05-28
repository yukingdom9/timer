// iOS Safari / PWA audio unlock + alarm beeps.
//
// ■ iOS の 5 層制限と対策
//   Layer 1: AudioContext 生成直後は state === 'suspended'
//   Layer 2: resume() はユーザージェスチャーの【同期スタック内】でしか信頼されない
//            → async/await を挟むと gesture trust が失われる場合がある
//   Layer 3: 無音バッファを一度再生しないと古い iOS では完全アンロックされない
//   Layer 4: バックグラウンド時に AudioContext が自動で suspended に戻る
//   Layer 5: タイマー終了時に ctx が suspended だと音が出ない
//
// ■ PWA で特に厳しい理由
//   Safari ブラウザタブより standalone モードの方が制限が厳しく、
//   スリープ復帰後の resume() には gesture trust が必要。
//
// ■ WebAudio API を使う理由
//   <audio> 要素はハードウェアサイレントスイッチで無音になるが、
//   WebAudio API は iOS 13+ ではサイレントスイッチの影響を受けない。
//
// Public API:
//   audio.unlockAudioSync()       — ユーザージェスチャー内で同期呼び出し必須
//   audio.playAlarm()             — アラーム再生 (ctx 停止中は pendingAlarm を立てる)
//   audio.onPendingChange(fn)     — fn(isPending: boolean) で点滅 UI を制御
//   audio.onBeepsEnd(fn)          — ビープ終了後(~2秒後)に呼ばれる

var audio = (function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var audioReady = false;    // 無音バッファ再生完了 = 完全アンロック済み
  var pendingAlarm = false;  // ctx が suspended で音を出せなかった場合 true

  var onPendingChangeCb = null;
  var onBeepsEndCb = null;

  function setPending(val) {
    pendingAlarm = val;
    if (onPendingChangeCb) onPendingChangeCb(val);
  }

  // ctx が running になったら無音バッファを再生し完全アンロックを完了させる
  function playSilentBuffer() {
    if (!ctx || ctx.state !== 'running' || audioReady) return;
    var buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    audioReady = true;
  }

  // pendingAlarm がありかつ今すぐ音を出せるなら再生して消化する
  function checkPendingAlarm() {
    if (!pendingAlarm) return;
    if (!ctx || ctx.state !== 'running') return;
    setPending(false);
    scheduleBeeps(ctx);
  }

  // ★ iOS で最重要: resume() を async/await を一切介さず
  //    ユーザージェスチャーの【同期スタック内】で直接呼ぶ。
  function unlockAudioSync() {
    if (!AC) return;
    if (!ctx) ctx = new AC();

    if (ctx.state === 'suspended') {
      ctx.resume().then(function () {
        playSilentBuffer();
        checkPendingAlarm();
      }).catch(function () {});
    } else if (ctx.state === 'running') {
      playSilentBuffer();
      checkPendingAlarm();
    }
  }

  // ジェスチャー外(Worker の done メッセージ)から呼ばれる。
  // ctx が running なら即時再生、suspended なら pendingAlarm を立てる。
  function playAlarm() {
    if (!ctx || ctx.state !== 'running') {
      setPending(true);
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(function () {
          playSilentBuffer();
          checkPendingAlarm();
        }).catch(function () {});
      }
      return;
    }
    scheduleBeeps(ctx);
  }

  // 880Hz × 2 (注意喚起) + 1320Hz × 1 (終了余韻)
  // WebAudio API のためサイレントスイッチ(iOS 13+)の影響を受けない
  function scheduleBeeps(audioCtx) {
    var compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -3;
    compressor.knee.value = 0;
    compressor.ratio.value = 20;
    compressor.attack.value = 0;
    compressor.release.value = 0.05;
    compressor.connect(audioCtx.destination);

    var beeps = [
      { freq: 880,  start: 0,    dur: 0.12 },
      { freq: 880,  start: 0.18, dur: 0.12 },
      { freq: 1320, start: 0.36, dur: 0.60 },
    ];

    beeps.forEach(function (b) {
      var osc  = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(compressor);
      osc.type = 'square';
      osc.frequency.value = b.freq;
      var t = audioCtx.currentTime + b.start;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1.0, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + b.dur);
      osc.start(t);
      osc.stop(t + b.dur + 0.05);
    });

    setTimeout(function () {
      if (onBeepsEndCb) onBeepsEndCb();
    }, 2000);
  }

  // バックグラウンド復帰時: suspended に戻った ctx を resume して pendingAlarm を消化
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(function () {
        playSilentBuffer();
        checkPendingAlarm();
      }).catch(function () {});
    } else if (ctx.state === 'running') {
      checkPendingAlarm();
    }
  });

  return {
    unlockAudioSync: unlockAudioSync,
    playAlarm:       playAlarm,
    onPendingChange: function (fn) { onPendingChangeCb = fn; },
    onBeepsEnd:      function (fn) { onBeepsEndCb = fn; }
  };
})();
