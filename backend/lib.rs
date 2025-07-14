use ic_cdk::api::caller;
use ic_cdk_macros::*;
use candid::{CandidType, Deserialize, Principal};
use std::collections::HashMap;
use std::cell::RefCell;

#[derive(Clone, Debug, CandidType, Deserialize)]
struct Palette {
    title: String,
    colors: Vec<String>,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct Color {
    hex_code: String,
    title: String,
}

type PaletteStore = HashMap<Principal, Vec<Palette>>;
type ColorStore = HashMap<Principal, Vec<Color>>;

thread_local! {
    static PALETTE_STORE: RefCell<PaletteStore> = RefCell::new(HashMap::new());
    static COLOR_STORE: RefCell<ColorStore> = RefCell::new(HashMap::new());
}

#[update]
fn add_palette(title: String, colors: Vec<String>) {
    let user = caller();
    let colors: Vec<String> = colors.into_iter().map(|c| c.to_ascii_uppercase()).collect();
    PALETTE_STORE.with(|store| {
        let mut map = store.borrow_mut();
        let entry = map.entry(user).or_insert_with(Vec::new);

        if entry.len() >= 15 {
            ic_cdk::trap("Maximum of 15 favorites allowed.");
        }

        if entry.iter().any(|p| p.colors == colors) {
            ic_cdk::trap("Palette already exists.");
        }

        entry.push(Palette { title, colors });
    });
}

#[query]
fn get_palettes() -> Vec<Palette> {
    let user = caller();
    PALETTE_STORE.with(|store| {
        store
            .borrow()
            .get(&user)
            .cloned()
            .unwrap_or_else(Vec::new)
    })
}

#[update]
fn delete_palette(colors: Vec<String>) -> bool {
    let user = caller();
    let colors: Vec<String> = colors.into_iter().map(|c| c.to_ascii_uppercase()).collect();
    PALETTE_STORE.with(|store| {
        let mut map = store.borrow_mut();
        if let Some(palettes) = map.get_mut(&user) {
            let len_before = palettes.len();
            palettes.retain(|p| p.colors != colors);
            return palettes.len() < len_before;
        }
        false
    })
}

#[update]
fn update_palette_title(colors: Vec<String>, new_title: String) -> bool
{
    let user = caller();
    let colors: Vec<String> = colors.into_iter().map(|c| c.to_ascii_uppercase()).collect();
    PALETTE_STORE.with(|store| {
        let mut map = store.borrow_mut();
        if let Some(palettes) = map.get_mut(&user) {
            for palette in palettes.iter_mut() {
                if palette.colors == colors {
                    palette.title = new_title;
                    return true;
                }
            }
        }
        false
    })
}

// Individual color favorites functions
#[update]
fn add_color(hex_code: String) {
    let user = caller();
    let hex_code = hex_code.to_ascii_uppercase();
    COLOR_STORE.with(|store| {
        let mut map = store.borrow_mut();
        let entry = map.entry(user).or_insert_with(Vec::new);

        if entry.len() >= 50 {
            ic_cdk::trap("Maximum of 50 favorite colors allowed.");
        }

        if entry.iter().any(|c| c.hex_code == hex_code) {
            ic_cdk::trap("Color already exists in favorites.");
        }

        entry.push(Color { hex_code, title: "Untitled".to_string() });
    });
}

#[query]
fn get_colors() -> Vec<Color> {
    let user = caller();
    COLOR_STORE.with(|store| {
        store
            .borrow()
            .get(&user)
            .cloned()
            .unwrap_or_else(Vec::new)
    })
}

#[update]
fn delete_color(hex_code: String) -> bool {
    let user = caller();
    let hex_code = hex_code.to_ascii_uppercase();
    COLOR_STORE.with(|store| {
        let mut map = store.borrow_mut();
        if let Some(colors) = map.get_mut(&user) {
            let len_before = colors.len();
            colors.retain(|c| c.hex_code != hex_code);
            return colors.len() < len_before;
        }
        false
    })
}

// Add update_color_title function
#[update]
fn update_color_title(hex_code: String, new_title: String) -> bool {
    let user = caller();
    let hex_code = hex_code.to_ascii_uppercase();
    COLOR_STORE.with(|store| {
        let mut map = store.borrow_mut();
        if let Some(colors) = map.get_mut(&user) {
            for color in colors.iter_mut() {
                if color.hex_code == hex_code {
                    color.title = new_title;
                    return true;
                }
            }
        }
        false
    })
}