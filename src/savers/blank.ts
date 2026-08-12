import type { SaverDefinition } from "../core/types";

export const blankSaver: SaverDefinition = {
  id: "blank",
  name: "空白屏幕",
  description: "最安静的经典屏保：关闭所有画面，只保留纯黑。",
  defaults: {},
  controls: [],
  create: () => ({
    update: () => undefined,
    render: (context, width, height) => {
      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);
    },
  }),
};
