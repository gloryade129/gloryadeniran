'use client';

import { useRef, Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, Stars, OrbitControls, Torus, Icosahedron, Box, TorusKnot } from '@react-three/drei';
import { useTheme } from '@/components/ThemeProvider';
import * as THREE from 'three';

const globalMouse = { x: 0, y: 0 };
if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', (e) => {
    globalMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    globalMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
}

function RotatingName({ isLight }) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    meshRef.current.rotation.y += delta * 0.03;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.05;
    meshRef.current.rotation.x += (globalMouse.y * 0.05 - meshRef.current.rotation.x) * 0.03;
    meshRef.current.rotation.y += (globalMouse.x * 0.05 - meshRef.current.rotation.y) * 0.03;
  });

  return (
    <group ref={meshRef} position={[0, 0, -2]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <Text
          fontSize={2.5}
          maxWidth={12}
          lineHeight={1}
          letterSpacing={-0.05}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
        >
          GLORY{"\n"}ADENIRAN
          <meshStandardMaterial
            color={isLight ? "#8BA51E" : "#C9E265"}
            emissive={isLight ? "#8BA51E" : "#C9E265"}
            emissiveIntensity={isLight ? 0.05 : 0.12}
            roughness={0.2}
            metalness={0.8}
            wireframe={true}
          />
        </Text>
      </Float>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <Text
          fontSize={2.5}
          maxWidth={12}
          lineHeight={1}
          letterSpacing={-0.05}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          position={[0, 0, -0.1]}
        >
          GLORY{"\n"}ADENIRAN
          <meshStandardMaterial color={isLight ? "#D0CFCB" : "#080706"} roughness={0.9} />
        </Text>
      </Float>
    </group>
  );
}

function FloatingShapes({ isLight }) {
  const shapesRef = useRef();

  useFrame((state, delta) => {
    shapesRef.current.rotation.y -= delta * 0.01;
    shapesRef.current.position.x = THREE.MathUtils.lerp(shapesRef.current.position.x, globalMouse.x * 0.5, 0.03);
    shapesRef.current.position.y = THREE.MathUtils.lerp(shapesRef.current.position.y, globalMouse.y * 0.5, 0.03);
  });

  return (
    <group ref={shapesRef}>
      <Float speed={0.4} rotationIntensity={0.2} floatIntensity={0.5}>
        <Torus args={[1, 0.3, 16, 32]} position={[-6, 3, -5]}>
          <meshStandardMaterial color={isLight ? "#8BA51E" : "#C9E265"} wireframe={true} emissive={isLight ? "#8BA51E" : "#C9E265"} emissiveIntensity={isLight ? 0.04 : 0.08} />
        </Torus>
      </Float>

      <Float speed={0.5} rotationIntensity={0.3} floatIntensity={0.6}>
        <Icosahedron args={[1.2, 0]} position={[7, 4, -8]}>
          <meshStandardMaterial color={isLight ? "#151413" : "#FAFAFA"} roughness={0.4} metalness={0.6} opacity={0.3} transparent />
        </Icosahedron>
      </Float>

      <Float speed={0.4} rotationIntensity={0.2} floatIntensity={0.4}>
        <Box args={[1.5, 1.5, 1.5]} position={[-7, -3, -6]}>
          <meshStandardMaterial color={isLight ? "#D0CFCB" : "#2A2A2D"} roughness={0.1} metalness={0.9} />
        </Box>
      </Float>

      <Float speed={0.5} rotationIntensity={0.4} floatIntensity={0.5}>
        <TorusKnot args={[0.8, 0.25, 64, 8]} position={[6, -4, -4]}>
          <meshStandardMaterial color={isLight ? "#8BA51E" : "#C9E265"} wireframe={true} emissive={isLight ? "#8BA51E" : "#C9E265"} emissiveIntensity={isLight ? 0.04 : 0.08} />
        </TorusKnot>
      </Float>
    </group>
  );
}

export default function Scene3D() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && theme === 'light';

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={isLight ? 0.85 : 0.6} />
          <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={isLight ? 1.8 : 1.5} />
          <pointLight position={[-10, -10, -10]} color={isLight ? "#8BA51E" : "#C9E265"} intensity={2.5} />
          <Stars radius={50} depth={50} count={800} factor={1.5} saturation={0} fade speed={0.3} />
          <RotatingName isLight={isLight} />
          <FloatingShapes isLight={isLight} />
          <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.2} minPolarAngle={Math.PI / 2 - 0.2} />
        </Suspense>
      </Canvas>
    </div>
  );
}
