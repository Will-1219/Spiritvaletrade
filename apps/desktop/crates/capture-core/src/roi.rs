//! ROI (region of interest) math: which part of the screen to capture around the cursor.
//!
//! Privacy rule (docs/PRODUCT.md §14): we never capture the full desktop —
//! only a bounded region near the cursor where a game tooltip can appear.

use crate::Rect;

/// Default capture box: tooltips render right/below or right/above the cursor,
/// so we take a generous but bounded window biased to the right of the cursor.
pub const ROI_LEFT: i32 = 120;
pub const ROI_RIGHT: i32 = 560;
pub const ROI_UP: i32 = 340;
pub const ROI_DOWN: i32 = 480;

/// Compute the ROI rectangle around the cursor, clamped to the monitor bounds.
/// `cursor` is in monitor-local coordinates; returns monitor-local Rect.
pub fn cursor_roi(cursor_x: i32, cursor_y: i32, monitor_w: u32, monitor_h: u32) -> Rect {
    let x1 = ((cursor_x - ROI_LEFT).max(0) as u32).min(monitor_w);
    let y1 = ((cursor_y - ROI_UP).max(0) as u32).min(monitor_h);
    let x2 = ((cursor_x + ROI_RIGHT).max(0) as u32).min(monitor_w);
    let y2 = ((cursor_y + ROI_DOWN).max(0) as u32).min(monitor_h);
    Rect { x: x1, y: y1, w: x2.saturating_sub(x1), h: y2.saturating_sub(y1) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roi_centered() {
        let r = cursor_roi(960, 540, 1920, 1080);
        assert_eq!(r, Rect { x: 840, y: 200, w: 680, h: 820 });
    }

    #[test]
    fn roi_clamps_at_edges() {
        let r = cursor_roi(10, 10, 1920, 1080);
        assert_eq!((r.x, r.y), (0, 0));
        assert_eq!(r.w, 570); // 10 + ROI_RIGHT
        assert_eq!(r.h, 490); // 10 + ROI_DOWN
        let r2 = cursor_roi(1910, 1070, 1920, 1080);
        assert_eq!(r2.x, 1790);
        assert_eq!(r2.w, 130);
        assert!(r2.y + r2.h <= 1080);
    }

    #[test]
    fn roi_never_exceeds_monitor() {
        for &(cx, cy) in &[(0, 0), (1919, 1079), (-5, -5), (5000, 5000)] {
            let r = cursor_roi(cx, cy, 1920, 1080);
            assert!(r.x + r.w <= 1920 && r.y + r.h <= 1080);
        }
    }
}
