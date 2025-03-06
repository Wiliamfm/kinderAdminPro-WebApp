import { JSXChildren, JSXOutput, QRL } from "@builder.io/qwik";

export type TableAction = {
  name: string | JSXOutput;
  action: QRL;
}

export type TableActions = {
  actions: JSXChildren[];
}

