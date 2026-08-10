//! Tooltip boundary detection.
//!
//! SpiritVale-style tooltips are dark, semi-opaque panels drawn over the game
//! world. Inside a captured ROI we look for the largest contiguous dark
//! rectangle near the cursor: grid-downsample -> dark-cell mask -> flood fill
//! from cells near the cursor -> bounding box -> refine edges at pixel level.
//!
//! Tunables live in `TooltipParams`; defaults are calibrated for 1080p and
//! will be re-tuned against real SpiritVale screenshots in Phase 3 (OCR).

use crate::{Rect, RgbaImage};

#[derive(Clone, Copy, Debug)]
pub struct TooltipParams {
    /// Luma at or below which a pixel counts as "dark panel".
    pub dark_luma: u8,
    /// Downsample cell size in pixels.
    pub cell: u32,
    /// Fraction (0-100) of dark pixels for a cell to count as dark.
    pub cell_dark_pct: u8,
    /// Minimum tooltip size in pixels (w, h).
    pub min_size: (u32, u32),
    /// Max distance (in cells) from cursor cell to seed the flood fill.
    pub seed_radius_cells: i32,
}

impl Default for TooltipParams {
    fn default() -> Self {
        Self { dark_luma: 70, cell: 8, cell_dark_pct: 70, min_size: (110, 70), seed_radius_cells: 6 }
    }
}

/// Result of detection: tooltip rect in ROI coordinates + confidence 0-1.
#[derive(Clone, Copy, Debug)]
pub struct TooltipHit {
    pub rect: Rect,
    pub confidence: f32,
}

