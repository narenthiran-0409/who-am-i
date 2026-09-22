import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { AnimationMixer } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { createCharacterPlayback } from './characterPlayback.mjs';

function Developer({ modelUrl, reduced, playback, automaticUsed, onState, onReady, onFailure }) {
  const gltf = useGLTF(modelUrl, false, false);
  const model = useMemo(() => {
    if (gltf.animations.length !== 2 || !['Idle', 'Salute'].every((name) => gltf.animations.some((clip) => clip.name === name))) {
      throw new Error('Developer model requires Idle and Salute clips');
    }
    return clone(gltf.scene);
  }, [gltf]);
  const mixer = useMemo(() => new AnimationMixer(model), [model]);
  const { gl, invalidate } = useThree();
  const firstFrame = useRef(true);
  useEffect(() => {
    const lost = (event) => { event.preventDefault(); onFailure(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure]);
  useEffect(() => {
    const controller = createCharacterPlayback(mixer, gltf.animations, {
      reduced, automatic: !automaticUsed.current, onState,
    });
    automaticUsed.current = true;
    playback.current = controller;
    invalidate();
    return () => {
      controller.dispose();
      playback.current = null;
      mixer.uncacheRoot(model);
    };
  }, [mixer, model, gltf.animations, reduced, playback, automaticUsed, onState, invalidate]);
  useFrame((_, delta) => {
    playback.current?.update(Math.min(delta, 0.05));
    if (firstFrame.current) { firstFrame.current = false; onReady(); }
  });
  return <primitive object={model} dispose={null} />;
}

export default function CharacterCanvas(props) {
  return (
    <div className="hero-character-canvas" aria-hidden="true">
      <Canvas orthographic camera={{ position: [4.3, 3.85, 8], zoom: 100, near: 0.1, far: 40 }}
        dpr={[1, 1.5]} frameloop={props.reduced ? 'demand' : 'always'}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        onCreated={({ camera, gl, size }) => {
          camera.lookAt(0, 1.64, 0.23);
          camera.zoom = Math.min(size.width / 3.0, size.height / 3.8);
          camera.updateProjectionMatrix();
          gl.setClearColor(0x000000, 0);
        }}>
        <CameraFit />
        <hemisphereLight args={['#e6f4ff', '#536071', 1.5]} />
        <directionalLight position={[-3, 6, 4]} intensity={2.4} color="#fff1e3" />
        <directionalLight position={[4, 4, 2]} intensity={1.5} color="#d5edff" />
        <directionalLight position={[1, 5, -3]} intensity={2.2} color="#c0dfff" />
        <Developer {...props} />
      </Canvas>
    </div>
  );
}

function CameraFit() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    camera.zoom = Math.min(size.width / 3.0, size.height / 3.8);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return null;
}
