import { Geometry, Mesh, Shader } from 'pixi.js';
import { UNIT } from '@/game/config';
import { MAX_LANTERNS } from '@/game/light';
import type { LightParams } from '@/game/light';

export interface DarknessFrame {
  light: LightParams;
  frontPx: number;
  night: number;
  time: number;
}

interface DarknessUniforms {
  uSize: Float32Array;
  uOrigin: Float32Array;
  uLight: Float32Array;
  uBeam: Float32Array;
  uLanternR: Float32Array;
  uLanternCount: number;
  uLanterns: Float32Array;
  uFront: number;
  uNight: number;
  uTime: number;
  uUnit: number;
}

/** How far past the map's edge the darkness reaches, so zooming out never shows its border. */
const OVERSCAN = 4000;

const VERTEX = `
in vec2 aPosition;
out vec2 vPos;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vPos = aPosition;
}
`;

const FRAGMENT = `
precision highp float;

in vec2 vPos;

uniform vec2 uSize;
uniform vec2 uOrigin;
uniform vec4 uLight;
uniform vec2 uBeam;
uniform vec2 uLanternR;
uniform float uLanternCount;
uniform vec2 uLanterns[${MAX_LANTERNS}];
uniform float uFront;
uniform float uNight;
uniform float uTime;
uniform float uUnit;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;

  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }

  return v;
}

float angleDelta(float a, float b) {
  float d = mod(abs(a - b), 6.2831853);

  return d > 3.1415927 ? 6.2831853 - d : d;
}

float beamAmount(vec2 d, float dist) {
  if (uLight.z <= 0.0) {
    return 0.0;
  }

  float along = 1.0 - smoothstep(uLight.z * 0.8, uLight.z, dist);
  float across = 1.0 - smoothstep(uBeam.x * 0.75, uBeam.x, angleDelta(atan(d.y, d.x), uLight.w));

  return along * across;
}

float lightAmount(vec2 p, out float beam) {
  vec2 d = p - uOrigin;
  float dist = length(d);
  float amount = uLight.y > 0.0 ? 1.0 - smoothstep(uLight.x, uLight.y, dist) : 0.0;
  beam = beamAmount(d, dist);
  amount = max(amount, beam);

  for (int i = 0; i < ${MAX_LANTERNS}; i++) {
    if (float(i) >= uLanternCount) {
      break;
    }

    amount = max(amount, 1.0 - smoothstep(uLanternR.x, uLanternR.y, distance(p, uLanterns[i])));
  }

  return amount;
}

void main() {
  vec2 p = vPos;
  float t = uTime;
  float beam;
  float light = lightAmount(p, beam);

  float edge = min(min(p.x, p.y), min(uSize.x - p.x, uSize.y - p.y));
  float slow = fbm(p * 0.007 + vec2(t * 0.04, -t * 0.03));
  float fast = fbm(p * 0.028 + vec2(-t * 0.16, t * 0.1));

  float reach = 1.0 - smoothstep(uFront - uUnit * 0.9, uFront + uUnit * 0.3, edge + (slow - 0.5) * uUnit * 3.0);
  float cover = reach * smoothstep(0.3, 0.8, 1.0 - light + (fast - 0.5) * 0.55);
  float ambient = uNight * (0.14 + (1.0 - light) * 0.5);
  float alpha = clamp(max(ambient, cover * (0.9 + slow * 0.1)), 0.0, 1.0);

  vec3 tint = mix(vec3(0.016, 0.022, 0.034), vec3(0.0), cover);
  vec3 color = tint * alpha;

  float warmth = uNight * (light * 0.06 + beam * 0.08 * (0.8 + fast * 0.4));
  color += vec3(1.0, 0.94, 0.82) * warmth;

  if (cover > 0.85 && uNight > 0.3) {
    vec2 cell = floor(p / 120.0);
    float h = hash(cell);

    if (h < 0.2) {
      vec2 centre = (cell + 0.3 + 0.4 * vec2(hash(cell + 3.1), hash(cell + 7.7))) * 120.0;
      float open = smoothstep(0.6, 0.85, sin(t * (0.4 + h * 2.0) + h * 60.0));
      vec2 q = p - centre;
      q.y *= 2.4;
      float eye = smoothstep(2.8, 1.2, min(length(q - vec2(-5.5, 0.0)), length(q - vec2(5.5, 0.0))));
      color += vec3(0.85, 0.9, 1.0) * eye * open * cover * uNight;
    }
  }

  gl_FragColor = vec4(color, alpha);
}
`;

export function createDarkness (width: number, height: number) {
  const geometry = new Geometry({
    attributes: {
      aPosition: new Float32Array([
        -OVERSCAN, -OVERSCAN,
        width + OVERSCAN, -OVERSCAN,
        width + OVERSCAN, height + OVERSCAN,
        -OVERSCAN, height + OVERSCAN
      ])
    },
    indexBuffer: [0, 1, 2, 0, 2, 3]
  });

  const shader = Shader.from({
    gl: { vertex: VERTEX, fragment: FRAGMENT },
    resources: {
      darkness: {
        uSize: { value: new Float32Array([width, height]), type: 'vec2<f32>' },
        uOrigin: { value: new Float32Array(2), type: 'vec2<f32>' },
        uLight: { value: new Float32Array(4), type: 'vec4<f32>' },
        uBeam: { value: new Float32Array(2), type: 'vec2<f32>' },
        uLanternR: { value: new Float32Array(2), type: 'vec2<f32>' },
        uLanternCount: { value: 0, type: 'f32' },
        uLanterns: { value: new Float32Array(MAX_LANTERNS * 2), type: 'vec2<f32>', size: MAX_LANTERNS },
        uFront: { value: 0, type: 'f32' },
        uNight: { value: 0, type: 'f32' },
        uTime: { value: 0, type: 'f32' },
        uUnit: { value: UNIT, type: 'f32' }
      }
    }
  });

  const mesh = new Mesh({ geometry, shader });

  function update (frame: DarknessFrame) {
    const group = shader.resources.darkness;
    const u = group.uniforms as DarknessUniforms;
    const { light } = frame;

    u.uOrigin.set([light.origin.x, light.origin.y]);
    u.uLight.set([light.lit, light.dim, light.beamLength, light.beamAngle]);
    u.uBeam.set([light.beamHalfArc, 0]);
    u.uLanternR.set([light.lanternLit, light.lanternDim]);
    u.uLanternCount = light.lanterns.length;
    light.lanterns.forEach((lantern, i) => u.uLanterns.set([lantern.x, lantern.y], i * 2));
    u.uFront = frame.frontPx;
    u.uNight = frame.night;
    u.uTime = frame.time;
    group.update();
  }

  return { mesh, update };
}
