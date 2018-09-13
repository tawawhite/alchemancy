import * as paper from 'paper'

export default class SelectedArea {
  sketchPane: any
  areaPath?: paper.Path

  constructor (options: any) {
    this.sketchPane = options.sketchPane
  }

  set (areaPath : paper.Path) {
    this.areaPath = areaPath
  }

  unset () {
    this.areaPath = null
  }

  // translated so origin = top left of areaPath bounds
  asPolygon () : PIXI.Polygon {
    return new PIXI.Polygon(
      this.areaPath.segments.map(
        segment => new PIXI.Point(
          segment.point.x - this.areaPath.bounds.x,
          segment.point.y - this.areaPath.bounds.y
        )
      )
    )
  }

  asMaskSprite () {
    // delete ALL cached canvas textures to ensure canvas is re-rendered
    PIXI.utils.clearTextureCache()

    let polygon = this.asPolygon()

    let canvas: HTMLCanvasElement = document.createElement('canvas')
    canvas.width = this.areaPath.bounds.width
    canvas.height = this.areaPath.bounds.height

    let ctx = canvas.getContext('2d')
    ctx.globalAlpha = 1.0

    ctx.beginPath()
    ctx.moveTo(polygon.points[0], polygon.points[1])
    for (let i = 2; i < polygon.points.length; i += 2) {
      ctx.lineTo(polygon.points[i], polygon.points[i + 1])
    }
    ctx.closePath()
    ctx.fillStyle = '#f00'
    ctx.fill()

    return new PIXI.Sprite(PIXI.Texture.fromCanvas(canvas))
  }


  // extract transparent sprite from layers
  asSprite (layerIndices? : Array<number>) : PIXI.Sprite {
    let rect = new PIXI.Rectangle(
      this.areaPath.bounds.x,
      this.areaPath.bounds.y,
      this.areaPath.bounds.width,
      this.areaPath.bounds.height
    )

    // create a sprite to hold the artwork with dimensions matching the bounds of the area path
    let sprite = new PIXI.Sprite(
      PIXI.RenderTexture.create(
        this.areaPath.bounds.width,
        this.areaPath.bounds.height
      )
    )

    let mask = this.asMaskSprite()

    for (let i of layerIndices) {
      let layer = this.sketchPane.layers[i]

      let clip = new PIXI.Sprite(new PIXI.Texture(layer.sprite.texture, rect))
      clip.alpha = layer.getOpacity()

      clip.addChild(mask)
      clip.mask = mask

      this.sketchPane.app.renderer.render(
        clip,
        sprite.texture as PIXI.RenderTexture,
        false
      )

      clip.mask = null
      clip.removeChild(mask)
    }

    return sprite
  }

  demo () {
    this.set(new paper.Path([
      [550, 300],
      [850, 400],
      [850, 575],
      [550, 575]
    ]))
    // this.set(new paper.Path([
    //   [0, 0],
    //   [1200, 0],
    //   [1200, 900],
    //   [0, 900]
    // ]))



    let maskSprite : PIXI.Sprite = this.asMaskSprite()
    maskSprite.name = 'maskSprite'
    this.sketchPane.sketchPaneContainer.addChildAt(
      maskSprite,
      this.sketchPane.sketchPaneContainer.getChildIndex(
        this.sketchPane.layersContainer
      ) + 1
    )
    maskSprite.x += 10
    maskSprite.y += 10


    let sprite : PIXI.Sprite = this.asSprite([0, 1, 2, 3]) // layer indices
    sprite.name = 'demo'
    this.sketchPane.sketchPaneContainer.addChildAt(
      sprite,
      this.sketchPane.sketchPaneContainer.getChildIndex(
        this.sketchPane.layersContainer
      ) + 1
    )
    sprite.x = this.areaPath.bounds.x + 315
    sprite.y = this.areaPath.bounds.y - 280

  }
}
