// KIT CORE. Character card shading (lighting.md 9.2 / 9.5), from the merdeka project with three kit changes:
//  1. ZONES PER CARD: the old shader assumed a standing adult on a fixed 600 x 1000 card (head band at v .565-.6,
//     head centre v .69, half widths .2 / .15). Kit cards are sized to the pose (sitting, lying, a bamboo spear above
//     the head), so every card carries its own zone uniforms (`CardZones`, filled by kit/cast from the rig Joints).
//  2. uCharAmb: overall card brightness of the light preset (night rooms are darker than daylight; default 1).
//  3. Practical point lights tint the card (distance attenuation x a soft left/right term toward the light).
// The card takes the scene light colour as a tint, keeps a bright floor where a cast shadow falls on it, and gets a
// soft side gradient toward the real sun (head ~charGrad, torso ~bodyGrad) with a lavender far side.
import * as THREE from "three";
import { LFB, CHAR } from "./shade";

export const GRAD_K = 5.5;   // head: preset charGrad x5.5, capped at .4 linear
export const GRAD_KB = 1.6;  // torso: preset bodyGrad x1.6 -> ~10-15 % form shade on screen
export const TINT_K = 0.55;

/** global card uniforms that change per light preset (world sets them every frame) */
export const CARD_AMB = { uCharAmb: { value: 1 }, uPtCardK: { value: 0.55 } };

/** per-card zones in UV (v = 1 at the top of the card). Filled by kit/cast/actor.ts from the rig Joints. */
export type CardZones = {
  uHeadZ: { value: THREE.Vector4 };  // x chin v, y head centre v, z head half height (v), w head centre u
  uBodyZ: { value: THREE.Vector4 };  // x head half width (u), y torso half width (u), z torso bottom v, w torso top v
  uUnit: { value: THREE.Vector2 };   // one design unit in uv (x, y)
};
export const makeZones = (): CardZones => ({
  // defaults = the old standing adult on a 600 x 1000 card
  uHeadZ: { value: new THREE.Vector4(0.58, 0.69, 0.11, 0.5) },
  uBodyZ: { value: new THREE.Vector4(0.2, 0.15, 0.27, 0.57) },
  uUnit: { value: new THREE.Vector2(1 / 600, 1 / 1000) },
});

