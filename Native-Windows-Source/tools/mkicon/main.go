// mkicon builds app.ico (PNG-compressed entries, 16..256 px) and ui/logo.png.
//
//	go run ./tools/mkicon -in logo.png -out app.ico -png ui/logo.png   (use a supplied PNG)
//	go run ./tools/mkicon -out app.ico -png ui/logo.png                (temporary placeholder mark)
package main

import (
	"bytes"
	"encoding/binary"
	"flag"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"math"
	"os"
)

func clamp(v float64) float64 { return math.Max(0, math.Min(1, v)) }

func sdRound(x, y, cx, cy, hw, hh, r float64) float64 {
	qx, qy := math.Abs(x-cx)-hw+r, math.Abs(y-cy)-hh+r
	return math.Hypot(math.Max(qx, 0), math.Max(qy, 0)) + math.Min(math.Max(qx, qy), 0) - r
}

func segDist(px, py, ax, ay, bx, by float64) float64 {
	dx, dy := bx-ax, by-ay
	t := clamp(((px-ax)*dx + (py-ay)*dy) / (dx*dx + dy*dy))
	return math.Hypot(px-(ax+t*dx), py-(ay+t*dy))
}

// placeholder draws the temporary mark on a 64-unit grid, supersampled for smooth edges.
func placeholder(size int) *image.NRGBA {
	img := image.NewNRGBA(image.Rect(0, 0, size, size))
	const ss = 4
	k := 64 / float64(size)
	for py := 0; py < size; py++ {
		for px := 0; px < size; px++ {
			var r, g, b, a float64
			for sy := 0; sy < ss; sy++ {
				for sx := 0; sx < ss; sx++ {
					x := (float64(px) + (float64(sx)+.5)/ss) * k
					y := (float64(py) + (float64(sy)+.5)/ss) * k
					if sdRound(x, y, 32, 32, 29, 29, 16) > 0 {
						continue
					}
					t := (x + y) / 128
					cr, cg, cb := 143+(165-143)*t, 166+(150-166)*t, 232+(226-232)*t
					if y < 32 { // soft glass highlight on the top half
						h := (32 - y) / 32 * .35
						cr, cg, cb = cr+(255-cr)*h, cg+(255-cg)*h, cb+(255-cb)*h
					}
					if d := sdRound(x, y, 32, 31, 17, 15, 8); d < 0 { // keycap
						cr, cg, cb = cr+(255-cr)*.2, cg+(255-cg)*.2, cb+(255-cb)*.2
						if d > -1.6 {
							cr, cg, cb = cr+(255-cr)*.55, cg+(255-cg)*.55, cb+(255-cb)*.55
						}
					}
					d := math.Min(segDist(x, y, 25, 24, 25, 38), math.Min(segDist(x, y, 25, 31, 33, 24), segDist(x, y, 27.5, 29, 34.5, 38)))
					if d < 1.7 || math.Hypot(x-42, y-36) < 2.6 {
						cr, cg, cb = 255, 255, 255
					}
					r, g, b, a = r+cr, g+cg, b+cb, a+1
				}
			}
			if a > 0 {
				n := float64(ss * ss)
				img.SetNRGBA(px, py, color.NRGBA{uint8(r / a), uint8(g / a), uint8(b / a), uint8(255 * a / n)})
			}
		}
	}
	return img
}

// scale downsamples with an area average, which keeps edges clean at small sizes.
func scale(src image.Image, size int) *image.NRGBA {
	b := src.Bounds()
	side := b.Dx()
	if b.Dy() < side {
		side = b.Dy()
	}
	ox, oy := b.Min.X+(b.Dx()-side)/2, b.Min.Y+(b.Dy()-side)/2 // centre-crop to a square
	out := image.NewNRGBA(image.Rect(0, 0, size, size))
	f := float64(side) / float64(size)
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			x0, x1, y0, y1 := int(float64(x)*f), int(math.Ceil(float64(x+1)*f)), int(float64(y)*f), int(math.Ceil(float64(y+1)*f))
			var r, g, bl, a, n float64
			for yy := y0; yy < y1 && yy < side; yy++ {
				for xx := x0; xx < x1 && xx < side; xx++ {
					c := color.NRGBAModel.Convert(src.At(ox+xx, oy+yy)).(color.NRGBA)
					w := float64(c.A)
					r, g, bl, a, n = r+float64(c.R)*w, g+float64(c.G)*w, bl+float64(c.B)*w, a+w, n+1
				}
			}
			if a > 0 {
				out.SetNRGBA(x, y, color.NRGBA{uint8(r / a), uint8(g / a), uint8(bl / a), uint8(a / n)})
			}
		}
	}
	return out
}

func main() {
	in := flag.String("in", "", "optional source PNG (square-ish logo)")
	out := flag.String("out", "app.ico", "output .ico")
	pngOut := flag.String("png", "", "optional output PNG (256px) for the UI")
	crop := flag.Float64("crop", 0, "fraction trimmed from each edge of the source before scaling (e.g. 0.07)")
	round := flag.Float64("round", 0, "corner radius as a fraction of the size, applied as a transparent mask (e.g. 0.24)")
	flag.Parse()

	var src image.Image
	if *in != "" {
		f, err := os.Open(*in)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		defer f.Close()
		if src, err = png.Decode(f); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		if *crop > 0 {
			b := src.Bounds()
			m := int(float64(b.Dx()) * *crop)
			if sub, ok := src.(interface {
				SubImage(image.Rectangle) image.Image
			}); ok {
				src = sub.SubImage(image.Rect(b.Min.X+m, b.Min.Y+m, b.Max.X-m, b.Max.Y-m))
			}
		}
	}
	sizes := []int{16, 24, 32, 48, 64, 128, 256}
	var blobs [][]byte
	for _, s := range sizes {
		var im *image.NRGBA
		if src != nil {
			im = scale(src, s)
			if *round > 0 { // anti-aliased rounded-corner alpha mask
				fs, r := float64(s), *round*float64(s)
				for y := 0; y < s; y++ {
					for x := 0; x < s; x++ {
						d := sdRound(float64(x)+.5, float64(y)+.5, fs/2, fs/2, fs/2, fs/2, r)
						c := im.NRGBAAt(x, y)
						c.A = uint8(float64(c.A) * clamp(.5-d))
						im.SetNRGBA(x, y, c)
					}
				}
			}
		} else {
			im = placeholder(s)
		}
		var buf bytes.Buffer
		_ = png.Encode(&buf, im)
		blobs = append(blobs, buf.Bytes())
		if *pngOut != "" && s == 256 {
			_ = os.WriteFile(*pngOut, buf.Bytes(), 0644)
		}
	}
	var ico bytes.Buffer
	_ = binary.Write(&ico, binary.LittleEndian, [3]uint16{0, 1, uint16(len(sizes))})
	off := 6 + 16*len(sizes)
	for i, s := range sizes {
		w := byte(s)
		if s >= 256 {
			w = 0
		}
		ico.Write([]byte{w, w, 0, 0})
		_ = binary.Write(&ico, binary.LittleEndian, [2]uint16{1, 32})
		_ = binary.Write(&ico, binary.LittleEndian, [2]uint32{uint32(len(blobs[i])), uint32(off)})
		off += len(blobs[i])
	}
	for _, b := range blobs {
		ico.Write(b)
	}
	if err := os.WriteFile(*out, ico.Bytes(), 0644); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	_ = draw.Src
	fmt.Println("wrote", *out, len(ico.Bytes()), "bytes")
}
