import { useNavigate } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import PaginationControls from '../../../components/PaginationControls';
import SortableHeaderCell from '../../../components/SortableHeaderCell';
import { toggleSort, type SortState } from '../../../lib/table/sorting';
import { DEFAULT_TABLE_PAGE_SIZE } from '../../../lib/table/pagination';
import { canAccessModule, getAuthUserId } from '../../../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../../../lib/pocketbase/errors';
import { getEmployeeByUserId } from '../../../lib/pocketbase/employees';
import {
  listEmployeeInvoices,
  type InvoiceRecord,
  type InvoiceSortField,
} from '../../../lib/pocketbase/invoices';

function formatDateTime(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function formatText(value: unknown): string {
  if (typeof value !== 'string') return '—';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '—';
}

function getErrorMessage(error: unknown): string {
  const normalized = error as PocketBaseRequestError | undefined;
  if (normalized && typeof normalized.message === 'string') return normalized.message;
  if (error instanceof Error) return error.message;
  return 'No se pudo completar la operación.';
}

type InvoiceSortKey = InvoiceSortField;
const DEFAULT_INVOICE_SORT: SortState<InvoiceSortKey> = { key: 'update_datetime', direction: 'desc' };

export default function ProfessorInvoicesPage() {
  const navigate = useNavigate();

  createEffect(() => {
    if (!canAccessModule('professor-personal')) {
      navigate('/', { replace: true });
    }
  });

  const userId = () => getAuthUserId() ?? '';
  const [employee] = createResource(
    () => (userId().length > 0 ? userId() : undefined),
    (uid) => getEmployeeByUserId(uid),
  );

  const [invoicePage, setInvoicePage] = createSignal(1);
  const [invoiceSort, setInvoiceSort] = createSignal<SortState<InvoiceSortKey>>(DEFAULT_INVOICE_SORT);

  const employeeId = () => employee()?.id ?? '';

  const [invoices] = createResource(
    () => {
      const eid = employeeId();
      if (!eid) return undefined;
      return { employeeId: eid, page: invoicePage(), sortField: invoiceSort().key, sortDirection: invoiceSort().direction };
    },
    ({ employeeId: eid, page, sortField, sortDirection }) =>
      listEmployeeInvoices(eid, page, DEFAULT_TABLE_PAGE_SIZE, { sortField, sortDirection }),
  );

  const handleInvoiceSort = (key: InvoiceSortKey) => {
    setInvoiceSort((current) => toggleSort(current, key));
    setInvoicePage(1);
  };

  const invoiceRows = () => invoices()?.items ?? [];

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-5xl rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Consultar pagos</h1>
            <p class="mt-2 text-gray-600">Consulta tus facturas y pagos registrados.</p>
          </div>

          <button
            type="button"
            class="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-yellow-200"
            onClick={() => navigate('/professor/personal')}
          >
            Volver
          </button>
        </div>

        <Show when={!employee.loading}>
          <Show
            when={employee() !== null && employee() !== undefined}
            fallback={
              <div class="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                No se encontró un registro de empleado vinculado a tu usuario. Contacta al administrador.
              </div>
            }
          >
            <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
              <table class="min-w-[520px] w-full text-left text-sm">
                <thead class="bg-yellow-100 text-gray-700">
                  <tr>
                    <SortableHeaderCell
                      class="px-4 py-3 font-semibold"
                      label="Nombre"
                      columnKey="name"
                      sort={invoiceSort()}
                      onSort={handleInvoiceSort}
                    />
                    <SortableHeaderCell
                      class="px-4 py-3 font-semibold"
                      label="Semestre"
                      columnKey="semester_name"
                      sort={invoiceSort()}
                      onSort={handleInvoiceSort}
                    />
                    <SortableHeaderCell
                      class="px-4 py-3 font-semibold"
                      label="Actualizado"
                      columnKey="update_datetime"
                      sort={invoiceSort()}
                      onSort={handleInvoiceSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  <Show
                    when={!invoices.loading}
                    fallback={
                      <tr>
                        <td class="px-4 py-4 text-gray-600" colSpan={3}>
                          Cargando facturas...
                        </td>
                      </tr>
                    }
                  >
                    <Show
                      when={!invoices.error}
                      fallback={
                        <tr>
                          <td class="px-4 py-4 text-red-700" colSpan={3}>
                            {getErrorMessage(invoices.error)}
                          </td>
                        </tr>
                      }
                    >
                      <Show
                        when={invoiceRows().length > 0}
                        fallback={
                          <tr>
                            <td class="px-4 py-4 text-gray-600" colSpan={3}>
                              No hay facturas registradas.
                            </td>
                          </tr>
                        }
                      >
                        <For each={invoiceRows()}>
                          {(invoice: InvoiceRecord) => (
                            <tr class="border-t border-yellow-100 align-top">
                              <td class="px-4 py-3">{formatText(invoice.name)}</td>
                              <td class="px-4 py-3">{formatText(invoice.semesterName || invoice.semesterId)}</td>
                              <td class="px-4 py-3">{formatDateTime(invoice.updated)}</td>
                            </tr>
                          )}
                        </For>
                      </Show>
                    </Show>
                  </Show>
                </tbody>
              </table>
            </div>
            <PaginationControls
              class="mt-3 flex items-center justify-between"
              page={invoices()?.page ?? 1}
              totalPages={invoices()?.totalPages ?? 1}
              busy={invoices.loading}
              onPageChange={(nextPage) => setInvoicePage(nextPage)}
            />
          </Show>
        </Show>
      </div>
    </section>
  );
}
