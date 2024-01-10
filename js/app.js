import {
  MSDFTextGeometry,
  MSDFTextMaterial,
  uniforms,
} from "three-msdf-text-utils"
import * as THREE from "three"
import textFragment from "./shader/text-fragment.glsl"
import textVertex from "./shader/text-vertex.glsl"
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
    this.gui = new GUI()
    this.scene = new THREE.Scene()

    // second scene
    this.sceneCopy = new THREE.Scene()
    this.groupCopy = new THREE.Group()
    this.sceneCopy.add(this.groupCopy)

    // text group
    this.group = new THREE.Group()
    this.scene.add(this.group)

    // plane group
    this.planeGroup = new THREE.Group()
    this.scene.add(this.planeGroup)

    this.imageTextures = [...document.querySelectorAll("img")]

    this.imageTextures = this.imageTextures.map((texture) =>
      new THREE.TextureLoader().load(texture.src)
    )

    this.container = options.dom
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    this.renderer.autoClear = false
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0xeeeeee, 1)
    this.renderer.outputEncoding = THREE.sRGBEncoding

    this.container.appendChild(this.renderer.domElement)

    this.scroller = new VirtualScroll()
    this.position = 0
    this.speed = 0
    this.targetSpeed = 0
    this.scroller.on((event) => {
      // wrapper.style.transform = `translateY(${event.y}px)`
      this.position = event.y / 2000
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

    this.addObjects()
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
      vertexShader: textVertex,
      fragmentShader: textFragment,
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
        mesh.position.x = -0.9
        mesh.position.y = this.size * i

        this.group.add(mesh)
        this.groupCopy.add(mesh.clone())
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

  addObjects() {
    let that = this
    this.planeMaterial = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable",
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { type: "f", value: 0 },
        uTexture: { value: this.imageTextures[0] },
        resolution: { type: "v4", value: new THREE.Vector4() },
      },
      // wireframe: true,
      // transparent: true,
      vertexShader: vertex,
      fragmentShader: fragment,
    })

    console.log(this.imageTextures[0].src)

    this.planeGeometry = new THREE.PlaneGeometry(
      1.77 / 3,
      1 / 3,
      30,
      30
    ).translate(0, 0, 1)
    let pos = this.planeGeometry.attributes.position.array
    let newPos = []
    let radius = 1.2

    for (let i = 0; i < pos.length; i += 3) {
      let x = pos[i]
      let y = pos[i + 1]
      let z = pos[i + 2]

      // make plane rounded
      // let xz = new THREE.Vector2(x, z).normalize().multiplyScalar(radius)
      // newPos.push(xz.x, y, xz.y)

      // plane rounded around sphere
      let xyz = new THREE.Vector3(x, y, z).normalize().multiplyScalar(radius)
      newPos.push(xyz.x, xyz.y, xyz.z)
    }

    // sphere to show how plane follows the sphere
    let sphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
      })
    )

    this.scene.add(sphereMesh)

    // turn sphereMesh off using GUI

    this.gui.add(sphereMesh, "visible").name("Sphere")

    // push position coordinates to the geometry
    this.planeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(newPos, 3)
    )

    this.plane = new THREE.Mesh(this.planeGeometry, this.planeMaterial)
    this.planeGroup.add(this.plane)
  }

  stop() {
    this.isPlaying = false
  }

  play() {
    if (!this.isPlaying) {
      this.render()
      this.isPlaying = true
    }
  }

  updateTexture() {
    // update the texture based on the scroll position
    let index = Math.round(this.position + 10000) % this.imageTextures.length
    this.planeMaterial.uniforms.uTexture.value = this.imageTextures[index]

    // set active text of the copy group to be set in front of plane
    this.groupCopy.children.forEach((mesh, i) => {
      if (i !== index) {
        mesh.visible = false
      } else {
        mesh.visible = true
      }
    })
  }

  render() {
    if (!this.isPlaying) return
    this.time += 0.05
    this.speed *= 0.9

    this.updateTexture()
    // smoothing the speed
    this.targetSpeed += (this.speed - this.targetSpeed) * 0.1
    this.material.uniforms.uSpeed.value = this.targetSpeed
    // this.material.uniforms.time.value = this.time
    this.group.position.y = -this.position * this.size - 0.1
    this.groupCopy.position.y = -this.position * this.size - 0.1
    // Every text scrolled past move th eplan around the circle hence 2 * Math.PI = full circle rotation
    this.planeGroup.rotation.y = this.position * 2 * Math.PI
    // scroll plane around the middle of the screen but change angle based on scroll position
    this.planeGroup.rotation.z = 0.2 * Math.sin(this.position * 0.5)
    requestAnimationFrame(this.render.bind(this))
    this.renderer.render(this.scene, this.camera)
    this.renderer.clearDepth()
    this.renderer.render(this.sceneCopy, this.camera)
  }
}

new Sketch({
  dom: document.getElementById("container"),
})
