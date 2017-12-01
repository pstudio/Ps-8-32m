import { FC } from '../FantasyConsole/FC';
import { IToolWindow } from './IToolWindow';
import { BitmapEncoderUI } from './BitmapEncoder';
import { MemoryDebugger } from './MemoryDebugger';
import { Compiler } from './Compiler';

export enum SelectedTool {
  None,
  BitmapEncoder,
  MemoryDebugger,
  Compiler,
}

interface SelectableTool {
  selectedTool: SelectedTool;
}

export class Tools {
  selectedTool: SelectableTool;

  private tools: Array<IToolWindow>;

  public init(fc: FC) {
    this.selectedTool = {
      selectedTool: SelectedTool.Compiler
    };

    this.tools = [
      new BitmapEncoderUI(),
      new MemoryDebugger(fc),
      new Compiler(fc),
    ];

    this.refreshSelectedTool();
  }

  public refreshSelectedTool() {
    this.tools.forEach((tool, index) => {
      if (index === this.selectedTool.selectedTool - 1)
        tool.visible(true);
      else
        tool.visible(false);
    });
  }

  public getTool(tool: SelectedTool): IToolWindow {
    return this.tools[tool - 1];
  }
}

export const ToolMenu: Tools = new Tools();