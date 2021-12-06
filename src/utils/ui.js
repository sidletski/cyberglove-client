import * as dat from 'dat.gui'
import { optionsToObject } from './helpers'

export const initUI = (callback) => {
  const gui = new dat.GUI()
  const objectsFolder = gui.addFolder('Model')
  const demosFolder = gui.addFolder('Demo')

  const demosOptions = [
    {
      key: 'default',
      isDefault: true,
      title: 'Default'
    }
    // {
    //   key: 'physics',
    //   // isDefault: true,
    //   title: 'Physics'
    // },
    // {
    //   key: 'paint',
    //   // isDefault: true,
    //   title: 'Paint'
    // },
    // {
    //   key: 'interface',
    //   // isDefault: true,
    //   title: 'Interface'
    // }
  ]

  const objectsOptions = [
    {
      key: 'hand',
      isDefault: true,
      title: 'Hand'
    },
    {
      key: 'rubik',
      title: 'Rubik'
    },
    {
      key: 'hidden',
      title: 'Hidden'
    }
  ]

  const demos = optionsToObject(demosOptions)
  const objects = optionsToObject(objectsOptions)

  const options = {
    demos,
    objects
  }

  demosOptions.forEach(({ key, title }) => {
    demosFolder
      .add(demos, key)
      .name(title)
      .listen()
      .onChange(function () {
        handleChange(demos, key)
      })
  })

  objectsOptions.forEach(({ key, title }) => {
    objectsFolder
      .add(objects, key)
      .name(title)
      .listen()
      .onChange(function () {
        handleChange(objects, key)
      })
  })

  function handleChange(obj, prop) {
    setChecked(obj, prop)

    callback(options)
  }

  function setChecked(obj, prop) {
    for (let p in obj) {
      obj[p] = false
    }

    obj[prop] = true
  }

  callback(options)

  return [options, gui]
}
