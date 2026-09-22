import { LoopOnce, LoopRepeat } from 'three';

// The mixer owns completion; timers never estimate the salute's duration.
export function createCharacterPlayback(mixer, clips, { reduced = false, automatic = true, onState = () => {} } = {}) {
  const idle = mixer.clipAction(clips.find((clip) => clip.name === 'Idle'));
  const salute = mixer.clipAction(clips.find((clip) => clip.name === 'Salute'));
  let busy = false, elapsed = 0, pendingAuto = automatic && !reduced, disposed = false;
  idle.reset().setLoop(LoopRepeat, Infinity).setEffectiveWeight(1).play();
  salute.setLoop(LoopOnce, 1);
  salute.clampWhenFinished = true;
  if (reduced) { mixer.update(0); idle.paused = true; }
  onState(reduced ? 'static' : 'idle');

  function activate() {
    if (disposed || reduced || busy) return false;
    pendingAuto = false;
    busy = true;
    idle.stopFading();
    salute.stopFading().reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    idle.crossFadeTo(salute, 0.18, false);
    onState('salute');
    return true;
  }
  function finished(event) {
    if (event.action !== salute || disposed) return;
    idle.stopFading().reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    salute.crossFadeTo(idle, 0.22, false);
    busy = false;
    onState('idle');
  }
  mixer.addEventListener('finished', finished);
  return {
    activate,
    update(delta) {
      if (disposed || reduced) return;
      mixer.update(delta);
      elapsed += delta;
      if (pendingAuto && elapsed >= 1.2) activate();
    },
    dispose() {
      disposed = true;
      mixer.removeEventListener('finished', finished);
      mixer.stopAllAction();
    },
  };
}
