import { component$ } from "@builder.io/qwik";

type TitleProps = {
  title: string;
}

export default component$<TitleProps>(({ title }) => {
  return (
    <h1 class="my-10 text-center text-3xl font-bold">
      {title}
    </h1>
  );
});
