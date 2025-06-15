use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl,
};
use std::cell::RefCell;
use ic_cdk::api::management_canister::main::raw_rand;
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;
use palette::{Srgb};

type Memory = VirtualMemory<DefaultMemoryImpl>;

// To store global state in a Rust canister, we use the `thread_local!` macro.
thread_local! {
    // The memory manager is used for simulating multiple memories. Given a `MemoryId` it can
    // return a memory that can be used by stable structures.
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // We store the greeting in a `Cell` in stable memory such that it gets persisted over canister upgrades.
    static GREETING: RefCell<ic_stable_structures::Cell<String, Memory>> = RefCell::new(
        ic_stable_structures::Cell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0))), "Hello, ".to_string()
        ).unwrap()
    );
}

// This update method stores the greeting prefix in stable memory.
#[ic_cdk::update]
fn set_greeting(prefix: String) {
    GREETING.with_borrow_mut(|greeting| {
        greeting.set(prefix).unwrap();
    });
}

// This query method returns the currently persisted greeting with the given name.
#[ic_cdk::query]
fn greet(name: String) -> String {
    let greeting = GREETING.with_borrow(|greeting| greeting.get().clone());
    format!("{greeting}{name}!")
}

#[ic_cdk::update]
async fn random_palette() -> Vec<String> {
    let (raw_bytes,) = raw_rand().await.expect("Failed to get randomness");
    let seed: [u8; 32] = raw_bytes[..32].try_into().expect("Seed must be 32 bytes");
    let mut rng = StdRng::from_seed(seed);

    (0..5).map(|_| {
        let r: f32 = rng.gen();
        let g: f32 = rng.gen();
        let b: f32 = rng.gen();
        let color = Srgb::new(r, g, b).into_format::<u8>();
        format!("#{:02X}{:02X}{:02X}", color.red, color.green, color.blue)
    }).collect()
}

// Export the interface for the smart contract.
ic_cdk::export_candid!();
