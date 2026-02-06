# PWA Icons

This folder should contain PWA icons for the DentalStock Management System.

## Required Icons

Please add the following PNG icons:

| Filename | Size | Purpose |
|----------|------|---------|
| `icon-72x72.png` | 72x72 | Small icon |
| `icon-96x96.png` | 96x96 | Standard icon |
| `icon-128x128.png` | 128x128 | Medium icon |
| `icon-144x144.png` | 144x144 | Windows tile |
| `icon-152x152.png` | 152x152 | iOS icon |
| `icon-192x192.png` | 192x192 | Android icon |
| `icon-384x384.png` | 384x384 | Large icon |
| `icon-512x512.png` | 512x512 | Splash screen |

## Generating Icons

You can use online tools like:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

Or generate with a script:
```bash
# Using ImageMagick
convert source-icon.png -resize 192x192 icon-192x192.png

# Using sharp (Node.js)
npx sharp-cli resize 192 192 -i source.png -o icon-192x192.png
```

## Design Guidelines

- Use a transparent background for best results
- Keep important content within the safe zone (center 80%)
- Use the DentalStock brand colors: Blue #3b82f6
