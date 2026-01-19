import { toast, type ExternalToast } from 'sonner';

const commonToastOptions: ExternalToast = {
  richColors: true,
  dismissible: true,
  closeButton: true,
};

export function showErrorToast(title: string, description?: Error | unknown) {
  const descriptionStr =
    description instanceof Error ? description.message : String(description);

  console.error(title, descriptionStr);
  toast.error(title, {
    ...commonToastOptions,
  });
}

export function showSuccessToast(title: string, description?: string) {
  toast.success(title, {
    ...commonToastOptions,
    description,
  });
}
