fn main() {
    if let Err(error) = tokio::runtime::Runtime::new()
        .expect("failed to create tokio runtime")
        .block_on(app_lib::devtools::seed_profiles::run())
    {
        eprintln!("seed failed: {error}");
        std::process::exit(1);
    }
}
