//! F8 capture orchestration: window gate → cursor → monitor grab → ROI →
//! tooltip detect → save crops → result for the UI.
//!
//! Privacy rules enforced here (docs/PRODUCT.md §14):
//! - capture is refused unless SpiritVale is the foreground window
//! - only the bounded cursor ROI is grabbed, never the full desktop
//! - files stay local; nothing is uploaded in Phase 2

use capture_core::{roi::cursor_roi, tooltip, Rect, RgbaImage};
use serde::Serialize;
use std::path::PathBuf;

use crate::platform;

/// Window-title substring that must match the foreground window.
pub const GAME_WINDOW_MATCH: &str = "SpiritVale";

#[derive(Serialize, Clone, Debug)]
pub struct CaptureResult {
    pub ok: bool,
    pub reason: Option<String>,
    pub window_title: Option<String>,
    pub roi_path: Option<String>,
    pub tooltip_path: Option<String>,
    pub tooltip_rect: Option<[u32; 4]>,
    pub tooltip_confidence: Option<f32>,
    pub elapsed_ms: u128,
}

impl CaptureResult {
    fn fail(reason: &str, title: Option<String>, elapsed_ms: u128) -> Self {
        Self {
            ok: false,
            reason: Some(reason.into()),
            window_title: title,
            roi_path: None,
            tooltip_path: None,
            tooltip_rect: None,
            tooltip_confidence: None,
            elapsed_ms,
        }
    }
}

pub fn run_capture(out_dir: PathBuf) -> CaptureResult {
    let started = std::time::Instant::now();

    // 1) game must be the foreground window
    let title = platform::foreground_window_title();
    let is_game = title.as_deref().map(|t| t.contains(GAME_WINDOW_MATCH)).unwrap_or(false);
    if !is_game {
        return CaptureResult::fail(
            "SpiritVale is not the foreground window — capture refused",
            title,
            started.elapsed().as_millis(),
        );
    }

    // 2) cursor + monitor
    let Some((cx, cy)) = platform::cursor_pos() else {
        return CaptureResult::fail("cursor position unavailable", title, started.elapsed().as_millis());
    };
    let monitor = match xcap::Monitor::from_point(cx, cy) {
        Ok(m) => m,
        Err(e) => {
            return CaptureResult::fail(&format!("monitor lookup failed: {e}"), title, started.elapsed().as_millis())
        }
    };

    // 3) grab the monitor frame, then crop to the bounded cursor ROI.
    //    (xcap grabs per-monitor; the full frame stays in memory only.)
    let frame = match monitor.capture_image() {
        Ok(f) => f,
        Err(e) => {
            return CaptureResult::fail(&format!("capture failed: {e}"), title, started.elapsed().as_millis())
        }
    };
    let (mw, mh) = (frame.width(), frame.height());
    let img = RgbaImage { width: mw, height: mh, data: frame.into_raw() };

    // monitor-local cursor coordinates
    let mx = monitor.x().unwrap_or(0);
    let my = monitor.y().unwrap_or(0);
    let (lcx, lcy) = (cx - mx, cy - my);

    let roi_rect = cursor_roi(lcx, lcy, mw, mh);
    if roi_rect.w == 0 || roi_rect.h == 0 {
        return CaptureResult::fail("empty ROI", title, started.elapsed().as_millis());
    }
    let roi = img.crop(roi_rect);
    drop(img); // full frame released immediately

    // 4) tooltip detection (cursor position translated into ROI coords)
    let cursor_in_roi = (lcx - roi_rect.x as i32, lcy - roi_rect.y as i32);
    let hit = tooltip::detect_tooltip(&roi, cursor_in_roi, tooltip::TooltipParams::default());

    // 5) save crops locally
    std::fs::create_dir_all(&out_dir).ok();
    let stamp = chrono::Local::now().format("%Y%m%d_%H%M%S%.3f");
    let roi_path = out_dir.join(format!("roi_{stamp}.png"));
    if let Err(e) = save_png(&roi, &roi_path) {
        return CaptureResult::fail(&format!("save failed: {e}"), title, started.elapsed().as_millis());
    }

    let (tooltip_path, tooltip_rect, confidence) = match hit {
        Some(h) => {
            let crop = roi.crop(h.rect);
            let p = out_dir.join(format!("tooltip_{stamp}.png"));
            match save_png(&crop, &p) {
                Ok(()) => (
                    Some(p.to_string_lossy().to_string()),
                    Some([h.rect.x, h.rect.y, h.rect.w, h.rect.h]),
                    Some(h.confidence),
                ),
                Err(_) => (None, None, None),
            }
        }
        None => (None, None, None),
    };

    CaptureResult {
        ok: true,
        reason: if tooltip_path.is_none() {
            Some("no tooltip detected — raw ROI saved for player review".into())
        } else {
            None
        },
        window_title: title,
        roi_path: Some(roi_path.to_string_lossy().to_string()),
        tooltip_path,
        tooltip_rect,
        tooltip_confidence: confidence,
        elapsed_ms: started.elapsed().as_millis(),
    }
}

fn save_png(img: &RgbaImage, path: &std::path::Path) -> Result<(), String> {
    let buf: image::RgbaImage =
        image::ImageBuffer::from_raw(img.width, img.height, img.data.clone())
            .ok_or_else(|| "buffer size mismatch".to_string())?;
    buf.save(path).map_err(|e| e.to_string())
}

#[allow(dead_code)]
fn unused_rect_lint_guard(r: Rect) -> u64 {
    r.area()
}
