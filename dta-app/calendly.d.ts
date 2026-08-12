interface Window {
  Calendly?: {
    initInlineWidget: (options: {
      url: string;
      parentElement: HTMLElement;
      prefill?: Record<string, unknown>;
      utm?: Record<string, unknown>;
    }) => void;
    initPopupWidget: (options: { url: string }) => void;
    closePopupWidget: () => void;
  };
}
