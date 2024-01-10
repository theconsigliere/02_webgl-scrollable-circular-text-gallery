import {
  MSDFTextGeometry,
  MSDFTextMaterial,
  uniforms,
} from "three-msdf-text-utils"
import * as THREE from "three"
import fragment from "./shader/fragment.glsl"
import vertex from "./shader/vertex.glsl"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import GUI from "lil-gui"
import gsap from "gsap"
import VirtualScroll from "virtual-scroll"

import fnt from "../font/SaltfordDisplay.json"
import atlasURL from "../font/SaltfordDisplay.png"

const TEXTS = [
  "Serendipity",
  "Solitude",
  "Ethereal",
  "Limerence",
  "Supine",
  "Aurora",
  "Epiphany",
  "Iridescent",
  "Tranquility",
  "Luminescence",
]

export default class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene()
    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.container = options.dom
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0xeeeeee, 1)
    this.renderer.outputEncoding = THREE.sRGBEncoding

    this.container.appendChild(this.renderer.domElement)

    this.scroller = new VirtualScroll()
    this.position = 0
    this.speed = 0
    this.scroller.on((event) => {
      // wrapper.style.transform = `translateY(${event.y}px)`
      this.position = event.y / 4000
      this.speed = event.deltaY / 2000
    })

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    )

    // var frustumSize = 10;
    // var aspect = window.innerWidth / window.innerHeight;
    // this.camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000 );
    this.camera.position.set(0, 0, 2)
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.time = 0

    this.isPlaying = true

    // this.addObjects()
    this.addTexts()
    this.resize()
    this.render()
    this.setupResize()
    // this.settings();
  }

  settings() {
    let that = this
    this.settings = {
      progress: 0,
    }
    this.gui = new dat.GUI()
    this.gui.add(this.settings, "progress", 0, 1, 0.01)
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this))
  }

  resize() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer.setSize(this.width, this.height)
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
  }

  addTexts() {
    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      defines: {
        IS_SMALL: false,
      },
      extensions: {
        derivatives: true,
      },
      uniforms: {
        uSpeed: { value: 0 },
        // Common
        ...uniforms.common,

        // Rendering
        ...uniforms.rendering,

        // Strokes
        ...uniforms.strokes,
      },
      vertexShader: `
          // Attribute
          attribute vec2 layoutUv;
  
          attribute float lineIndex;
  
          attribute float lineLettersTotal;
          attribute float lineLetterIndex;
  
          attribute float lineWordsTotal;
          attribute float lineWordIndex;
  
          attribute float wordIndex;
  
          attribute float letterIndex;
  
          // Varyings
          varying vec2 vUv;
          varying vec2 vLayoutUv;
          varying vec3 vViewPosition;
          varying vec3 vNormal;
  
          varying float vLineIndex;
  
          varying float vLineLettersTotal;
          varying float vLineLetterIndex;
  
          varying float vLineWordsTotal;
          varying float vLineWordIndex;
  
          varying float vWordIndex;
  
          varying float vLetterIndex;


          mat4 rotationMatrix(vec3 axis, float angle) {
            axis = normalize(axis);
            float s = sin(angle);
            float c = cos(angle);
            float oc = 1.0 - c;
            
            return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                        oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                        oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                        0.0,                                0.0,                                0.0,                                1.0);
        }
        
        vec3 rotate(vec3 v, vec3 axis, float angle) {
          mat4 m = rotationMatrix(axis, angle);
          return (m * vec4(v, 1.0)).xyz;
        }

        uniform float uSpeed;
  
          void main() {

  
              // Varyings
              vUv = uv;
              vLayoutUv = layoutUv;
        
              vNormal = normal;
  
              vLineIndex = lineIndex;
  
              vLineLettersTotal = lineLettersTotal;
              vLineLetterIndex = lineLetterIndex;
  
              vLineWordsTotal = lineWordsTotal;
              vLineWordIndex = lineWordIndex;
  
              vWordIndex = wordIndex;
  
              vLetterIndex = letterIndex;

              // Output
              vec3 newpos = position;

              // use rotate function
              newpos = rotate(newpos, vec3(1., 0., 1.), 0.5);

              vec4 mvPosition = vec4(newpos, 1.0);
              mvPosition = modelViewMatrix * mvPosition;
              gl_Position = projectionMatrix * mvPosition;

              vViewPosition = -mvPosition.xyz;
          }
      `,
      fragmentShader: `
          // Varyings
          varying vec2 vUv;
  
          // Uniforms: Common
          uniform float uOpacity;
          uniform float uThreshold;
          uniform float uAlphaTest;
          uniform vec3 uColor;
          uniform sampler2D uMap;
  
          // Uniforms: Strokes
          uniform vec3 uStrokeColor;
          uniform float uStrokeOutsetWidth;
          uniform float uStrokeInsetWidth;
  
          // Utils: Median
          float median(float r, float g, float b) {
              return max(min(r, g), min(max(r, g), b));
          }
  
          void main() {
              // Common
              // Texture sample
              vec3 s = texture2D(uMap, vUv).rgb;
  
              // Signed distance
              float sigDist = median(s.r, s.g, s.b) - 0.5;
  
              float afwidth = 1.4142135623730951 / 2.0;
  
              #ifdef IS_SMALL
                  float alpha = smoothstep(uThreshold - afwidth, uThreshold + afwidth, sigDist);
              #else
                  float alpha = clamp(sigDist / fwidth(sigDist) + 0.5, 0.0, 1.0);
              #endif
  
              // Strokes
              // Outset
              float sigDistOutset = sigDist + uStrokeOutsetWidth * 0.5;
  
              // Inset
              float sigDistInset = sigDist - uStrokeInsetWidth * 0.5;
  
              #ifdef IS_SMALL
                  float outset = smoothstep(uThreshold - afwidth, uThreshold + afwidth, sigDistOutset);
                  float inset = 1.0 - smoothstep(uThreshold - afwidth, uThreshold + afwidth, sigDistInset);
              #else
                  float outset = clamp(sigDistOutset / fwidth(sigDistOutset) + 0.5, 0.0, 1.0);
                  float inset = 1.0 - clamp(sigDistInset / fwidth(sigDistInset) + 0.5, 0.0, 1.0);
              #endif
  
              // Border
              float border = outset * inset;
  
              // Alpha Test
              if (alpha < uAlphaTest) discard;
  
              // Output: Common
              vec4 filledFragColor = vec4(uColor, uOpacity * alpha);
  
              // Output: Strokes
              vec4 strokedFragColor = vec4(uStrokeColor, uOpacity * border);
  
              gl_FragColor = filledFragColor;

              gl_FragColor = vec4(1.,0.,0.,1.);
          }
      `,
    })

    Promise.all([loadFontAtlas(atlasURL)]).then(([atlas]) => {
      this.size = 0.2
      this.material.uniforms.uMap.value = atlas

      TEXTS.forEach((text, i) => {
        const geometry = new MSDFTextGeometry({
          text: text.toUpperCase(),
          font: fnt,
        })

        const mesh = new THREE.Mesh(geometry, this.material)
        let textScale = 0.005
        mesh.scale.set(textScale, -textScale, textScale)
        mesh.position.x = -0.5
        mesh.position.y = this.size * i
        this.group.add(mesh)
      })
    })

    function loadFontAtlas(path) {
      const promise = new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader()
        loader.load(path, resolve)
      })

      return promise
    }
  }

  // addObjects() {
  //   let that = this
  //   this.material = new THREE.ShaderMaterial({
  //     extensions: {
  //       derivatives: "#extension GL_OES_standard_derivatives : enable",
  //     },
  //     side: THREE.DoubleSide,
  //     uniforms: {
  //       time: { type: "f", value: 0 },
  //       resolution: { type: "v4", value: new THREE.Vector4() },
  //       uvRate1: {
  //         value: new THREE.Vector2(1, 1),
  //       },
  //     },
  //     // wireframe: true,
  //     // transparent: true,
  //     vertexShader: vertex,
  //     fragmentShader: fragment,
  //   })

  //   this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1)

  //   this.plane = new THREE.Mesh(this.geometry, this.material)
  //   this.scene.add(this.plane)
  // }

  stop() {
    this.isPlaying = false
  }

  play() {
    if (!this.isPlaying) {
      this.render()
      this.isPlaying = true
    }
  }

  render() {
    if (!this.isPlaying) return
    this.time += 0.05
    this.speed *= 0.9
    this.material.uniforms.uSpeed.value = this.speed
    // this.material.uniforms.time.value = this.time
    this.group.position.y = -this.position
    requestAnimationFrame(this.render.bind(this))
    this.renderer.render(this.scene, this.camera)
  }
}

new Sketch({
  dom: document.getElementById("container"),
})
