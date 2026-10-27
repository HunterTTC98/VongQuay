/**
 * Device tier detection and WebGL capabilities detection
 * Ensures smooth 60 FPS performance across all devices including low-end student phones.
 */

export interface DeviceGraphicTier {
  tier: 'HIGH' | 'MEDIUM' | 'LOW';
  isSoftwareGl: boolean;
  pixelRatio: number;
  shadows: boolean;
  antialias: boolean;
  recommendedMode: '3D' | '2D';
}

export function detectDeviceGraphicTier(): DeviceGraphicTier {
  if (typeof window === 'undefined') {
    return {
      tier: 'MEDIUM',
      isSoftwareGl: false,
      pixelRatio: 1,
      shadows: false,
      antialias: false,
      recommendedMode: '3D',
    };
  }

  // Detect Software WebGL (SwiftShader, llvmpipe, WARP, etc.)
  let isSoftwareGl = false;
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) {
      isSoftwareGl = true;
    } else {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const gpuStr = String(renderer || '');
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuStr);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    isSoftwareGl = true;
  }

  // Check hardware concurrency & mobile screen width
  const cores = navigator.hardwareConcurrency || 4;
  const isMobile = window.innerWidth < 640;
  const memory = (navigator as any).deviceMemory || 4; // in GB

  if (isSoftwareGl || memory < 2 || cores < 4) {
    return {
      tier: 'LOW',
      isSoftwareGl: true,
      pixelRatio: 1,
      shadows: false,
      antialias: false,
      recommendedMode: '2D',
    };
  }

  if (isMobile || memory <= 4 || cores <= 4) {
    return {
      tier: 'MEDIUM',
      isSoftwareGl: false,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
      shadows: false,
      antialias: true,
      recommendedMode: '3D',
    };
  }

  return {
    tier: 'HIGH',
    isSoftwareGl: false,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    shadows: true,
    antialias: true,
    recommendedMode: '3D',
  };
}