const CARD = /* glsl */ `
vec3 tintK = mix( vec3( 1.0 ), uCharTint, uTintK );
tintK /= pow( max( dot( tintK, vec3( 0.2126, 0.7152, 0.0722 ) ), 0.2 ), uNorm );
vec3 outgoingLight = diffuseColor.rgb * tintK * uCharAmb;
float head = smoothstep( uHeadZ.x - 0.015, uHeadZ.x + 0.02, vMapUv.y );                  // head zone vs body
float hw = mix( uBodyZ.y, uBodyZ.x, head );
float ucx = mix( 0.5 + ( uHeadZ.w - 0.5 ) * 0.6, uHeadZ.w, head );
float uu = clamp( ( vMapUv.x - ucx ) / max( hw, 1e-3 ), -1.0, 1.0 ) * sign( dFdx( vMapUv.x ) + 1e-7 );
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float side = sign( sunV.x ) * smoothstep( 0.0, 0.35, abs( sunV.x ) );
  float t = uu * side;
  float g = mix( uBodyGrad * uGradKB, min( uGrad * uGradK, 0.4 ), head );
  float dark = smoothstep( -0.15, 0.9, -t );
  vec3 sideK = mix( vec3( 1.0 ), uSideTint, dark * clamp( g / max( min( uGrad * uGradK, 0.4 ), 1e-3 ), 0.0, 1.5 ) * 0.5 );
  float top = 1.0 + 0.05 * clamp( ( vMapUv.y - uHeadZ.y ) / max( uHeadZ.z, 1e-3 ), -1.0, 1.0 ) * clamp( dot( sunV, upV ) * 2.0, 0.0, 1.0 ) * head;
  float lift = 1.0 + 0.04 * smoothstep( 0.0, 0.9, t );
  outgoingLight *= mix( uCharShade, 1.0, sunVis ) * ( 1.0 - g * dark ) * sideK * top * lift * uGain;
  #ifdef USE_MAP
  {
    // INNER warm rim, golden only: outermost ~2 px of the HEAD skin / TORSO silhouette on the sun-facing edge.
    float warm = smoothstep( 0.2, 0.4, 1.0 - uCharTint.b );
    float sl = length( sunV.xy );
    vec2 d2 = sunV.xy / max( sl, 1e-4 );
    vec2 duv = 2.0 * uPx * ( d2.x * dFdx( vMapUv ) + d2.y * dFdy( vMapUv ) );
    float edge = step( texture2D( map, vMapUv + duv ).a, 0.5 );
    vec2 dirU = normalize( duv + vec2( 1e-9 ) );
    vec4 c1 = texture2D( map, vMapUv - dirU * 16.0 * uUnit );
    vec4 c2 = texture2D( map, vMapUv - dirU * 40.0 * uUnit );
    float skin = step( 0.5, c1.a ) * step( 0.3, c1.r ) * step( c1.b + 0.12, c1.r ) * step( c1.g, c1.r + 0.02 );
    float torso = step( uBodyZ.z, vMapUv.y ) * step( vMapUv.y, uBodyZ.w ) * step( 0.5, c1.a ) * step( 0.5, c2.a ) * step( 0.04, max( c1.r, max( c1.g, c1.b ) ) );
    float rim = warm * smoothstep( 0.1, 0.4, sl ) * edge * max( skin * head, torso ) * mix( 0.6, 1.0, sunVis );
    outgoingLight += vec3( 0.95, 0.52, 0.16 ) * rim;
  }
  #endif
}
#endif
#if NUM_POINT_LIGHTS > 0
{
  // practical lights: a card has no useful normal, so use the distance attenuation and a soft left/right term
  IncidentLight ptL; vec3 ptSum = vec3( 0.0 ); float sideP = 1.0;
  #pragma unroll_loop_start
  for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
    getPointLightInfo( pointLights[ i ], geometryPosition, ptL );
    sideP = 0.75 + 0.25 * clamp( uu * sign( ptL.direction.x ) * smoothstep( 0.0, 0.3, abs( ptL.direction.x ) ), -1.0, 1.0 );
    ptSum += ptL.color * sideP;
  }
  #pragma unroll_loop_end
  outgoingLight += diffuseColor.rgb * ptSum * uPtCardK;
}
#endif
`;

const DECL = "#include <common>\nuniform vec3 uCharTint; uniform float uCharShade; uniform float uGrad; uniform float uBodyGrad; uniform vec3 uSideTint;"
  + " uniform float uGradK; uniform float uGradKB; uniform float uTintK; uniform float uNorm; uniform float uGain; uniform float uPx;"
  + " uniform float uCharAmb; uniform float uPtCardK; uniform vec4 uHeadZ; uniform vec4 uBodyZ; uniform vec2 uUnit;";
/** card-only constants (not per light): gradient share, tint share, overall gain (calibrated: faces ~.93 V) */
export const CARD_K = { uGradK: { value: GRAD_K }, uGradKB: { value: GRAD_KB }, uTintK: { value: TINT_K }, uNorm: { value: 0.7 }, uGain: { value: 1.03 }, uPx: { value: 0.5 } }; // uPx = render height / 1920 (set per draw in cast)

/** MeshLambertMaterial -> lit card: no emissive, scene tint, bright floor, side gradient toward the sun.
 *  `zones` are this card's own uniforms (pass one object per card; update its values per frame). */
export function cardShade(m: THREE.MeshLambertMaterial, zones: CardZones = makeZones()) {
  m.emissive.set(0x000000); m.emissiveIntensity = 0; m.emissiveMap = null;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, CHAR, CARD_K, CARD_AMB, zones);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", DECL)
      .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
      .replace("vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;", CARD);
  };
  m.customProgramCacheKey = () => "card10";
  return m;
}

/** ground contact blob: multiplies what is already drawn (the ground); drawn after the ground and before the cards */
export const blobMaterial = (map: THREE.Texture) => new THREE.MeshBasicMaterial({
  map, transparent: false, depthWrite: false, fog: false, toneMapped: false,
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide,
});
