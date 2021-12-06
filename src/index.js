import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { initUI } from './utils/ui'
import * as CANNON from 'cannon-es'
import * as TWEEN from '@tweenjs/tween.js'

let date = new Date()
const multipliers = {
  // x: 0.00003,
  // y: 0.00001,
  // z: 0
  x: 0,
  y: 0,
  z: 0
}

let rotationOffset = { x: 0, y: 0, z: 0 }

var gltfLoader = new GLTFLoader()
var objLoader = new OBJLoader()

const materials = {
  normal: new THREE.MeshNormalMaterial(),
  phong: new THREE.MeshPhongMaterial()
}

let camera, scene, renderer
let hand
let handObj
let cube
let cubeGroups = {
  green: new THREE.Group(),
  blue: new THREE.Group(),
  another: new THREE.Group()
}
let prevFingers = [null, null, null, null, null]

// const physObjects = []
// const fingersObjects = []
// const world = new CANNON.World()
// world.gravity.set(0, -9.82, 0)

let demo = null,
  object = null

const demoScenes = {
  default: new THREE.Group(),
  rubik: new THREE.Group(),
  physics: new THREE.Group(),
  paint: new THREE.Group(),
  interface: new THREE.Group()
}

const objectScenes = {
  hand: new THREE.Group(),
  rubik: new THREE.Group(),
  hidden: new THREE.Group()
}

const handOptions = {
  fingers: [0, 0, 0, 0, 0],
  orientation: [0, 0, 0, 0],
  euler: [0, 0, 0]
}

const handleResize = function () {
  // resize ThreeJS canvas and update projection matrix on window resizing
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
}

const generateLights = function (scene) {
  const lightSources = [
    { fn: THREE.AmbientLight, args: [0x404040] },
    {
      fn: THREE.PointLight,
      args: [0xffffff, 1, 0],
      coords: [0, 10, 0]
    },
    {
      fn: THREE.PointLight,
      args: [0xffffff, 0.7, 0],
      coords: [13, -20, -10]
    },
    {
      fn: THREE.PointLight,
      args: [0xffffff, 1, 0],
      coords: [100, 100, 100]
    }
  ]

  const lights = lightSources.map((source) => {
    let light = new source.fn(...source.args)
    if (source.coords) light.position.set(...source.coords)
    return light
  })

  lights[1].castShadow = true
  lights[1].shadow.mapSize.width = 512
  lights[1].shadow.mapSize.height = 512
  lights[1].shadow.camera.near = 0.5
  lights[1].shadow.camera.far = 20

  lights.forEach((light) => {
    scene.add(light)
  })
}

const modifyFingerValues = function (values) {
  handOptions.fingers = [...values]
}

const modifyOrientation = function (data) {
  handOptions.orientation = [...data]
}

const modifyEuler = function (data) {
  handOptions.euler = [...data]
}

const handleServerMessage = function ({ data }) {
  try {
    const options = JSON.parse(data)
    if (options.fingers) {
      modifyFingerValues(options.fingers)
    }
    if (options.orientation) {
      modifyOrientation(options.orientation)
    }
    if (options.euler) {
      modifyEuler(options.euler)
    }
  } catch (err) {
    console.log('Unhandled message type')
  }
}

const initWebsocket = function () {
  let socket = new WebSocket('ws://localhost:9000')

  socket.onopen = function (_) {
    console.log('Connected successfully')
  }

  socket.onclose = function (_) {
    setTimeout(() => {
      initWebsocket()
    }, 1000)
  }

  socket.onmessage = handleServerMessage

  socket.onerror = function (err) {
    console.log('Websocket connection error:', err)
    setTimeout(() => {
      initWebsocket()
    }, 1000)
  }
}

const getWorldPosition = (obj) => {
  const position = new THREE.Vector3()
  obj.getWorldPosition(position)
  // const position = new THREE.Vector3()
  // position.setFromMatrixPosition(obj.matrixWorld)

  return position
}

const initHiddenModel = function () {
  const s = objectScenes.hidden
  scene.add(s)
}

