import { JSXChildren, JSXOutput, QRL } from "@builder.io/qwik";

export type TableAction = {
  name: string | JSXOutput;
  action: QRL;
}

export type TableActions = {
  actions: JSXChildren[];
}

export class BaseError extends Error {
  status: number;
  context: object;

  constructor(message: string, status: number, context: object) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.context = context;
  }

}
