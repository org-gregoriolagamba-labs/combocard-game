export default function Toast({ toasts }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-black bg-opacity-80 text-white px-4 py-2 rounded shadow-lg text-sm animate-slide-in"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}