export default function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm">
      {message}
    </div>
  );
}
