import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Palette { 'title' : string, 'colors' : Array<string> }
export interface _SERVICE {
  'add_palette' : ActorMethod<[string, Array<string>], undefined>,
  'delete_palette' : ActorMethod<[Array<string>], boolean>,
  'get_palettes' : ActorMethod<[], Array<Palette>>,
  'update_palette_title' : ActorMethod<[Array<string>, string], boolean>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