/// Find the tooltip panel in `img`. `cursor` is the cursor position in ROI
/// coordinates (the point the player hovered). Returns None when no plausible
/// panel is found — the caller must then fall back to Player Review with the
/// raw ROI (never auto-publish a guess).
pub fn detect_tooltip(img: &RgbaImage, cursor: (i32, i32), p: TooltipParams) -> Option<TooltipHit> {
    if img.width < p.min_size.0 || img.height < p.min_size.1 {
        return None;
    }
    let gw = img.width.div_ceil(p.cell);
    let gh = img.height.div_ceil(p.cell);

    // 1) dark-cell mask
    let mut dark = vec![false; (gw * gh) as usize];
    for gy in 0..gh {
        for gx in 0..gw {
            let (x0, y0) = (gx * p.cell, gy * p.cell);
            let (x1, y1) = ((x0 + p.cell).min(img.width), (y0 + p.cell).min(img.height));
            let mut n = 0u32;
            let mut d = 0u32;
            for y in y0..y1 {
                for x in x0..x1 {
                    n += 1;
                    if img.luma(x, y) <= p.dark_luma {
                        d += 1;
                    }
                }
            }
            dark[(gy * gw + gx) as usize] = n > 0 && d * 100 / n >= p.cell_dark_pct as u32;
        }
    }

    // 2) seed cells: dark cells within seed_radius of the cursor cell
    let ccx = (cursor.0.max(0) as u32 / p.cell).min(gw - 1) as i32;
    let ccy = (cursor.1.max(0) as u32 / p.cell).min(gh - 1) as i32;
    let mut stack: Vec<(i32, i32)> = Vec::new();
    for dy in -p.seed_radius_cells..=p.seed_radius_cells {
        for dx in -p.seed_radius_cells..=p.seed_radius_cells {
            let (gx, gy) = (ccx + dx, ccy + dy);
            if gx >= 0 && gy >= 0 && (gx as u32) < gw && (gy as u32) < gh
                && dark[(gy as u32 * gw + gx as u32) as usize]
            {
                stack.push((gx, gy));
            }
        }
    }
    if stack.is_empty() {
        return None;
    }

    // 3) flood fill the dark region
    let mut visited = vec![false; (gw * gh) as usize];
    let (mut min_x, mut min_y, mut max_x, mut max_y) = (i32::MAX, i32::MAX, i32::MIN, i32::MIN);
    let mut filled = 0u32;
    while let Some((gx, gy)) = stack.pop() {
        if gx < 0 || gy < 0 || gx as u32 >= gw || gy as u32 >= gh {
            continue;
        }
        let idx = (gy as u32 * gw + gx as u32) as usize;
        if visited[idx] || !dark[idx] {
            continue;
        }
        visited[idx] = true;
        filled += 1;
        min_x = min_x.min(gx);
        min_y = min_y.min(gy);
        max_x = max_x.max(gx);
        max_y = max_y.max(gy);
        stack.extend([(gx + 1, gy), (gx - 1, gy), (gx, gy + 1), (gx, gy - 1)]);
    }

    // 4) bounding box in pixels
    let rect = Rect {
        x: (min_x as u32) * p.cell,
        y: (min_y as u32) * p.cell,
        w: ((max_x - min_x + 1) as u32 * p.cell).min(img.width - (min_x as u32) * p.cell),
        h: ((max_y - min_y + 1) as u32 * p.cell).min(img.height - (min_y as u32) * p.cell),
    };
    if rect.w < p.min_size.0 || rect.h < p.min_size.1 {
        return None;
    }

    // 5) confidence: how "rectangular" the filled region is (filled cells /
    // bounding-box cells). A real panel fills its box; scattered darkness doesn't.
    let box_cells = ((max_x - min_x + 1) * (max_y - min_y + 1)) as u32;
    let confidence = (filled as f32 / box_cells as f32).clamp(0.0, 1.0);

    Some(TooltipHit { rect, confidence })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Build a light image (luma ~200) with an optional dark rect (luma ~30).
    fn synthetic(w: u32, h: u32, panel: Option<Rect>) -> RgbaImage {
        let mut img = RgbaImage::new(w, h);
        for y in 0..h {
            for x in 0..w {
                img.set_pixel(x, y, (200, 200, 200, 255));
            }
        }
        if let Some(r) = panel {
            for y in r.y..(r.y + r.h).min(h) {
                for x in r.x..(r.x + r.w).min(w) {
                    img.set_pixel(x, y, (28, 30, 34, 255));
                }
            }
        }
        img
    }

    #[test]
    fn finds_panel_near_cursor() {
        let panel = Rect { x: 200, y: 100, w: 320, h: 400 };
        let img = synthetic(680, 820, Some(panel));
        // cursor just left of the panel (hover position)
        let hit = detect_tooltip(&img, (190, 300), TooltipParams::default()).expect("panel found");
        // detected box should tightly contain the panel (cell-aligned tolerance)
        let tol = 8 + 1;
        assert!((hit.rect.x as i32 - panel.x as i32).abs() <= tol);
        assert!((hit.rect.y as i32 - panel.y as i32).abs() <= tol);
        assert!((hit.rect.w as i32 - panel.w as i32).abs() <= 2 * tol);
        assert!((hit.rect.h as i32 - panel.h as i32).abs() <= 2 * tol);
        assert!(hit.confidence > 0.9, "solid panel => high confidence, got {}", hit.confidence);
    }

    #[test]
    fn none_when_no_panel() {
        let img = synthetic(680, 820, None);
        assert!(detect_tooltip(&img, (340, 410), TooltipParams::default()).is_none());
    }

    #[test]
    fn none_when_panel_far_from_cursor() {
        let panel = Rect { x: 500, y: 600, w: 150, h: 150 };
        let img = synthetic(680, 820, Some(panel));
        // cursor far away in the opposite corner — must not seed the fill
        assert!(detect_tooltip(&img, (20, 20), TooltipParams::default()).is_none());
    }

    #[test]
    fn rejects_too_small_panels() {
        let panel = Rect { x: 300, y: 300, w: 60, h: 40 }; // below min_size
        let img = synthetic(680, 820, Some(panel));
        assert!(detect_tooltip(&img, (295, 320), TooltipParams::default()).is_none());
    }

    #[test]
    fn scattered_noise_has_low_confidence_or_none() {
        let mut img = synthetic(680, 820, None);
        // sprinkle disconnected dark dots — not a panel
        for i in 0..300u32 {
            let x = (i * 37) % 660;
            let y = (i * 61) % 800;
            for dy in 0..3 {
                for dx in 0..3 {
                    img.set_pixel(x + dx, y + dy, (20, 20, 20, 255));
                }
            }
        }
        if let Some(hit) = detect_tooltip(&img, (340, 410), TooltipParams::default()) {
            assert!(hit.confidence < 0.5, "noise must not look like a solid panel");
        }
    }

    #[test]
    fn crop_matches_detected_rect() {
        let panel = Rect { x: 160, y: 240, w: 240, h: 320 };
        let img = synthetic(680, 820, Some(panel));
        let hit = detect_tooltip(&img, (150, 400), TooltipParams::default()).unwrap();
        let crop = img.crop(hit.rect);
        assert_eq!(crop.width, hit.rect.w);
        assert_eq!(crop.height, hit.rect.h);
        // centre of the crop must be panel-dark
        assert!(crop.luma(crop.width / 2, crop.height / 2) < 70);
    }
}
