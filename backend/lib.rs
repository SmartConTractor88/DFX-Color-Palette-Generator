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

type PaletteStore = HashMap<Principal, Vec<Palette>>;

thread_local! {
    static STORE: RefCell<PaletteStore> = RefCell::new(HashMap::new());
}

#[update]
fn add_palette(title: String, colors: Vec<String>) {
    let user = caller();
    let colors: Vec<String> = colors.into_iter().map(|c| c.to_ascii_uppercase()).collect();
    STORE.with(|store| {
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
    STORE.with(|store| {
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
    STORE.with(|store| {
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
    STORE.with(|store| {
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