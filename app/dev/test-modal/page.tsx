"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Navigation } from "@/components/Navigation";

export default function TestModalPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-medium focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
      >
        Skip to main content
      </a>

      <Navigation />

      <section
        id="main-content"
        className="flex flex-col items-center justify-center min-h-screen px-4 py-16 sm:px-8 md:px-16 lg:px-24 xl:px-32 pt-20 sm:pt-24"
      >
        <div className="text-center space-y-6 max-w-2xl">
          <h1 className="text-4xl font-bold">Modal Dialog Test</h1>
          <p className="text-lg text-muted-foreground">
            Click the button below to open a modal dialog and test focus trap and Escape key
            functionality.
          </p>

          <div className="flex flex-col gap-4 mt-8">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            >
              Open Modal Dialog
            </button>

            <p className="text-sm text-muted-foreground">
              Try pressing Tab to navigate and Escape to close
            </p>
          </div>

          <div className="mt-12 p-6 bg-muted rounded-lg text-left space-y-4">
            <h2 className="text-xl font-semibold">Test Checklist:</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Click "Open Modal Dialog" button</li>
              <li>Press Tab - focus should cycle within modal</li>
              <li>Press Shift+Tab - focus should cycle backward within modal</li>
              <li>Press Escape - modal should close</li>
              <li>Focus should return to the trigger button</li>
              <li>Background should not scroll when modal is open</li>
            </ul>
          </div>
        </div>
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Example Modal Dialog"
      >
        <div className="space-y-4">
          <p>
            This is an example modal dialog with focus trap functionality. Try pressing Tab to
            navigate between focusable elements.
          </p>

          <div className="space-y-3">
            <label htmlFor="modal-input" className="block text-sm font-medium">
              Example Input:
            </label>
            <input
              id="modal-input"
              type="text"
              placeholder="Type something..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            >
              Confirm
            </button>
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            >
              Cancel
            </button>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Press Escape or click outside to close this modal.
          </p>
        </div>
      </Modal>
    </main>
  );
}
