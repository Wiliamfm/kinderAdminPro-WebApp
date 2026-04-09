import { useNavigate } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import Modal from '../../../components/Modal';
import PaginationControls from '../../../components/PaginationControls';
import SortableHeaderCell from '../../../components/SortableHeaderCell';
import { toggleSort, type SortState } from '../../../lib/table/sorting';
import { DEFAULT_TABLE_PAGE_SIZE } from '../../../lib/table/pagination';
import { canAccessModule, getAuthUserId } from '../../../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../../../lib/pocketbase/errors';
import { getEmployeeByUserId } from '../../../lib/pocketbase/employees';
import { getInvoiceFileUrl } from '../../../lib/pocketbase/invoice-files';
import {
  listEmployeeInvoices,
  type InvoiceRecord,
  type InvoiceSortField,
} from '../../../lib/pocketbase/invoices';
import { downloadBlobFile } from '../../../lib/reports/download';

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
const BULK_DOWNLOAD_DELAY_MS = 250;

function formatDownloadFileName(value: unknown): string {
  if (typeof value !== 'string') return 'factura.pdf';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'factura.pdf';
}

async function fetchFileBlob(fileUrl: string): Promise<Blob> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error('No se pudo descargar el archivo.');
  }
  return response.blob();
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

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
  const [selectedInvoiceIds, setSelectedInvoiceIds] = createSignal<string[]>([]);
  const [bulkDownloadBusy, setBulkDownloadBusy] = createSignal(false);
  const [bulkDownloadError, setBulkDownloadError] = createSignal('');
  const [previewInvoice, setPreviewInvoice] = createSignal<InvoiceRecord | null>(null);
  const [previewFileUrl, setPreviewFileUrl] = createSignal('');
  const [previewLoading, setPreviewLoading] = createSignal(false);
  const [previewError, setPreviewError] = createSignal('');
  const [previewDownloadBusy, setPreviewDownloadBusy] = createSignal(false);
  const [previewDownloadError, setPreviewDownloadError] = createSignal('');

  const employeeId = () => employee()?.id ?? '';
  let previewRequestId = 0;
  let selectAllCheckboxRef: HTMLInputElement | undefined;

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
  const visibleInvoiceIds = () => invoiceRows().map((invoice) => invoice.id);
  const selectedVisibleInvoiceIds = () => visibleInvoiceIds().filter((id) => selectedInvoiceIds().includes(id));
  const allVisibleSelected = () =>
    visibleInvoiceIds().length > 0 && selectedVisibleInvoiceIds().length === visibleInvoiceIds().length;
  const someVisibleSelected = () =>
    selectedVisibleInvoiceIds().length > 0 && selectedVisibleInvoiceIds().length < visibleInvoiceIds().length;

  createEffect(() => {
    const visibleIds = new Set(visibleInvoiceIds());
    setSelectedInvoiceIds((current) => current.filter((id) => visibleIds.has(id)));
  });

  createEffect(() => {
    if (!selectAllCheckboxRef) return;
    selectAllCheckboxRef.indeterminate = someVisibleSelected();
  });

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoiceIds((current) =>
      current.includes(invoiceId)
        ? current.filter((id) => id !== invoiceId)
        : [...current, invoiceId],
    );
    setBulkDownloadError('');
  };

  const toggleAllVisibleInvoices = () => {
    setSelectedInvoiceIds(allVisibleSelected() ? [] : visibleInvoiceIds());
    setBulkDownloadError('');
  };

  const closePreviewModal = () => {
    previewRequestId += 1;
    setPreviewInvoice(null);
    setPreviewFileUrl('');
    setPreviewLoading(false);
    setPreviewError('');
    setPreviewDownloadBusy(false);
    setPreviewDownloadError('');
  };

  const openPreviewModal = async (invoice: InvoiceRecord) => {
    const requestId = ++previewRequestId;
    setPreviewInvoice(invoice);
    setPreviewFileUrl('');
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewDownloadError('');

    try {
      const fileUrl = await getInvoiceFileUrl(invoice.fileId);
      if (requestId !== previewRequestId) return;
      setPreviewFileUrl(fileUrl);
    } catch (error) {
      if (requestId !== previewRequestId) return;
      setPreviewError(getErrorMessage(error));
    } finally {
      if (requestId === previewRequestId) {
        setPreviewLoading(false);
      }
    }
  };

  const downloadInvoice = async (invoice: InvoiceRecord, fileUrl?: string) => {
    const resolvedFileUrl = fileUrl && fileUrl.length > 0
      ? fileUrl
      : await getInvoiceFileUrl(invoice.fileId);
    const blob = await fetchFileBlob(resolvedFileUrl);
    downloadBlobFile(formatDownloadFileName(invoice.name), blob);
  };

  const handlePreviewDownload = async () => {
    const invoice = previewInvoice();
    if (!invoice || previewDownloadBusy()) return;

    setPreviewDownloadBusy(true);
    setPreviewDownloadError('');

    try {
      await downloadInvoice(invoice, previewFileUrl() || undefined);
    } catch (error) {
      setPreviewDownloadError(getErrorMessage(error));
    } finally {
      setPreviewDownloadBusy(false);
    }
  };

  const handleBulkDownload = async () => {
    if (bulkDownloadBusy()) return;

    const selectedInvoices = invoiceRows().filter((invoice) => selectedInvoiceIds().includes(invoice.id));
    if (selectedInvoices.length === 0) return;

    setBulkDownloadBusy(true);
    setBulkDownloadError('');

    try {
      for (const [index, invoice] of selectedInvoices.entries()) {
        await downloadInvoice(invoice);
        if (index < selectedInvoices.length - 1) {
          await wait(BULK_DOWNLOAD_DELAY_MS);
        }
      }
    } catch (error) {
      setBulkDownloadError(getErrorMessage(error));
    } finally {
      setBulkDownloadBusy(false);
    }
  };

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

        <Show when={selectedInvoiceIds().length > 0}>
          <div class="mt-4 flex justify-end">
            <button
              type="button"
              class="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={bulkDownloadBusy()}
              onClick={() => void handleBulkDownload()}
            >
              {bulkDownloadBusy()
                ? 'Descargando...'
                : `Descargar seleccionadas (${selectedInvoiceIds().length})`}
            </button>
          </div>
        </Show>

        <Show when={bulkDownloadError().length > 0}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {bulkDownloadError()}
          </div>
        </Show>

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
              <table class="min-w-[580px] w-full text-left text-sm">
                <thead class="bg-yellow-100 text-gray-700">
                  <tr>
                    <th class="w-14 px-4 py-3 font-semibold">
                      <input
                        ref={selectAllCheckboxRef}
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                        checked={allVisibleSelected()}
                        aria-label="Seleccionar todas las facturas visibles"
                        onChange={toggleAllVisibleInvoices}
                      />
                    </th>
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
                        <td class="px-4 py-4 text-gray-600" colSpan={4}>
                          Cargando facturas...
                        </td>
                      </tr>
                    }
                  >
                    <Show
                      when={!invoices.error}
                      fallback={
                        <tr>
                          <td class="px-4 py-4 text-red-700" colSpan={4}>
                            {getErrorMessage(invoices.error)}
                          </td>
                        </tr>
                      }
                    >
                      <Show
                        when={invoiceRows().length > 0}
                        fallback={
                          <tr>
                            <td class="px-4 py-4 text-gray-600" colSpan={4}>
                              No hay facturas registradas.
                            </td>
                          </tr>
                        }
                      >
                        <For each={invoiceRows()}>
                          {(invoice: InvoiceRecord) => (
                            <tr
                              class="cursor-pointer border-t border-yellow-100 align-top transition-colors hover:bg-yellow-50 focus-within:bg-yellow-50"
                              tabindex="0"
                              onClick={() => void openPreviewModal(invoice)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  void openPreviewModal(invoice);
                                }
                              }}
                            >
                              <td class="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  class="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                                  checked={selectedInvoiceIds().includes(invoice.id)}
                                  aria-label={`Seleccionar factura ${formatText(invoice.name)}`}
                                  onClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => event.stopPropagation()}
                                  onChange={() => toggleInvoiceSelection(invoice.id)}
                                />
                              </td>
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

      <Modal
        open={previewInvoice() !== null}
        title={formatText(previewInvoice()?.name)}
        description="Vista previa del archivo PDF."
        confirmLabel="Descargar"
        size="xl"
        onConfirm={() => {}}
        onClose={closePreviewModal}
        footer={(
          <div class="mt-6 flex shrink-0 justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
              onClick={closePreviewModal}
            >
              Cerrar
            </button>
            <button
              type="button"
              class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={previewLoading() || previewFileUrl().length === 0 || previewDownloadBusy()}
              onClick={() => void handlePreviewDownload()}
            >
              {previewDownloadBusy() ? 'Descargando...' : 'Descargar'}
            </button>
          </div>
        )}
      >
        <div class="space-y-4">
          <Show when={previewDownloadError().length > 0}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {previewDownloadError()}
            </div>
          </Show>

          <Show
            when={!previewLoading()}
            fallback={(
              <div class="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-6 text-sm text-gray-700">
                Cargando vista previa...
              </div>
            )}
          >
            <Show
              when={previewError().length === 0}
              fallback={(
                <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-6 text-sm text-red-700">
                  {previewError()}
                </div>
              )}
            >
              <Show
                when={previewFileUrl().length > 0}
                fallback={(
                  <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-6 text-sm text-red-700">
                    No se encontró el archivo de la factura.
                  </div>
                )}
              >
                <iframe
                  class="h-[65vh] w-full rounded-lg border border-yellow-200 bg-white"
                  src={previewFileUrl()}
                  title={`Vista previa de ${formatText(previewInvoice()?.name)}`}
                />
              </Show>
            </Show>
          </Show>
        </div>
      </Modal>
    </section>
  );
}
