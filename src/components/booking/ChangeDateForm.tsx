interface ChangeDateFormProps {
  checkIn: string;
  checkOut: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  onClick: (e: React.MouseEvent) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  minDate?: string; // Added minDate prop
}

export default function ChangeDateForm({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  onClick,
  onSubmit,
  onCancel,
  minDate, // Added minDate parameter
}: ChangeDateFormProps) {
  return (
    <>
      {/* Change Date Form */}
      <form onSubmit={onSubmit} className="bg-white px-5 pt-5 pb-2 rounded-lg">
        <p className="text-lg font-bold text-gray-800 mb-4">Change Date</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Check In */}
          <div>
            <label className="block text-lg text-gray-800 mb-2">Check In</label>
            <div className="relative">
              <input
                type="date"
                value={checkIn}
                onChange={(e) => onCheckInChange(e.target.value)}
                min={minDate} // Added min attribute
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          {/* Check Out */}
          <div>
            <label className="block text-lg text-gray-800 mb-2">
              Check Out
            </label>
            <div className="relative">
              <input
                type="date"
                value={checkOut}
                onChange={(e) => onCheckOutChange(e.target.value)}
                min={minDate} // Added min attribute
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>
      </form>
      {/* Confirm Change Date Button */}
      <div className="flex justify-end mt-10">
        <button
          type="submit"
          onClick={onClick}
          className="flex-1 md:flex-none px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md transition-colors cursor-pointer"
        >
          Confirm Change Date
        </button>
      </div>
      {/* Mobile Cancel Button */}
      <div className="flex h-full justify-center items-center mt-3">
        <button
          type="button"
          onClick={onCancel}
          className="md:hidden px-6 py-3 text-orange-600 hover:text-orange-700 font-medium transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </>
  );
}
