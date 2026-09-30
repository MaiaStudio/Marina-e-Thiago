"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

const CAM_FOV = 75

const CAM_Z = 6

const VIEW_HEIGHT = 2 * CAM_Z * Math.tan((CAM_FOV * Math.PI) / 360)

const PAGE_SEGMENTS = 40

const MAX_PAGES = 60

const THICKNESS_RATIO = 0.005

const OFFSET_RANGE = 250

const MOBILE_MAX_ATLAS = 2048
const DESKTOP_MAX_ATLAS = 4096
const MOBILE_MAX_CELL = 256
const DESKTOP_MAX_CELL = 512

const PLACEHOLDER_ASPECTS = [
    0.72, 1.5, 0.78, 1.33, 1.0, 1.62, 0.68, 1.2, 0.86, 1.45,
]
const PLACEHOLDER_COUNT = 10

const DEFAULT_VIEW = {
    tap: true,
    zoom: 5,
    speed: 5,
}

const DEFAULT_TRAVEL = {
    drift: 2,
    smoothing: 5,
    wave: 5,
}

const DEFAULTS = {
    images: [{"image":{"src":"https://images.unsplash.com/photo-1656872626435-0d5b22738091?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDExN3x8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1687618083947-691b6c4adb4d?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDEzMnx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1689872330402-fef4837b23c4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDEzNHx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1741335661494-a2c26dfa7613?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDEzNnx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1735485410477-27bbc75261ff?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE0MXx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1757008845699-431fc010a051?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE0NXx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1617866238699-c96c5b1e5639?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE0OHx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1729779831897-5b8ce9aca81d?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE1Nnx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1744732053134-8890d62d9db4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE3Mnx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1697215786004-682b1684c65e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE3Nnx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0}],
    background: "#000000",
    pages: 20,
    spacing: 5,
    tilt: 0,
    turn: 0,
    pageWidth: 600,
    pageHeight: 500,
    view: DEFAULT_VIEW,
    scrollSens: 5,
    travel: DEFAULT_TRAVEL,
}

const CORRIDOR_DIM = 0.22

const TAP_SLOP = 8
const TAP_MS = 600

const PICK_MAX = 1600

type ResponsiveImage = { src?: string; srcSet?: string; alt?: string } | string

type ImageEntry = { image?: ResponsiveImage; offsetY?: number } | ResponsiveImage

export interface View {
    tap: boolean

    zoom: number

    speed: number
}

export interface Travel {
    drift: number

    smoothing: number

    wave: number
}

export interface MagazineFlipProps {
    images: ImageEntry[]
    background: string

    pages: number

    spacing: number

    tilt: number

    turn: number
    pageWidth: number
    pageHeight: number
    view: Partial<View>

    scrollSens: number
    travel: Partial<Travel>
    style?: React.CSSProperties
    onSelect?: (index: number) => void
}

type Config = {
    images: ImageEntry[]
    pages: number
    spacing: number
    tilt: number
    turn: number
    pageWidth: number
    pageHeight: number
    view: View
    scrollSens: number
    travel: Travel
    onSelect?: (index: number) => void
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

function srcOf(image: ResponsiveImage): string {
    if (typeof image === "string") return image
    return image?.src ?? ""
}

function altOf(image: ResponsiveImage): string {
    if (typeof image === "string") return ""
    return image?.alt ?? ""
}

function imageOf(entry: ImageEntry): ResponsiveImage {
    if (entry && typeof entry === "object" && "image" in entry) {
        return (entry.image ?? "") as ResponsiveImage
    }
    return entry as ResponsiveImage
}

function offsetOf(entry: ImageEntry): number {
    if (entry && typeof entry === "object" && "offsetY" in entry) {
        const n = (entry as { offsetY?: number }).offsetY
        return typeof n === "number" && isFinite(n) ? n : 0
    }
    return 0
}

function power2InOut(t: number): number {
    if (t <= 0) return 0
    if (t >= 1) return 1
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function settingsFor(cfg: Config, viewWidthPx: number, viewHeightPx: number) {
    const worldPerPx = VIEW_HEIGHT / Math.max(1, viewHeightPx)
    const viewAspect = Math.max(1, viewWidthPx) / Math.max(1, viewHeightPx)
    const pageWidthPx = clamp(cfg.pageWidth, 40, 1200, DEFAULTS.pageWidth)
    const pageHeightPx = clamp(cfg.pageHeight, 40, 1600, DEFAULTS.pageHeight)
    const pageWidth = pageWidthPx * worldPerPx
    const pageHeight = pageHeightPx * worldPerPx
    const spacing = clamp(cfg.spacing, 0, 10, DEFAULTS.spacing)
    const smoothing = clamp(
        cfg.travel.smoothing,
        0,
        10,
        DEFAULT_TRAVEL.smoothing
    )
    const wave = clamp(cfg.travel.wave, 0, 10, DEFAULT_TRAVEL.wave)
    const drift = clamp(cfg.travel.drift, -10, 10, DEFAULT_TRAVEL.drift)

    const focusZ = Math.min(CAM_Z * 0.55, pageWidth * 0.75)

    const planeHeight = (VIEW_HEIGHT * (CAM_Z - focusZ)) / CAM_Z
    const planeWidth = planeHeight * viewAspect
    const fill = 0.6 + clamp(cfg.view.zoom, 0, 10, DEFAULT_VIEW.zoom) * 0.04

    return {
        pageWidth,
        pageHeight,
        pageWidthPx,
        pageHeightPx,
        worldPerPx,
        pages: Math.round(clamp(cfg.pages, 4, MAX_PAGES, DEFAULTS.pages)),

        pageSpacing: pageWidth * (0.1 + spacing * 0.08),
        thickness: pageWidth * THICKNESS_RATIO,
        tilt: (clamp(cfg.tilt, -45, 45, DEFAULTS.tilt) * Math.PI) / 180,
        turn: (clamp(cfg.turn, -60, 60, DEFAULTS.turn) * Math.PI) / 180,

        wave: pageWidth * 0.04 * wave,

        lerp: 0.35 * Math.pow(0.82, smoothing),
        driftPerSecond: drift * pageWidth * 0.15,
        wheel: 0.4 + clamp(cfg.scrollSens, 0, 10, DEFAULTS.scrollSens) * 0.16,
        tapToView: cfg.view.tap !== false,
        focusZ,

        focusScale: Math.min(
            (planeHeight * fill) / pageHeight,
            (planeWidth * fill) / pageWidth
        ),

        viewDuration:
            1.6 - clamp(cfg.view.speed, 0, 10, DEFAULT_VIEW.speed) * 0.13,
    }
}

const PAGE_VERTEX =  `
attribute float aIndex;
attribute vec4 aRect;
attribute float aAspect;
attribute float aOffset;

uniform float uPageThickness;
uniform float uPageWidth;
uniform float uPageHeight;
uniform float uMeshCount;
uniform float uPageSpacing;
uniform float uScrollY;
uniform float uSpeedY;
uniform float uWave;
uniform float uTilt;
uniform float uTurn;
uniform float uFocusIndex;
uniform float uFocusProgress;
uniform float uFocusScale;
uniform float uFocusZ;

varying vec2 vUv;
varying vec4 vRect;
varying float vAspect;
varying float vOffset;
varying float vIndex;
varying float vDim;

const float TAU_HALF = 3.14159265359;

mat3 rotY(float a) {
    return mat3(cos(a), 0.0, sin(a), 0.0, 1.0, 0.0, -sin(a), 0.0, cos(a));
}

mat3 rotX(float a) {
    return mat3(1.0, 0.0, 0.0, 0.0, cos(a), -sin(a), 0.0, sin(a), cos(a));
}

void main() {
    float PI = TAU_HALF;

    float isLandscape = step(1.0, aAspect);
    float pw = mix(uPageHeight * aAspect, uPageWidth, isLandscape);
    float ph = mix(uPageHeight, uPageWidth / max(0.01, aAspect), isLandscape);

    vec3 basePos = vec3(
        position.x * pw,
        position.y * ph,
        position.z * uPageThickness
    );

    vec3 rotationCenter = vec3(-pw * 0.5, 0.0, 0.0);

    float fromMiddle = aIndex - (uMeshCount - 1.0) * 0.5;

    float yAngle = -PI * 0.5 + uTurn;
    float xAngle = uTilt;

    float boxCenterZ = uPageSpacing * (-fromMiddle);
    float maxZ = uMeshCount * (uPageSpacing + uPageThickness) * 0.5;

    float bow = sin((position.y + 0.5) * 2.0) * uWave;
    float speed = clamp(uSpeedY / pw * 4.0, -2.0, 2.0);

    float zCorridor = mod(boxCenterZ - uScrollY + maxZ, 2.0 * maxZ) - maxZ
        - bow * speed;

    float focused = step(abs(aIndex - uFocusIndex), 0.5);
    float e = focused * uFocusProgress;

    float k = mix(1.0, uFocusScale, e);
    vec3 pivot = rotationCenter * (1.0 - e);

    vec3 vertexLocal = basePos * k - pivot;
    vertexLocal.z += zCorridor * (1.0 - e);

    vec3 rotated = rotY(yAngle * (1.0 - e)) * vertexLocal + pivot;

    rotated.z -= pw * 0.5 * (1.0 - e);
    rotated.x += pw * 0.5 * (1.0 - e);

    vec3 newPosition = rotX(xAngle * (1.0 - e)) * rotated;
    newPosition.z += uFocusZ * e;

    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    gl_Position = projectionMatrix * viewMatrix * modelPosition;

    vUv = uv;
    vRect = aRect;
    vAspect = aAspect;

    vOffset = aOffset;
    vIndex = aIndex;

    vDim = uFocusProgress * (1.0 - focused);
}
`

const PAGE_FRAGMENT =  `
uniform sampler2D uAtlas;

varying vec2 vUv;
varying vec4 vRect;
varying float vAspect;
varying float vOffset;
varying float vDim;

void main() {
    vec2 atlasUv = mix(vRect.xy, vRect.zw, clamp(vUv, 0.0, 1.0));
    vec4 color = texture2D(uAtlas, atlasUv);

    gl_FragColor = vec4(color.rgb * mix(1.0, ${CORRIDOR_DIM.toFixed(2)}, vDim), color.a);
}
`

const PICK_FRAGMENT =  `
varying float vIndex;

void main() {
    gl_FragColor = vec4((vIndex + 1.0) / 255.0, 0.0, 0.0, 1.0);
}
`

interface Cell {
    rect: [number, number, number, number]
    aspect: number
}

interface Atlas {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
    texture: THREE.CanvasTexture
    cells: Cell[]
    cols: number
    rows: number
    cell: number
    updateCell: (index: number, img: HTMLImageElement) => void
    dispose: () => void
}

const imageCache = new Map<string, HTMLImageElement | null>()
const imagePending = new Map<string, Promise<HTMLImageElement | null>>()

function loadImage(url: string): Promise<HTMLImageElement | null> {
    if (!url) return Promise.resolve(null)
    if (imageCache.has(url)) return Promise.resolve(imageCache.get(url) ?? null)
    const pending = imagePending.get(url)
    if (pending) return pending
    const p = new Promise<HTMLImageElement | null>((resolve) => {
        const img = new window.Image()

        if (url.startsWith("http://") || url.startsWith("https://")) {
            if (typeof window !== "undefined" && !url.startsWith(window.location.origin)) {
                img.crossOrigin = "anonymous"
            }
        }
        img.onload = () => {
            imageCache.set(url, img)
            resolve(img)
        }
        img.onerror = () => {
            imageCache.set(url, null)
            resolve(null)
        }
        img.src = url
    })
    imagePending.set(url, p)
    return p
}

function drawPlaceholder(
    ctx: CanvasRenderingContext2D,
    index: number,
    x: number,
    y: number,
    w: number,
    h: number
) {
    const hue = (index * 47) % 360
    const grad = ctx.createLinearGradient(x, y, x + w, y + h)
    grad.addColorStop(0, `hsl(${hue}, 22%, 27%)`)
    grad.addColorStop(0.55, `hsl(${hue}, 18%, 13%)`)
    grad.addColorStop(1, `hsl(${(hue + 40) % 360}, 24%, 23%)`)
    ctx.fillStyle = grad
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = "rgba(255,255,255,0.14)"
    ctx.lineWidth = Math.max(1, Math.round(w * 0.008))
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
    ctx.fillStyle = "rgba(255,255,255,0.68)"
    ctx.font = `500 ${Math.round(
        Math.min(w, h) * 0.26
    )}px ui-sans-serif, system-ui, -apple-system, sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(String(index + 1).padStart(2, "0"), x + w / 2, y + h / 2)
}

function createAtlas(
    n: number,
    maxTextureDim: number,
    cellMax: number,
    maxAnisotropy: number
): Atlas | null {
    const total = Math.max(1, n)
    const cols = Math.ceil(Math.sqrt(total))
    const rows = Math.ceil(total / cols)
    const cell = Math.max(64, Math.min(cellMax, Math.floor(maxTextureDim / Math.max(cols, rows))))

    const canvas = document.createElement("canvas")
    canvas.width = cols * cell
    canvas.height = rows * cell
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const cells: Cell[] = []

    for (let i = 0; i < total; i++) {
        const cx = (i % cols) * cell
        const cy = Math.floor(i / cols) * cell
        const aspect = PLACEHOLDER_ASPECTS[i % PLACEHOLDER_ASPECTS.length]
        const w = aspect >= 1 ? cell : cell * aspect
        const h = aspect >= 1 ? cell / aspect : cell
        const dx = cx + (cell - w) / 2
        const dy = cy + (cell - h) / 2

        drawPlaceholder(ctx, i, dx, dy, w, h)

        const u0 = (dx + 1) / canvas.width
        const u1 = (dx + w - 1) / canvas.width
        const vTop = 1 - (dy + 1) / canvas.height
        const vBottom = 1 - (dy + h - 1) / canvas.height
        cells.push({ rect: [u0, vBottom, u1, vTop], aspect })
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.NoColorSpace
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
    texture.anisotropy = maxAnisotropy
    texture.needsUpdate = true

    const updateCell = (index: number, img: HTMLImageElement) => {
        if (index < 0 || index >= total) return
        const cx = (index % cols) * cell
        const cy = Math.floor(index / cols) * cell
        const aspect =
            img.naturalHeight > 0
                ? img.naturalWidth / img.naturalHeight
                : PLACEHOLDER_ASPECTS[index % PLACEHOLDER_ASPECTS.length]
        const w = aspect >= 1 ? cell : cell * aspect
        const h = aspect >= 1 ? cell / aspect : cell
        const dx = cx + (cell - w) / 2
        const dy = cy + (cell - h) / 2

        ctx.clearRect(cx, cy, cell, cell)
        try {
            ctx.drawImage(img, dx, dy, w, h)
        } catch {
            drawPlaceholder(ctx, index, dx, dy, w, h)
            return
        }

        const u0 = (dx + 1) / canvas.width
        const u1 = (dx + w - 1) / canvas.width
        const vTop = 1 - (dy + 1) / canvas.height
        const vBottom = 1 - (dy + h - 1) / canvas.height
        cells[index] = { rect: [u0, vBottom, u1, vTop], aspect }
    }

    const dispose = () => {
        texture.dispose()
        canvas.width = 1
        canvas.height = 1
    }

    return { canvas, ctx, texture, cells, cols, rows, cell, updateCell, dispose }
}

function blankTexture(): THREE.DataTexture {
    const t = new THREE.DataTexture(
        new Uint8Array([46, 46, 48, 255]),
        1,
        1,
        THREE.RGBAFormat
    )
    t.needsUpdate = true
    return t
}

class MagazineScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera: THREE.PerspectiveCamera
    private geometry: THREE.BoxGeometry
    private material: THREE.ShaderMaterial
    private pickMaterial: THREE.ShaderMaterial
    private mesh: THREE.InstancedMesh
    private blank: THREE.DataTexture
    private atlas: Atlas | null = null

    private pickTarget = new THREE.WebGLRenderTarget(1, 1)
    private pickBuffer = new Uint8Array(4)

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false
    private atlasToken = 0
    private atlasKey = ""

    private rectAttr: THREE.InstancedBufferAttribute
    private aspectAttr: THREE.InstancedBufferAttribute
    private offsetAttr: THREE.InstancedBufferAttribute

    private scroll = { target: 0, current: 0, speed: 0 }
    private drag = { active: false, lastX: 0, lastY: 0, id: -1 }

    private focus = { index: -1, t: 0, target: 0 }

    private tap = { x: 0, y: 0, at: 0, id: -1, hit: -1 }

    private settingsCache: ReturnType<typeof settingsFor> | null = null

    onAtlasReady: (() => void) | null = null

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

        this.renderer.setClearColor(0x000000, 0)
        const canvas = this.renderer.domElement
        canvas.style.cssText =
            "position:absolute;inset:0;width:100%;height:100%;display:block"
        container.appendChild(canvas)

        canvas.addEventListener(
            "webglcontextlost",
            (event) => {
                event.preventDefault()
                this.pause()
            },
            false
        )
        canvas.addEventListener(
            "webglcontextrestored",
            () => {
                this.loadAtlas()
                this.start()
            },
            false
        )

        this.camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 200)
        this.camera.position.z = CAM_Z
        this.scene.add(this.camera)

        this.blank = blankTexture()

        this.geometry = new THREE.BoxGeometry(
            1,
            1,
            1,
            PAGE_SEGMENTS,
            PAGE_SEGMENTS,
            1
        )

        this.material = new THREE.ShaderMaterial({
            vertexShader: PAGE_VERTEX,
            fragmentShader: PAGE_FRAGMENT,
            transparent: true,
            uniforms: {
                uPageThickness: { value: 0.01 },
                uPageWidth: { value: 2 },
                uPageHeight: { value: 3 },
                uMeshCount: { value: DEFAULTS.pages },
                uPageSpacing: { value: 1 },
                uScrollY: { value: 0 },
                uSpeedY: { value: 0 },
                uWave: { value: 0.4 },
                uTilt: { value: 0 },
                uTurn: { value: 0 },
                uFocusIndex: { value: -1 },
                uFocusProgress: { value: 0 },
                uFocusScale: { value: 1 },
                uFocusZ: { value: 0 },
                uPageAspect: { value: 2 / 3 },
                uAtlas: { value: this.blank as THREE.Texture },
            },
        })

        this.pickMaterial = new THREE.ShaderMaterial({
            vertexShader: PAGE_VERTEX,
            fragmentShader: PICK_FRAGMENT,
            uniforms: this.material.uniforms,
        })

        this.mesh = new THREE.InstancedMesh(
            this.geometry,
            this.material,
            MAX_PAGES
        )

        this.mesh.frustumCulled = false

        const index = new Float32Array(MAX_PAGES)
        for (let i = 0; i < MAX_PAGES; i++) index[i] = i
        this.geometry.setAttribute(
            "aIndex",
            new THREE.InstancedBufferAttribute(index, 1)
        )
        this.rectAttr = new THREE.InstancedBufferAttribute(
            new Float32Array(MAX_PAGES * 4),
            4
        )
        this.aspectAttr = new THREE.InstancedBufferAttribute(
            new Float32Array(MAX_PAGES).fill(1),
            1
        )
        this.offsetAttr = new THREE.InstancedBufferAttribute(
            new Float32Array(MAX_PAGES),
            1
        )
        this.geometry.setAttribute("aRect", this.rectAttr)
        this.geometry.setAttribute("aAspect", this.aspectAttr)
        this.geometry.setAttribute("aOffset", this.offsetAttr)

        for (let i = 0; i < MAX_PAGES; i++) this.rectAttr.setXYZW(i, 0, 0, 1, 1)
        this.rectAttr.needsUpdate = true

        this.scene.add(this.mesh)

        this.applyConfig()
        this.loadAtlas()
    }

    private applyConfig() {
        const S = this.settings()
        const u = this.material.uniforms
        this.mesh.count = S.pages
        u.uMeshCount.value = S.pages
        u.uPageWidth.value = S.pageWidth
        u.uPageHeight.value = S.pageHeight
        u.uPageThickness.value = S.thickness
        u.uPageSpacing.value = S.pageSpacing
        u.uWave.value = S.wave
        u.uTilt.value = S.tilt
        u.uTurn.value = S.turn
        u.uPageAspect.value = S.pageWidthPx / S.pageHeightPx
        u.uFocusScale.value = S.focusScale
        u.uFocusZ.value = S.focusZ
        this.writeOffsets()

        if (this.focus.index >= S.pages || !S.tapToView) this.clearFocus()
    }

    private clearFocus() {
        this.focus.index = -1
        this.focus.t = 0
        this.focus.target = 0
        this.material.uniforms.uFocusIndex.value = -1
        this.material.uniforms.uFocusProgress.value = 0
    }

    private writeOffsets() {
        const list = this.cfg.images
        const count = Math.max(1, list.length)
        for (let i = 0; i < MAX_PAGES; i++) {
            const entry = list.length ? list[i % count] : undefined
            const offset = entry
                ? clamp(offsetOf(entry), -OFFSET_RANGE, OFFSET_RANGE, 0)
                : 0
            this.offsetAttr.setX(i, offset / OFFSET_RANGE)
        }
        this.offsetAttr.needsUpdate = true
    }

    private writeCells() {
        const cells = this.atlas?.cells
        if (!cells || !cells.length) return
        for (let i = 0; i < MAX_PAGES; i++) {
            const c = cells[i % cells.length]
            this.rectAttr.setXYZW(i, c.rect[0], c.rect[1], c.rect[2], c.rect[3])
            this.aspectAttr.setX(i, c.aspect)
        }
        this.rectAttr.needsUpdate = true
        this.aspectAttr.needsUpdate = true
    }

    private sourceList(): string[] {
        const list = this.cfg.images
        if (list && list.length) {
            return list.map((entry) => srcOf(imageOf(entry)))
        }
        return Array.from({ length: PLACEHOLDER_COUNT }, () => "")
    }

    private loadAtlas() {
        const sources = this.sourceList()
        const key = sources.join("|")

        if (key === this.atlasKey && this.atlas) return
        this.atlasKey = key
        const token = ++this.atlasToken

        if (this.atlas) {
            this.atlas.dispose()
            this.atlas = null
        }

        const isMobile =
            typeof window !== "undefined" &&
            (window.innerWidth < 768 || navigator.maxTouchPoints > 0)
        const hwMax = this.renderer.capabilities.maxTextureSize || 4096
        const maxTextureDim = Math.min(
            hwMax,
            isMobile ? MOBILE_MAX_ATLAS : DESKTOP_MAX_ATLAS
        )
        const cellMax = isMobile ? MOBILE_MAX_CELL : DESKTOP_MAX_CELL
        const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy()

        const atlas = createAtlas(
            sources.length,
            maxTextureDim,
            cellMax,
            maxAnisotropy
        )
        if (!atlas) return

        this.atlas = atlas
        this.material.uniforms.uAtlas.value = atlas.texture
        this.writeCells()
        this.onAtlasReady?.()

        // Phase 1: Load initial batch of photos
        const initialBatchSize = Math.min(8, sources.length)
        const initialSources = sources.slice(0, initialBatchSize)

        Promise.all(
            initialSources.map((src, i) =>
                src
                    ? loadImage(src).then((img) => ({ i, img }))
                    : Promise.resolve({ i, img: null })
            )
        ).then((results) => {
            if (this.disposed || token !== this.atlasToken || !this.atlas) return
            let changed = false
            for (const { i, img } of results) {
                if (img) {
                    this.atlas.updateCell(i, img)
                    this.writeCell(i)
                    changed = true
                }
            }
            if (changed) {
                this.atlas.texture.needsUpdate = true
                this.onAtlasReady?.()
            }

            // Phase 2: Progressively load remaining batches during idle time
            this.loadRemainingBatches(sources, initialBatchSize, token)
        })
    }

    private writeCell(index: number) {
        const cells = this.atlas?.cells
        if (!cells || !cells.length) return
        const c = cells[index % cells.length]
        if (!c) return
        const count = cells.length
        for (let i = index; i < MAX_PAGES; i += count) {
            this.rectAttr.setXYZW(i, c.rect[0], c.rect[1], c.rect[2], c.rect[3])
            this.aspectAttr.setX(i, c.aspect)
        }
        this.rectAttr.needsUpdate = true
        this.aspectAttr.needsUpdate = true
    }

    private loadRemainingBatches(
        sources: string[],
        startIndex: number,
        token: number
    ) {
        if (startIndex >= sources.length) return
        const batchSize = 6
        const nextIndex = Math.min(startIndex + batchSize, sources.length)
        const slice = sources.slice(startIndex, nextIndex)

        const runBatch = () => {
            if (this.disposed || token !== this.atlasToken || !this.atlas) return
            Promise.all(
                slice.map((src, idx) => {
                    const globalIdx = startIndex + idx
                    return src
                        ? loadImage(src).then((img) => ({ i: globalIdx, img }))
                        : Promise.resolve({ i: globalIdx, img: null })
                })
            ).then((results) => {
                if (this.disposed || token !== this.atlasToken || !this.atlas) return
                let changed = false
                for (const { i, img } of results) {
                    if (img) {
                        this.atlas.updateCell(i, img)
                        this.writeCell(i)
                        changed = true
                    }
                }
                if (changed) {
                    this.atlas.texture.needsUpdate = true
                }
                this.loadRemainingBatches(sources, nextIndex, token)
            })
        }

        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
            window.requestIdleCallback(() => runBatch(), { timeout: 150 })
        } else {
            setTimeout(runBatch, 40)
        }
    }

    private settings() {
        if (!this.settingsCache) {
            this.settingsCache = settingsFor(this.cfg, this.width, this.height)
        }
        return this.settingsCache
    }

    private pick(clientX: number, clientY: number): number {
        const rect = this.container.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return -1

        const u = (clientX - rect.left) / rect.width
        const v = (clientY - rect.top) / rect.height
        if (u < 0 || v < 0 || u >= 1 || v >= 1) return -1

        const scale = Math.min(1, PICK_MAX / Math.max(this.width, this.height))
        const tw = Math.max(1, Math.round(this.width * scale))
        const th = Math.max(1, Math.round(this.height * scale))
        if (this.pickTarget.width !== tw || this.pickTarget.height !== th) {
            this.pickTarget.setSize(tw, th)
        }

        const previous = this.mesh.material
        this.mesh.material = this.pickMaterial
        this.renderer.setRenderTarget(this.pickTarget)

        this.renderer.setClearColor(0x000000, 1)
        this.renderer.render(this.scene, this.camera)
        this.renderer.readRenderTargetPixels(
            this.pickTarget,
            Math.min(tw - 1, Math.floor(u * tw)),
            Math.min(th - 1, Math.floor((1 - v) * th)),
            1,
            1,
            this.pickBuffer
        )
        this.renderer.setRenderTarget(null)
        this.renderer.setClearColor(0x000000, 0)
        this.mesh.material = previous

        const hit = this.pickBuffer[0] - 1
        return hit >= 0 && hit < this.settings().pages ? hit : -1
    }

    private onTap(hit: number) {
        if (hit >= 0 && this.cfg.onSelect) {
            this.cfg.onSelect(hit)
        }
        if (!this.settings().tapToView) return
        if (this.focus.index >= 0) {
            this.focus.target = 0
            return
        }
        if (hit >= 0) {
            this.focus.index = hit
            this.focus.target = 1
        }
    }

    private onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && this.focus.index >= 0) {
            this.focus.target = 0
        }
    }

    private wheelScale(event: WheelEvent): number {
        if (event.deltaMode === 1) return 16
        if (event.deltaMode === 2) return this.height
        return 1
    }

    private onWheel = (event: WheelEvent) => {
        if (this.disposed) return

        if (this.focus.index >= 0) return
        event.preventDefault()
        const scale = this.wheelScale(event)
        const dx = event.deltaX * scale
        const dy = event.deltaY * scale

        const dominant = Math.abs(dx) > Math.abs(dy) ? dx : dy
        const S = this.settings()
        this.push(dominant * S.worldPerPx * S.wheel)
    }

    private onPointerDown = (event: PointerEvent) => {
        if (this.disposed || event.button !== 0) return
        this.tap = {
            x: event.clientX,
            y: event.clientY,
            at: performance.now(),
            id: event.pointerId,
            hit: -1,
        }
        if (event.pointerType === "mouse") {
            this.container.setPointerCapture?.(event.pointerId)
        }

        if (this.focus.index >= 0) return
        this.drag.active = event.pointerType === "mouse"
        this.drag.lastX = event.clientX
        this.drag.lastY = event.clientY
        this.drag.id = event.pointerId
    }

    private onPointerMove = (event: PointerEvent) => {
        if (event.pointerId !== this.drag.id) return

        if (!this.drag.active) {
            if (event.pointerType === "touch") {
                const absDx = Math.abs(event.clientX - this.tap.x)
                const absDy = Math.abs(event.clientY - this.tap.y)
                if (absDy > absDx && absDy > 8) {
                    return
                }
                if (absDx > absDy && absDx > 8) {
                    this.drag.active = true
                    this.drag.lastX = event.clientX
                    this.drag.lastY = event.clientY
                } else {
                    return
                }
            } else {
                this.drag.active = true
            }
        }

        const delta = this.drag.lastX - event.clientX
        this.drag.lastX = event.clientX
        this.drag.lastY = event.clientY

        const S = this.settings()
        this.push(delta * 2 * S.worldPerPx * S.wheel)
    }

    private onPointerUp = (event: PointerEvent) => {
        if (event.pointerId === this.drag.id) {
            this.drag.active = false
            this.drag.id = -1
        }
        if (event.pointerId !== this.tap.id) return
        if (event.pointerType === "mouse") {
            this.container.releasePointerCapture?.(event.pointerId)
        }
        this.tap.id = -1

        const moved = Math.hypot(
            event.clientX - this.tap.x,
            event.clientY - this.tap.y
        )
        if (moved <= TAP_SLOP && performance.now() - this.tap.at <= TAP_MS) {
            const hit = this.pick(this.tap.x, this.tap.y)
            this.onTap(hit)
        }
    }

    private onPointerCancel = (event: PointerEvent) => {
        if (event.pointerId === this.drag.id) {
            this.drag.active = false
            this.drag.id = -1
        }
        if (event.pointerId === this.tap.id) {
            if (event.pointerType === "mouse") {
                this.container.releasePointerCapture?.(event.pointerId)
            }
            this.tap.id = -1
        }
    }

    private push(worldDelta: number) {
        if (!isFinite(worldDelta)) return
        this.scroll.target += worldDelta
        this.scroll.speed += worldDelta
    }

    private attach() {
        const node = this.container
        node.addEventListener("wheel", this.onWheel, { passive: false })
        node.addEventListener("pointerdown", this.onPointerDown)
        node.addEventListener("pointermove", this.onPointerMove)
        node.addEventListener("pointerup", this.onPointerUp)
        node.addEventListener("pointercancel", this.onPointerCancel)

        window.addEventListener("keydown", this.onKeyDown)
    }

    private detach() {
        const node = this.container
        node.removeEventListener("wheel", this.onWheel)
        node.removeEventListener("pointerdown", this.onPointerDown)
        node.removeEventListener("pointermove", this.onPointerMove)
        node.removeEventListener("pointerup", this.onPointerUp)
        node.removeEventListener("pointercancel", this.onPointerCancel)
        window.removeEventListener("keydown", this.onKeyDown)
    }

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)
        this.camera.aspect = this.width / this.height
        this.camera.updateProjectionMatrix()
        this.settingsCache = null
        this.applyConfig()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        this.settingsCache = null

        this.loadAtlas()
        this.applyConfig()
        this.writeCells()
    }

    private setCursor(value: string) {
        if (this.container.style.cursor === value) return
        this.container.style.cursor = value
    }

    renderStatic() {
        if (this.disposed) return
        this.renderer.render(this.scene, this.camera)
    }

    pause() {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId)
            this.frameId = 0
        }
    }

    start() {
        if (this.disposed || this.frameId) return
        this.attach()
        this.lastT = performance.now()
        const loop = () => {
            if (this.disposed || !this.frameId) return
            this.frameId = requestAnimationFrame(loop)
            this.step()
        }
        this.frameId = requestAnimationFrame(loop)
    }

    private step() {
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0

        if (dt > 0.05) dt = 0.05

        const S = this.settings()
        const u = this.material.uniforms

        if (this.focus.index >= 0) {
            const rate = dt / Math.max(0.05, S.viewDuration)
            this.focus.t = Math.min(
                1,
                Math.max(0, this.focus.t + (this.focus.target ? rate : -rate))
            )
            if (this.focus.t === 0 && this.focus.target === 0) {
                this.focus.index = -1
            }
        }
        u.uFocusIndex.value = this.focus.index
        u.uFocusProgress.value = power2InOut(this.focus.t)

        this.setCursor(
            this.focus.index >= 0 && this.focus.target === 1
                ? "zoom-out"
                : "grab"
        )

        if (S.driftPerSecond !== 0 && this.focus.index < 0) {
            this.push(S.driftPerSecond * dt)
        }

        const k = dt * 60
        const ease = 1 - Math.pow(1 - S.lerp, k)
        this.scroll.current += (this.scroll.target - this.scroll.current) * ease
        this.scroll.speed *= Math.pow(0.835, k)

        const period = S.pages * (S.pageSpacing + S.thickness)
        if (Math.abs(this.scroll.current) > period) {
            const wrap = Math.sign(this.scroll.current) * period
            this.scroll.current -= wrap
            this.scroll.target -= wrap
        }

        u.uScrollY.value = this.scroll.current
        u.uSpeedY.value = this.scroll.speed

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.frameId = 0
        this.detach()
        this.geometry.dispose()
        this.material.dispose()
        this.pickMaterial.dispose()
        this.pickTarget.dispose()
        this.blank.dispose()
        this.atlas?.dispose()
        this.mesh.dispose()
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        canvas.parentNode?.removeChild(canvas)
    }
}

export default function MagazineFlip(props: Partial<MagazineFlipProps>) {
    const {
        images = DEFAULTS.images,
        background = DEFAULTS.background,
        pages = DEFAULTS.pages,
        spacing = DEFAULTS.spacing,
        tilt = DEFAULTS.tilt,
        turn = DEFAULTS.turn,
        pageWidth = DEFAULTS.pageWidth,
        pageHeight = DEFAULTS.pageHeight,
        view,
        scrollSens = DEFAULTS.scrollSens,
        travel,
        style,
        onSelect,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<MagazineScene | null>(null)

    const cfgRef = useRef<Config>(null as unknown as Config)
    const cfg: Config = {
        images: Array.isArray(images) ? images : [],
        pages,
        spacing,
        tilt,
        turn,
        pageWidth,
        pageHeight,
        view: { ...DEFAULT_VIEW, ...view },
        scrollSens,
        travel: { ...DEFAULT_TRAVEL, ...travel },
        onSelect,
    }
    cfgRef.current = cfg

    const imageKey = cfg.images
        .map((entry) => `${srcOf(imageOf(entry))}@${offsetOf(entry)}`)
        .join("|")

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: MagazineScene
        try {
            scene = new MagazineScene(container, cfgRef.current)
        } catch {
            return
        }
        sceneRef.current = scene
        scene.setSize(container.clientWidth, container.clientHeight)
        scene.start()

        const ro = new ResizeObserver(() => {
            scene.setSize(container.clientWidth, container.clientHeight)
        })
        ro.observe(container)

        const io = new IntersectionObserver(
            (entries) => {
                const entry = entries[0]
                if (entry?.isIntersecting) {
                    scene.start()
                } else {
                    scene.pause()
                }
            },
            { rootMargin: "300px" }
        )
        io.observe(container)

        return () => {
            io.disconnect()
            ro.disconnect()
            scene.dispose()
            sceneRef.current = null
        }
    }, [])

    useEffect(() => {
        const scene = sceneRef.current
        if (!scene) return
        scene.updateConfig(cfgRef.current)
    }, [
        imageKey,
        pages,
        spacing,
        tilt,
        turn,
        pageWidth,
        pageHeight,
        scrollSens,
        cfg.view.tap,
        cfg.view.zoom,
        cfg.view.speed,
        cfg.travel.drift,
        cfg.travel.smoothing,
        cfg.travel.wave,
    ])

    const first = cfg.images[0]

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label={
                (first ? altOf(imageOf(first)) : "") ||
                "A corridor of magazine pages you scroll through, and tap to hold one up"
            }
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 200,
                minHeight: 200,
                overflow: "hidden",
                background,
                cursor: "grab",

                touchAction: "pan-y",
                ...style,
            }}
        />
    )
}