# DesaKu — art prompts (ChatGPT)

Game dah boleh main tanpa gambar (bangunan dilukis guna code). Setiap gambar yang ada dalam `list.json` akan **terus ganti** lukisan code.

## ⚠️ Peraturan teknikal (WAJIB untuk semua gambar)
- Format `.webp`, **background transparent**, takde teks, takde watermark.
- **Sudut isometrik 2:1** (sudut kamera klasik SimCity/Pocket City, ~30°). Semua gambar mesti sudut SAMA.
- **Lebar gambar = 512 px.** Objek mesti penuh lebar petak.
- **Tapak berbentuk berlian (diamond) 512×256** duduk betul-betul kat **bawah gambar**: bucu kiri & kanan berlian di tepi kiri/kanan gambar, bucu bawah berlian di tengah-bawah gambar. Bangunan berdiri atas berlian ni.
- Ketinggian gambar: 512 px (bangunan biasa) atau 768 px (bangunan tinggi). Ruang kosong atas mesti transparent.
- Cahaya dari **kiri atas**: sisi kiri bangunan lebih terang, sisi kanan lebih gelap.
- Takde bayang panjang yang terkeluar dari berlian.

## Gaya umum (letak depan setiap prompt)
> Cozy isometric game asset, 2:1 isometric angle like Pocket City / Townscaper, soft pastel colours, rounded chunky shapes, gentle cel shading, thin soft dark-brown outline, Malaysian kampung theme, cute and warm, transparent background, no text, no people. The object stands on a flat diamond-shaped grass base tile (512×256) that touches the left, right and bottom edges of the image.

## 1. Tanah & alam (berlian sahaja, 512×256, TAKDE bangunan)
| Fail | Saiz | Prompt tambahan |
|---|---|---|
| `tanah.webp` | 512×256 | A flat isometric diamond tile of soft lush grass with tiny flowers, seamless edges so tiles join perfectly, no base thickness |
| `air.webp` | 512×256 | A flat isometric diamond tile of calm light-blue river water with small white ripples, seamless edges, no base thickness |
| `pokok.webp` | 512×512 | A cluster of 2 tropical trees (one coconut palm, one round leafy tree) on a grass diamond base |

## 2. Jalan (berlian sahaja, 512×256, flat)
| Fail | Prompt tambahan |
|---|---|
| `jalan_x.webp` | Flat isometric diamond tile of a small kampung asphalt road running from TOP-LEFT edge to BOTTOM-RIGHT edge, dashed white centre line, grass verges |
| `jalan_y.webp` | Same road style but running from TOP-RIGHT edge to BOTTOM-LEFT edge |
| `jalan_simpang.webp` | Same road style, a 4-way crossroad junction covering the whole diamond |

## 3. Rumah (3 level — rumah naik taraf bila penduduk gembira)
| Fail | Saiz | Prompt tambahan |
|---|---|---|
| `rumah_0.webp` | 512×512 | Traditional small Malay wooden kampung house on short stilts, brown timber walls, zinc roof, little wooden stairs |
| `rumah_1.webp` | 512×512 | Cosy single-storey brick terrace-style house, cream walls, red-orange tiled roof, small porch with potted plants |
| `rumah_2.webp` | 512×512 | Pretty 2-storey bungalow, white walls, blue roof, balcony, small garden with flowers |

## 4. Bangunan
| Fail | Saiz | Prompt tambahan |
|---|---|---|
| `sawah.webp` | 512×256 | Flat diamond tile of green paddy field with rows of rice plants and a little water shine (no building) |
| `warung.webp` | 512×512 | Small Malaysian roadside food stall (warung) with striped awning, plastic tables & stools, steaming wok |
| `taman.webp` | 512×512 | Small park with a bench, a slide, a flower bed and a round tree on the grass diamond |
| `kedai.webp` | 512×512 | Small kampung sundry shop (kedai runcit) with colourful signboard shape (no letters), crates of goods outside |
| `surau.webp` | 512×512 | Small Malaysian surau with a green dome and a tiny minaret, white walls, neat and peaceful |
| `sekolah.webp` | 512×512 | Small Malaysian primary school building, 2 storeys, cream & blue walls, small field and flag pole |
| `pasar.webp` | 512×512 | Open-air wet market with colourful tents and stalls of fruit and vegetables |
| `klinik.webp` | 512×512 | Small friendly community clinic, white building with a red cross sign shape and a small ambulance |
| `kilang.webp` | 512×768 | Small cute factory with a chimney (light grey smoke puff), corrugated roof, a few crates |
| `flat.webp` | 512×768 | Cute 5-storey low-cost apartment block (flat) with colourful laundry on balconies |

## Lepas siap
1. Simpan semua `.webp` dalam folder `sprites/`.
2. Tambah nama (tanpa `.webp`) dalam `sprites/list.json`, contoh: `["tanah","air","pokok","jalan_x", ...]`.
3. Naikkan `VERSION` dalam `sw.js` (contoh `desaku-0.1.0` → `desaku-0.2.0`).
