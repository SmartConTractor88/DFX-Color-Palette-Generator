export const idlFactory = ({ IDL }) => {
  const Palette = IDL.Record({
    'title' : IDL.Text,
    'colors' : IDL.Vec(IDL.Text),
  });
  return IDL.Service({
    'add_palette' : IDL.Func([IDL.Text, IDL.Vec(IDL.Text)], [], []),
    'delete_palette' : IDL.Func([IDL.Vec(IDL.Text)], [IDL.Bool], []),
    'get_palettes' : IDL.Func([], [IDL.Vec(Palette)], ['query']),
    'update_palette_title' : IDL.Func(
        [IDL.Vec(IDL.Text), IDL.Text],
        [IDL.Bool],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
