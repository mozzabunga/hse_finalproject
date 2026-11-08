import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const svgPath = path.resolve('public/icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf-8');

function renderSvg(width, height) {
  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

console.log('Rendering 512x512 icon.png...');
fs.writeFileSync('public/icon.png', renderSvg(512, 512));

console.log('Rendering 180x180 apple-touch-icon.png...');
const appleIcon = renderSvg(180, 180);
fs.writeFileSync('public/apple-touch-icon.png', appleIcon);
fs.writeFileSync('public/apple-touch-icon-precomposed.png', appleIcon);

console.log('Rendering 192x192 favicon.png...');
fs.writeFileSync('public/favicon.png', renderSvg(192, 192));

console.log('Rendering app_icon.jpg / icon.png...');
fs.writeFileSync('public/app_icon.jpg', renderSvg(512, 512));

console.log('Icons generated successfully!');
