use app_lib::devtools::{repair_seed_profiles, seed_profiles};

#[tokio::main]
async fn main() {
    let command = std::env::args().nth(1).unwrap_or_else(|| "seed".to_string());
    let result = match command.as_str() {
        "repair" => repair_seed_profiles::run().await,
        "seed" | _ => seed_profiles::run().await,
    };
    if let Err(error) = result {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
