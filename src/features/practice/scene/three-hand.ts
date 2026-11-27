import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  WebGLRenderer,
  type BufferGeometry,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Tile } from '../../../engine/types';
import {
  TILE_DEPTH,
  TILE_HEIGHT,
  TILE_WIDTH,
  sceneWidth,
  type HandSceneItem,
  type HandSceneLayout,
} from './layout';
import {
  DEFAULT_ORBIT,
  orbitFromDrag,
  orbitPosition,
  type Orbit,
} from './camera';
import { createFaceCanvas, textureKey } from './textures';

/**
 * Three.js の牌卓。React に依存しないので、動的 import の中でだけ使う。
 * - ライトは HemisphereLight + DirectionalLight
 * - 接地影は Plane + ShadowMaterial
 * - 描画は on-demand（変化があったときだけ RAF を 1 回）
 */

export interface HandScene {
  update(layout: HandSceneLayout): void;
  resetView(): void;
  dispose(): void;
}

const FELT_COLOR = 0x103a2e;
const BACKGROUND_COLOR = 0x0d2f26;
const IVORY = 0xf6efdd;
const GOLD = 0xc9a227;
const BACK_GREEN = 0x1f5a45;

const EMPTY_LAYOUT: HandSceneLayout = {
  items: [],
  width: 14 * (TILE_WIDTH + 0.06),
  height: TILE_HEIGHT,
  dora: null,
};

