# Icons

This directory contains the application icons for ScoBro Logbook.

## Files

- `icon.svg` - Source SVG icon (32x32)
- `icon.png` - PNG version for tray icon (32x32)

## Generating PNG from SVG

To convert the SVG to PNG, you can use:

```bash
# Using ImageMagick
convert icon.svg icon.png

# Using Inkscape
inkscape --export-png=icon.png icon.svg

# Using online converter
# Upload icon.svg to https://convertio.co/svg-png/
```

## Icon Design

The icon features:
- Blue background (#0275d8)
- White notebook lines
- Binding holes on the left
- Simple, clean design suitable for system tray
