fn main() {
    // Skip icon generation completely to avoid Windows ICO format issues
    println!("cargo:rustc-env=TAURI_SKIP_ICON_GENERATION=1");
    println!("cargo:rustc-env=TAURI_SKIP_BUNDLE_ICONS=1");
    tauri_build::build();
}
