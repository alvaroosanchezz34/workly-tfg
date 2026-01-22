const MetricCard = ({ title, value, color }) => {
  return (
    <div className="
  bg-white border border-slate-200 rounded-xl shadow-sm
  p-6 h-32 flex flex-col justify-between
  hover:shadow-md hover:-translate-y-0.5
  transition duration-200 ease-out
">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <h2
        className="text-2xl font-semibold"
        style={{ color }}
      >
        {value}
      </h2>
    </div>
  );
};

export default MetricCard;