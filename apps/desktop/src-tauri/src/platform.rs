//! OS-specific helpers: foreground window title + cursor position.
//! Windows is the production target; other platforms get dev-mode mocks so the
//! app runs (with a warning) during cross-platform development.

#[cfg(windows)]
pub fn foreground_window_title() -> Option<String> {
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW};
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }
        let mut buf = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut buf);
        if len == 0 {
            return None;
        }
        Some(String::from_utf16_lossy(&buf[..len as usize]))
    }
}

#[cfg(windows)]
pub fn cursor_pos() -> Option<(i32, i32)> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
    unsafe {
        let mut p = POINT::default();
        if GetCursorPos(&mut p).is_ok() {
            Some((p.x, p.y))
        } else {
            None
        }
    }
}

#[cfg(not(windows))]
pub fn foreground_window_title() -> Option<String> {
    // Dev mock: pretend the game is focused so the capture flow can be exercised.
    Some("SpiritVale (dev mock)".into())
}

#[cfg(not(windows))]
pub fn cursor_pos() -> Option<(i32, i32)> {
    Some((400, 400))
}
