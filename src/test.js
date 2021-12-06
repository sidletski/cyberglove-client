import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { initUI } from './utils/ui'
import * as CANNON from 'cannon-es'

let rotationOffset = { x: 0, y: 0, z: 0 }

var gltfLoader = new GLTFLoader()

const materials = {
  normal: new THREE.MeshNormalMaterial(),
  phong: new THREE.MeshPhongMaterial()
}

let camera, scene, renderer
let hand

const physObjects = []
const fingersObjects = []
const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)

let demo = null,
  object = null

const demoScenes = {
  default: new THREE.Group(),
  physics: new THREE.Group(),
  paint: new THREE.Group(),
  interface: new THREE.Group()
}

const objectScenes = {
  hand: new THREE.Group()
}

const handOptions = {
  fingers: [0, 0, 0, 0, 0],
  // orientation: [0, 0, 0, 0],
  orientation: [0, 0, 0]
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

const handleServerMessage = function ({ data }) {
  try {
    const options = JSON.parse(data)
    if (options.fingers) {
      modifyFingerValues(options.fingers)
    }
    if (options.orientation) {
      modifyOrientation(options.orientation)
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

const initHandModel = function () {
  const s = objectScenes.hand
  scene.add(s)

  gltfLoader.load('hand.glb', function (glb) {
    hand = glb.scene.children[0]

    hand.rotation.set(0, 0, 0)

    // hand.scale.set(8, 8, 8)
    hand.scale.set(2.2, 2.2, 2.2)
    hand.position.set(0, -0.5, 0)

    const boneIds = [12, 6, 17, 23, 29]

    boneIds.forEach((id) => {
      const bones = hand.children[1].skeleton.bones
      const cubeGeometry = new THREE.BoxGeometry(0.015, 0.05, 0.015)
      const cubeMesh = new THREE.Mesh(cubeGeometry, materials.normal)
      if (id == 12) {
        cubeMesh.position.set(0, -0.02, 0)
      } else {
        cubeMesh.position.set(0, 0, 0)
      }
      bones[id].add(cubeMesh)

      const cubeShape = new CANNON.Box(
        new CANNON.Vec3(0.0075, 0.025, 0.0075)
      )
      const cubeBody = new CANNON.Body({
        mass: 0.5
      })
      cubeBody.addShape(cubeShape)

      applyPosition(cubeBody, {
        position: getWorldPosition(cubeMesh)
      })
      world.addBody(cubeBody)
      fingersObjects.push({ mesh: cubeMesh, body: cubeBody })
    })

    s.add(glb.scene)
  })
}

const initDefaultScene = function () {
  const s = demoScenes.default
  scene.add(s)
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
  if (fingersObjects.length) {
    physObjects.forEach(({ mesh, body }) =>
      applyPosition(body, { position: getWorldPosition(mesh) })
    )
  }
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

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.shadowMap.enabled = true
  renderer.setSize(window.innerWidth, window.innerHeight)

  generateLights(scene)

  new OrbitControls(camera, renderer.domElement)
  document.body.appendChild(renderer.domElement)

  window.addEventListener('resize', handleResize, false)
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

  const { x: offsetX, y: offsetY, z: offsetZ } = rotationOffset

  // if (!offsetX && !offsetY && !offsetZ) {
  //   rotationOffset = { x: z, y: x, z: -y }
  // } else {
  //   hand.rotation.set(
  //     z - offsetX - deltaTime * multipliers.x,
  //     x - offsetY - deltaTime * multipliers.y,
  //     -y - offsetZ - deltaTime * multipliers.z
  //   )
  // }

  const [x, y, z] = handOptions.orientation
  hand.rotation.set(-y, -x - 2, z)

  // hand.rotation.setEulerFromQuaternion(
  //   new THREE.Quaternion(...handOptions.orientation)
  // )

  // hand.rotation.set(
  //   handOptions.orientation[0] / 10,
  //   Math.PI / 2,
  //   Math.PI / 2
  // )
  // orientation
}

const clock = new THREE.Clock()
let delta

const render = function () {
  requestAnimationFrame(render)

  if (object == 'hand') {
    animateHand()
  }

  delta = Math.min(clock.getDelta(), 0.1)
  world.step(delta)

  if (world && physObjects.length) {
    applyPhysics()
  }

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
    }
  }

  if (object != nextObject) {
    if (object) {
      scene.remove(objectScenes[object])
    }

    object = nextObject

    if (object == 'hand') {
      initHandModel()
    }
  }
}

init()
render()
initUI((options) => {
  handleOptionsChange(options)
})
