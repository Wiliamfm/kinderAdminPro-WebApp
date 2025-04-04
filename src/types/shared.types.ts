import { JSXChildren, JSXOutput, QRL } from "@builder.io/qwik";

export type TableAction = {
  name: string | JSXOutput;
  action: QRL;
}

export type TableActions = {
  actions: JSXChildren[];
}

export type ErrorResponse = {
  error?: Error;
  message: string;
  status: number;
}

export class BaseError extends Error {
  status: number;
  context: {};

  constructor(message: string, status: number, context: {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.context = context;
  }

}
