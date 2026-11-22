// KIT SHORT: turns a Project into Remotion components (port of merdeka Bridge.tsx).
//   const S = makeShort(PROJECT)   ->  S.Short, S.WithCaptions, S.Captions, S.total
//   in Root.tsx:  {kitCompositions("MyVideo", PROJECT)}
// Post chain: ink -> lens blur (pre + main) -> bloom -> NEUTRAL tone map -> grade; MSAA 4. One WebGL canvas per
// visible shot (cross-fades show two). Input props: { post: { ink, lens, bloom, grade, dpr } } toggles for debugging.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, Composition, Folder, getInputProps, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, Effect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { REF } from "./core/ref";
import { InkPass, noInkFallback } from "./core/ink";
import { LensBlur } from "./core/lensblur";
import { GradeEffect, GRADES, gradeFor } from "./core/grade";
import { LIGHTS } from "./core/lights";
import { KitWorld } from "./scene/runtime";
import { layersAt, totalFrames } from "./scene/model";
import type { Project } from "./scene/types";

type PostToggles = { ink: boolean; lens: boolean; bloom: boolean; grade: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, bloom: true, grade: true, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });
const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((REF.h * w) / Math.max(h, 1)), REF.h);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(), glSize = new THREE.Vector2();

const Inner: React.FC<{ project: Project; i: number; f: number }> = ({ project, i, f }) => {
  const { gl, camera, scene } = useThree();
  const world = useMemo(() => new KitWorld(project, i), [project, i]);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, 1),
  }), [camera, scene]);
  const composer = useMemo(() => {
    gl.toneMapping = THREE.NoToneMapping;
    const c = new EffectComposer(gl, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
    c.addPass(new RenderPass(scene, camera));
    if (on.ink) c.addPass(fx.ink);
    if (on.lens) { c.addPass(new EffectPass(camera, fx.lens.pre)); c.addPass(new EffectPass(camera, fx.lens.main)); }
    const tail: Effect[] = [];
    if (on.bloom) tail.push(fx.bloom);
    tail.push(fx.tone);
    if (on.grade) tail.push(fx.grade);
    c.addPass(new EffectPass(camera, ...tail));
    return c;
  }, [gl, scene, camera, fx, on]);
  useEffect(() => () => { composer.dispose(); fx.ink.dispose(); }, [composer, fx]);
  const sync = (frame: number) => {
    const cam = camera as THREE.PerspectiveCamera;
    const out = world.update(frame, cam, scene);
    noInkFallback(world.root);
    cam.getWorldDirection(fwd);
    fpt.copy(out.focus);
    fx.lens.focus = Math.max(0.2, fpt.sub(cam.position).dot(fwd));
    fx.lens.cInf = out.cInf;
    gradeFor(fx.grade, LIGHTS[out.light].grade);
  };
  sync(f);
  useFrame((_, delta) => {
    sync(f);
    gl.getSize(glSize);
    composer.setSize(glSize.width, glSize.height);
    gl.autoClear = true;
    composer.render(delta || 1 / 30);
  }, 1);
  return <primitive object={world.root} dispose={null} />;
};

const ShotView: React.FC<{ project: Project; i: number; f: number; alpha: number }> = ({ project, i, f, alpha }) => {
  REF.h = project.height ?? 1920;
  return (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={project.width ?? 1080} height={project.height ?? 1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows
      gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }} camera={{ fov: 36, near: 0.05, far: 1500 }}>
      <Inner project={project} i={i} f={f} />
    </ThreeCanvas>
  </AbsoluteFill>
  );
};

/** the caption overlay (chunks in seconds); same look as the merdeka / seandainya captions */
export const CaptionOverlay: React.FC<{ chunks: { text: string; start: number; end: number }[]; fps: number; frameOffset?: number; bg?: string }> = ({ chunks, fps, frameOffset = 0, bg }) => {
  const { width: W, height: H } = useVideoConfig();
  const time = (useCurrentFrame() + frameOffset) / fps;
  const c = chunks.find((x) => time >= x.start && time < x.end + 0.04);
  const pop = c ? 1 + 0.12 * Math.pow(1 - Math.min(1, Math.max(0, time - c.start) / 0.08), 2) : 1;
  return (
    <AbsoluteFill style={{ backgroundColor: bg || "transparent", justifyContent: "flex-end", alignItems: "center", paddingBottom: Math.round(H * (W > H ? 0.07 : 0.27)), pointerEvents: "none" }}>
      {c && (
        <span style={{ fontFamily: "'Poppins', 'Montserrat', 'Segoe UI', 'Arial Rounded MT Bold', sans-serif", fontWeight: 900, fontSize: Math.round(W > H ? H * 0.055 : H * 0.0354), lineHeight: 1.15,
          color: "#ffffff", WebkitTextStroke: `${Math.max(3, Math.round(H * 0.0036))}px #000000`, paintOrder: "stroke fill", textShadow: "0 6px 16px rgba(0,0,0,0.65)", textAlign: "center",
          maxWidth: W > H ? "78%" : "85%", transform: `scale(${pop.toFixed(3)})`, display: "inline-block" }}>{c.text}</span>
      )}
    </AbsoluteFill>
  );
};

export const makeShort = (project: Project) => {
  const total = totalFrames(project);
  const Short: React.FC<{ frameOffset?: number }> = ({ frameOffset = 0 }) => {
    const f = useCurrentFrame() + frameOffset;
    const cur = project.shots.find((s) => f >= s.a && f < s.b);
    const flash = cur?.flash ? Math.max(0, 1 - (f - cur.a) / 4) : 0;
    return (
      <AbsoluteFill style={{ backgroundColor: "#140b2e" }}>
        {layersAt(project, f).map((l) => <ShotView key={l.i} project={project} i={l.i} f={f} alpha={l.alpha} />)}
        {flash > 0 && <AbsoluteFill style={{ backgroundColor: "#ffffff", opacity: flash }} />}
        {project.audio && <Audio src={staticFile(project.audio)} startFrom={frameOffset} />}
      </AbsoluteFill>
    );
  };
  const Captions: React.FC<{ frameOffset?: number; bg?: string }> = ({ frameOffset = 0, bg }) =>
    <CaptionOverlay chunks={project.captions ?? []} fps={project.fps} frameOffset={frameOffset} bg={bg} />;
  const WithCaptions: React.FC<{ frameOffset?: number }> = ({ frameOffset = 0 }) => (
    <AbsoluteFill><Short frameOffset={frameOffset} /><Captions frameOffset={frameOffset} /></AbsoluteFill>
  );
  return { Short, WithCaptions, Captions, total };
};

/** <Folder> with <id>Short, <id>ShortWithCaptions, <id>CaptionOverlay, <id>CaptionGreenScreen compositions */
export const kitCompositions = (id: string, project: Project) => {
  const S = makeShort(project), w = project.width ?? 1080, h = project.height ?? 1920, fps = project.fps;
  const Green: React.FC = () => <S.Captions bg="#00FF00" />;
  return (
    <Folder name={id}>
      <Composition id={`${id}Short`} component={S.Short} durationInFrames={S.total} fps={fps} width={w} height={h} />
      <Composition id={`${id}ShortWithCaptions`} component={S.WithCaptions} durationInFrames={S.total} fps={fps} width={w} height={h} />
      <Composition id={`${id}CaptionOverlay`} component={S.Captions} durationInFrames={S.total} fps={fps} width={w} height={h} />
      <Composition id={`${id}CaptionGreenScreen`} component={Green} durationInFrames={S.total} fps={fps} width={w} height={h} />
    </Folder>
  );
};
