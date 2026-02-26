import { Show, type Component } from 'solid-js';

type InlineFieldAlertProps = {
  id: string;
  message?: string | null;
};

const InlineFieldAlert: Component<InlineFieldAlertProps> = (props) => {
  return (
    <Show when={props.message}>
      <p id={props.id} class="field-alert" aria-live="polite">
        {props.message}
      </p>
    </Show>
  );
};

export default InlineFieldAlert;
