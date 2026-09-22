import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

const CharacterCanvas = lazy(() => import('./hero/CharacterCanvas'));

class CharacterBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    update();
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function Character({ modelUrl, fallbackImage, accessibleLabel }) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [state, setState] = useState('loading');
  const playback = useRef(null);
  const automaticUsed = useRef(false);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => { setFailed(true); setState('fallback'); }, []);
  useEffect(() => {
    if (ready || failed) return;
    const timeout = window.setTimeout(onFailure, 15000);
    return () => window.clearTimeout(timeout);
  }, [ready, failed, onFailure]);
  const interactive = ready && !failed && !reduced;

  return (
    <div className="hero-character" data-state={failed ? 'fallback' : ready ? state : 'loading'}>
      <img className="hero-character-fallback" src={fallbackImage} alt={accessibleLabel}
        width="800" height="900" aria-hidden={interactive || undefined}
        style={{ visibility: ready && !failed ? 'hidden' : 'visible' }} />
      {!failed && (
        <CharacterBoundary onFailure={onFailure}>
          <Suspense fallback={null}>
            <CharacterCanvas modelUrl={modelUrl} reduced={reduced} playback={playback}
              automaticUsed={automaticUsed} onState={setState} onReady={onReady} onFailure={onFailure} />
          </Suspense>
        </CharacterBoundary>
      )}
      <button type="button" className="hero-character-activate" aria-label={accessibleLabel}
        disabled={!interactive} aria-disabled={!interactive || state === 'salute'}
        onClick={() => playback.current?.activate()} />
      {ready && !failed && reduced && <span className="hero-character-static-label" role="img" aria-label={accessibleLabel} />}
    </div>
  );
}

export default function HeroCharacter({ config }) {
  return <Character key={config.modelUrl} {...config} />;
}