const initHandModel = function () {
  objectScenes.hand = new THREE.Group()
  const s = objectScenes.hand
  scene.add(s)

  gltfLoader.load('hand.glb', function (glb) {
    handObj = glb.scene
    hand = glb.scene.children[0]

    hand.rotation.set(0, 0, 0)

    hand.scale.set(2.2, 2.2, 2.2)
    hand.position.set(0, -0.5, 0)

    // const boneIds = [12, 6, 17, 23, 29]

    // boneIds.forEach((id) => {
    //   const bones = hand.children[1].skeleton.bones
    //   const cubeGeometry = new THREE.BoxGeometry(0.015, 0.05, 0.015)
    //   const cubeMesh = new THREE.Mesh(cubeGeometry, materials.normal)
    //   if (id == 12) {
    //     cubeMesh.position.set(0, -0.02, 0)
    //   } else {
    //     cubeMesh.position.set(0, 0, 0)
    //   }
    //   bones[id].add(cubeMesh)

    //   const cubeShape = new CANNON.Box(
    //     new CANNON.Vec3(0.0075, 0.025, 0.0075)
    //   )
    //   const cubeBody = new CANNON.Body({
    //     mass: 0.5
    //   })
    //   cubeBody.addShape(cubeShape)

    //   applyPosition(cubeBody, {
    //     position: getWorldPosition(cubeMesh)
    //   })
    //   world.addBody(cubeBody)
    //   fingersObjects.push({ mesh: cubeMesh, body: cubeBody })
    // })

    s.add(handObj)
  })
}

const initDefaultScene = function () {
  const s = demoScenes.default
  scene.add(s)
}

const initRubikModel = function () {
  const s = objectScenes.rubik
  scene.add(s)

  gltfLoader.load('cube.glb', function (glb) {
    let cubeScene = glb.scene
    cube = new THREE.Group()

    cube.scale.set(0.05, 0.05, 0.05)

    cube.add(cubeGroups.green)
    cube.add(cubeGroups.blue)
    cube.add(cubeGroups.another)
    s.add(cube)

    let i = 0
    while (true) {
      if (i >= cubeScene.children.length) break

      const part = cubeScene.children[i]
      if (part.name[0] === 'g') {
        cubeGroups.green.add(part)
      } else if (part.name[0] === 'b') {
        cubeGroups.blue.add(part)
      } else {
        cubeGroups.another.add(part)
      }
    }
  })
}

const applyPosition = (object1, object2) => {
  const { x, y, z } = object2.position

  object1.position.x = x
  object1.position.y = y
  object1.position.z = z
}

const initPhysicsScene = function () {
  const s = demoScenes.physics
  scene.add(s)

  const cubeGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4)

  for (let i = 0; i < 70; i++) {
    const cubeMesh = new THREE.Mesh(cubeGeometry, materials.normal)

    const x = (i % 10) * 0.45 - 2.2
    const y = Math.round(i / 5) * 0.3 - 2

    cubeMesh.position.set(x, y, -2)
    cubeMesh.castShadow = true

    s.add(cubeMesh)
    const cubeShape = new CANNON.Box(new CANNON.Vec3(0.2, 0.2, 0.2))
    const cubeBody = new CANNON.Body({
      mass: 0.5
    })
    cubeBody.addShape(cubeShape)
    applyPosition(cubeBody, cubeMesh)
    world.addBody(cubeBody)
    physObjects.push({ mesh: cubeMesh, body: cubeBody })
  }

  const planeGeometry = new THREE.PlaneGeometry(50, 50)
  const planeMesh = new THREE.Mesh(planeGeometry, materials.phong)
  planeMesh.rotateX(-Math.PI / 2)
  planeMesh.receiveShadow = true
  planeMesh.position.set(0, -2, -2)
  s.add(planeMesh)
  const planeShape = new CANNON.Plane()
  const planeBody = new CANNON.Body({ mass: 0 })
  planeBody.addShape(planeShape)
  applyPosition(planeBody, planeMesh)
  planeBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(1, 0, 0),
    -Math.PI / 2
  )
  world.addBody(planeBody)
  physObjects.push({ mesh: planeMesh, body: planeBody })
}

const applyPhysics = () => {
  physObjects.forEach(({ mesh, body }) => applyPosition(mesh, body))
}

const init = function () {
  initWebsocket()
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  )

  camera.position.set(0, 0, 1)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.shadowMap.enabled = true
  renderer.setSize(window.innerWidth, window.innerHeight)

  generateLights(scene)

  new OrbitControls(camera, renderer.domElement)
  document.body.appendChild(renderer.domElement)

  window.addEventListener('resize', handleResize, false)
}

