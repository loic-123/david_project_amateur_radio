import { PropagationRating } from "@/types";

const COLORS: Record<PropagationRating, string> = {
  Excellent: "bg-green-500 text-white",
  Good: "bg-lime-500 text-white",
  Fair: "bg-yellow-400 text-gray-900",
  Poor: "bg-red-500 text-white",
};

export default function BandBadge({ rating }: { rating: PropagationRating }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${COLORS[rating]}`}>
      {rating}
    </span>
  );
}
