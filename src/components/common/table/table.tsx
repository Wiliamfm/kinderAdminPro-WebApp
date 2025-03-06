import { JSXChildren, component$ } from "@builder.io/qwik";

export type TableHeader = {
  name: string;
  key: string;
}

export type TableProps = {
  headers: TableHeader[];
  data: any[];
};

export default component$<TableProps>(({ headers, data }) => {
  return (
    <div class="relative overflow-x-auto shadow-md sm:rounded-lg">
      <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            {headers.map((header) => (
              <th scope="col" class="px-6 py-3">
                {header.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">
              {/* TODO: Allow a more flexible table styles for each row and column */}
              {headers.map((header, index) => (
                header.key === "actions" ? <td key={index} class="px-6 py-4">{row[header.key].map((action: JSXChildren, index: number) => (
                  <div key={index}>
                    {action}
                  </div>
                ))}</td> : < td key={index} class="px-6 py-4" >
                  {row[header.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div >
  );
});
