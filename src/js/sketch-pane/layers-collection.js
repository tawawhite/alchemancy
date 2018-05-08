const PIXI = require('pixi.js')

const Layer = require('./layer')
const Util = require('./util')

// see: https://github.com/wesbos/es6-articles/blob/master/54%20-%20Extending%20Arrays%20with%20Classes%20for%20Custom%20Collections.md
module.exports = class LayersCollection extends Array {
  constructor ({ renderer, width, height }) {
    super()
    this.renderer = renderer
    this.width = width
    this.height = height
    this.currentIndex = undefined // index of the current layer
    this.onAdd = undefined
    this.onSelect = undefined
  }
  create () {
    let layer = new Layer({
      renderer: this.renderer,
      width: this.width,
      height: this.height
    })
    this.add(layer)
    return layer
  }
  add (layer) {
    let index = this.length
    this.push(layer)
    layer.index = index
    layer.name = `Layer ${index + 1}`
    layer.sprite.name = layer.name
    this.onAdd && this.onAdd(layer.index)
    return layer
  }
  markDirty (indices) {
    for (let index of indices) {
      this[index].setDirty(true)
    }
  }
  // getActiveIndices () {
  //   return [...this.activeIndices]
  // }
  // setActiveIndices (indices) {
  //   this.activeIndices = [...indices]
  // }
  getCurrentIndex () {
    return this.currentIndex
  }
  setCurrentIndex (index) {
    this.currentIndex = index
    this.onSelect && this.onSelect(index)
  }
  getCurrentLayer () {
    return this[this.currentIndex]
  }

  //
  //
  // operations
  //
  flip (vertical = false) {
    for (let layer of this) {
      layer.flip(vertical)
    }
  }

  // for given layers,
  // with specified opacity
  // render a composite texture
  // and return as *pixels*
  //
  // NOTE intentionally transparent. we use it to generate large images as well.
  //
  // TODO sort back to front
  // TODO better antialiasing
  // TODO rename extractCompositePixels ?
  extractThumbnailPixels (width, height, indices = []) {
    let rt = PIXI.RenderTexture.create(width, height)
    return this.renderer.plugins.extract.pixels(
      this.generateCompositeTexture(width, height, indices, rt)
    )
  }

  generateCompositeTexture (width, height, indices = [], rt) {
    for (let layer of this) {
      // if indices are specified, include only selected layers
      if (indices.length && indices.includes(layer.index)) {
        // make a new Sprite from the layer texture
        let sprite = new PIXI.Sprite(layer.sprite.texture)
        // copy the layer's alpha
        sprite.alpha = layer.sprite.alpha
        // resize
        sprite.scale.set(width / this.width, height / this.height)
        this.renderer.render(
          sprite,
          rt,
          false
        )
      }
    }
    return rt
  }

  // merge
  //
  // sources is an array of layer indices, ordered back to front
  // destination is the index of the destination layer
  merge (sources, destination) {
    let rt = PIXI.RenderTexture.create(this.width, this.height)

    rt = this.generateCompositeTexture(
      this.width,
      this.height,
      sources,
      rt
    )

    // clear destination
    this[destination].clear()

    // stamp composite onto destination
    // TODO would it be better to write raw pixel data?
    // TODO would it be better to destroy layer texture and assign rt as layer texture?
    this[destination].replace(rt)

    // clear the source layers
    for (let index of sources) {
      if (index !== destination) {
        this[index].clear()
      }
    }
  }
}
