import * as Assets from '../assets';

export interface PixelScale {
  scale: number;
  crisp: boolean;
  width: number;
  height: number;
}

export let pixelScale: PixelScale = {
  scale: 4,
  crisp: true,
  width: 1,
  height: 1,
};

export function SetScaleAndCalculateDimensions(scale: number, ps: PixelScale): void {
  ps.scale = scale;
  ps.width = DEFAULT_GAME_WIDTH * scale;
  ps.height = DEFAULT_GAME_HEIGHT * scale;
}

export function UpdateGameScale(ps: PixelScale, game: Phaser.Game): void {
  game.scale.setMinMax(ps.width, ps.height, ps.width, ps.height);
  game.scale.refresh();
}

export function UpdateGameCrispness(ps: PixelScale, game: Phaser.Game): void {
  if (ps.crisp)
    Phaser.Canvas.setImageRenderingCrisp(game.canvas);
  else
    Phaser.Canvas.setImageRenderingBicubic(game.canvas);

  // Phaser.Canvas.setSmoothingEnabled(game.context, !ps.crisp);
}