const animateCube = function () {
  if (!cube) return

  const { x, y, z } = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion(...handOptions.orientation)
  )

  const deltaTime = new Date() - date

  const { x: offsetX, y: offsetY, z: offsetZ } = rotationOffset

  if (!offsetX && !offsetY && !offsetZ) {
    rotationOffset = { x: z, y: x, z: -y }
  } else {
    cube.rotation.set(
      z - offsetX - deltaTime * multipliers.x,
      x - offsetY - deltaTime * multipliers.y,
      -y - offsetZ - deltaTime * multipliers.z
    )
  }

  const fingerThreshold = 0.8

  if (
    prevFingers[0] >= fingerThreshold &&
    handOptions.fingers[0] < fingerThreshold
  ) {
    // finger up
    let rotation = { y: cubeGroups.green.rotation.y }
    let targetRad =
      ((Math.round(cubeGroups.green.rotation.y / (Math.PI / 2)) + 1) *
        Math.PI) /
      2
    let target = { y: targetRad }

    var tween = new TWEEN.Tween(rotation)
      .to(target, (targetRad - cubeGroups.green.rotation.y) * 500)
      .easing(TWEEN.Easing.Quadratic.Out)

    tween.onUpdate(function () {
      cubeGroups.green.rotation.y = rotation.y
    })

    tween.start()
  }

  if (
    prevFingers[1] >= fingerThreshold &&
    handOptions.fingers[1] < fingerThreshold
  ) {
    // finger up
    let rotation = { y: cubeGroups.blue.rotation.y }
    let targetRad =
      ((Math.round(cubeGroups.blue.rotation.y / (Math.PI / 2)) + 1) *
        Math.PI) /
      2
    let target = { y: targetRad }

    var tween = new TWEEN.Tween(rotation)
      .to(target, (targetRad - cubeGroups.blue.rotation.y) * 500)
      .easing(TWEEN.Easing.Quadratic.Out)

    tween.onUpdate(function () {
      cubeGroups.blue.rotation.y = rotation.y
    })

    tween.start()
  }

  prevFingers = [...handOptions.fingers]
}

const animateHand = function () {
  if (!hand) return

  const bones = hand.children[1].skeleton.bones

  const fingers = [
    {
      id: 4,
      name: 'thumb',
      boneIds: [10, 11],
      multipliers: [1.4, 1.4]
    },
    {
      id: 0,
      name: 'forefinger',
      boneIds: [4, 5, 6],
      multipliers: [0.5, 1.3, 1.3]
    },
    {
      id: 1,
      name: 'middle',
      boneIds: [15, 16, 17],
      multipliers: [0.9, 0.6, 1]
    },
    {
      id: 2,
      name: 'ring',
      boneIds: [21, 22, 23],
      multipliers: [1, 0.7, 1]
    },
    {
      id: 3,
      name: 'little',
      boneIds: [27, 28, 29],
      multipliers: [1, 0.6, 0.6]
    }
  ]

  handOptions.fingers.forEach((value, id) => {
    const finger = fingers.find(({ id: fingerId }) => fingerId == id)
    if (!finger) return

    finger.boneIds.forEach((boneId, id) => {
      if (!bones[boneId]) return

      bones[boneId].rotation.x = value * finger.multipliers[id]
    })
  })

  const { x, y, z } = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion(...handOptions.orientation)
  )

  hand.rotation.set(z, x, -y)

  // const deltaTime = new Date() - date

  // const { x: offsetX, y: offsetY, z: offsetZ } = rotationOffset

  // if (!offsetX && !offsetY && !offsetZ) {
  //   rotationOffset = { x: z, y: x, z: -y }
  // } else {
  //   hand.rotation.set(
  //     z - offsetX - deltaTime * multipliers.x,
  //     x - offsetY - deltaTime * multipliers.y,
  //     -y - offsetZ - deltaTime * multipliers.z
  //   )
  // }
}

const clock = new THREE.Clock()
let delta

const render = function (time) {
  requestAnimationFrame(render)

  TWEEN.update(time)

  animateHand()
  animateCube()

  // delta = Math.min(clock.getDelta(), 0.1)
  // world.step(delta)

  // if (world && physObjects.length) {
  //   applyPhysics()
  // }

  renderer.render(scene, camera)
}

const handleOptionsChange = (nextOptions) => {
  const { demos, objects } = { ...nextOptions }

  const nextDemo = Object.entries(demos).find(
    ([_, value]) => !!value
  )[0]

  const nextObject = Object.entries(objects).find(
    ([_, value]) => !!value
  )[0]

  if (demo != nextDemo) {
    if (demo) {
      scene.remove(demoScenes[demo])
    }

    demo = nextDemo

    if (demo == 'default') {
      initDefaultScene()
    } else if (demo == 'physics') {
      initPhysicsScene()
    } else if (demo == 'rubik') {
      initRubikScene()
    }
  }

  if (object != nextObject) {
    if (object) {
      scene.remove(objectScenes[object])
      hand = null
      cube = null
    }

    object = nextObject

    if (object == 'hand') {
      initHandModel()
    } else if (object == 'hidden') {
      initHiddenModel()
    } else if (object == 'rubik') {
      initRubikModel()
    }
  }
}

init()
render()
initUI((options) => {
  handleOptionsChange(options)
})
