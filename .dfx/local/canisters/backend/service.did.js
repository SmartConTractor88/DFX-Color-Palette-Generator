export const idlFactory = ({ IDL }) => {
  const Color = IDL.Record({ 'title' : IDL.Text, 'hex_code' : IDL.Text });
  const Palette = IDL.Record({
    'title' : IDL.Text,
    'colors' : IDL.Vec(IDL.Text),
  });
  return IDL.Service({
    'add_color' : IDL.Func([IDL.Text], [], []),
    'add_palette' : IDL.Func([IDL.Text, IDL.Vec(IDL.Text)], [], []),
    'delete_color' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'delete_palette' : IDL.Func([IDL.Vec(IDL.Text)], [IDL.Bool], []),
    'get_colors' : IDL.Func([], [IDL.Vec(Color)], ['query']),
    'get_palettes' : IDL.Func([], [IDL.Vec(Palette)], ['query']),
    'update_color_title' : IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
    'update_palette_title' : IDL.Func(
        [IDL.Vec(IDL.Text), IDL.Text],
        [IDL.Bool],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
