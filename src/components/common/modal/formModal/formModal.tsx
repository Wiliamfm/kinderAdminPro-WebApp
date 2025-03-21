import { QRL, Signal, Slot, component$, useSignal } from "@builder.io/qwik";
import { ActionStore, Form } from "@builder.io/qwik-city";

export type modalFormProps = {
  modalId: string;
  modalBtnClass?: string;
  modalTitle: string;
  modalBtnName: string;
  formBtnName?: string;
  formBtnClass: string;
  formAction: ActionStore<any, any, any>;
  formOnSubmitFn: QRL;
  btnModalRef?: Signal<HTMLButtonElement | undefined>;
};

export default component$<modalFormProps>((props) => {
  const btnCloseModalRef = useSignal<HTMLButtonElement>();

  return (
    <div>
      {/*<!-- Modal toggle -->*/}
      <button ref={props.btnModalRef} data-modal-target={props.modalId} data-modal-toggle={props.modalId} class={props.modalBtnClass} type="button">
        <span class="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
          {props.modalBtnName}
        </span>
      </button>

      {/*<!-- Main modal -->*/}
      <div id={props.modalId} tabIndex={-1} aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
        <div class="relative min-w-3xs p-4 w-full max-w-md max-h-full">
          {/*<!-- Modal content -->*/}
          <div class="relative flex-grow bg-white rounded-lg shadow-sm dark:bg-gray-700">
            {/*<!-- Modal header -->*/}
            <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600 border-gray-200">
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                {props.modalTitle}
              </h3>
              <button ref={btnCloseModalRef} type="button" class="end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" data-modal-hide={props.modalId}>
                <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
                <span class="sr-only">Close modal</span>
              </button>
            </div>
            {/*<!-- Modal body -->*/}
            <div class="p-4 md:p-5">
              <Form class="space-y-4" action={props.formAction} onSubmitCompleted$={(data, element) => {
                props.formOnSubmitFn(data, element);
                btnCloseModalRef.value?.click();
              }}>
                <Slot />
                <button type="submit" class={props.formBtnClass}>
                  {props.formBtnName ? props.formBtnName :
                    <Slot name="formSlot">
                      {props.formBtnName}
                    </Slot>
                  }
                </button>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
