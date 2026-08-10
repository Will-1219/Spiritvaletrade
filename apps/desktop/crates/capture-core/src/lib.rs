//! ValeTrade capture-core: OS-independent logic for the F8 capture flow.
//!
//! - `roi`: computes the capture rectangle around the cursor
//! - `tooltip`: finds the tooltip panel inside a captured ROI image
//!
//! No OS or GUI dependencies — everything here runs and tests on any platform.

pub mod roi;
pub mod tooltip;

/// Simple owned RGBA image buffer (row-major, 4 bytes per pixel).
#[derive(Clone)]
pub struct RgbaImage {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

impl RgbaImage {
    pub fn new(width: u32, height: u32) -> Self {
        Self { width, height, data: vec![0; (width * height * 4) as usize] }
    }

    #[inline]
    pub fn pixel(&self, x: u32, y: u32) -> (u8, u8, u8, u8) {
        let i = ((y * self.width + x) * 4) as usize;
        (self.data[i], self.data[i + 1], self.data[i + 2], self.data[i + 3])
    }

    #[inline]
    pub fn set_pixel(&mut self, x: u32, y: u32, rgba: (u8, u8, u8, u8)) {
        let i = ((y * self.width + x) * 4) as usize;
        self.data[i] = rgba.0;
        self.data[i + 1] = rgba.1;
        self.data[i + 2] = rgba.2;
        self.data[i + 3] = rgba.3;
    }

    /// Perceived luminance (0-255).
    #[inline]
    pub fn luma(&self, x: u32, y: u32) -> u8 {
        let (r, g, b, _) = self.pixel(x, y);
        ((r as u32 * 299 + g as u32 * 587 + b as u32 * 114) / 1000) as u8
    }

    /// Crop a sub-rectangle (clamped to bounds).
    pub fn crop(&self, rect: Rect) -> RgbaImage {
        let x1 = rect.x.min(self.width);
        let y1 = rect.y.min(self.height);
        let x2 = (rect.x + rect.w).min(self.width);
        let y2 = (rect.y + rect.h).min(self.height);
        let (w, h) = (x2.saturating_sub(x1), y2.saturating_sub(y1));
        let mut out = RgbaImage::new(w, h);
        for y in 0..h {
            for x in 0..w {
                out.set_pixel(x, y, self.pixel(x1 + x, y1 + y));
            }
        }
        out
    }
}

/// Axis-aligned rectangle in image coordinates.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Rect {
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

impl Rect {
    pub fn area(&self) -> u64 {
        self.w as u64 * self.h as u64
    }
}