export function createHandScene(host: HTMLElement): HandScene {
  let orbit: Orbit = { ...DEFAULT_ORBIT };
  let layout: HandSceneLayout = EMPTY_LAYOUT;

  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.cursor = 'grab';
  // 横ドラッグだけ拾い、縦スクロールはページに譲る。
  canvas.style.touchAction = 'pan-y';
  host.appendChild(canvas);

  const scene = new Scene();
  scene.background = new Color(BACKGROUND_COLOR);

  const camera = new OrthographicCamera(-8, 8, 4, -4, 0.1, 100);
  camera.position.set(0, 7.5, 9.5);
  camera.lookAt(0, 0, 0);

  // フェルト面。粗い roughness で光を広く散らす。
  const feltGeometry = new PlaneGeometry(64, 40);
  const feltMaterial = new MeshStandardMaterial({
    color: FELT_COLOR,
    roughness: 0.97,
    metalness: 0,
  });
  const felt = new Mesh(feltGeometry, feltMaterial);
  felt.rotation.x = -Math.PI / 2;
  felt.position.y = 0;
  // 影は ShadowMaterial の Plane だけで受ける（二重に暗くしない）。
  felt.receiveShadow = false;
  scene.add(felt);

  // 接地影だけを落とす透明な Plane。
  const shadowGeometry = new PlaneGeometry(64, 40);
  const shadowMaterial = new ShadowMaterial({ opacity: 0.34 });
  const shadowPlane = new Mesh(shadowGeometry, shadowMaterial);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.004;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const hemisphere = new HemisphereLight(0xe2f2e6, 0x08201a, 1.15);
  scene.add(hemisphere);

  const directional = new DirectionalLight(0xfff2da, 2.1);
  directional.position.set(6, 12, 8);
  directional.castShadow = true;
  directional.shadow.mapSize.set(1024, 1024);
  directional.shadow.camera.left = -18;
  directional.shadow.camera.right = 18;
  directional.shadow.camera.top = 12;
  directional.shadow.camera.bottom = -12;
  directional.shadow.camera.near = 1;
  directional.shadow.camera.far = 44;
  directional.shadow.bias = -0.0006;
  scene.add(directional);

  const tiles = new Group();
  tiles.name = 'hand';
  scene.add(tiles);

  // 共有ジオメトリ・マテリアル。牌の数だけ複製しない。
  const tileGeometry = new RoundedBoxGeometry(
    TILE_WIDTH,
    TILE_HEIGHT,
    TILE_DEPTH,
    4,
    0.08,
  );
  const faceGeometry = new PlaneGeometry(
    TILE_WIDTH * 0.8,
    TILE_HEIGHT * 0.81,
  );
  const winEdges = new EdgesGeometry(tileGeometry, 24);

  const bodyMaterial = new MeshStandardMaterial({
    color: IVORY,
    roughness: 0.46,
    metalness: 0.03,
  });
  const winBodyMaterial = new MeshStandardMaterial({
    color: 0xf8f2e4,
    roughness: 0.36,
    metalness: 0.06,
    emissive: new Color(GOLD),
    emissiveIntensity: 0.3,
  });
  const backMaterial = new MeshStandardMaterial({
    color: BACK_GREEN,
    roughness: 0.62,
    metalness: 0.02,
  });
  const edgeMaterial = new LineBasicMaterial({
    color: GOLD,
    transparent: true,
    opacity: 0.95,
  });

  const faceCache = new Map<string, MeshBasicMaterial>();

  let frame = 0;
  let disposed = false;
  let inView = true;

  const faceMaterial = (tile: Tile): MeshBasicMaterial => {
    const key = textureKey(tile);
    const cached = faceCache.get(key);
    if (cached) return cached;

    let texture: CanvasTexture | null = null;
    const faceCanvas = createFaceCanvas(tile, () => {
      if (disposed || !texture) return;
      texture.needsUpdate = true;
      requestRender();
    });

    let material: MeshBasicMaterial;
    if (faceCanvas) {
      texture = new CanvasTexture(faceCanvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = Math.min(
        4,
        renderer.capabilities.getMaxAnisotropy(),
      );
      texture.needsUpdate = true;
      // 牌面は印刷面なのでライティングに影響させず、SVG の色をそのまま出す。
      material = new MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: DoubleSide,
        toneMapped: false,
      });
    } else {
      material = new MeshBasicMaterial({ color: IVORY });
    }
    faceCache.set(key, material);
    return material;
  };

  const buildTile = (item: HandSceneItem): Group => {
    const group = new Group();
    group.name = item.id;

    const bodyMaterialForTile = item.faceDown
      ? backMaterial
      : item.highlight
        ? winBodyMaterial
        : bodyMaterial;
    const body = new Mesh(tileGeometry, bodyMaterialForTile);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    if (!item.faceDown) {
      const face = new Mesh(faceGeometry, faceMaterial(item.tile));
      face.position.z = TILE_DEPTH / 2 + 0.004;
      group.add(face);
    }

    if (item.highlight) {
      // 和了牌は金の縁。色だけに頼らず、DOM 側の「和了」ラベルでも示す。
      const edges = new LineSegments(winEdges, edgeMaterial);
      group.add(edges);
    }

    group.position.set(item.x, item.y, item.z);
    group.rotation.z = item.rotation;
    group.scale.setScalar(item.scale);
    return group;
  };

  const updateFrustum = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const aspect = width / height;
    const viewWidth = Math.max(sceneWidth(layout), 3);
    const viewHeight = Math.max(viewWidth / aspect, 2.6);
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  };

  const applyOrbit = () => {
    const position = orbitPosition(orbit);
    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(0, 0, 0);
  };

  function requestRender(): void {
    if (disposed || frame !== 0) return;
    if (!inView) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      if (disposed) return;
      renderer.render(scene, camera);
    });
  }

  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    updateFrustum();
    requestRender();
  };

  const resetView = () => {
    orbit = { ...DEFAULT_ORBIT };
    applyOrbit();
    requestRender();
  };

  let drag: { x: number; y: number; start: Orbit } | null = null;

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, start: { ...orbit } };
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // ポインタキャプチャ非対応でも window 側で追従する。
    }
    canvas.style.cursor = 'grabbing';
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
    orbit = orbitFromDrag(drag.start, deltaX, deltaY);
    applyOrbit();
    requestRender();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) return;
    drag = null;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // 解放できなくても致命的ではない。
    }
    canvas.style.cursor = 'grab';
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('dblclick', resetView);

  const onVisibilityChange = () => {
    if (!document.hidden) requestRender();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  let intersectionObserver: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true;
        if (inView) requestRender();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(host);
  }

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
  } else {
    window.addEventListener('resize', resize);
  }

  const update = (next: HandSceneLayout) => {
    if (disposed) return;
    layout = next;
    for (const child of [...tiles.children]) {
      tiles.remove(child);
    }
    for (const item of next.items) {
      tiles.add(buildTile(item));
    }
    if (next.dora) tiles.add(buildTile(next.dora));
    updateFrustum();
    applyOrbit();
    requestRender();
  };

  const disposeObject = (root: Object3D) => {
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      const material = (mesh as Mesh).material;
      if (Array.isArray(material)) {
        for (const entry of material) materials.add(entry);
      } else if (material) {
        materials.add(material);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) {
      const map = (material as MeshStandardMaterial).map;
      map?.dispose();
      material.dispose();
    }
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (frame !== 0) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
    canvas.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('dblclick', resetView);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('resize', resize);
    intersectionObserver?.disconnect();
    resizeObserver?.disconnect();
    drag = null;

    disposeObject(scene);
    tiles.clear();
    faceCache.clear();
    renderer.dispose();
    renderer.forceContextLoss();
    if (canvas.parentElement === host) host.removeChild(canvas);
  };

  applyOrbit();
  resize();

  return { update, resetView, dispose };
}
