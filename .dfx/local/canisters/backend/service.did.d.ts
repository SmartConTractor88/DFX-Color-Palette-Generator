import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Color { 'title' : string, 'hex_code' : string }
export interface Palette { 'title' : string, 'colors' : Array<string> }
export interface _SERVICE {
  'add_color' : ActorMethod<[string], undefined>,
  'add_palette' : ActorMethod<[string, Array<string>], undefined>,
  'delete_color' : ActorMethod<[string], boolean>,
  'delete_palette' : ActorMethod<[Array<string>], boolean>,
  'get_colors' : ActorMethod<[], Array<Color>>,
  'get_palettes' : ActorMethod<[], Array<Palette>>,
  'update_color_title' : ActorMethod<[string, string], boolean>,
  'update_palette_title' : ActorMethod<[Array<string>, string], boolean>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
